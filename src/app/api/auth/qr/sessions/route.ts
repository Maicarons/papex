import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qrSessions } from "@/lib/db/schema";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

const QR_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Create a QR-code login session (P3 #26). The web client renders
 * `papex:login:{sessionId}` as a QR code and polls GET .../[sessionId].
 */
export async function POST(_req: Request) {
  const sessionId = randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + QR_TTL_MS);
  const [row] = await db
    .insert(qrSessions)
    .values({ sessionId, status: "pending", expiresAt })
    .returning();
  return NextResponse.json(
    { sessionId: row.sessionId, expiresAt: row.expiresAt.toISOString() },
    { status: 201 },
  );
}
