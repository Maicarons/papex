import { messageKindEnum } from "@/lib/db/schema";

export type MessageKind = (typeof messageKindEnum.enumValues)[number];

export type MessageTone = "default" | "info" | "warning" | "success" | "purple" | "danger";

export const MESSAGE_KINDS = messageKindEnum.enumValues as MessageKind[];

// Human-readable labels + accent tone for each message category (inbox UI).
// Kept in a client-safe module (no DB import) so both server services and the
// client inbox can share it.
export const MESSAGE_CATEGORY_META: Record<MessageKind, { label: string; tone: MessageTone }> = {
  system: { label: "系统通知", tone: "default" },
  ticket_reply: { label: "工单回执", tone: "info" },
  announcement: { label: "公告", tone: "warning" },
  review_result: { label: "审核结果", tone: "success" },
  co_review_request: { label: "协审请求", tone: "purple" },
  co_review_result: { label: "协审回执", tone: "purple" },
  admin_message: { label: "管理员私信", tone: "danger" },
  community_reply: { label: "社区回复", tone: "info" },
};

export const TONE_CLASSES: Record<MessageTone, string> = {
  default: "bg-muted text-muted-foreground",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};
