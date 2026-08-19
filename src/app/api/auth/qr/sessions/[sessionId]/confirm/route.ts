import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qrSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveDevice, issueAuthPair } from "@/lib/auth/refresh-token";

export const dynamic = "force-dynamic";

const confirmSchema = z.object({
  deviceName: z.string().max(120).optional(),
  platform: z.string().max(40).optional(),
});

/**
 * Confirm a QR login session from the mobile app. Requires the app's own
 * Bearer session; issues a fresh token pair for the web client (stored on the
 * session until it is exchanged).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { sessionId } = await params;
  const json = await req.json().catch(() => null);
  const parsed = confirmSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(qrSessions)
    .where(eq(qrSessions.sessionId, sessionId))
    .limit(1);
  if (!row) return NextResponse.json({ error: "session not found" }, { status: 404 });
  if (row.status !== "pending") {
    return NextResponse.json({ error: "session already processed" }, { status: 409 });
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ status: "expired" }, { status: 410 });
  }

  const device = await resolveDevice(user.id, {
    deviceName: parsed.data.deviceName ?? "qr-login-web",
    platform: parsed.data.platform ?? "web",
    fingerprint: null,
  });
  const auth = await issueAuthPair(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
    device.id,
  );

  await db
    .update(qrSessions)
    .set({
      status: "confirmed",
      userId: user.id,
      deviceId: device.id,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      confirmedAt: new Date(),
    })
    .where(eq(qrSessions.id, row.id));

  return NextResponse.json({ status: "confirmed", user: { id: user.id, username: user.username, displayName: user.displayName } });
}
