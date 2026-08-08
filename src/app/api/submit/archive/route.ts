import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { processSubmissionArchive } from "@/lib/latex/papex-archive";

export const dynamic = "force-dynamic";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * POST /api/submit/archive
 *
 * 接收 multipart/form-data，字段 `file` 为论文源码包（tar.gz）。
 * 端到端流程与字段契约见 docs/guide/submission.md。
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "请求格式应为 multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof (file as { arrayBuffer?: unknown }).arrayBuffer !== "function") {
    return NextResponse.json({ error: "缺少 file 字段（tar.gz）" }, { status: 400 });
  }

  const buf = Buffer.from(await (file as Blob).arrayBuffer());
  if (buf.length === 0) return NextResponse.json({ error: "空文件" }, { status: 400 });
  if (buf.length > MAX_SIZE)
    return NextResponse.json({ error: "文件过大（>50MB）" }, { status: 413 });

  try {
    const result = await processSubmissionArchive(buf, { id: user.id, role: user.role });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "MANIFEST_MISSING")
      return NextResponse.json({ error: "压缩包内缺少 papex.json" }, { status: 400 });
    if (msg.startsWith("MANIFEST_INVALID"))
      return NextResponse.json({ error: msg.replace("MANIFEST_INVALID:", "") }, { status: 400 });
    if (msg === "MANIFEST_JSON_INVALID")
      return NextResponse.json({ error: "papex.json 不是合法 JSON" }, { status: 400 });
    if (msg.startsWith("CATEGORY_NOT_FOUND"))
      return NextResponse.json(
        { error: `分类不存在: ${msg.split(":")[1] ?? ""}` },
        { status: 400 },
      );
    if (msg.startsWith("ARCHIVE_PARSE_FAILED") || msg === "ARCHIVE_EMPTY")
      return NextResponse.json({ error: "压缩包解析失败" }, { status: 400 });
    if (msg === "PAPER_NOT_FOUND")
      return NextResponse.json({ error: "目标论文不存在" }, { status: 404 });
    if (msg === "FORBIDDEN")
      return NextResponse.json({ error: "无权向该论文提交新版本" }, { status: 403 });
    if (msg === "ID_GENERATION_FAILED")
      return NextResponse.json({ error: "编号生成失败，请重试" }, { status: 500 });
    return NextResponse.json({ error: `提交失败: ${msg}` }, { status: 500 });
  }
}
