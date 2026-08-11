import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";
import { assignCoReview, listCoReviews } from "@/lib/services/co-reviews";
import { assignCoReviewSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  if (scope === "all") {
    if (!(await userCan(user, "co_review:manage"))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const reviews = await listCoReviews({ scope: "all" });
    return NextResponse.json({ reviews });
  }
  const reviews = await listCoReviews({ scope: "mine", userId: user.id });
  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await userCan(user, "co_review:assign"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = assignCoReviewSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }
  try {
    const review = await assignCoReview({
      paperId: parsed.data.paperId,
      reviewerId: parsed.data.reviewerId,
      assignedById: user.id,
      note: parsed.data.note ?? null,
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "assign failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
