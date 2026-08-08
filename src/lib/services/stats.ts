import { db } from "@/lib/db";
import { authors, citations, comments, paperAuthors, papers, subscriptions, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export interface AdminStats {
  totalPapers: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
  submissionsLast14Days: { date: string; count: number }[];
  totalAuthors: number;
  totalUsers: number;
  totalComments: number;
  totalSubscriptions: number;
  totalCitations: number;
  pendingReviews: number;
  topAuthors: { name: string; count: number }[];
}

export async function getAdminStats(): Promise<AdminStats> {
  const [{ v: totalPapers }] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(papers);

  const byStatus = await db
    .select({ status: papers.status, count: sql<number>`count(*)::int` })
    .from(papers)
    .groupBy(papers.status);

  const byCategory = await db
    .select({ category: papers.primaryCategoryId, count: sql<number>`count(*)::int` })
    .from(papers)
    .groupBy(papers.primaryCategoryId)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  const since = new Date(Date.now() - 14 * 86400000);
  const recentRows = await db
    .select({
      day: sql<string>`to_char(${papers.createdAt} at time zone 'utc', 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(papers)
    .where(sql`${papers.createdAt} >= ${since.toISOString()}`)
    .groupBy(sql`to_char(${papers.createdAt} at time zone 'utc', 'YYYY-MM-DD')`)
    .orderBy(sql`1`);

  // Fill the full 14-day series (including zero days) for a clean chart.
  const dayMap = new Map(recentRows.map((r) => [r.day, r.count]));
  const submissionsLast14Days: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    submissionsLast14Days.push({ date: key.slice(5), count: dayMap.get(key) ?? 0 });
  }

  const [{ v: totalAuthors }] = await db.select({ v: sql<number>`count(*)::int` }).from(authors);
  const [{ v: totalUsers }] = await db.select({ v: sql<number>`count(*)::int` }).from(users);
  const [{ v: totalComments }] = await db.select({ v: sql<number>`count(*)::int` }).from(comments);
  const [{ v: totalSubscriptions }] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(subscriptions);
  const [{ v: totalCitations }] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(citations);
  const [{ v: pendingReviews }] = await db
    .select({ v: sql<number>`count(*)::int` })
    .from(papers)
    .where(sql`${papers.status} = 'submitted'`);

  const topAuthors = await db
    .select({ name: authors.name, count: sql<number>`count(*)::int` })
    .from(paperAuthors)
    .innerJoin(authors, eq(paperAuthors.authorId, authors.id))
    .groupBy(authors.id, authors.name)
    .orderBy(sql`count(*) desc`)
    .limit(8);

  return {
    totalPapers,
    byStatus: byStatus.map((r) => ({ status: r.status, count: r.count })),
    byCategory: byCategory.map((r) => ({ category: r.category, count: r.count })),
    submissionsLast14Days,
    totalAuthors,
    totalUsers,
    totalComments,
    totalSubscriptions,
    totalCitations,
    pendingReviews,
    topAuthors: topAuthors.map((r) => ({ name: r.name, count: r.count })),
  };
}
