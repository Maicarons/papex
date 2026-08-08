import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getTicket, addReply, updateTicket } from "@/lib/services/tickets";
import { notifyTicketReply } from "@/lib/services/notifications";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const ticket = await getTicket(numId, user.id, user.role !== "author");
  if (!ticket) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ticket });
}

const replySchema = z.object({ body: z.string().min(1).max(5000) });
const updateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = replySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "参数错误" }, { status: 400 });
  const ticket = await getTicket(numId, user.id, user.role !== "author");
  if (!ticket) return NextResponse.json({ error: "not found" }, { status: 404 });
  const isAdmin = user.role !== "author";
  const reply = await addReply({
    ticketId: numId,
    userId: user.id,
    body: parsed.data.body,
    isAdmin,
  });
  // Notify the reporter when staff replies to their ticket.
  if (isAdmin && ticket.userId !== user.id) {
    await notifyTicketReply({
      userId: ticket.userId,
      ticketId: numId,
      ticketCode: ticket.code,
      byName: user.displayName,
    });
  }
  return NextResponse.json({ reply }, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role === "author") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "参数错误" }, { status: 400 });
  const ticket = await updateTicket(numId, parsed.data);
  if (!ticket) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ticket });
}
