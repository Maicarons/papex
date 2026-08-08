import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";
import { getCoReviewDetail } from "@/lib/services/co-reviews";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const detail = await getCoReviewDetail(reviewId);
  if (!detail) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Reviewer themselves, or anyone who can manage co-reviews (admin/moderator).
  const canManage = await userCan(user, "co_review:manage");
  if (detail.reviewerId !== user.id && !canManage) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ review: detail });
}
