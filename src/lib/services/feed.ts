import { db } from "@/lib/db";
import { announcements, subscriptions, users } from "@/lib/db/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { sendEmail, buildNewPaperEmail } from "@/lib/email";

/**
 * Notify subscribers when a paper is approved/published:
 *  - subscribers of the primary category
 *  - subscribers of any author on the paper
 *  - subscribers of the paper itself
 *
 * Inserts in-app announcements for every subscriber, then (best-effort) sends
 * an email to each. Email failures never block the announcement write.
 */
export async function notifyNewPaper(opts: {
  paperId: string;
  title: string;
  primaryCategoryId: string;
  authorIds: number[];
}) {
  const subs = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.type, "category"), eq(subscriptions.refId, opts.primaryCategoryId)),
    );

  const authorSubs =
    opts.authorIds.length > 0
      ? await db
          .select()
          .from(subscriptions)
          .where(
            or(
              ...opts.authorIds.map((id) =>
                and(eq(subscriptions.type, "author"), eq(subscriptions.refId, String(id))),
              ),
            ),
          )
      : [];

  const paperSubs = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.type, "paper"), eq(subscriptions.refId, opts.paperId)));

  const userIds = new Set<string>();
  for (const s of [...subs, ...authorSubs, ...paperSubs]) userIds.add(s.userId);

  if (userIds.size === 0) return;

  const userRows = await db
    .select({ id: users.id, email: users.email, displayName: users.displayName })
    .from(users)
    .where(inArray(users.id, [...userIds]));

  const inserted = await db
    .insert(announcements)
    .values(
      userRows.map((u) => ({
        userId: u.id,
        kind: "new_in_category" as const,
        refId: opts.paperId,
        title: `新论文发布：${opts.title}`,
        body: "您订阅的主题或作者发布了新论文。",
      })),
    )
    .returning({ id: announcements.id, userId: announcements.userId });

  // Best-effort email fan-out.
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Papex";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const emailedUserIds = new Set<string>();
  await Promise.allSettled(
    userRows.map(async (u) => {
      const { subject, html, text } = buildNewPaperEmail({
        title: opts.title,
        paperId: opts.paperId,
        appName,
        appUrl,
      });
      const res = await sendEmail({ to: u.email, subject, html, text });
      if (res.ok) emailedUserIds.add(u.id);
      else if (res.provider !== "none") {
        console.warn(`[email] 发送给 ${u.email} 失败 (${res.provider}): ${res.error}`);
      }
    }),
  );

  if (emailedUserIds.size > 0) {
    await db
      .update(announcements)
      .set({ emailedAt: new Date() })
      .where(inArray(announcements.id, inserted.filter((r) => emailedUserIds.has(r.userId)).map((r) => r.id)));
  }
}

export async function listAnnouncements(userId: string, onlyUnread = false) {
  return db
    .select()
    .from(announcements)
    .where(
      onlyUnread
        ? and(eq(announcements.userId, userId), eq(announcements.read, false))
        : eq(announcements.userId, userId),
    )
    .orderBy(sql`${announcements.createdAt} desc`)
    .limit(50);
}

export async function markAnnouncementsRead(userId: string) {
  await db.update(announcements).set({ read: true }).where(eq(announcements.userId, userId));
}

/** Mark a single announcement read. Scoped to the owner to prevent cross-user tampering. */
export async function markAnnouncementRead(userId: string, id: number) {
  await db
    .update(announcements)
    .set({ read: true })
    .where(and(eq(announcements.id, id), eq(announcements.userId, userId)));
}
