import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookmarks, subscriptions, papers } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { listPapers, type PaperListItem } from "@/lib/services/papers";
import { isEmbeddingEnabled } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

const MAX_CATEGORIES = 5;
const PER_CATEGORY = 5;
const SOURCE_PAPERS = 3; // bookmarks whose embeddings seed the semantic pool
const PER_SOURCE = 6;
const LIMIT = 20;

/**
 * Personalized recommendations. Two-tier pool, both computed server-side:
 *
 * 1. Semantic (P0-D, when an embedding backend is configured): the nearest
 *    neighbours of the user's saved papers, reusing the P0-A pgvector layer.
 * 2. Heuristic (always): the most-cited approved papers per interest category
 *    (primary categories of bookmarked papers + category subscriptions).
 *
 * The semantic tier is listed first; the heuristic tier fills the remainder
 * and doubles as the cold-start / no-embedding fallback.
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
  const bookmarkIds = new Set(bookmarked.map((b) => b.paperId));
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

  const seen = new Set<string>();
  const rows: PaperListItem[] = [];
  const semanticUsed = isEmbeddingEnabled() && bookmarked.length > 0;

  // 1) Semantic: vector neighbours of the user's saved papers.
  if (semanticUsed) {
    for (const b of bookmarked.slice(0, SOURCE_PAPERS)) {
      try {
        const res = await listPapers({ similarToPaperId: b.paperId, pageSize: PER_SOURCE });
        for (const r of res.rows) {
          if (seen.has(r.paper.id) || bookmarkIds.has(r.paper.id)) continue;
          seen.add(r.paper.id);
          rows.push(r);
        }
      } catch {
        // A source paper without an embedding simply contributes nothing;
        // the heuristic tier below still fills the pool.
      }
    }
  }

  // 2) Heuristic: most-cited approved papers per interest category.
  const categories = [...catSet].slice(0, MAX_CATEGORIES);
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

  return NextResponse.json({ rows: rows.slice(0, LIMIT), total: rows.length, semanticUsed });
}
