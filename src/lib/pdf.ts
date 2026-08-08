import pdfParse from "pdf-parse/lib/pdf-parse.js";

export interface ParsedPdf {
  text: string;
  numPages: number;
  /** Best-effort title: first non-empty line of the document. */
  title?: string;
  /** Best-effort abstract: text following a line beginning with "Abstract". */
  abstract?: string;
}

export interface ExtractedReference {
  targetArxivId?: string;
  targetDoi?: string;
  targetTitle?: string;
  targetUrl?: string;
}

const ARXIV_RE = /(?:arXiv\s*:|ar[Xx]iv\.org\/abs\/)(\d{4}\.\d{4,5})/;
// Conservative DOI pattern: 10.<digits>/<rest>
const DOI_RE = /10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/;

/**
 * Parse a PDF buffer into text plus light metadata heuristics.
 * Imports the lib entry directly to avoid pdf-parse's test-file side effect.
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  const data = await pdfParse(buffer);
  const text = (data.text ?? "").replace(/\r/g, "").trim();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const title = lines[0]?.slice(0, 400);

  let abstract: string | undefined;
  const ai = lines.findIndex((l) => /^abstract\b/i.test(l));
  if (ai >= 0) {
    const slice = lines.slice(ai + 1, ai + 12).join(" ");
    // Trim up to the next section header if present.
    abstract = slice.split(/\n?(?:keywords|index terms|1\.\s*introduction)\b/i)[0].trim().slice(0, 20000);
    if (!abstract) abstract = undefined;
  }

  return { text, numPages: data.numpages ?? 0, title, abstract };
}

/**
 * Pull candidate references (arXiv ids / DOIs) out of parsed PDF text.
 * Used by the batch ingest pipeline to auto-build the citation graph.
 */
export function extractReferences(text: string, limit = 60): ExtractedReference[] {
  const found = new Map<string, ExtractedReference>();
  const lines = text.replace(/\r/g, "").split("\n");
  for (const line of lines) {
    const arxiv = line.match(ARXIV_RE);
    const doi = line.match(DOI_RE);
    if (!arxiv && !doi) continue;
    const key = arxiv?.[1] ?? doi?.[0] ?? "";
    if (found.has(key)) continue;
    const clean = line.replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
    found.set(key, {
      targetArxivId: arxiv?.[1],
      targetDoi: doi?.[0],
      targetTitle: clean.slice(0, 300) || undefined,
    });
    if (found.size >= limit) break;
  }
  return [...found.values()];
}
