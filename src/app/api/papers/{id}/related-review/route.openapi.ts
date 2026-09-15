// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/related-review.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/related-review": {
      post: {
        tags: ["Papers"],
        summary: "Generate an AI review of a paper's related works",
        description:
          "Reuses the semantic `similarToPaperId` ranking to gather up to 6 related papers and synthesizes a review whose points cite the exact paper ids. Signed-in, rate-limited.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "lang", in: "query", required: false, schema: { type: "string", enum: ["zh", "en"], default: "en" } },
        ],
        responses: {
          200: {
            description: "Review result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
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