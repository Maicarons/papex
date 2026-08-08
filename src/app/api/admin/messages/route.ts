import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";
import { createMessages, listRecipientUserIds, MESSAGE_KINDS } from "@/lib/services/messages";
import type { MessageKind } from "@/lib/message-meta";

export const dynamic = "force-dynamic";

const broadcastSchema = z.object({
  scope: z.enum(["all", "role", "userIds"]),
  role: z.string().optional(),
  userIds: z.array(z.string()).optional(),
  kind: z.enum(["announcement", "system", "admin_message"]).default("announcement"),
  title: z.string().min(1, "标题不能为空").max(200),
  body: z.string().min(1, "内容不能为空").max(5000),
  link: z.string().max(500).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await userCan(user, "message:broadcast"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = broadcastSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }
  const { scope, role, userIds, kind, title, body, link } = parsed.data;
  const recipients = await listRecipientUserIds({
    all: scope === "all",
    role: scope === "role" ? role : undefined,
    userIds: scope === "userIds" ? userIds : undefined,
  });
  if (recipients.length === 0) {
    return NextResponse.json({ error: "没有匹配的接收用户" }, { status: 400 });
  }
  const sent = await createMessages({
    userIds: recipients,
    senderId: user.id,
    kind: kind as MessageKind,
    title,
    body,
    link: link || null,
  });
  return NextResponse.json({ sent });
}
