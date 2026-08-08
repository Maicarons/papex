import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { papers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { addCitation, listCitations } from "@/lib/services/citations";
import { citationSchemaRefined } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const graph = await listCitations(id);
  return NextResponse.json(graph);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const [paper] = await db.select().from(papers).where(eq(papers.id, id));
  const isOwner = paper && paper.createdById === user.id;
  if (!isOwner && user.role !== "moderator" && user.role !== "admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = citationSchemaRefined.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }
  try {
    const created = await addCitation({
      paperId: id,
      targetArxivId: parsed.data.targetArxivId || undefined,
      targetDoi: parsed.data.targetDoi || undefined,
      targetTitle: parsed.data.targetTitle || undefined,
      targetUrl: parsed.data.targetUrl || undefined,
      createdById: user.id,
    });
    revalidatePath(`/papers/${id}`);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "添加引用失败" }, { status: 500 });
  }
}
