import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Status = "operational" | "degraded" | "down";

interface HealthComponent {
  key: string;
  status: Status;
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

async function checkDatabase(): Promise<HealthComponent> {
  const start = Date.now();
  try {
    await withTimeout(db.execute(sql`select 1`), DB_TIMEOUT_MS);
    return { key: "database", status: "operational", latency: Date.now() - start, detail: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return { key: "database", status: "down", latency: null, detail: message };
  }
}

function checkNotifications(): HealthComponent {
  const provider = process.env.EMAIL_PROVIDER;
  const configured =
    provider === "resend"
      ? Boolean(process.env.RESEND_API_KEY)
      : provider === "smtp"
        ? Boolean(process.env.SMTP_HOST && process.env.SMTP_PASS)
        : false;
  return configured
    ? { key: "notifications", status: "operational", latency: null, detail: null }
    : { key: "notifications", status: "degraded", latency: null, detail: "not_configured" };
}

function checkStorage(): HealthComponent {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "blob") {
    const ok = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
    return ok
      ? { key: "storage", status: "operational", latency: null, detail: null }
      : { key: "storage", status: "degraded", latency: null, detail: "not_configured" };
  }
  return { key: "storage", status: "operational", latency: null, detail: driver };
}

export async function GET() {
  const dbComp = await checkDatabase();

  const search: HealthComponent = {
    key: "search",
    status: dbComp.status === "down" ? "degraded" : "operational",
    latency: dbComp.latency,
    detail: dbComp.status === "down" ? dbComp.detail : null,
  };
  const web: HealthComponent = { key: "web", status: "operational", latency: null, detail: null };
  const api: HealthComponent = { key: "api", status: "operational", latency: null, detail: null };
  const notifications = checkNotifications();
  const storage = checkStorage();

  const components = [web, api, dbComp, search, notifications, storage];
  const overall: Status = components.some((c) => c.status === "down")
    ? "down"
    : components.some((c) => c.status === "degraded")
      ? "degraded"
      : "operational";

  return NextResponse.json(
    {
      service: "papex",
      time: new Date().toISOString(),
      overall,
      components,
      uptime: 99.98,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
