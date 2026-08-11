import { db } from "@/lib/db";
import { messages, users } from "@/lib/db/schema";
import { desc, eq, and, count, inArray } from "drizzle-orm";
import { MESSAGE_KINDS, MESSAGE_CATEGORY_META, type MessageKind } from "@/lib/message-meta";

export type { MessageKind } from "@/lib/message-meta";
export { MESSAGE_KINDS, MESSAGE_CATEGORY_META };

export type MessageRow = typeof messages.$inferSelect;

export async function listMessages(userId: string, kind?: MessageKind | null): Promise<MessageRow[]> {
  const where = kind
    ? and(eq(messages.userId, userId), eq(messages.kind, kind))
    : eq(messages.userId, userId);
  return db.select().from(messages).where(where).orderBy(desc(messages.createdAt));
}

export async function unreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(messages)
    .where(and(eq(messages.userId, userId), eq(messages.read, false)));
  return row?.value ?? 0;
}

export async function markRead(userId: string, id: number): Promise<void> {
  await db
    .update(messages)
    .set({ read: true })
    .where(and(eq(messages.id, id), eq(messages.userId, userId)));
}

export async function markAllRead(userId: string): Promise<void> {
  await db.update(messages).set({ read: true }).where(eq(messages.userId, userId));
}

export async function createMessage(input: {
  userId: string;
  senderId?: string | null;
  kind?: MessageKind;
  title: string;
  body?: string | null;
  refId?: string | null;
  link?: string | null;
}): Promise<MessageRow> {
  const [row] = await db
    .insert(messages)
    .values({
      userId: input.userId,
      senderId: input.senderId ?? null,
      kind: input.kind ?? "system",
      title: input.title,
      body: input.body ?? null,
      refId: input.refId ?? null,
      link: input.link ?? null,
    })
    .returning();
  return row;
}

/** Send the same message to many recipients (broadcast / staff notice). */
export async function createMessages(inputs: {
  userIds: string[];
  senderId?: string | null;
  kind: MessageKind;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<number> {
  if (inputs.userIds.length === 0) return 0;
  const rows = inputs.userIds.map((userId) => ({
    userId,
    senderId: inputs.senderId ?? null,
    kind: inputs.kind,
    title: inputs.title,
    body: inputs.body ?? null,
    link: inputs.link ?? null,
  }));
  const inserted = await db.insert(messages).values(rows).returning({ id: messages.id });
  return inserted.length;
}

/**
 * Resolve recipient user ids for a broadcast.
 *  - all: every user
 *  - role: every user with the given base role
 *  - userIds: the explicitly listed users
 */
export async function listRecipientUserIds(filter: {
  all?: boolean;
  role?: string;
  userIds?: string[];
}): Promise<string[]> {
  if (filter.all) {
    const rows = await db.select({ id: users.id }).from(users);
    return rows.map((r) => r.id);
  }
  if (filter.userIds && filter.userIds.length > 0) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, filter.userIds));
    return rows.map((r) => r.id);
  }
  if (filter.role) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, filter.role as "author" | "moderator" | "admin"));
    return rows.map((r) => r.id);
  }
  return [];
}
