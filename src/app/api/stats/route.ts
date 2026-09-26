import { NextRequest, NextResponse } from "next/server";
import { getLatestSiteStats, getSiteStatsHistory } from "@/lib/services/site-stats";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats
 * GET /api/stats?days=30  → latest snapshot + daily history for /stats.
 */
export async function GET(req: NextRequest) {
  const daysParam = req.nextUrl.searchParams.get("days");
  const days = daysParam ? Number(daysParam) : 30;
  const [latest, history] = await Promise.all([
    getLatestSiteStats(),
    getSiteStatsHistory(Number.isFinite(days) ? days : 30),
  ]);
  return NextResponse.json(
    { latest, history, days: Number.isFinite(days) ? days : 30 },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
