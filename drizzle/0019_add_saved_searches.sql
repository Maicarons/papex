-- Saved search / keyword alerts (B1, Google Scholar-style). Adds a new
-- announcement kind and a per-user saved_searches table.
ALTER TYPE "announcement_kind" ADD VALUE IF NOT EXISTS 'search_match';

CREATE TABLE IF NOT EXISTS "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"q" text NOT NULL,
	"category" text,
	"semantic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "saved_searches_user_q_uniq" ON "saved_searches" USING btree ("user_id","q");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_searches_user_idx" ON "saved_searches" USING btree ("user_id");