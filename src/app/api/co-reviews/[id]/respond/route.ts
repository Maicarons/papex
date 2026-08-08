import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";
import { respondToCoReview } from "@/lib/services/co-reviews";
import { coReviewRespondSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await userCan(user, "co_review:respond"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = coReviewRespondSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  try {
    const review = await respondToCoReview(reviewId, user.id, parsed.data.accepted);
    return NextResponse.json({ review });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    const status = msg === "FORBIDDEN" ? 403 : msg === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
