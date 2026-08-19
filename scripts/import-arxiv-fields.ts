/**
 * One-off data-ingest script: pull one recent paper per top-level arXiv field
 * from the arXiv API, download its PDF into local storage, and insert it into
 * the catalogue as an approved paper.
 *
 *   NODE_OPTIONS="" npm run db:seed-arxiv
 *
 * Field coverage: the 20 arXiv-native top-level categories (cs / econ / eess /
 * math / physics / q-bio / q-fin / stat / astro-ph / cond-mat / gr-qc / hep-ex
 * / hep-lat / hep-ph / hep-th / math-ph / nlin / nucl-ex / nucl-th / quant-ph).
 * The 8 aggregate archives (cs, econ, eess, math, physics, q-fin, stat, nlin)
 * are queried through one of their concrete sub-categories (see FIELD_CATS).
 *
 * Idempotent: papers whose arXiv id already exists in `paper_external_ids` are
 * skipped. Re-running is safe.
 */
import { db } from "@/lib/db";
import {
  papers,
  paperVersions,
  paperAuthors,
  paperCategories,
  paperExternalIds,
  categories,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { savePdfBuffer } from "@/lib/storage";
import { findOrCreateAuthor } from "@/lib/services/authors";

/** createdById for ingested papers — the seeded administrator account. */
const ADMIN_USER_ID = "1477a93b-15b1-4281-bc88-b7a534042aef";

/**
 * Top-level field → the concrete arXiv category used to query it.
 * Archive-level ids (cs, math, …) are not accepted by the arXiv API, so each
 * aggregate archive is queried through a representative sub-category.
 */
const FIELD_CATS: { top: string; cat: string }[] = [
  { top: "cs", cat: "cs.LG" },
  { top: "econ", cat: "econ.GN" },
  { top: "eess", cat: "eess.SP" },
  { top: "math", cat: "math.NT" },
  { top: "physics", cat: "physics.flu-dyn" },
  { top: "q-bio", cat: "q-bio.GN" },
  { top: "q-fin", cat: "q-fin.ST" },
  { top: "stat", cat: "stat.ML" },
  { top: "astro-ph", cat: "astro-ph.CO" },
  { top: "cond-mat", cat: "cond-mat.mtrl-sci" },
  { top: "gr-qc", cat: "gr-qc" },
  { top: "hep-ex", cat: "hep-ex" },
  { top: "hep-lat", cat: "hep-lat" },
  { top: "hep-ph", cat: "hep-ph" },
  { top: "hep-th", cat: "hep-th" },
  { top: "math-ph", cat: "math-ph" },
  { top: "nlin", cat: "nlin.AO" },
  { top: "nucl-ex", cat: "nucl-ex" },
  { top: "nucl-th", cat: "nucl-th" },
  { top: "quant-ph", cat: "quant-ph" },
];

const UA = { "user-agent": "Papex/0.1 (+https://github.com/Maicarons/papex)" };

interface ArxivEntry {
  arxivId: string; // base id without version, e.g. "2608.12345"
  version: number;
  title: string;
  abstract: string;
  authors: string[];
  /** Concrete arXiv categories, primary first. */
  categories: string[];
  comments?: string;
  published: string;
}

/** Minimal HTML/XML entity decoding for values coming from the Atom feed. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function xmlTag(xml: string, tag: string, nth = 0): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  let m: RegExpExecArray | null;
  let idx = 0;
  let lastIndex = 0;
  while ((m = re.exec(xml.slice(lastIndex))) !== null && idx <= nth) {
    if (idx === nth) return m[1];
    idx++;
    lastIndex += m.index + m[0].length;
  }
  return "";
}

function parseEntries(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const body = m[1];
    const idUrl = xmlTag(body, "id");
    const idMatch = idUrl.match(/abs\/(\d{4}\.\d{4,5})(?:v(\d+))?/);
    if (!idMatch) continue;
    const arxivId = idMatch[1];
    const version = idMatch[2] ? Number(idMatch[2]) : 1;
    const title = decodeEntities(xmlTag(body, "title"));
    const abstract = decodeEntities(xmlTag(body, "summary"));
    const authors = [...body.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/g)].map(
      (a) => decodeEntities(a[1]),
    );
    const primary = xmlTag(body, "primary_category", 0).match(/term="([^"]+)"/)?.[1];
    const others = [...body.matchAll(/<category[^>]*term="([^"]+)"/g)].map((c) => c[1]);
    const categories = primary
      ? [primary, ...others.filter((c) => c !== primary)]
      : others;
    const comments = xmlTag(body, "comment");
    const published = xmlTag(body, "published");
    entries.push({
      arxivId,
      version,
      title,
      abstract,
      authors,
      categories,
      comments: comments ? decodeEntities(comments) : undefined,
      published,
    });
  }
  return entries;
}

async function fetchRecent(cat: string): Promise<ArxivEntry[]> {
  const url =
    `http://export.arxiv.org/api/query?search_query=cat:${encodeURIComponent(cat)}` +
    `&sortBy=submittedDate&sortOrder=descending&max_results=5`;
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`arXiv API HTTP ${res.status} for ${cat}`);
  return parseEntries(await res.text());
}

/** Download a paper PDF and validate the %PDF magic bytes. */
async function downloadPdf(entry: ArxivEntry): Promise<Buffer> {
  const url = `https://arxiv.org/pdf/${entry.arxivId}v${entry.version}`;
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`PDF download HTTP ${res.status} for ${entry.arxivId}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5 || buf[0] !== 0x25 || buf[1] !== 0x50 || buf[2] !== 0x44 || buf[3] !== 0x46) {
    throw new Error(`Invalid PDF magic bytes for ${entry.arxivId} (${buf.length} bytes)`);
  }
  return buf;
}

async function alreadyImported(arxivId: string): Promise<boolean> {
  const [ext] = await db
    .select({ paperId: paperExternalIds.paperId })
    .from(paperExternalIds)
    .where(and(eq(paperExternalIds.source, "arxiv"), eq(paperExternalIds.externalId, arxivId)))
    .limit(1);
  return !!ext;
}

async function importField(top: string, cat: string): Promise<void> {
  console.log(`\n=== ${top} (via ${cat}) ===`);

  const entries = await fetchRecent(cat);
  if (entries.length === 0) throw new Error(`No entries returned for ${cat}`);

  let entry: ArxivEntry | null = null;
  let pdf: Buffer | null = null;
  for (const candidate of entries) {
    if (await alreadyImported(candidate.arxivId)) {
      console.log(`  skip ${candidate.arxivId} (already imported)`);
      continue;
    }
    try {
      pdf = await downloadPdf(candidate);
      entry = candidate;
      break;
    } catch (e) {
      console.log(`  ${candidate.arxivId} PDF unavailable (${(e as Error).message}), trying next`);
    }
  }
  if (!entry || !pdf) throw new Error(`No importable paper for ${cat} (all already imported or no PDF)`);

  const { arxivId, version } = entry;
  console.log(`  importing ${arxivId} v${version}: ${entry.title.slice(0, 80)}`);

  // Local paper id == arXiv id (YYMM.NNNNN format matches the schema).
  const paperId = arxivId;

  // Primary local category: the top-level field; additionally link the concrete
  // arXiv category when it exists locally.
  const { pdfUrl } = await savePdfBuffer(paperId, 1, pdf);

  const authorRows: { id: number; name: string; order: number }[] = [];
  for (const [i, name] of entry.authors.entries()) {
    const author = await findOrCreateAuthor(name);
    authorRows.push({ id: author.id, name: author.name, order: i });
  }
  if (authorRows.length === 0) {
    const fallback = await findOrCreateAuthor("Unknown Author");
    authorRows.push({ id: fallback.id, name: fallback.name, order: 0 });
  }
  const authorsJson = authorRows.map((a) => ({ name: a.name, order: a.order, authorId: a.id }));

  const paperCategoriesRows: { paperId: string; categoryId: string; isPrimary: boolean }[] = [
    { paperId, categoryId: top, isPrimary: true },
  ];
  // Link the arXiv primary category (and any other locally-known arXiv cats).
  for (const c of entry.categories) {
    if (c === top) continue;
    const [known] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, c))
      .limit(1);
    if (known && !paperCategoriesRows.some((r) => r.categoryId === c)) {
      paperCategoriesRows.push({ paperId, categoryId: c, isPrimary: false });
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(papers)
      .values({
        id: paperId,
        title: entry.title,
        primaryCategoryId: top,
        status: "approved",
        createdById: ADMIN_USER_ID,
        latestVersion: 1,
      })
      .onConflictDoNothing();
    await tx
      .insert(paperVersions)
      .values({
        paperId,
        version: 1,
        title: entry.title,
        abstract: entry.abstract,
        authorsJson,
        pdfUrl,
        sourceUrl: `https://arxiv.org/abs/${paperId}`,
        doi: `10.48550/arXiv.${paperId}`,
        license: "arXiv",
        comments: entry.comments ?? null,
      })
      .onConflictDoNothing();
    await tx
      .insert(paperAuthors)
      .values(authorRows.map((a) => ({ paperId, authorId: a.id, order: a.order })))
      .onConflictDoNothing();
    await tx.insert(paperCategories).values(paperCategoriesRows).onConflictDoNothing();
    await tx
      .insert(paperExternalIds)
      .values({
        paperId,
        source: "arxiv",
        externalId: arxivId,
        url: `https://arxiv.org/abs/${paperId}`,
      })
      .onConflictDoNothing();
  });

  console.log(`  ✓ ${paperId} inserted (${pdf.length.toLocaleString()} bytes PDF)`);
}

async function main() {
  let ok = 0;
  let failed = 0;
  for (const { top, cat } of FIELD_CATS) {
    try {
      await importField(top, cat);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${top}: ${(e as Error).message}`);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 800)); // be polite to export.arxiv.org
  }
  console.log(`\nDone. ${ok} fields imported, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
