import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { markRead } from "@/lib/services/messages";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  await markRead(user.id, numId);
  return NextResponse.json({ ok: true });
}
