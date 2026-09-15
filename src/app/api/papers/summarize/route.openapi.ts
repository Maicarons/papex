// AUTO-GENERATED OpenAPI fragment for /api/papers/summarize.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/summarize": {
      post: {
        tags: ["Discovery"],
        summary: "Generate an AI review of the top papers for a query (RAG corpus review)",
        description:
          "Retrieves the top-k papers (semantic when embeddings are configured, keyword otherwise) and synthesizes a review whose points cite the exact paper ids. Signed-in, rate-limited.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["q"],
                properties: {
                  q: { type: "string", minLength: 2, maxLength: 500 },
                  topK: { type: "integer", minimum: 1, maximum: 8, default: 5 },
                  lang: { type: "string", enum: ["zh", "en"], default: "en" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Review result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    q: { type: "string" },
                    title: { type: "string" },
                    points: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          claim: { type: "string" },
                          paperId: { type: "string" },
                          evidence: { type: "string" },
                          confidence: { type: "number" },
                        },
                      },
                    },
                    papers: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { id: { type: "string" }, title: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          429: { description: "Rate limited" },
          503: { description: "AI service not configured" },
        },
      },
    },
} as const;
