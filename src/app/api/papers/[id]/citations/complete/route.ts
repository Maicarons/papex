import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { completeCitations } from "@/lib/services/import";
import { db } from "@/lib/db";
import { papers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/papers/{id}/citations/complete
 *
 * Backfill a paper's outgoing citation graph from external sources (Semantic
 * Scholar / OpenCitations) using its stored DOI / arXiv id. Accessible to
 * staff (moderator/admin) or the paper's owner.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const [paper] = await db
    .select({ createdById: papers.createdById })
    .from(papers)
    .where(eq(papers.id, id))
    .limit(1);
  if (!paper) return NextResponse.json({ error: "论文不存在" }, { status: 404 });

  const isStaff = user.role === "moderator" || user.role === "admin";
  if (!isStaff && paper.createdById !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const result = await completeCitations(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: "引用补全失败：" + (e as Error).message },
      { status: 502 },
    );
  }
}
