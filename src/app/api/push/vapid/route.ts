import { NextResponse } from "next/server";
import { isPushEnabled, getVapidPublicKey } from "@/lib/push/send";

export const dynamic = "force-dynamic";

/**
 * GET /api/push/vapid
 *
 * Hands the browser the VAPID public key it needs to create a push
 * subscription. `enabled: false` when Web Push is not configured on this
 * deployment — the settings UI hides the push toggle then.
 */
export async function GET() {
  return NextResponse.json(
    { enabled: isPushEnabled(), publicKey: getVapidPublicKey() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
