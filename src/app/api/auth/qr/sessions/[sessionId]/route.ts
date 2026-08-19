import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qrSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Poll a QR login session (web client). Returns pending / confirmed / expired;
 * on confirmed also returns the confirmed user (public profile fields only).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const [row] = await db
    .select({ id: qrSessions.id, status: qrSessions.status, userId: qrSessions.userId, expiresAt: qrSessions.expiresAt })
    .from(qrSessions)
    .where(eq(qrSessions.sessionId, sessionId))
    .limit(1);
  if (!row) return NextResponse.json({ error: "session not found" }, { status: 404 });
  if (row.status === "pending" && row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ status: "expired" });
  }
  const body: Record<string, unknown> = { status: row.status };
  if (row.status === "confirmed" && row.userId) {
    const { users } = await import("@/lib/db/schema");
    const [u] = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);
    if (u) body.user = u;
  }
  return NextResponse.json(body);
}
