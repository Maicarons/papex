import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { healthChecks } from "@/lib/db/schema";

export type HealthStatus = "operational" | "degraded" | "down";

export interface HealthSnapshotRow {
  key: string;
  status: HealthStatus;
  latency: number | null;
}

export interface DailyUptime {
  /** YYYY-MM-DD (UTC) */
  date: string;
  /** 0–100; null when the day has no samples yet. */
  uptimePercent: number | null;
  checks: number;
  operational: number;
  degraded: number;
  down: number;
}

export interface UptimeHistory {
  days: number;
  /** 0–100 across the whole window; null when there are no samples. */
  overallUptimePercent: number | null;
  totalChecks: number;
  daily: DailyUptime[];
}

/** Throttle in-process so a busy /status auto-refresh does not flood the table. */
let lastRecordAt = 0;
const RECORD_MIN_INTERVAL_MS = 60_000;

/**
 * Persist one health snapshot (one row per component + a synthetic `overall`
 * row). Safe to fire-and-forget: failures must never break /api/health.
 */
export async function recordHealthSnapshot(
  components: HealthSnapshotRow[],
  overall: HealthStatus,
  opts: { force?: boolean } = {},
): Promise<void> {
  const now = Date.now();
  if (!opts.force && now - lastRecordAt < RECORD_MIN_INTERVAL_MS) return;
  lastRecordAt = now;

  const rows = [
    ...components.map((c) => ({
      component: c.key,
      status: c.status,
      latency: c.latency,
    })),
    {
      component: "overall",
      status: overall,
      latency: null as number | null,
    },
  ];

  try {
    await db.insert(healthChecks).values(rows);
  } catch {
    // Never surface storage errors on the public health endpoint.
  }
}

/**
 * Aggregate `overall` snapshots into daily uptime for the status chart.
 * Uptime counts operational+degraded as available (degraded is still up),
 * matching common status-page conventions.
 */
export async function getUptimeHistory(days = 30): Promise<UptimeHistory> {
  const windowDays = Math.min(Math.max(days, 1), 90);
  const since = new Date(Date.now() - windowDays * 86_400_000);

  const rows = await db
    .select({
      day: sql<string>`to_char(${healthChecks.checkedAt} at time zone 'utc', 'YYYY-MM-DD')`,
      total: sql<number>`count(*)::int`,
      operational: sql<number>`count(*) filter (where ${healthChecks.status} = 'operational')::int`,
      degraded: sql<number>`count(*) filter (where ${healthChecks.status} = 'degraded')::int`,
      down: sql<number>`count(*) filter (where ${healthChecks.status} = 'down')::int`,
    })
    .from(healthChecks)
    .where(and(eq(healthChecks.component, "overall"), gte(healthChecks.checkedAt, since)))
    .groupBy(sql`to_char(${healthChecks.checkedAt} at time zone 'utc', 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${healthChecks.checkedAt} at time zone 'utc', 'YYYY-MM-DD')`);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const daily: DailyUptime[] = [];
  let totalChecks = 0;
  let totalUp = 0;

  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    const row = byDay.get(date);
    if (!row) {
      daily.push({
        date,
        uptimePercent: null,
        checks: 0,
        operational: 0,
        degraded: 0,
        down: 0,
      });
      continue;
    }
    const up = row.operational + row.degraded;
    const uptimePercent = row.total > 0 ? Math.round((up / row.total) * 10000) / 100 : null;
    totalChecks += row.total;
    totalUp += up;
    daily.push({
      date,
      uptimePercent,
      checks: row.total,
      operational: row.operational,
      degraded: row.degraded,
      down: row.down,
    });
  }

  return {
    days: windowDays,
    overallUptimePercent:
      totalChecks > 0 ? Math.round((totalUp / totalChecks) * 10000) / 100 : null,
    totalChecks,
    daily,
  };
}

/** Latest recorded snapshot (for debugging / the cron response). */
export async function getLatestHealthChecks(limit = 20) {
  return db
    .select()
    .from(healthChecks)
    .orderBy(desc(healthChecks.checkedAt), desc(healthChecks.id))
    .limit(limit);
}
