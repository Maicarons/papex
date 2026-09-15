-- Co-review transparency (P1-E): allow the assigner to publish a completed
-- review so it becomes visible on the paper page (OpenReview-style).
ALTER TABLE "co_reviews" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL;
