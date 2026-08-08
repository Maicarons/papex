import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { moderate } from "@/lib/services/papers";
import { moderateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (user.role !== "moderator" && user.role !== "admin") {
    return NextResponse.json({ error: "无审核权限" }, { status: 403 });
  }
  const json = await req.json().catch(() => null);
  const parsed = moderateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  try {
    const detail = await moderate(id, parsed.data.action, { id: user.id, role: user.role }, parsed.data.reason);
    revalidatePath(`/papers/${id}`);
    revalidatePath("/");
    return NextResponse.json(detail);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "无权限" }, { status: 403 });
    return NextResponse.json({ error: "审核失败" }, { status: 500 });
  }
}
