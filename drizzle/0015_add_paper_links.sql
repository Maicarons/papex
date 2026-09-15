-- Paper external links (P1-D): code repositories / datasets / websites tied to
-- a paper (Papers With Code style). Only metadata links — no mirrored content.
CREATE TABLE IF NOT EXISTS "paper_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_id" text NOT NULL,
	"kind" text DEFAULT 'website' NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"added_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "paper_links" ADD CONSTRAINT "paper_links_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "paper_links" ADD CONSTRAINT "paper_links_added_by_id_users_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "paper_links_paper_idx" ON "paper_links" USING btree ("paper_id");
