import { db } from "@/lib/db";
import { announcements, paperVersions, papers, savedSearches } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { compileSearch } from "@/lib/search";
import { sendPushToUser } from "@/lib/push/send";
import { logger } from "@/lib/log";

export type SavedSearchRow = typeof savedSearches.$inferSelect;

/** List the user's saved searches (oldest first). */
export async function listSavedSearches(userId: string): Promise<SavedSearchRow[]> {
  return db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(asc(savedSearches.createdAt));
}

/** Create (upsert by user+query) a saved search. */
export async function createSavedSearch(
  userId: string,
  input: { name?: string; q: string; category?: string | null; semantic?: boolean },
): Promise<SavedSearchRow> {
  const name = (input.name ?? "").trim() || `检索：${input.q.trim()}`;
  const [row] = await db
    .insert(savedSearches)
    .values({
      userId,
      name: name.slice(0, 120),
      q: input.q.trim(),
      category: input.category ?? null,
      semantic: input.semantic ?? false,
    })
    .onConflictDoUpdate({
      target: [savedSearches.userId, savedSearches.q],
      set: { name: name.slice(0, 120), category: input.category ?? null, semantic: input.semantic ?? false },
    })
    .returning();
  return row;
}

/** Remove a saved search (owner only). Returns whether a row was deleted. */
export async function deleteSavedSearch(userId: string, id: string): Promise<boolean> {
  const [row] = await db
    .delete(savedSearches)
    .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)))
    .returning({ id: savedSearches.id });
  return !!row;
}

/**
 * B1: match a newly approved paper against every saved search and alert the
 * owners whose query hits. Matching reuses `compileSearch` so field prefixes /
 * boolean syntax behave exactly like the search page (semantic is stored for
 * parity but matches via keyword for now).
 *
 * Fire-and-forget fan-out: inserts a `search_match` announcement per hit and
 * pushes it (respecting per-kind push prefs). Never blocks the approval write.
 */
export async function notifySavedSearches(paperId: string): Promise<void> {
  const [paper] = await db
    .select({ primaryCategoryId: papers.primaryCategoryId, latestVersion: papers.latestVersion })
    .from(papers)
    .where(eq(papers.id, paperId))
    .limit(1);
  if (!paper) return;
  const [version] = await db
    .select({ title: paperVersions.title })
    .from(paperVersions)
    .where(
      and(eq(paperVersions.paperId, paperId), eq(paperVersions.version, paper.latestVersion)),
    )
    .limit(1);
  if (!version) return;

  const searches = await db.select().from(savedSearches);
  const hits: { userId: string; name: string }[] = [];
  for (const s of searches) {
    const cond = compileSearch(s.q);
    if (!cond) continue;
    const matched = await db
      .select({ id: paperVersions.id })
      .from(paperVersions)
      .innerJoin(papers, eq(paperVersions.paperId, papers.id))
      .where(
        and(
          eq(paperVersions.paperId, paperId),
          cond,
          s.category ? eq(papers.primaryCategoryId, s.category) : undefined,
        ),
      )
      .limit(1);
    if (matched.length > 0) hits.push({ userId: s.userId, name: s.name });
  }

  if (hits.length === 0) return;

  logger.info("saved-search", "matched new paper", { paperId, hits: hits.length });

  const body = `检索提醒命中：${version.title}`;
  await Promise.allSettled(
    hits.map(async (hit) => {
      await db.insert(announcements).values({
        userId: hit.userId,
        kind: "search_match",
        refId: paperId,
        title: `检索提醒：${hit.name} 有新论文`,
        body,
      });
      await sendPushToUser(
        hit.userId,
        { title: `检索提醒：${hit.name}`, body, url: `/papers/${paperId}` },
        "search_match",
      ).catch(() => {});
    }),
  );
}