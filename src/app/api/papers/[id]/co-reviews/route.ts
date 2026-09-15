import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coReviews } from "@/lib/db/schema";
import { displayName } from "@/lib/services/tickets";

export const dynamic = "force-dynamic";

/**
 * GET /api/papers/{id}/co-reviews
 * Public list of published co-reviews for a paper (P1-E, OpenReview-style).
 * Only completed reviews that the assigner explicitly made public.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rows = await db
    .select({
      id: coReviews.id,
      decision: coReviews.decision,
      comment: coReviews.comment,
      reviewerId: coReviews.reviewerId,
      completedAt: coReviews.completedAt,
    })
    .from(coReviews)
    .where(and(eq(coReviews.paperId, id), eq(coReviews.isPublic, true), eq(coReviews.status, "completed")))
    .orderBy(coReviews.completedAt);

  const reviews = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      decision: r.decision,
      comment: r.comment,
      reviewerName: r.reviewerId ? await displayName(r.reviewerId) : null,
      completedAt: r.completedAt,
    })),
  );
  return NextResponse.json({ reviews });
}
