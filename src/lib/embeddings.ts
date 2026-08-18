/**
 * Pluggable text-embedding layer for semantic / hybrid search (P0-A).
 *
 * Design goals:
 *  - Zero hard dependencies. The only backend shipped is an OpenAI-compatible
 *    HTTP endpoint (works with OpenAI, Together, Groq, local vLLM, Ollama with
 *    an embeddings route, etc.). A local ONNX model can be dropped in later by
 *    implementing `EmbeddingProvider`.
 *  - Self-host friendly. When `EMBEDDING_API_URL` is unset the feature is
 *    simply disabled (`isEmbeddingEnabled() === false`) and search falls back
 *    to keyword/boolean mode. No crash, no telemetry.
 *  - Dimension is fixed at `EMBEDDING_DIM` (default 1024, matching bge-m3 /
 *    multilingual-e5-large). The pgvector column is `vector(1024)`, so the
 *    configured model MUST emit that many dimensions.
 *
 * Server-only: touches `process.env` and `fetch`.
 */

export const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM ?? 1024);

export interface EmbeddingProvider {
  readonly name: string;
  embed(texts: string[]): Promise<number[][]>;
}

interface OpenAIEmbeddingResponse {
  data?: { embedding?: number[] }[];
  error?: { message?: string };
}

/**
 * Minimal OpenAI-compatible embeddings client.
 * POST `${EMBEDDING_API_URL}/embeddings` { model, input: string[] }
 * -> { data: [{ embedding: number[] }] }
 */
class OpenAICompatibleProvider implements EmbeddingProvider {
  readonly name = "openai-compatible";
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly batchSize: number;

  constructor() {
    this.baseUrl = (process.env.EMBEDDING_API_URL ?? "").replace(/\/+$/, "");
    this.apiKey = process.env.EMBEDDING_API_KEY || undefined;
    this.model = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
    // Most endpoints cap input arrays; 32 is a safe default.
    this.batchSize = Math.max(1, Number(process.env.EMBEDDING_BATCH_SIZE ?? 32));
  }

  async embed(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const chunk = texts.slice(i, i + this.batchSize);
      const res = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({ model: this.model, input: chunk }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`embedding endpoint ${res.status}: ${detail.slice(0, 200)}`);
      }
      const json = (await res.json()) as OpenAIEmbeddingResponse;
      if (json.error?.message) throw new Error(`embedding error: ${json.error.message}`);
      const data = json.data;
      if (!data || data.length !== chunk.length) {
        throw new Error("embedding response length mismatch");
      }
      for (const item of data) {
        const vec = item.embedding;
        if (!vec || vec.length !== EMBEDDING_DIM) {
          throw new Error(
            `embedding dimension ${vec?.length ?? 0} != expected ${EMBEDDING_DIM} (set EMBEDDING_DIM to match the model)`,
          );
        }
        out.push(vec);
      }
    }
    return out;
  }
}

let cachedProvider: EmbeddingProvider | null | undefined;

/** Returns the configured embedding provider, or `null` if disabled. */
export function getEmbeddingProvider(): EmbeddingProvider | null {
  if (cachedProvider !== undefined) return cachedProvider;
  cachedProvider = process.env.EMBEDDING_API_URL ? new OpenAICompatibleProvider() : null;
  return cachedProvider;
}

/** Whether semantic search / embeddings are operational on this deployment. */
export function isEmbeddingEnabled(): boolean {
  return getEmbeddingProvider() !== null;
}

/** Normalize free text into a single embeddable string (title + abstract). */
export function buildEmbedText(title: string, abstract: string): string {
  const t = (title ?? "").trim();
  const a = (abstract ?? "").trim();
  return a ? `${t}. ${a}` : t;
}

/** Embed a single query string (used by hybrid search). */
export async function embedQuery(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  if (!provider) throw new Error("embedding provider not configured");
  const [vec] = await provider.embed([text]);
  return vec;
}

/** Embed many documents, preserving order. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const provider = getEmbeddingProvider();
  if (!provider) throw new Error("embedding provider not configured");
  if (texts.length === 0) return [];
  return provider.embed(texts);
}

/**
 * Format a vector as a pgvector literal string `'[v0,v1,...]'`.
 * The surrounding single quotes are REQUIRED: pgvector expects a quoted text
 * literal (`'[...]'::vector`), not a bare `[...]` (which Postgres parses as an
 * array constructor and raises `syntax error at or near "["`). Used by raw SQL
 * distance operators (`<=>`). Numbers are safe to inline.
 */
export function toPgVectorLiteral(vec: number[]): string {
  return `'[${vec.join(",")}]'`;
}
