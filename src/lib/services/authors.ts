import { db } from "@/lib/db";
import { authors, affiliations, paperAuthors, papers } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";

export async function getAuthor(id: number) {
  const [author] = await db
    .select({ author: authors, affiliation: affiliations })
    .from(authors)
    .leftJoin(affiliations, eq(authors.affiliationId, affiliations.id))
    .where(eq(authors.id, id));
  return author ?? null;
}

export async function listAuthors(query?: string) {
  const q = query?.trim().toLowerCase();
  const rows = await db
    .select({ author: authors, affiliation: affiliations })
    .from(authors)
    .leftJoin(affiliations, eq(authors.affiliationId, affiliations.id))
    .where(q ? sql`lower(${authors.name}) like ${`%${q}%`}` : undefined)
    .orderBy(asc(authors.name))
    .limit(50);
  return rows;
}

export async function getAuthorPaperCount(authorId: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(paperAuthors)
    .where(eq(paperAuthors.authorId, authorId));
  return row?.count ?? 0;
}

export async function findOrCreateAuthor(name: string, affiliationId?: number) {
  const [existing] = await db
    .select()
    .from(authors)
    .where(sql`lower(${authors.name}) = lower(${name})`)
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(authors)
    .values({ name, affiliationId })
    .returning();
  return created;
}

export async function getAuthorPapers(authorId: number) {
  const rows = await db
    .select({ paper: papers })
    .from(paperAuthors)
    .innerJoin(papers, eq(paperAuthors.paperId, papers.id))
    .where(eq(paperAuthors.authorId, authorId))
    .orderBy(sql`${papers.createdAt} desc`);
  return rows.map((r) => r.paper);
}

export interface AuthorMetrics {
  totalPapers: number;
  totalCitations: number;
  hIndex: number;
  coAuthors: { id: number; name: string; count: number }[];
}

/**
 * Bibliometric metrics for an author (CNKI-style):
 * - totalCitations: sum of citations across the author's papers
 * - hIndex: h papers each cited at least h times
 * - coAuthors: collaborators ranked by number of joint papers
 */
export async function getAuthorMetrics(authorId: number): Promise<AuthorMetrics> {
  const papersOf = await db
    .select({ paperId: paperAuthors.paperId })
    .from(paperAuthors)
    .where(eq(paperAuthors.authorId, authorId));
  const ids = papersOf.map((r) => r.paperId);

  const [citeRows, coRows] = await Promise.all([
    ids.length === 0
      ? []
      : db.execute(sql`
          select c.target_paper_id as pid, count(*)::int as n
          from citations c
          where c.target_paper_id in ${ids}
          group by c.target_paper_id
        `),
    db.execute(sql`
      select pa2.author_id as aid, a.name as name, count(*)::int as n
      from paper_authors pa1
      join paper_authors pa2 on pa1.paper_id = pa2.paper_id and pa1.author_id <> pa2.author_id
      join authors a on a.id = pa2.author_id
      where pa1.author_id = ${authorId}
      group by pa2.author_id, a.name
      order by n desc
      limit 20
    `),
  ]);

  const citeCounts = ((citeRows as unknown as { pid: string; n: number }[]) ?? []).map((r) => r.n).sort((a, b) => b - a);
  const totalCitations = citeCounts.reduce((s, n) => s + n, 0);
  let hIndex = 0;
  for (let i = 0; i < citeCounts.length; i++) {
    if (citeCounts[i] >= i + 1) hIndex = i + 1;
    else break;
  }

  const coAuthors = ((coRows as unknown as { aid: number; name: string; n: number }[]) ?? []).map((r) => ({
    id: r.aid,
    name: r.name,
    count: r.n,
  }));

  return { totalPapers: ids.length, totalCitations, hIndex, coAuthors };
}
