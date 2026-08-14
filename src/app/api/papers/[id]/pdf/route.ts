import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { papers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { attachPdf } from "@/lib/services/papers";

export const dynamic = "force-dynamic";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

/** Upload a PDF for the paper's latest version (owner or moderator/admin). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const [paper] = await db.select().from(papers).where(eq(papers.id, id));
  if (!paper) return NextResponse.json({ error: "论文不存在" }, { status: 404 });
  const isOwner = paper.createdById === user.id;
  if (!isOwner && user.role !== "moderator" && user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("pdf");
  if (!file || typeof file === "string" || !(file as File).arrayBuffer) {
    return NextResponse.json({ error: "缺少 pdf 文件" }, { status: 400 });
  }
  const buf = Buffer.from(await (file as File).arrayBuffer());
  if (buf.length === 0) return NextResponse.json({ error: "空文件" }, { status: 400 });
  if (buf.length > MAX_SIZE)
    return NextResponse.json({ error: "文件过大（>50MB）" }, { status: 413 });

  try {
    const pdf = await attachPdf(id, paper.latestVersion, buf, user.id);
    return NextResponse.json({ ok: true, ...pdf });
  } catch (e) {
    return NextResponse.json({ error: `PDF 处理失败：${(e as Error).message}` }, { status: 500 });
  }
}
