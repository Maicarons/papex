-- Daily site statistics snapshot (papers / users counts) for the /stats page.
-- Written once per UTC day by /api/stats/cron.
CREATE TABLE IF NOT EXISTS "site_daily_stats" (
	"day" text PRIMARY KEY NOT NULL,
	"papers_total" integer DEFAULT 0 NOT NULL,
	"papers_approved" integer DEFAULT 0 NOT NULL,
	"papers_submitted" integer DEFAULT 0 NOT NULL,
	"users_total" integer DEFAULT 0 NOT NULL,
	"authors_total" integer DEFAULT 0 NOT NULL,
	"comments_total" integer DEFAULT 0 NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_daily_stats_recorded_at_idx" ON "site_daily_stats" USING btree ("recorded_at");
