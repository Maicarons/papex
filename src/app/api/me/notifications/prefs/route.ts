import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationPrefs } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Per-kind push preferences (A4). Opt-out model: absence of a row means
 * "enabled by default". This endpoint lists the known kinds with their current
 * effective state (default true) and lets the client flip them.
 */
const PUSH_KINDS = [
  "new_paper",
  "review_result",
  "ticket_reply",
  "community_reply",
  "co_review_request",
  "co_review_result",
  "admin_message",
  "system",
] as const;

const putSchema = z.object({
  prefs: z.record(z.enum(PUSH_KINDS), z.boolean()),
});

/** GET /api/me/notifications/prefs — effective on/off per kind. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await db
    .select({ kind: notificationPrefs.kind, enabled: notificationPrefs.enabled })
    .from(notificationPrefs)
    .where(eq(notificationPrefs.userId, user.id));
  const map: Record<string, boolean> = Object.fromEntries(PUSH_KINDS.map((k) => [k, true]));
  for (const r of rows) map[r.kind] = r.enabled;
  return NextResponse.json({ prefs: map });
}

/** PUT /api/me/notifications/prefs — upsert kinds; enabled=true removes the row. */
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const entries = Object.entries(parsed.data.prefs);
  const disabled = entries.filter(([, v]) => v === false).map(([k]) => k);
  const enabledToDefault = entries.filter(([, v]) => v === true).map(([k]) => k);

  await db.transaction(async (tx) => {
    if (disabled.length > 0) {
      await tx
        .insert(notificationPrefs)
        .values(disabled.map((kind) => ({ userId: user.id, kind, enabled: false })))
        .onConflictDoUpdate({
          target: [notificationPrefs.userId, notificationPrefs.kind],
          set: { enabled: false, updatedAt: new Date() },
        });
    }
    if (enabledToDefault.length > 0) {
      // Restoring to default = drop the opt-out row.
      await tx
        .delete(notificationPrefs)
        .where(
          and(
            eq(notificationPrefs.userId, user.id),
            inArray(notificationPrefs.kind, enabledToDefault),
          ),
        );
    }
  });

  return NextResponse.json({ ok: true });
}