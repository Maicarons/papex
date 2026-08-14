import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";
import { attachPdf, createSubmission, listPapers, type AttachedPdf } from "@/lib/services/papers";
import { createPaperSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

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

  // Accept either JSON or multipart/form-data. The web form submits metadata as
  // a `meta` JSON string plus an optional `pdf` file upload; API clients may
  // still POST plain JSON.
  const contentType = req.headers.get("content-type") ?? "";
  let input: unknown;
  let pdfFile: File | null = null;
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "请求格式应为 multipart/form-data" }, { status: 400 });
    }
    const meta = form.get("meta");
    input = typeof meta === "string" ? JSON.parse(meta) : null;
    const file = form.get("pdf");
    if (file && typeof file !== "string" && (file as File).arrayBuffer) {
      pdfFile = file as File;
    }
  } else {
    input = await req.json().catch(() => null);
  }

  const parsed = createPaperSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }

  try {
    const created = await createSubmission(parsed.data, { id: user.id, role: user.role });
    const result: { paperId: string; version: number; pdf?: AttachedPdf } = { ...created };

    // Persist an uploaded PDF (if any) and auto-link its references.
    if (pdfFile) {
      const buf = Buffer.from(await pdfFile.arrayBuffer());
      if (buf.length === 0) return NextResponse.json({ error: "空文件" }, { status: 400 });
      if (buf.length > MAX_SIZE)
        return NextResponse.json({ error: "文件过大（>50MB）" }, { status: 413 });
      // Magic bytes: %PDF
      if (!(buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)) {
        return NextResponse.json({ error: "不是有效的 PDF 文件" }, { status: 400 });
      }
      result.pdf = await attachPdf(result.paperId, result.version, buf, user.id);
    }

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
