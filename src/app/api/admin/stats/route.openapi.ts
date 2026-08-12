// AUTO-GENERATED OpenAPI fragment for /api/admin/stats.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/admin/stats": {
      get: {
        tags: ["Admin"],
        summary: "Platform statistics (moderator/admin)",
        responses: {
          200: {
            description: "Stats",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totalPapers: { type: "integer" },
                    byStatus: { type: "array", items: { type: "object" } },
                    byCategory: { type: "array", items: { type: "object" } },
                    submissionsLast14Days: { type: "array", items: { type: "object" } },
                    totalAuthors: { type: "integer" },
                    totalUsers: { type: "integer" },
                    totalComments: { type: "integer" },
                    totalSubscriptions: { type: "integer" },
                    totalCitations: { type: "integer" },
                    pendingReviews: { type: "integer" },
                    topAuthors: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
} as const;
