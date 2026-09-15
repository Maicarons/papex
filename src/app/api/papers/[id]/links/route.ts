import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { papers, paperLinks } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeLink } from "@/lib/paper-links";

export const dynamic = "force-dynamic";

const linkSchema = z.object({
  kind: z.enum(["repository", "dataset", "website"]).default("website"),
  url: z.string().min(1).max(1000),
  title: z.string().max(200).optional(),
});

function toView(row: typeof paperLinks.$inferSelect) {
  return {
    id: row.id,
    kind: row.kind,
    url: row.url,
    title: row.title,
    addedById: row.addedById,
    createdAt: row.createdAt,
  };
}

/** Whether the user may manage links on this paper (owner or staff). */
async function canManage(paperId: string, userId: string, role: string): Promise<boolean> {
  if (role === "moderator" || role === "admin") return true;
  const [paper] = await db.select({ createdById: papers.createdById }).from(papers).where(eq(papers.id, paperId)).limit(1);
  return paper?.createdById === userId;
}

/** GET /api/papers/{id}/links — public list. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(paperLinks)
    .where(eq(paperLinks.paperId, id))
    .orderBy(paperLinks.createdAt);
  return NextResponse.json({ links: rows.map(toView) });
}

/** POST /api/papers/{id}/links — add a code / dataset / website link (owner or staff). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id } = await params;
  if (!(await canManage(id, user.id, user.role))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = linkSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const link = normalizeLink(parsed.data);
  if (!link) return NextResponse.json({ error: "链接格式不正确" }, { status: 400 });

  const [row] = await db
    .insert(paperLinks)
    .values({
      paperId: id,
      kind: link.kind,
      url: link.url,
      title: link.title,
      addedById: user.id,
    })
    .returning();
  return NextResponse.json({ link: toView(row) }, { status: 201 });
}
