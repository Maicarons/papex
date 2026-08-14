CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "paper_tags" (
	"paper_id" text NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "paper_tags_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE cascade,
	CONSTRAINT "paper_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE "paper_tags" ADD CONSTRAINT "paper_tags_paper_id_tag_id_pk" PRIMARY KEY("paper_id","tag_id");
--> statement-breakpoint
CREATE INDEX "paper_tags_tag_idx" ON "paper_tags" USING btree ("tag_id");
