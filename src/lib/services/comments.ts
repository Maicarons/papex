import { db } from "@/lib/db";
import { comments, users } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import type { CommentInput } from "@/lib/validations";

export interface CommentNode {
  id: number;
  body: string;
  createdAt: string;
  authorName: string;
  authorUsername: string | null;
  parentId: number | null;
  children: CommentNode[];
}

export async function listComments(paperId: string): Promise<CommentNode[]> {
  const rows = await db
    .select({
      comment: comments,
      authorName: users.displayName,
      authorUsername: users.username,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.paperId, paperId))
    .orderBy(asc(comments.createdAt));

  const nodes = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];
  for (const r of rows) {
    nodes.set(r.comment.id, {
      id: r.comment.id,
      body: r.comment.body,
      createdAt: r.comment.createdAt.toISOString(),
      authorName: r.authorName ?? "匿名",
      authorUsername: r.authorUsername ?? null,
      parentId: r.comment.parentId ?? null,
      children: [],
    });
  }
  for (const r of rows) {
    const node = nodes.get(r.comment.id)!;
    if (r.comment.parentId != null && nodes.has(r.comment.parentId)) {
      nodes.get(r.comment.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function createComment(paperId: string, userId: string, input: CommentInput) {
  const [comment] = await db
    .insert(comments)
    .values({
      paperId,
      userId,
      body: input.body,
      parentId: input.parentId ?? null,
    })
    .returning();
  return comment;
}
