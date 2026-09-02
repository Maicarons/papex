import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { pushDevices } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  deviceToken: z.string().min(8).max(512),
  platform: z.string().max(40).default("unknown"),
});

/**
 * Register a push device token (P1 #18). Upserts on (userId, token) so a
 * re-register simply refreshes the platform field.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const json = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  await db
    .insert(pushDevices)
    .values({ userId: user.id, token: parsed.data.deviceToken, platform: parsed.data.platform })
    .onConflictDoUpdate({
      target: [pushDevices.userId, pushDevices.token],
      set: { platform: parsed.data.platform },
    });
  return NextResponse.json({ ok: true });
}
