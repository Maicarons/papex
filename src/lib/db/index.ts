import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://papex:papex@localhost:5432/papex";

/**
 * Reuse a single postgres client across hot reloads in dev to avoid
 * exhausting connections. In serverless (Vercel) a module-level singleton
 * is also fine because each lambda has its own isolate.
 */
const globalForDb = globalThis as unknown as {
  __papexPg?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__papexPg ??
  postgres(connectionString, {
    max: process.env.VERCEL ? 1 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__papexPg = client;
}

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;
