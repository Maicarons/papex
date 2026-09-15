import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { papers, paperLinks } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** DELETE /api/papers/{id}/links/{linkId} — remove a link (owner or staff). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id, linkId } = await params;

  let allowed = user.role === "moderator" || user.role === "admin";
  if (!allowed) {
    const [paper] = await db
      .select({ createdById: papers.createdById })
      .from(papers)
      .where(eq(papers.id, id))
      .limit(1);
    allowed = paper?.createdById === user.id;
  }
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [row] = await db
    .delete(paperLinks)
    .where(and(eq(paperLinks.id, linkId), eq(paperLinks.paperId, id)))
    .returning({ id: paperLinks.id });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
