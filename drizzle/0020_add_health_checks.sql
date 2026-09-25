-- Health-check snapshots for the /status 30-day uptime chart.
-- One row per probed component per snapshot; aggregated by day in SQL.
CREATE TABLE IF NOT EXISTS "health_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"component" text NOT NULL,
	"status" text NOT NULL,
	"latency" integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_checks_checked_at_idx" ON "health_checks" USING btree ("checked_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_checks_component_idx" ON "health_checks" USING btree ("component","checked_at");
