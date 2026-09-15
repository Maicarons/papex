-- AI-generated summary cache (P1-C): validated TLDR / corpus-review payloads,
-- keyed per (paper_id, version, kind) so regeneration is explicit and costs stay low.
CREATE TABLE IF NOT EXISTS "ai_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"kind" text DEFAULT 'tldr' NOT NULL,
	"model" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_summaries_paper_version_kind_uniq" ON "ai_summaries" USING btree ("paper_id","version","kind");
