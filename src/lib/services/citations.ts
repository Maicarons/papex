import { db } from "@/lib/db";
import { citations, papers, paperVersions, paperExternalIds } from "@/lib/db/schema";
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

/**
 * Look up the internal paper id for an arXiv id or DOI, if it exists locally.
 * Checks three sources: the paper id itself (legacy arXiv-id-as-paper-id), the
 * paper_versions.doi column, and the cross-source `paper_external_ids` table
 * (populated by P0-B external imports).
 */
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
    const [ext] = await db
      .select({ paperId: paperExternalIds.paperId })
      .from(paperExternalIds)
      .where(
        sql`${paperExternalIds.source} = 'arxiv' and ${paperExternalIds.externalId} = ${opts.targetArxivId}`,
      )
      .limit(1);
    if (ext) return ext.paperId;
  }
  if (opts.targetDoi) {
    const [row] = await db
      .select({ paperId: paperVersions.paperId })
      .from(paperVersions)
      .where(eq(paperVersions.doi, opts.targetDoi))
      .limit(1);
    if (row) return row.paperId;
    const [ext] = await db
      .select({ paperId: paperExternalIds.paperId })
      .from(paperExternalIds)
      .where(
        sql`${paperExternalIds.source} = 'doi' and ${paperExternalIds.externalId} = ${opts.targetDoi}`,
      )
      .limit(1);
    if (ext) return ext.paperId;
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

export interface RelatedByCitation {
  paperId: string;
  title: string | null;
  count: number;
}

export interface CitationRelated {
  coCited: RelatedByCitation[]; // cited together with this paper
  coCiting: RelatedByCitation[]; // share references with this paper
  secondLevel: RelatedByCitation[]; // references of this paper's references
}

async function resolveTitles(
  paperIds: string[],
  counts: { pid: string; n: number }[],
): Promise<RelatedByCitation[]> {
  if (paperIds.length === 0) return [];
  const rows = await db
    .select({ id: papers.id, title: papers.title })
    .from(papers)
    .where(sql`${papers.id} in ${paperIds}`);
  const byId = new Map(rows.map((r) => [r.id, r.title]));
  return counts
    .map((c) => ({ paperId: c.pid, title: byId.get(c.pid) ?? null, count: c.n }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Three classic citation-graph relations from the CNKI "knowledge node":
 * - coCited: papers that are cited together with this one (same citing set)
 * - coCiting: papers that cite at least one of the same references (shared sources)
 * - secondLevel: references of this paper's references (citation chain depth 2)
 */
export async function citationRelated(
  paperId: string,
  limit = 6,
): Promise<CitationRelated> {
  const [coCitedRows, coCitingRows, secondRows] = await Promise.all([
    db.execute(sql`
      select c2.target_paper_id as pid, count(*)::int as n
      from citations c1
      join citations c2 on c1.paper_id = c2.paper_id
      where c1.target_paper_id = ${paperId}
        and c2.target_paper_id is not null
        and c2.target_paper_id <> ${paperId}
      group by c2.target_paper_id
      order by n desc
      limit ${limit}
    `),
    db.execute(sql`
      select c2.paper_id as pid, count(*)::int as n
      from citations c1
      join citations c2 on c1.target_paper_id = c2.target_paper_id
      where c1.paper_id = ${paperId}
        and c2.target_paper_id is not null
        and c2.paper_id <> ${paperId}
      group by c2.paper_id
      order by n desc
      limit ${limit}
    `),
    db.execute(sql`
      select c2.target_paper_id as pid, count(*)::int as n
      from citations c1
      join citations c2 on c1.target_paper_id = c2.paper_id
      where c1.paper_id = ${paperId}
        and c2.target_paper_id is not null
      group by c2.target_paper_id
      order by n desc
      limit ${limit}
    `),
  ]);

  const rowsOf = (r: unknown): { pid: string; n: number }[] =>
    (r as { pid: string; n: number }[]) ?? [];

  const coCitedIds = rowsOf(coCitedRows).map((x) => x.pid);
  const coCitingIds = rowsOf(coCitingRows).map((x) => x.pid);
  const secondIds = rowsOf(secondRows).map((x) => x.pid);

  const [coCited, coCiting, secondLevel] = await Promise.all([
    resolveTitles(coCitedIds, rowsOf(coCitedRows)),
    resolveTitles(coCitingIds, rowsOf(coCitingRows)),
    resolveTitles(secondIds, rowsOf(secondRows)),
  ]);

  return { coCited, coCiting, secondLevel };
}
