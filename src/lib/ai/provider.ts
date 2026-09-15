/**
 * Pluggable LLM layer (P1-C).
 *
 * Zero hard dependencies: the only backend shipped is an OpenAI-compatible
 * /chat/completions endpoint (OpenAI, Together, Groq, local vLLM, Ollama with
 * an OpenAI-compatible route, SiliconFlow, etc.). Self-host friendly — when
 * AI_API_URL is unset the feature is simply disabled (`isAiEnabled() === false`)
 * and the UI hides the AI entry points, same pattern as the embedding layer.
 *
 * Responses are requested as JSON (`response_format: json_object`) so the
 * caller gets structured, validatable output; the prompt contract is what
 * enforces provenance (every claim must quote its evidence from the abstract).
 */

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

/** Whether the AI assistant layer is operational on this deployment. */
export function isAiEnabled(): boolean {
  return !!process.env.AI_API_URL && !!process.env.AI_API_MODEL;
}

/** Extract a JSON payload from a completion, tolerating ``` fences. */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1].trim() : trimmed;
  return JSON.parse(candidate);
}

/**
 * Run a chat completion and parse the response as JSON.
 * Throws when the endpoint is missing, errors, or returns invalid JSON.
 */
export async function chatJson(system: string, user: string): Promise<unknown> {
  const baseUrl = (process.env.AI_API_URL ?? "").replace(/\/+$/, "");
  const model = process.env.AI_API_MODEL;
  if (!baseUrl || !model) throw new Error("AI provider not configured");
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.AI_API_KEY ? { authorization: `Bearer ${process.env.AI_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      // OpenAI-compatible; backends that ignore it still return parseable text.
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI endpoint ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as ChatCompletionResponse;
  if (json.error?.message) throw new Error(`AI error: ${json.error.message}`);
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response");
  try {
    return extractJson(content);
  } catch {
    throw new Error("AI returned non-JSON output");
  }
}
