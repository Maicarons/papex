-- P0-A (semantic search) + P0-B (external imports) schema support.
-- Requires the `vector` extension (pgvector) for the embedding column + HNSW index.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint

-- Dense vector embedding of (title + abstract) for semantic / hybrid search.
-- Dimension is fixed at 1024 (bge-m3 / multilingual-e5-large). Null until a
-- backfill run populates it.
ALTER TABLE "paper_versions" ADD COLUMN "embedding" vector(1024);--> statement-breakpoint

-- Approximate-nearest-neighbour index for cosine-distance semantic search.
-- HNSW is build-on-write and query-time O(log n). For a large existing table
-- prefer `CREATE INDEX CONCURRENTLY` in a maintenance window; the non-concurrent
-- form below is fine for migrations on small/medium datasets.
CREATE INDEX "paper_versions_embedding_idx" ON "paper_versions" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint

-- Cross-source external identifiers (arXiv / DOI / Semantic Scholar) so imports
-- can de-duplicate and citation backfill can resolve references to local papers.
CREATE TABLE "paper_external_ids" (
	"id" serial PRIMARY KEY NOT NULL,
	"paper_id" text NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "paper_external_ids_uniq" ON "paper_external_ids" ("paper_id","source","external_id");--> statement-breakpoint
CREATE INDEX "paper_external_ids_lookup_idx" ON "paper_external_ids" ("source","external_id");--> statement-breakpoint
ALTER TABLE "paper_external_ids" ADD CONSTRAINT "paper_external_ids_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;
