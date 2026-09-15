// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/ai.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/ai": {
      get: {
        tags: ["Papers"],
        summary: "Get cached AI summary (TLDR) for a paper version",
        description:
          "Public, cost-free: returns the validated, provenance-checked AI summary if one has been generated. `enabled: false` when no LLM backend is configured.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "version", in: "query", required: false, schema: { type: "integer", default: 1 } },
        ],
        responses: {
          200: {
            description: "AI summary (or enabled=false)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    model: { type: "string" },
                    summary: {
                      type: "object",
                      nullable: true,
                      properties: {
                        summary: { type: "string" },
                        points: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              claim: { type: "string" },
                              evidence: { type: "string" },
                              confidence: { type: "number", minimum: 0, maximum: 1 },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Papers"],
        summary: "Generate (and cache) an AI TLDR with provenance for a paper version",
        description:
          "Signed-in, rate-limited (10/min/user). Every point's `evidence` must be a verbatim quote from the abstract, enforced server-side.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "version", in: "query", required: false, schema: { type: "integer", default: 1 } },
          { name: "lang", in: "query", required: false, schema: { type: "string", enum: ["zh", "en"], default: "en" } },
        ],
        responses: {
          200: {
            description: "Generated summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    fromCache: { type: "boolean" },
                    summary: {
                      type: "object",
                      properties: {
                        summary: { type: "string" },
                        points: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              claim: { type: "string" },
                              evidence: { type: "string" },
                              confidence: { type: "number" },
                            },
                          },
                        },
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
