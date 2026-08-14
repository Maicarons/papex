import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createTicket, addReply, listTickets } from "@/lib/services/tickets";

const createSchema = z.object({
  subject: z.string().min(2, "主题过短").max(200),
  type: z.enum(["bug", "feature", "other"]).default("other"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  message: z.string().min(1, "请填写详细描述").max(5000),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "all" && user.role !== "author" ? "all" : "mine";
  const statusRaw = url.searchParams.get("status");
  const status = (["open", "awaiting_user", "in_progress", "resolved", "closed"] as const).includes(
    statusRaw as "open",
  )
    ? (statusRaw as "open" | "awaiting_user" | "in_progress" | "resolved" | "closed")
    : undefined;
  const rows = await listTickets(user.id, { scope, status });
  return NextResponse.json({ tickets: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }
  const ticket = await createTicket({
    userId: user.id,
    subject: parsed.data.subject,
    type: parsed.data.type,
    priority: parsed.data.priority,
  });
  await addReply({ ticketId: ticket.id, userId: user.id, body: parsed.data.message, isAdmin: false });
  return NextResponse.json({ ticket }, { status: 201 });
}
