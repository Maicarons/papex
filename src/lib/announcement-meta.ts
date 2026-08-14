import { announcementKindEnum } from "@/lib/db/schema";
import { TONE_CLASSES, type MessageTone } from "@/lib/message-meta";

export type AnnouncementKind = (typeof announcementKindEnum.enumValues)[number];

export const ANNOUNCEMENT_KINDS = announcementKindEnum.enumValues as AnnouncementKind[];

// Human-readable labels + accent tone for each announcement category (feed UI).
// Kept in a client-safe module (no DB import beyond the enum's const values)
// so both the feed page and the feed bell can share it.
export const ANNOUNCEMENT_CATEGORY_META: Record<
  AnnouncementKind,
  { label: string; tone: MessageTone }
> = {
  new_in_category: { label: "订阅分类·新论文", tone: "info" },
  new_from_author: { label: "订阅作者·新论文", tone: "success" },
  comment_reply: { label: "评论回复", tone: "purple" },
  announcement: { label: "公告", tone: "warning" },
};

export { TONE_CLASSES };
