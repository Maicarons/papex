import { chatJson, isAiEnabled } from "./provider";

/**
 * Corpus review synthesis (P1-C "RAG 综述"): given a set of retrieved papers
 * (id + title + abstract), the LLM writes a short review whose points cite the
 * source papers. Validation mirrors tldr.ts — every point must name one of the
 * provided paper ids and quote evidence from its abstract, so the review is
 * fully traceable to the retrieved corpus.
 */

export interface ReviewPoint {
  claim: string;
  paperId: string;
  evidence: string;
  /** 0..1 — how directly the cited abstract supports the claim. */
  confidence: number;
}

export interface ReviewResult {
  title: string;
  points: ReviewPoint[];
}

const SYSTEM_PROMPT = `You are a research assistant synthesizing a short review from a list of papers, each given as "id", "title" and "abstract".

STRICT REQUIREMENTS:
- Respond with valid JSON only, in exactly this shape:
  {"title": string, "points": [{"claim": string, "paperId": string, "evidence": string, "confidence": number}]}
- Write 3-5 points. Each point MUST name the exact "id" of the paper it derives from, and "evidence" MUST be a verbatim or near-verbatim quote from that paper's abstract.
- "confidence" is 0..1 and reflects how directly the cited abstract supports the claim.
- Only make claims supported by the provided abstracts. Do not use external knowledge.
- No markdown or commentary outside the JSON object.`;

export function normalizeReview(raw: unknown, allowedIds: Set<string>): ReviewResult {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const title = typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : "";
  const points: ReviewPoint[] = [];
  if (Array.isArray(obj.points)) {
    for (const item of obj.points) {
      if (!item || typeof item !== "object") continue;
      const p = item as Record<string, unknown>;
      const claim = typeof p.claim === "string" ? p.claim.trim() : "";
      const paperId = typeof p.paperId === "string" ? p.paperId.trim() : "";
      const evidence = typeof p.evidence === "string" ? p.evidence.trim() : "";
      if (!claim || !evidence || !allowedIds.has(paperId)) continue;
      const confidence = Math.max(0, Math.min(1, Number(p.confidence) || 0.5));
      points.push({ claim, paperId, evidence, confidence });
      if (points.length >= 8) break;
    }
  }
  return { title, points };
}

export async function generateReview(input: {
  papers: { id: string; title: string; abstract: string | null }[];
  language?: string;
}): Promise<ReviewResult> {
  if (!isAiEnabled()) throw new Error("AI not configured");
  const lang = input.language === "zh" ? "Chinese" : "English";
  const list = input.papers
    .map(
      (p, i) =>
        `${i + 1}. id=${p.id}\n   Title: ${p.title}\n   Abstract: ${(p.abstract ?? "").trim() || "(empty)"}`,
    )
    .join("\n\n");
  const raw = await chatJson(SYSTEM_PROMPT, `Papers:\n\n${list}\n\nRespond in ${lang}.`);
  return normalizeReview(raw, new Set(input.papers.map((p) => p.id)));
}
