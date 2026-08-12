import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";
import { createSubmission, listPapers } from "@/lib/services/papers";
import { createPaperSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = await getCurrentUser();
  const requested = searchParams.get("status") ?? "approved";
  const status =
    requested !== "approved" && user && (user.role === "moderator" || user.role === "admin")
      ? requested
      : "approved";

  const authorIdRaw = searchParams.get("authorId");
  const rows = await listPapers({
    status,
    category: searchParams.get("category") ?? undefined,
    authorId: authorIdRaw ? Number(authorIdRaw) : undefined,
    q: searchParams.get("q") ?? undefined,
    sort: (searchParams.get("sort") as "new" | "updated") ?? "new",
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Math.min(Number(searchParams.get("pageSize") ?? 20), 50),
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!(await userCan(user, "paper:publish"))) {
    return NextResponse.json({ error: "无权限发布论文" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createPaperSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }
  try {
    const result = await createSubmission(parsed.data, { id: user.id, role: user.role });
    revalidatePath("/");
    revalidatePath("/papers");
    revalidatePath(`/papers/${result.paperId}`);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "无权限" }, { status: 403 });
    if (msg === "PAPER_NOT_FOUND") return NextResponse.json({ error: "论文不存在" }, { status: 404 });
    if (msg === "ID_GENERATION_FAILED")
      return NextResponse.json({ error: "编号生成失败，请重试" }, { status: 500 });
    if (msg === "ENDORSEMENT_REQUIRED")
      return NextResponse.json(
        { error: "首次在该分类投稿需先获得该分类的背书" },
        { status: 403 },
      );
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
