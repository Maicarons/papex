-- Enforce the "no paper without a PDF" policy at the database layer.
-- Every paper version must carry a non-empty pdf_url (the streaming route
-- /api/papers/{id}/pdf/{version}, or an equivalent direct link). This blocks
-- any insert/update that would leave a version PDF-less.
ALTER TABLE "paper_versions" ADD CONSTRAINT "paper_versions_pdf_url_not_empty" CHECK ("pdf_url" IS NOT NULL AND length(btrim("pdf_url")) > 0);
