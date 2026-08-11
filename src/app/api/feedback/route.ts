import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { createTicket, addReply } from "@/lib/services/tickets";
import { createMessage } from "@/lib/services/messages";

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "other"]).default("other"),
  subject: z.string().min(2).max(200),
  message: z.string().min(1).max(5000),
  contact: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = feedbackSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }

  const ticket = await createTicket({
    userId: user.id,
    subject: parsed.data.subject,
    type: parsed.data.type,
    priority: parsed.data.type === "bug" ? "normal" : "low",
  });
  const body = parsed.data.contact
    ? `${parsed.data.message}\n\n联系方式：${parsed.data.contact}`
    : parsed.data.message;
  await addReply({ ticketId: ticket.id, userId: user.id, body, isAdmin: false });

  // Confirmation message to the reporter.
  await createMessage({
    userId: user.id,
    kind: "ticket_reply",
    title: `反馈已收到：${ticket.code}`,
    body: "我们已为你创建工单，处理进展会通过站内信通知。",
    refId: String(ticket.id),
  });

  // Notify staff.
  const staff = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["admin", "moderator"]));
  for (const s of staff) {
    await createMessage({
      userId: s.id,
      kind: "ticket_reply",
      title: `新反馈 ${ticket.code}：${parsed.data.subject}`,
      body: `来自 ${user.displayName} 的反馈，类型 ${parsed.data.type}。`,
      refId: String(ticket.id),
    });
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
