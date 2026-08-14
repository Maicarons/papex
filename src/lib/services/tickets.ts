import { db } from "@/lib/db";
import { tickets, ticketReplies, users } from "@/lib/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";

export type TicketRow = typeof tickets.$inferSelect;
export type TicketReplyRow = typeof ticketReplies.$inferSelect;
export type TicketStatus = "open" | "awaiting_user" | "in_progress" | "resolved" | "closed";

export interface TicketWithReplies extends TicketRow {
  replies: TicketReplyRow[];
}

export async function createTicket(input: {
  userId: string;
  subject: string;
  type?: string;
  priority?: "low" | "normal" | "high" | "urgent";
}): Promise<TicketRow> {
  const [row] = await db
    .insert(tickets)
    .values({
      code: `T-${Date.now().toString(36).toUpperCase()}`,
      userId: input.userId,
      subject: input.subject,
      type: input.type ?? "other",
      priority: input.priority ?? "normal",
    })
    .returning();
  // Assign a stable, human-friendly code using the serial id.
  const code = `T-${String(row.id).padStart(5, "0")}`;
  const [updated] = await db.update(tickets).set({ code }).where(eq(tickets.id, row.id)).returning();
  return updated ?? row;
}

export async function listTickets(
  userId: string,
  opts: { scope: "mine" | "all"; status?: TicketStatus },
): Promise<TicketRow[]> {
  const conds = [];
  if (opts.scope === "mine") conds.push(eq(tickets.userId, userId));
  if (opts.status) conds.push(eq(tickets.status, opts.status));
  const where = conds.length ? and(...conds) : undefined;
  return db.select().from(tickets).where(where).orderBy(desc(tickets.updatedAt));
}

export async function getTicket(
  id: number,
  userId: string,
  isAdmin: boolean,
): Promise<TicketWithReplies | null> {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
  if (!ticket) return null;
  if (!isAdmin && ticket.userId !== userId) return null;
  const replies = await db
    .select()
    .from(ticketReplies)
    .where(eq(ticketReplies.ticketId, id))
    .orderBy(sql`${ticketReplies.createdAt} ASC`);
  return { ...ticket, replies };
}

export async function addReply(input: {
  ticketId: number;
  userId: string;
  body: string;
  isAdmin: boolean;
}): Promise<{ reply: TicketReplyRow; status: TicketStatus }> {
  const [reply] = await db
    .insert(ticketReplies)
    .values({
      ticketId: input.ticketId,
      userId: input.userId,
      body: input.body,
      isAdmin: input.isAdmin,
    })
    .returning();
  // Auto-advance status based on who replied last:
  // - staff reply -> awaiting_user (ball is in the reporter's court)
  // - reporter reply on awaiting_user -> open (back to staff)
  const [t] = await db
    .update(tickets)
    .set({
      status: input.isAdmin ? "awaiting_user" : "open",
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, input.ticketId))
    .returning();
  return { reply, status: (t?.status ?? "open") as TicketStatus };
}

export async function updateTicket(
  id: number,
  patch: { status?: TicketStatus; priority?: "low" | "normal" | "high" | "urgent" },
): Promise<TicketRow | null> {
  const [row] = await db
    .update(tickets)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(tickets.id, id))
    .returning();
  return row ?? null;
}

export async function reporterOf(ticketId: number): Promise<string | null> {
  const [t] = await db.select({ userId: tickets.userId }).from(tickets).where(eq(tickets.id, ticketId));
  return t?.userId ?? null;
}

export async function displayName(userId: string | null): Promise<string> {
  if (!userId) return "系统";
  const [u] = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, userId));
  return u?.displayName ?? "用户";
}
