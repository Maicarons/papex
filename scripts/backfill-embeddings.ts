/**
 * Backfill paper-version embeddings for semantic search (P0-A).
 *
 * One-off / recurring maintenance script. Populates `paper_versions.embedding`
 * for rows that don't have one yet. Requires an embedding backend
 * (EMBEDDING_API_URL). Re-running is safe: it only processes null rows.
 *
 *   npm run embeddings:backfill
 *
 * Respects the provider's batch size and the pgvector 1024-dim contract.
 */
import { db } from "@/lib/db";
import { paperVersions } from "@/lib/db/schema";
import { isEmbeddingEnabled, embedBatch, buildEmbedText } from "@/lib/embeddings";
import { eq, sql } from "drizzle-orm";

const BATCH = 32;

async function main() {
  if (!isEmbeddingEnabled()) {
    console.error(
      "✗ Embedding backend not configured. Set EMBEDDING_API_URL (and optionally EMBEDDING_API_KEY / EMBEDDING_MODEL) and re-run.",
    );
    process.exit(1);
  }

  let processed = 0;
  let updated = 0;

  for (;;) {
    const rows = await db
      .select({
        id: paperVersions.id,
        title: paperVersions.title,
        abstract: paperVersions.abstract,
      })
      .from(paperVersions)
      .where(sql`${paperVersions.embedding} is null`)
      .orderBy(paperVersions.id)
      .limit(BATCH);

    if (rows.length === 0) break;

    const texts = rows.map((r) => buildEmbedText(r.title, r.abstract));
    const vectors = await embedBatch(texts);

    for (let i = 0; i < rows.length; i++) {
      await db
        .update(paperVersions)
        .set({ embedding: vectors[i] })
        .where(eq(paperVersions.id, rows[i].id));
      updated++;
    }

    processed += rows.length;
    console.log(`  embedded ${updated} versions so far…`);
    if (rows.length < BATCH) break;
  }

  console.log(`✓ Done. Embedded ${updated} paper versions (processed ${processed}).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
