import { NextRequest, NextResponse } from "next/server";
import { recordSiteDailyStats } from "@/lib/services/site-stats";

export const dynamic = "force-dynamic";

/**
 * Daily statistics snapshot (Vercel Cron). Upserts today's paper/user counts
 * into site_daily_stats so /stats can render without live COUNT(*) queries.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const snapshot = await recordSiteDailyStats();
  return NextResponse.json(
    { ok: true, time: new Date().toISOString(), snapshot },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
