// AUTO-GENERATED OpenAPI fragment for /api/recommendations.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/recommendations": {
      get: {
        tags: ["Discovery"],
        summary: "Personalized paper recommendations",
        description:
          "Two-tier pool: semantic neighbours of the user's bookmarked papers (when embeddings are configured) first, then most-cited papers per interest category. Signed-in only.",
        responses: {
          200: {
            description: "Recommendations",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    rows: { type: "array", items: { $ref: "#/components/schemas/PaperListItem" } },
                    total: { type: "integer" },
                    semanticUsed: { type: "boolean" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
} as const;
