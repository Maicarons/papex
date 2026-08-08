import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { papers, paperVersions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parsePdf, extractReferences } from "@/lib/pdf";
import { savePdfBuffer } from "@/lib/storage";
import { addCitation } from "@/lib/services/citations";

export const dynamic = "force-dynamic";

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

  try {
    const { storedPath, pdfUrl } = await savePdfBuffer(id, paper.latestVersion, buf);
    await db
      .update(paperVersions)
      .set({ pdfUrl })
      .where(eq(paperVersions.paperId, id) && eq(paperVersions.version, paper.latestVersion));

    // Extract references from the PDF and auto-link any that resolve locally.
    const parsed = await parsePdf(buf);
    const refs = extractReferences(parsed.text);
    let linked = 0;
    for (const r of refs) {
      const added = await addCitation({
        paperId: id,
        targetArxivId: r.targetArxivId,
        targetDoi: r.targetDoi,
        targetTitle: r.targetTitle,
        createdById: user.id,
      });
      if (added.targetPaperId) linked++;
    }

    return NextResponse.json({
      ok: true,
      storedPath,
      pdfUrl,
      pages: parsed.numPages,
      referencesExtracted: refs.length,
      referencesLinked: linked,
    });
  } catch (e) {
    return NextResponse.json({ error: `PDF 处理失败：${(e as Error).message}` }, { status: 500 });
  }
}
