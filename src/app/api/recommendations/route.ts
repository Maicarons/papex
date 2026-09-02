import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookmarks, subscriptions, papers } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { listPapers, type PaperListItem } from "@/lib/services/papers";

export const dynamic = "force-dynamic";

const MAX_CATEGORIES = 5;
const PER_CATEGORY = 5;
const LIMIT = 20;

/**
 * Personalized recommendations (P2 #24). Collects the user's interest
 * categories (primary categories of bookmarked papers + category
 * subscriptions), then pulls the most-cited approved papers per category,
 * de-duplicated and capped. Backend computes — the app only renders.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const catSet = new Set<string>();
  const bookmarked = await db
    .select({ paperId: bookmarks.paperId })
    .from(bookmarks)
    .where(eq(bookmarks.userId, user.id))
    .limit(50);
  if (bookmarked.length > 0) {
    const cats = await db
      .selectDistinct({ c: papers.primaryCategoryId })
      .from(papers)
      .where(inArray(papers.id, bookmarked.map((b) => b.paperId)));
    cats.forEach((r) => catSet.add(r.c));
  }
  const subs = await db
    .select({ refId: subscriptions.refId })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.type, "category")))
    .limit(50);
  subs.forEach((s) => {
    if (s.refId) catSet.add(s.refId);
  });

  const bookmarkIds = new Set(bookmarked.map((b) => b.paperId));
  const categories = [...catSet].slice(0, MAX_CATEGORIES);
  if (categories.length === 0) return NextResponse.json({ rows: [], total: 0 });

  const seen = new Set<string>();
  const rows: PaperListItem[] = [];
  for (const category of categories) {
    try {
      const res = await listPapers({ category, sort: "by_citations", pageSize: PER_CATEGORY });
      for (const r of res.rows) {
        if (seen.has(r.paper.id) || bookmarkIds.has(r.paper.id)) continue;
        seen.add(r.paper.id);
        rows.push(r);
      }
    } catch {
      /* skip a failing category */
    }
  }
  rows.sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0));
  return NextResponse.json({ rows: rows.slice(0, LIMIT), total: rows.length });
}
