import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listSubscriptions, toggleSubscription } from "@/lib/services/subscriptions";
import { subscriptionSchema } from "@/lib/validations";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const list = await listSubscriptions(user.id);
  return NextResponse.json({ subscriptions: list });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = subscriptionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const subscribed = await toggleSubscription(user.id, parsed.data);
  return NextResponse.json({ subscribed });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = subscriptionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  await db
    .delete(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, user.id),
        eq(subscriptions.type, parsed.data.type),
        eq(subscriptions.refId, parsed.data.refId),
      ),
    );
  return NextResponse.json({ ok: true });
}
