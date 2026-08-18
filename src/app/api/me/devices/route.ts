import { NextResponse } from "next/server";
import { getSession, getCurrentUser } from "@/lib/auth/session";
import { listDevices, revokeAllDevices } from "@/lib/services/devices";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const devices = await listDevices(session.sub, session.deviceId);
  return NextResponse.json({ devices });
}

/** Log out all devices (revokes their refresh tokens + deletes device rows). */
export async function DELETE(_req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  // Keep the device that issued this request alive (unless it's a bearer token
  // without a bound device — then revoke everything).
  const session = await getSession();
  const keep = session?.deviceId;
  const revoked = await revokeAllDevices(user.id, keep);
  return NextResponse.json({ ok: true, revoked });
}
