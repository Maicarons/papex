import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";
import { createEndorsement, listEndorsements } from "@/lib/services/endorsements";
import { endorseSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const endorseeId = url.searchParams.get("endorseeId") ?? undefined;
  const endorserId = url.searchParams.get("endorserId") ?? undefined;
  const categoryId = url.searchParams.get("categoryId") ?? undefined;
  const items = await listEndorsements({ endorseeId, endorserId, categoryId });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!(await userCan(user, "endorse:create"))) {
    return NextResponse.json({ error: "无权限给予背书" }, { status: 403 });
  }
  const json = await request.json().catch(() => null);
  const parsed = endorseSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }
  try {
    const endorsement = await createEndorsement({
      endorserId: user.id,
      endorseeId: parsed.data.endorseeId,
      categoryId: parsed.data.categoryId,
    });
    return NextResponse.json({ endorsement }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "endorse failed";
    if (msg === "SELF_ENDORSE") return NextResponse.json({ error: "不能给自己背书" }, { status: 400 });
    if (msg === "ALREADY_ENDORSED")
      return NextResponse.json({ error: "你已为该分类背书过" }, { status: 400 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
