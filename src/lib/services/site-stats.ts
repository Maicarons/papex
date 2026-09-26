import { desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { authors, comments, papers, siteDailyStats, users } from "@/lib/db/schema";

export interface SiteDailyStat {
  day: string;
  papersTotal: number;
  papersApproved: number;
  papersSubmitted: number;
  usersTotal: number;
  authorsTotal: number;
  commentsTotal: number;
  recordedAt: string;
}

export interface SiteStatsSnapshot {
  /** Live counts at write time (also returned to the cron caller). */
  papersTotal: number;
  papersApproved: number;
  papersSubmitted: number;
  usersTotal: number;
  authorsTotal: number;
  commentsTotal: number;
  day: string;
}

/** UTC date YYYY-MM-DD */
export function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function countRows(table: typeof papers | typeof users | typeof authors | typeof comments): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
  return row?.n ?? 0;
}

/**
 * Collect live counts and upsert today's snapshot. Idempotent per UTC day —
 * safe to run from the daily cron and from a manual trigger.
 */
export async function recordSiteDailyStats(): Promise<SiteStatsSnapshot> {
  const day = utcDay();

  const [papersTotal, usersTotal, authorsTotal, commentsTotal, approved, submitted] =
    await Promise.all([
      countRows(papers),
      countRows(users),
      countRows(authors),
      countRows(comments),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(papers)
        .where(eq(papers.status, "approved"))
        .then((r) => r[0]?.n ?? 0),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(papers)
        .where(eq(papers.status, "submitted"))
        .then((r) => r[0]?.n ?? 0),
    ]);

  const snapshot: SiteStatsSnapshot = {
    day,
    papersTotal,
    papersApproved: approved,
    papersSubmitted: submitted,
    usersTotal,
    authorsTotal,
    commentsTotal,
  };

  await db
    .insert(siteDailyStats)
    .values({
      day,
      papersTotal,
      papersApproved: approved,
      papersSubmitted: submitted,
      usersTotal,
      authorsTotal,
      commentsTotal,
      recordedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteDailyStats.day,
      set: {
        papersTotal,
        papersApproved: approved,
        papersSubmitted: submitted,
        usersTotal,
        authorsTotal,
        commentsTotal,
        recordedAt: new Date(),
      },
    });

  return snapshot;
}

export async function getLatestSiteStats(): Promise<SiteDailyStat | null> {
  const [row] = await db
    .select()
    .from(siteDailyStats)
    .orderBy(desc(siteDailyStats.day))
    .limit(1);
  return row ? mapRow(row) : null;
}

/** Last N daily snapshots, ascending by day (for the /stats chart). */
export async function getSiteStatsHistory(days = 30): Promise<SiteDailyStat[]> {
  const windowDays = Math.min(Math.max(days, 1), 90);
  const since = utcDay(new Date(Date.now() - (windowDays - 1) * 86_400_000));
  const rows = await db
    .select()
    .from(siteDailyStats)
    .where(gte(siteDailyStats.day, since))
    .orderBy(siteDailyStats.day);
  return rows.map(mapRow);
}

function mapRow(row: typeof siteDailyStats.$inferSelect): SiteDailyStat {
  return {
    day: row.day,
    papersTotal: row.papersTotal,
    papersApproved: row.papersApproved,
    papersSubmitted: row.papersSubmitted,
    usersTotal: row.usersTotal,
    authorsTotal: row.authorsTotal,
    commentsTotal: row.commentsTotal,
    recordedAt: row.recordedAt.toISOString(),
  };
}
