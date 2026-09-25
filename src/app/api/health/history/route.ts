import { NextRequest, NextResponse } from "next/server";
import { getUptimeHistory } from "@/lib/services/health-history";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/history?days=30
 * Daily overall uptime for the /status chart.
 */
export async function GET(req: NextRequest) {
  const daysParam = req.nextUrl.searchParams.get("days");
  const days = daysParam ? Number(daysParam) : 30;
  const history = await getUptimeHistory(Number.isFinite(days) ? days : 30);
  return NextResponse.json(history, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
