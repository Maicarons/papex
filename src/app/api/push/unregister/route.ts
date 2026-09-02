import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushDevices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Remove the current user's registered push tokens (push disabled in app). */
export async function POST(_request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await db.delete(pushDevices).where(eq(pushDevices.userId, user.id));
  return NextResponse.json({ ok: true });
}
