import { db } from "@/lib/db";
import { subscriptions, categories, authors, papers } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { SubscriptionInput } from "@/lib/validations";

export type SubscriptionType = "category" | "author" | "paper";

export interface EnrichedSubscription {
  id: number;
  type: SubscriptionType;
  refId: string;
  title: string;
  href: string;
  createdAt: string;
}

export async function listSubscriptions(userId: string) {
  return db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
}

/**
 * List a user's subscriptions enriched with a human-readable title and a link
 * to the subscribed resource. Resolves refIds in bulk (one query per type) so
 * the page can render category/author/paper names instead of raw ids/slugs.
 */
export async function listSubscriptionsEnriched(
  userId: string,
): Promise<EnrichedSubscription[]> {
  const rows = await listSubscriptions(userId);
  if (rows.length === 0) return [];

  const catIds: string[] = [];
  const authorIds: number[] = [];
  const paperIds: string[] = [];
  for (const r of rows) {
    if (r.type === "category") catIds.push(r.refId);
    else if (r.type === "author") {
      const n = Number(r.refId);
      if (!Number.isNaN(n)) authorIds.push(n);
    } else if (r.type === "paper") paperIds.push(r.refId);
  }

  const [catRows, authorRows, paperRows] = await Promise.all([
    catIds.length
      ? db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(inArray(categories.id, catIds))
      : Promise.resolve([]),
    authorIds.length
      ? db
          .select({ id: authors.id, name: authors.name })
          .from(authors)
          .where(inArray(authors.id, authorIds))
      : Promise.resolve([]),
    paperIds.length
      ? db
          .select({ id: papers.id, title: papers.title })
          .from(papers)
          .where(inArray(papers.id, paperIds))
      : Promise.resolve([]),
  ]);

  const catMap = new Map(catRows.map((c) => [c.id, c.name]));
  const authorMap = new Map(authorRows.map((a) => [String(a.id), a.name]));
  const paperMap = new Map(paperRows.map((p) => [p.id, p.title]));

  return rows.map((r) => {
    let title = r.refId;
    let href = "#";
    if (r.type === "category") {
      title = catMap.get(r.refId) ?? r.refId;
      href = `/categories/${encodeURIComponent(r.refId)}`;
    } else if (r.type === "author") {
      title = authorMap.get(r.refId) ?? r.refId;
      href = `/authors/${encodeURIComponent(r.refId)}`;
    } else if (r.type === "paper") {
      title = paperMap.get(r.refId) ?? r.refId;
      href = `/papers/${encodeURIComponent(r.refId)}`;
    }
    return {
      id: r.id,
      type: r.type as SubscriptionType,
      refId: r.refId,
      title,
      href,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    };
  });
}

export async function isSubscribed(userId: string, input: SubscriptionInput) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.type, input.type),
        eq(subscriptions.refId, input.refId),
      ),
    );
  return !!row;
}

/** Create if absent, delete if present. Returns the new state. */
export async function toggleSubscription(userId: string, input: SubscriptionInput) {
  const existing = await isSubscribed(userId, input);
  if (existing) {
    await db
      .delete(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.type, input.type),
          eq(subscriptions.refId, input.refId),
        ),
      );
    return false;
  }
  await db.insert(subscriptions).values({
    userId,
    type: input.type,
    refId: input.refId,
  });
  return true;
}
