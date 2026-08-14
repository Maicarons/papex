import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { papers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { attachTag, detachTag, ensureTag } from "@/lib/services/tags";

export const dynamic = "force-dynamic";

async function canManage(paperId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, paper: null };
  const [paper] = await db.select().from(papers).where(eq(papers.id, paperId));
  const allowed = paper && (paper.createdById === user.id || user.role === "moderator" || user.role === "admin");
  return { user, paper, allowed };
}

/** POST /api/papers/{id}/tags — attach a tag (by tagId or by name, auto-created). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, allowed } = await canManage(id);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const tagId = typeof json?.tagId === "number" ? json.tagId : null;
  const name = typeof json?.name === "string" ? json.name.trim() : "";

  let resolvedId: number | null = tagId;
  if (!resolvedId && name) {
    if (name.length > 40) return NextResponse.json({ error: "标签名称过长" }, { status: 400 });
    const tag = await ensureTag(name, user.id);
    resolvedId = tag;
  }
  if (!resolvedId) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const tag = await attachTag(id, resolvedId);
  revalidatePath(`/papers/${id}`);
  return NextResponse.json({ tag }, { status: 201 });
}

/** DELETE /api/papers/{id}/tags?tagId=N — detach a tag. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, allowed } = await canManage(id);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const tagId = Number(new URL(req.url).searchParams.get("tagId"));
  if (!Number.isInteger(tagId)) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  await detachTag(id, tagId);
  revalidatePath(`/papers/${id}`);
  return NextResponse.json({ ok: true });
}
