import { chatJson, isAiEnabled } from "./provider";

/**
 * AI-assisted summaries (P1-C): paper TLDR + key points.
 *
 * Provenance contract: the model is told it MUST quote evidence verbatim from
 * the abstract for every claim, and the response is validated server-side
 * before it is ever shown — claims without usable evidence are dropped and
 * confidence is clamped to [0,1]. This is what keeps the feature safe to
 * self-host (no unverifiable hallucinated claims reach the user).
 */

export interface AiPoint {
  claim: string;
  evidence: string;
  /** 0..1 — how directly the abstract supports the claim. */
  confidence: number;
}

export interface AiSummary {
  summary: string;
  points: AiPoint[];
}

const SYSTEM_PROMPT = `You are a research assistant. Given a paper title and abstract, produce a concise TLDR plus 3-6 key points.

STRICT REQUIREMENTS:
- Respond with valid JSON only, in exactly this shape:
  {"summary": string, "points": [{"claim": string, "evidence": string, "confidence": number}]}
- Every "evidence" MUST be a verbatim or near-verbatim quote from the abstract (a substring of it). If you cannot find supporting text in the abstract, omit that point.
- "confidence" is 0..1 and reflects how directly the abstract supports the claim.
- Do not add facts, numbers or conclusions that are not in the abstract. If the abstract is empty, set summary to a short statement saying so and points to [].
- No markdown, no commentary outside the JSON object.`;

function normalizePoints(raw: unknown, abstract: string): AiPoint[] {
  if (!Array.isArray(raw)) return [];
  const points: AiPoint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const claim = typeof p.claim === "string" ? p.claim.trim() : "";
    const evidence = typeof p.evidence === "string" ? p.evidence.trim() : "";
    if (!claim || !evidence) continue;
    // Enforce the provenance contract: the evidence must actually occur in the
    // abstract (the model's quotes are short, so a normalized contains check is
    // enough). Points whose evidence can't be located are dropped.
    const haystack = abstract.replace(/\s+/g, " ").toLowerCase();
    const needle = evidence.replace(/\s+/g, " ").toLowerCase();
    if (needle.length < 12 || !haystack.includes(needle)) continue;
    const confidence = Math.max(0, Math.min(1, Number(p.confidence) || 0.5));
    points.push({ claim, evidence, confidence });
    if (points.length >= 6) break;
  }
  return points;
}

export function normalizeSummary(raw: unknown, abstract: string): AiSummary {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const summary =
    typeof obj.summary === "string" && obj.summary.trim() ? obj.summary.trim() : "";
  return { summary, points: normalizePoints(obj.points, abstract) };
}

export async function generateTldr(input: {
  title: string;
  abstract: string | null;
  language?: string;
}): Promise<AiSummary> {
  if (!isAiEnabled()) throw new Error("AI not configured");
  const abstract = (input.abstract ?? "").trim();
  const lang = input.language === "zh" ? "Chinese" : "English";
  const raw = await chatJson(
    SYSTEM_PROMPT,
    `Title: ${input.title}\n\nAbstract:\n${abstract || "(empty)"}\n\nRespond in ${lang}.`,
  );
  return normalizeSummary(raw, abstract);
}
