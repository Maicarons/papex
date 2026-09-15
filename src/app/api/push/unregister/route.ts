import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushDevices } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Remove registered push tokens.
 *  - with `{ deviceToken }`: removes only that token (e.g. toggling push off on
 *    one browser, keeping other platforms like mobile intact)
 *  - without a body: removes every token of the user (push disabled in app)
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const json = await request.json().catch(() => null);
  const token = typeof json?.deviceToken === "string" ? json.deviceToken : null;
  if (token) {
    await db
      .delete(pushDevices)
      .where(and(eq(pushDevices.userId, user.id), eq(pushDevices.token, token)));
  } else {
    await db.delete(pushDevices).where(eq(pushDevices.userId, user.id));
  }
  return NextResponse.json({ ok: true });
}
