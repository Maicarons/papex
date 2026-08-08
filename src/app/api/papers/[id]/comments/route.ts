import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";
import { createComment, listComments } from "@/lib/services/comments";
import { notifyCommunityReply } from "@/lib/services/notifications";
import { getPaperDetail } from "@/lib/services/papers";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { commentSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comments = await listComments(id);
  return NextResponse.json({ comments });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!(await userCan(user, "comment:create"))) {
    return NextResponse.json({ error: "无权限发表评论" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = commentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }
  const comment = await createComment(id, user.id, parsed.data);

  // Notify the parent comment's author of a reply (community notification).
  if (parsed.data.parentId != null) {
    const [parent] = await db
      .select({ userId: comments.userId })
      .from(comments)
      .where(eq(comments.id, parsed.data.parentId));
    if (parent?.userId && parent.userId !== user.id) {
      const detail = await getPaperDetail(id);
      const title = detail?.latest?.title ?? id;
      await notifyCommunityReply({
        userId: parent.userId,
        paperId: id,
        paperTitle: title,
        byName: user.displayName,
      });
    }
  }

  return NextResponse.json({ comment }, { status: 201 });
}
