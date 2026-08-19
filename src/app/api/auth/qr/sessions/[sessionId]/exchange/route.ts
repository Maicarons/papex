import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qrSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * One-time exchange: the web client redeems a confirmed session for the token
 * pair that was minted during the app confirm step. The session is marked
 * consumed afterwards, so a sessionId can only be exchanged once.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const [row] = await db
    .select()
    .from(qrSessions)
    .where(eq(qrSessions.sessionId, sessionId))
    .limit(1);
  if (!row) return NextResponse.json({ error: "session not found" }, { status: 404 });
  if (row.status !== "confirmed") {
    return NextResponse.json({ error: "session not confirmed" }, { status: 409 });
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "session expired" }, { status: 410 });
  }
  await db
    .update(qrSessions)
    .set({ status: "consumed", consumedAt: new Date() })
    .where(eq(qrSessions.id, row.id));
  return NextResponse.json({
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    user: row.userId,
  });
}
