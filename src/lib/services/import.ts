/**
 * P0-B — External metadata import + citation backfill.
 *
 * Lets a moderator/administrator pull a paper's metadata (and its reference
 * list) from scholarly sources by DOI / arXiv id / URL, then create a local
 * paper record (de-duplicated via `paper_external_ids`) and auto-build the
 * citation graph. This replaces the sparse, hand-typed citation network: once
 * papers are imported, `completeCitations` fills in their outgoing references.
 *
 * Sources (no API key required for basic use):
 *  - Crossref  (DOI -> metadata, via api.crossref.org)
 *  - arXiv     (id  -> Atom metadata + PDF, via export.arxiv.org)
 *  - Semantic Scholar (DOI/arXiv -> metadata + references, graph/v1)
 *  - OpenCitations (DOI -> references, fallback for citation backfill)
 *
 * Pure mapping functions are exported separately so they can be unit-tested
 * with recorded fixtures without network access.
 */

import { db } from "@/lib/db";
import { paperExternalIds, categories, paperVersions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { createSubmission } from "@/lib/services/papers";
import { addCitation } from "@/lib/services/citations";
import type { CreatePaperInput } from "@/lib/validations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReferenceIdentifier {
  doi?: string;
  arxivId?: string;
  title?: string;
  url?: string;
  /** Free-text reference string (Crossref "unstructured"), best-effort. */
  unstructured?: string;
}

export interface ImportedMetadata {
  title: string;
  abstract?: string;
  authors: { name: string; order: number }[];
  doi?: string;
  arxivId?: string;
  sourceUrl?: string;
  pdfUrl?: string;
  /** External category ids (arXiv-style, e.g. "cs.LG"); best-effort mapped to local categories. */
  categories: string[];
  publishedYear?: number;
  references: ReferenceIdentifier[];
}

export interface ImportResult {
  paperId: string;
  version: number;
  title: string;
  created: boolean;
  externalIds: { source: string; externalId: string }[];
  referencesLinked: number;
}

export interface CitationBackfillResult {
  paperId: string;
  fetched: number;
  linked: number;
}

interface OwnerLike {
  id: string;
  role: "author" | "moderator" | "admin";
}

// ---------------------------------------------------------------------------
// Pure mappers (unit-tested)
// ---------------------------------------------------------------------------

/** Flatten nested Crossref author objects into { name, order }. */
export function mapCrossrefAuthors(
  authors: unknown,
): { name: string; order: number }[] {
  if (!Array.isArray(authors)) return [];
  return authors
    .map((a, i) => {
      const obj = (a ?? {}) as { given?: string; family?: string; name?: string };
      const name = (obj.name ?? [obj.given, obj.family].filter(Boolean).join(" ")).trim();
      return name ? { name, order: i } : null;
    })
    .filter((x): x is { name: string; order: number } => x !== null);
}

/** Crossref `message` object -> ImportedMetadata. */
export function normalizeCrossref(message: unknown): ImportedMetadata {
  const m = (message ?? {}) as Record<string, any>;
  const title = Array.isArray(m.title) ? (m.title[0] ?? "") : (m.title ?? "");
  const abstract = typeof m.abstract === "string" ? m.abstract : undefined;
  const doi = typeof m.DOI === "string" ? m.DOI : undefined;
  const url = typeof m.URL === "string" ? m.URL : doi ? `https://doi.org/${doi}` : undefined;
  const publishedYear = Array.isArray(m.published)
    ? Number(m.published?.[0]?.year)
    : undefined;
  // Crossref "references" are sparse; prefer Semantic Scholar for backfill.
  const references: ReferenceIdentifier[] = Array.isArray(m.reference)
    ? m.reference
        .map((r: any) => ({
          doi: typeof r.DOI === "string" ? r.DOI : undefined,
          title: typeof r["article-title"] === "string" ? r["article-title"] : undefined,
          unstructured: typeof r.unstructured === "string" ? r.unstructured : undefined,
        }))
        .filter((r: ReferenceIdentifier) => r.doi || r.title || r.unstructured)
    : [];
  return {
    title: title || "Untitled",
    abstract,
    authors: mapCrossrefAuthors(m.author),
    doi,
    sourceUrl: url,
    categories: [],
    publishedYear: Number.isFinite(publishedYear) ? publishedYear : undefined,
    references,
  };
}

/** Minimal Atom entry (string) -> ImportedMetadata. Regex-based, no XML dep. */
export function normalizeArxiv(atom: string): ImportedMetadata {
  const entry = atom.includes("<entry>")
    ? atom.slice(atom.indexOf("<entry>"), atom.indexOf("</entry>") + 8)
    : atom;
  const pick = (tag: string): string => {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
    const m = entry.match(re);
    return m ? m[1].replace(/\s+/g, " ").trim() : "";
  };
  const idUrl = pick("id"); // e.g. http://arxiv.org/abs/2310.12345v1
  const arxivId = (idUrl.match(/abs\/([^\s?v]+)/) ?? [])[1] ?? idUrl;
  const title = pick("title");
  const abstract = pick("summary");
  const published = pick("published");
  const publishedYear = published ? Number(published.slice(0, 4)) : undefined;
  const authorNames = [...entry.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/g)].map(
    (m) => m[1].replace(/\s+/g, " ").trim(),
  );
  const authors = authorNames.map((name, i) => ({ name, order: i }));
  const primaryCatMatch = entry.match(/<primary_category[^>]*term="([^"]+)"/i);
  const catMatches = [...entry.matchAll(/<category[^>]*term="([^"]+)"/gi)].map((m) => m[1]);
  const categories = primaryCatMatch
    ? [primaryCatMatch[1], ...catMatches.filter((c) => c !== primaryCatMatch[1])]
    : catMatches;
  const pdfMatch = entry.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/i);
  const pdfUrl = pdfMatch ? pdfMatch[1] : undefined;
  return {
    title: title || "Untitled",
    abstract: abstract || undefined,
    authors,
    arxivId,
    sourceUrl: idUrl || undefined,
    pdfUrl,
    categories,
    publishedYear: Number.isFinite(publishedYear) ? publishedYear : undefined,
    references: [],
  };
}

/** Semantic Scholar paper object -> ImportedMetadata. */
export function normalizeSemanticScholar(paper: unknown): ImportedMetadata {
  const p = (paper ?? {}) as Record<string, any>;
  const title = typeof p.title === "string" ? p.title : "";
  const abstract = typeof p.abstract === "string" ? p.abstract : undefined;
  const externalIds = (p.externalIds ?? {}) as Record<string, string>;
  const doi = typeof externalIds.DOI === "string" ? externalIds.DOI : undefined;
  const arxivId =
    typeof externalIds.ArXiv === "string"
      ? externalIds.ArXiv
      : (p.arxivId as string | undefined);
  const authors = Array.isArray(p.authors)
    ? p.authors
        .map((a: any, i: number) => {
          const name = a?.name;
          return name ? { name: String(name), order: i } : null;
        })
        .filter((x: any): x is { name: string; order: number } => x !== null)
    : [];
  const year = typeof p.year === "number" ? p.year : undefined;
  const references: ReferenceIdentifier[] = Array.isArray(p.references)
    ? p.references
        .map((r: any) => {
          const re = (r?.citedPaper ?? r) as any;
          const ext = (re?.externalIds ?? {}) as Record<string, string>;
          return {
            doi: typeof ext.DOI === "string" ? ext.DOI : undefined,
            arxivId: typeof ext.ArXiv === "string" ? ext.ArXiv : undefined,
            title: typeof re?.title === "string" ? re.title : undefined,
          };
        })
        .filter((r: ReferenceIdentifier) => r.doi || r.arxivId || r.title)
    : [];
  return {
    title: title || "Untitled",
    abstract,
    authors,
    doi,
    arxivId,
    sourceUrl: doi ? `https://doi.org/${doi}` : undefined,
    categories: [],
    publishedYear: year,
    references,
  };
}

/** Extract a normalized identifier request from a free-form URL. */
export function parseIdentifierFromUrl(url: string): { doi?: string; arxivId?: string } {
  const u = url.trim();
  const doiMatch = u.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
  if (doiMatch) return { doi: doiMatch[0] };
  const arxivMatch = u.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/i);
  if (arxivMatch) return { arxivId: arxivMatch[1] };
  return {};
}

// ---------------------------------------------------------------------------
// Fetchers (network). Time-boxed; tolerate missing fields / failures.
// ---------------------------------------------------------------------------

const UA = { "user-agent": "Papex/0.1 (+https://github.com/Maicarons/papex)" };

/**
 * Download a paper's PDF bytes from an external source URL and validate the
 * `%PDF` magic bytes. Policy: every paper version must carry a PDF, so an
 * import whose PDF cannot be fetched must fail rather than create a PDF-less
 * record.
 */
async function downloadPdf(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`PDF download HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (
    buf.length < 5 ||
    buf[0] !== 0x25 ||
    buf[1] !== 0x50 ||
    buf[2] !== 0x44 ||
    buf[3] !== 0x46
  ) {
    throw new Error("INVALID_PDF");
  }
  return buf;
}

async function fetchJson(url: string): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, { headers: UA, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function fetchCrossref(doi: string): Promise<ImportedMetadata> {
  const json = await fetchJson(
    `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
  );
  return normalizeCrossref(json?.message);
}

async function fetchArxiv(arxivId: string): Promise<ImportedMetadata> {
  const xml = await fetchText(
    `http://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}&max_results=1`,
  );
  return normalizeArxiv(xml);
}

async function fetchSemanticScholarById(
  id: string,
  withReferences: boolean,
): Promise<ImportedMetadata> {
  const fields = withReferences
    ? "title,abstract,authors,externalIds,year,references.externalIds,references.title"
    : "title,abstract,authors,externalIds,year";
  const json = await fetchJson(
    `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(id)}?fields=${fields}`,
  );
  return normalizeSemanticScholar(json);
}

/** Resolve references for a paper by its DOI (OpenCitations fallback). */
async function fetchReferences(
  doi?: string,
  _arxivId?: string,
): Promise<ReferenceIdentifier[]> {
  try {
    if (doi) {
      const json = await fetchJson(
        `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}/references?fields=title,externalIds`,
      );
      const refs = normalizeSemanticScholar({ references: json?.data ?? [] }).references;
      if (refs.length) return refs;
    }
  } catch {
    // fall through to OpenCitations
  }
  if (doi) {
    try {
      const json = await fetchJson(`https://opencitations.net/index/api/v1/references/${encodeURIComponent(doi)}`);
      if (Array.isArray(json)) {
        return json
          .map((r: any) => ({ doi: r?.cited as string | undefined }))
          .filter((r: ReferenceIdentifier) => r.doi);
      }
    } catch {
      // ignore
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Category resolution
// ---------------------------------------------------------------------------

/**
 * Map external (arXiv-style) category ids to a local primary category id.
 * Exact-match first; otherwise an explicitly configured default
 * (IMPORT_DEFAULT_CATEGORY); otherwise the first local category as a last resort.
 */
async function resolvePrimaryCategory(candidates: string[]): Promise<string> {
  for (const c of candidates) {
    if (!c) continue;
    const [row] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, c))
      .limit(1);
    if (row) return row.id;
  }
  const configured = process.env.IMPORT_DEFAULT_CATEGORY;
  if (configured) return configured;
  const [first] = await db.select({ id: categories.id }).from(categories).limit(1);
  if (first) return first.id;
  throw new Error("NO_CATEGORY_AVAILABLE");
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

function dedupeExternalIds(meta: ImportedMetadata): { source: string; externalId: string; url?: string }[] {
  const map = new Map<string, { source: string; externalId: string; url?: string }>();
  if (meta.doi) map.set(`doi:${meta.doi}`, { source: "doi", externalId: meta.doi, url: meta.sourceUrl });
  if (meta.arxivId)
    map.set(`arxiv:${meta.arxivId}`, {
      source: "arxiv",
      externalId: meta.arxivId,
      url: meta.sourceUrl,
    });
  return [...map.values()];
}

/** Find an existing local paper for the given external identifiers, if any. */
async function findExistingPaper(meta: ImportedMetadata): Promise<string | null> {
  const ids = dedupeExternalIds(meta);
  if (ids.length === 0) return null;
  for (const { source, externalId } of ids) {
    const [ext] = await db
      .select({ paperId: paperExternalIds.paperId })
      .from(paperExternalIds)
      .where(
        sql`${paperExternalIds.source} = ${source} and ${paperExternalIds.externalId} = ${externalId}`,
      )
      .limit(1);
    if (ext) return ext.paperId;
    if (source === "doi") {
      const [pv] = await db
        .select({ paperId: paperVersions.paperId })
        .from(paperVersions)
        .where(eq(paperVersions.doi, externalId))
        .limit(1);
      if (pv) return pv.paperId;
    }
  }
  return null;
}

async function recordExternalIds(
  paperId: string,
  ids: { source: string; externalId: string; url?: string }[],
): Promise<void> {
  if (ids.length === 0) return;
  await db
    .insert(paperExternalIds)
    .values(ids.map((i) => ({ paperId, source: i.source, externalId: i.externalId, url: i.url })))
    .onConflictDoNothing();
}

async function linkReferences(
  paperId: string,
  refs: ReferenceIdentifier[],
  createdById?: string | null,
): Promise<number> {
  let linked = 0;
  for (const r of refs.slice(0, 200)) {
    try {
      const added = await addCitation({
        paperId,
        targetDoi: r.doi,
        targetArxivId: r.arxivId,
        targetTitle: r.title,
        createdById: createdById ?? undefined,
      });
      if (added.targetPaperId) linked++;
    } catch {
      // duplicate / constraint — ignore
    }
  }
  return linked;
}

/**
 * Import a paper by DOI / arXiv id / URL into the local catalogue.
 * Idempotent: if an external id already maps to a paper, that paper is returned
 * (with `created: false`) instead of creating a duplicate.
 */
export async function importByIdentifier(
  req: { doi?: string; arxivId?: string; url?: string },
  owner: OwnerLike,
  opts: { backfillCitations?: boolean } = {},
): Promise<ImportResult> {
  let { doi, arxivId } = req;
  if (!doi && !arxivId && req.url) {
    const parsed = parseIdentifierFromUrl(req.url);
    doi = parsed.doi;
    arxivId = parsed.arxivId;
  }
  if (!doi && !arxivId) throw new Error("MISSING_IDENTIFIER");

  // Fetch + normalize. arXiv first (gives categories + PDF), then enrich with
  // Crossref/S2 metadata (abstract, references) when available.
  let meta: ImportedMetadata | null = null;
  if (arxivId) {
    try {
      meta = await fetchArxiv(arxivId);
    } catch {
      meta = null;
    }
  }
  if (doi) {
    try {
      const cr = await fetchCrossref(doi);
      meta = meta ? { ...meta, ...cr, authors: cr.authors.length ? cr.authors : meta.authors } : cr;
    } catch {
      // keep arxiv metadata if crossref fails
    }
  }
  // Semantic Scholar enrichment (references + abstract).
  try {
    const s2id = doi ? `DOI:${doi}` : arxivId ? `ARXIV:${arxivId}` : undefined;
    if (s2id) {
      const s2 = await fetchSemanticScholarById(s2id, false);
      meta = meta
        ? {
            ...meta,
            abstract: meta.abstract || s2.abstract,
            authors: meta.authors.length ? meta.authors : s2.authors,
            references: s2.references,
          }
        : s2;
    }
  } catch {
    // ignore enrichment failure
  }

  if (!meta || !meta.title) throw new Error("FETCH_FAILED");

  // Idempotency: reuse existing paper if already imported.
  const existing = await findExistingPaper(meta);
  if (existing) {
    if (opts.backfillCitations) {
      const refs = await fetchReferences(meta.doi, meta.arxivId);
      const linked = await linkReferences(existing, refs, owner.id);
      return {
        paperId: existing,
        version: 1,
        title: meta.title,
        created: false,
        externalIds: dedupeExternalIds(meta),
        referencesLinked: linked,
      };
    }
    return {
      paperId: existing,
      version: 1,
      title: meta.title,
      created: false,
      externalIds: dedupeExternalIds(meta),
      referencesLinked: 0,
    };
  }

  const primaryCategoryId = await resolvePrimaryCategory(meta.categories);

  // Download the PDF into local storage (the storage layer stores `pdfUrl` as
  // the streaming route) so imported papers always carry a real PDF.
  if (!meta.pdfUrl) throw new Error("PDF_UNAVAILABLE");
  const pdfBuffer = await downloadPdf(meta.pdfUrl);

  const input: CreatePaperInput = {
    title: meta.title,
    abstract: meta.abstract ?? "",
    primaryCategoryId,
    secondaryCategoryIds: [],
    authors: meta.authors.length
      ? meta.authors
      : [{ name: "Unknown Author", order: 0 }],
    doi: meta.doi,
    sourceUrl: meta.sourceUrl,
    license: "CC-BY-4.0",
  };

  const { paperId, version } = await createSubmission(input, owner, {
    skipEndorsementGate: true,
    pdfBuffer,
  });
  await recordExternalIds(paperId, dedupeExternalIds(meta));

  let referencesLinked = 0;
  if (opts.backfillCitations) {
    const refs = await fetchReferences(meta.doi, meta.arxivId);
    referencesLinked = await linkReferences(paperId, refs, owner.id);
  }

  return {
    paperId,
    version,
    title: meta.title,
    created: true,
    externalIds: dedupeExternalIds(meta),
    referencesLinked,
  };
}

/**
 * Backfill the outgoing citation graph for an already-imported paper using its
 * external identifiers. Returns how many references were resolved to a local
 * (internal) paper.
 */
export async function completeCitations(paperId: string): Promise<CitationBackfillResult> {
  const extRows = await db
    .select({ source: paperExternalIds.source, externalId: paperExternalIds.externalId })
    .from(paperExternalIds)
    .where(eq(paperExternalIds.paperId, paperId));
  const [latest] = await db
    .select({ doi: paperVersions.doi })
    .from(paperVersions)
    .where(eq(paperVersions.paperId, paperId))
    .limit(1);

  const doi = extRows.find((r) => r.source === "doi")?.externalId ?? latest?.doi ?? undefined;
  const arxivId = extRows.find((r) => r.source === "arxiv")?.externalId;

  const refs = await fetchReferences(doi, arxivId);
  const linked = await linkReferences(paperId, refs);
  return { paperId, fetched: refs.length, linked };
}
