import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coReviews } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const visibilitySchema = z.object({ public: z.boolean() });

/**
 * PATCH /api/co-reviews/{id}/visibility
 * Toggle whether a review is published on the paper page (P1-E).
 * Allowed for the assigner or anyone who can manage co-reviews.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const json = await req.json().catch(() => null);
  const parsed = visibilitySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const [review] = await db.select().from(coReviews).where(eq(coReviews.id, reviewId)).limit(1);
  if (!review) return NextResponse.json({ error: "not found" }, { status: 404 });

  const canManage = await userCan(user, "co_review:manage");
  if (review.assignedById !== user.id && !canManage) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db
    .update(coReviews)
    .set({ isPublic: parsed.data.public })
    .where(eq(coReviews.id, reviewId));
  return NextResponse.json({ ok: true, public: parsed.data.public });
}
