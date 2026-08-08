import { createMessage } from "@/lib/services/messages";

// ---------------------------------------------------------------------------
// Unified notification helpers.
//
// Every cross-module alert (review results, ticket receipts, co-review
// requests / receipts, community replies, admin DMs) funnels through these so
// the message category, wording, and destination link stay consistent. All of
// them ultimately call createMessage(), so the inbox bell + /messages page
// surface them uniformly.
// ---------------------------------------------------------------------------

export async function notifyReviewResult(input: {
  userId: string;
  paperId: string;
  paperTitle: string;
  action: "approve" | "reject" | "withdraw";
  reason?: string | null;
}): Promise<void> {
  const label =
    input.action === "approve" ? "已通过" : input.action === "reject" ? "未通过" : "已撤稿";
  const body = `您提交的论文《${input.paperTitle}》审核${label}。${
    input.reason ? `审核意见：${input.reason}` : ""
  }`;
  await createMessage({
    userId: input.userId,
    kind: "review_result",
    title: `论文审核结果：${input.paperTitle}`,
    body,
    link: `/papers/${input.paperId}`,
    refId: input.paperId,
  });
}

export async function notifyTicketReply(input: {
  userId: string;
  ticketId: number;
  ticketCode: string;
  byName: string;
}): Promise<void> {
  await createMessage({
    userId: input.userId,
    kind: "ticket_reply",
    title: `工单更新 ${input.ticketCode}`,
    body: `${input.byName} 回复了您的工单，请查看处理进展。`,
    link: `/tickets/${input.ticketId}`,
    refId: String(input.ticketId),
  });
}

export async function notifyCommunityReply(input: {
  userId: string;
  paperId: string;
  paperTitle: string;
  byName: string;
}): Promise<void> {
  await createMessage({
    userId: input.userId,
    kind: "community_reply",
    title: `社区回复提醒`,
    body: `${input.byName} 回复了您在《${input.paperTitle}》下的评论。`,
    link: `/papers/${input.paperId}`,
    refId: input.paperId,
  });
}

export async function notifyCoReviewRequest(input: {
  userId: string;
  reviewId: number;
  paperId: string;
  paperTitle: string;
  byName: string;
  note?: string | null;
}): Promise<void> {
  await createMessage({
    userId: input.userId,
    kind: "co_review_request",
    title: `协审请求：《${input.paperTitle}》`,
    body: `${input.byName} 邀请您对《${input.paperTitle}》进行同行评审。${
      input.note ? `\n备注：${input.note}` : ""
    }`,
    link: `/co-reviews/${input.reviewId}`,
    refId: String(input.reviewId),
  });
}

export async function notifyCoReviewReceipt(input: {
  userId: string;
  reviewId: number;
  paperTitle: string;
  reviewerName: string;
  accepted: boolean;
}): Promise<void> {
  await createMessage({
    userId: input.userId,
    kind: "co_review_result",
    title: `协审回应：《${input.paperTitle}》`,
    body: `${input.reviewerName} ${input.accepted ? "已接受" : "已拒绝"}了协审请求。`,
    link: `/admin/co-reviews/${input.reviewId}`,
    refId: String(input.reviewId),
  });
}

export async function notifyCoReviewSubmitted(input: {
  userId: string;
  reviewId: number;
  paperTitle: string;
  reviewerName: string;
  decision: "approve" | "reject" | "revise";
}): Promise<void> {
  const label =
    input.decision === "approve" ? "建议通过" : input.decision === "reject" ? "建议拒绝" : "建议修改";
  await createMessage({
    userId: input.userId,
    kind: "co_review_result",
    title: `协审意见已提交：《${input.paperTitle}》`,
    body: `${input.reviewerName} 提交了评审意见：${label}。`,
    link: `/admin/co-reviews/${input.reviewId}`,
    refId: String(input.reviewId),
  });
}

export async function sendAdminDirectMessage(input: {
  userId: string;
  senderId: string;
  title: string;
  body: string;
  link?: string | null;
}): Promise<void> {
  await createMessage({
    userId: input.userId,
    senderId: input.senderId,
    kind: "admin_message",
    title: input.title,
    body: input.body,
    link: input.link ?? null,
  });
}
