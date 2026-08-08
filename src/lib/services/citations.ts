import { db } from "@/lib/db";
import { citations, papers, paperVersions } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export interface CitationOut {
  id: number;
  paperId: string;
  targetPaperId: string | null;
  targetDoi: string | null;
  targetArxivId: string | null;
  targetTitle: string | null;
  targetUrl: string | null;
  resolvedTitle: string | null; // title of the internal paper if targetPaperId resolves
}

export interface CitationGraph {
  outgoing: CitationOut[];
  incoming: CitationOut[];
}

/** Look up the internal paper id for an arXiv id or DOI, if it exists locally. */
async function resolveTarget(opts: {
  targetArxivId?: string;
  targetDoi?: string;
}): Promise<string | null> {
  if (opts.targetArxivId) {
    const [row] = await db
      .select({ id: papers.id })
      .from(papers)
      .where(eq(papers.id, opts.targetArxivId));
    if (row) return row.id;
  }
  if (opts.targetDoi) {
    const [row] = await db
      .select({ paperId: paperVersions.paperId })
      .from(paperVersions)
      .where(eq(paperVersions.doi, opts.targetDoi))
      .limit(1);
    if (row) return row.paperId;
  }
  return null;
}

export async function listCitations(paperId: string): Promise<CitationGraph> {
  const outgoingRows = await db
    .select()
    .from(citations)
    .where(eq(citations.paperId, paperId))
    .orderBy(desc(citations.createdAt));

  const incomingRows = await db
    .select({ c: citations, title: papers.title })
    .from(citations)
    .leftJoin(papers, eq(citations.paperId, papers.id))
    .where(eq(citations.targetPaperId, paperId))
    .orderBy(desc(citations.createdAt));

  const outgoing: CitationOut[] = outgoingRows.map((c) => ({
    id: c.id,
    paperId: c.paperId,
    targetPaperId: c.targetPaperId,
    targetDoi: c.targetDoi,
    targetArxivId: c.targetArxivId,
    targetTitle: c.targetTitle,
    targetUrl: c.targetUrl,
    resolvedTitle: null,
  }));

  const incoming: CitationOut[] = incomingRows.map((r) => ({
    id: r.c.id,
    paperId: r.c.paperId,
    targetPaperId: r.c.targetPaperId,
    targetDoi: r.c.targetDoi,
    targetArxivId: r.c.targetArxivId,
    targetTitle: r.c.targetTitle,
    targetUrl: r.c.targetUrl,
    // The citing paper's own title (this row's "source").
    resolvedTitle: r.title,
  }));

  return { outgoing, incoming };
}

export async function addCitation(input: {
  paperId: string;
  targetArxivId?: string;
  targetDoi?: string;
  targetTitle?: string;
  targetUrl?: string;
  createdById?: string;
}): Promise<CitationOut> {
  const targetPaperId = await resolveTarget({
    targetArxivId: input.targetArxivId,
    targetDoi: input.targetDoi,
  });

  const [row] = await db
    .insert(citations)
    .values({
      paperId: input.paperId,
      targetPaperId,
      targetDoi: input.targetDoi ?? null,
      targetArxivId: input.targetArxivId ?? null,
      targetTitle: input.targetTitle ?? null,
      targetUrl: input.targetUrl ?? null,
      createdById: input.createdById ?? null,
    })
    .onConflictDoUpdate({
      target: [
        citations.paperId,
        citations.targetPaperId,
        citations.targetDoi,
        citations.targetArxivId,
      ],
      set: {
        targetTitle: input.targetTitle ?? null,
        targetUrl: input.targetUrl ?? null,
      },
    })
    .returning();

  return {
    id: row.id,
    paperId: row.paperId,
    targetPaperId: row.targetPaperId,
    targetDoi: row.targetDoi,
    targetArxivId: row.targetArxivId,
    targetTitle: row.targetTitle,
    targetUrl: row.targetUrl,
    resolvedTitle: null,
  };
}

export async function citationCounts(paperIds: string[]): Promise<Map<string, number>> {
  if (paperIds.length === 0) return new Map();
  const rows = await db
    .select({ paperId: citations.paperId, count: sql<number>`count(*)::int` })
    .from(citations)
    .where(sql`${citations.targetPaperId} in ${paperIds}`)
    .groupBy(citations.paperId);
  return new Map(rows.map((r) => [r.paperId, r.count]));
}
