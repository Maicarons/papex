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
