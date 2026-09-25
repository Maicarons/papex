import { NextRequest, NextResponse } from "next/server";
import { recordHealthSnapshot, type HealthStatus } from "@/lib/services/health-history";

export const dynamic = "force-dynamic";

interface HealthComponent {
  key: string;
  status: HealthStatus;
  latency: number | null;
  detail: string | null;
}

const DB_TIMEOUT_MS = 2500;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/**
 * Scheduled health probe (Vercel Cron + GitHub Actions).
 * Records a forced snapshot even when nobody is looking at /status.
 */
async function probe() {
  const { db } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");

  const start = Date.now();
  let dbComp: HealthComponent;
  try {
    await withTimeout(db.execute(sql`select 1`), DB_TIMEOUT_MS);
    dbComp = {
      key: "database",
      status: "operational",
      latency: Date.now() - start,
      detail: null,
    };
  } catch (e) {
    dbComp = {
      key: "database",
      status: "down",
      latency: null,
      detail: e instanceof Error ? e.message : "unknown error",
    };
  }

  const search: HealthComponent = {
    key: "search",
    status: dbComp.status === "down" ? "degraded" : "operational",
    latency: dbComp.latency,
    detail: dbComp.status === "down" ? dbComp.detail : null,
  };

  const provider = process.env.EMAIL_PROVIDER;
  const notificationsConfigured =
    provider === "resend"
      ? Boolean(process.env.RESEND_API_KEY)
      : provider === "smtp"
        ? Boolean(process.env.SMTP_HOST && process.env.SMTP_PASS)
        : false;
  const notifications: HealthComponent = {
    key: "notifications",
    status: notificationsConfigured ? "operational" : "degraded",
    latency: null,
    detail: notificationsConfigured ? null : "not_configured",
  };

  const storageDriver = process.env.STORAGE_DRIVER ?? "local";
  const storage: HealthComponent = {
    key: "storage",
    status: "operational",
    latency: null,
    detail: storageDriver,
  };

  const components: HealthComponent[] = [
    { key: "web", status: "operational", latency: null, detail: null },
    { key: "api", status: "operational", latency: null, detail: null },
    dbComp,
    search,
    notifications,
    storage,
  ];

  const overall: HealthStatus = components.some((c) => c.status === "down")
    ? "down"
    : components.some((c) => c.status === "degraded")
      ? "degraded"
      : "operational";

  await recordHealthSnapshot(components, overall, { force: true });
  return { overall, components };
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when configured.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const result = await probe();
  return NextResponse.json(
    { ok: true, time: new Date().toISOString(), ...result },
    { headers: { "Cache-Control": "no-store" } },
  );
}
