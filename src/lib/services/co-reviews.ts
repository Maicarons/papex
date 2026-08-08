import { db } from "@/lib/db";
import { coReviews, papers, paperVersions } from "@/lib/db/schema";
import { desc, eq, and, asc } from "drizzle-orm";
import { createMessage } from "@/lib/services/messages";
import { displayName } from "@/lib/services/tickets";
import { getPaperDetail } from "@/lib/services/papers";

export type CoReviewRow = typeof coReviews.$inferSelect;

export interface CoReviewDetail extends CoReviewRow {
  paperTitle: string;
  authorId: string | null;
  reviewerName: string;
  assignedByName: string;
}

async function paperTitleOf(paperId: string): Promise<{ title: string; authorId: string | null }> {
  const detail = await getPaperDetail(paperId);
  return { title: detail?.latest?.title ?? paperId, authorId: detail?.paper.createdById ?? null };
}

export async function assignCoReview(input: {
  paperId: string;
  reviewerId: string;
  assignedById: string;
  note?: string | null;
}): Promise<CoReviewRow> {
  const { title } = await paperTitleOf(input.paperId);
  const assignedByName = await displayName(input.assignedById);

  const [row] = await db
    .insert(coReviews)
    .values({
      paperId: input.paperId,
      reviewerId: input.reviewerId,
      assignedById: input.assignedById,
      note: input.note ?? null,
      status: "pending",
    })
    .returning();

  const msg = await createMessage({
    userId: input.reviewerId,
    senderId: input.assignedById,
    kind: "co_review_request",
    title: `协审请求：《${title}》`,
    body: `${assignedByName} 邀请您对《${title}》进行同行评审。${
      input.note ? `\n备注：${input.note}` : ""
    }`,
    link: `/co-reviews/${row.id}`,
    refId: String(row.id),
  });

  await db.update(coReviews).set({ messageId: msg.id }).where(eq(coReviews.id, row.id));
  return row;
}

export async function respondToCoReview(
  id: number,
  userId: string,
  accepted: boolean,
): Promise<CoReviewRow> {
  const [review] = await db.select().from(coReviews).where(eq(coReviews.id, id));
  if (!review) throw new Error("NOT_FOUND");
  if (review.reviewerId !== userId) throw new Error("FORBIDDEN");
  if (review.status !== "pending") throw new Error("INVALID_STATE");

  await db
    .update(coReviews)
    .set({ status: accepted ? "accepted" : "declined", respondedAt: new Date() })
    .where(eq(coReviews.id, id));

  const { title } = await paperTitleOf(review.paperId);
  const reviewerName = await displayName(userId);
  await createMessage({
    userId: review.assignedById,
    senderId: userId,
    kind: "co_review_result",
    title: `协审回应：《${title}》`,
    body: `${reviewerName} ${accepted ? "已接受" : "已拒绝"}了协审请求。`,
    link: `/admin/co-reviews/${id}`,
    refId: String(id),
  });
  return (await db.select().from(coReviews).where(eq(coReviews.id, id))).at(0)!;
}

export async function submitCoReview(
  id: number,
  userId: string,
  decision: "approve" | "reject" | "revise",
  comment: string,
): Promise<CoReviewRow> {
  const [review] = await db.select().from(coReviews).where(eq(coReviews.id, id));
  if (!review) throw new Error("NOT_FOUND");
  if (review.reviewerId !== userId) throw new Error("FORBIDDEN");
  if (review.status !== "accepted") throw new Error("INVALID_STATE");

  await db
    .update(coReviews)
    .set({ status: "completed", decision, comment, completedAt: new Date() })
    .where(eq(coReviews.id, id));

  const { title, authorId } = await paperTitleOf(review.paperId);
  const reviewerName = await displayName(userId);
  const decisionLabel =
    decision === "approve" ? "建议通过" : decision === "reject" ? "建议拒绝" : "建议修改";

  // Notify the assigner.
  await createMessage({
    userId: review.assignedById,
    senderId: userId,
    kind: "co_review_result",
    title: `协审意见已提交：《${title}》`,
    body: `${reviewerName} 提交了评审意见：${decisionLabel}。`,
    link: `/admin/co-reviews/${id}`,
    refId: String(id),
  });

  // Notify the paper author (if different from assigner).
  if (authorId && authorId !== review.assignedById) {
    await createMessage({
      userId: authorId,
      senderId: userId,
      kind: "co_review_result",
      title: `论文协审完成：《${title}》`,
      body: `您的论文《${title}》已完成同行评审，结论：${decisionLabel}。`,
      link: `/papers/${review.paperId}`,
      refId: review.paperId,
    });
  }
  return (await db.select().from(coReviews).where(eq(coReviews.id, id))).at(0)!;
}

export async function listCoReviews(opts: {
  scope: "mine" | "all";
  userId?: string;
}): Promise<CoReviewRow[]> {
  if (opts.scope === "mine" && opts.userId) {
    return db
      .select()
      .from(coReviews)
      .where(eq(coReviews.reviewerId, opts.userId))
      .orderBy(desc(coReviews.createdAt));
  }
  return db.select().from(coReviews).orderBy(desc(coReviews.createdAt));
}

export async function getCoReviewDetail(id: number): Promise<CoReviewDetail | null> {
  const [review] = await db.select().from(coReviews).where(eq(coReviews.id, id));
  if (!review) return null;
  const { title, authorId } = await paperTitleOf(review.paperId);
  const [reviewerName, assignedByName] = await Promise.all([
    displayName(review.reviewerId),
    displayName(review.assignedById),
  ]);
  return { ...review, paperTitle: title, authorId, reviewerName, assignedByName };
}

/** Papers that are eligible for co-review assignment (submitted + approved). */
export async function listAssignablePapers(limit = 50) {
  const rows = await db
    .select({ paper: papers, version: paperVersions })
    .from(papers)
    .innerJoin(
      paperVersions,
      and(eq(paperVersions.paperId, papers.id), eq(paperVersions.version, papers.latestVersion)),
    )
    .where(eq(papers.status, "submitted"))
    .orderBy(desc(papers.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    paperId: r.paper.id,
    title: r.version.title,
    status: r.paper.status,
  }));
}
