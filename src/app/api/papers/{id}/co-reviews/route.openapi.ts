// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/co-reviews.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/co-reviews": {
      get: {
        tags: ["Papers"],
        summary: "Public co-reviews for a paper (OpenReview-style)",
        description:
          "Only completed reviews that the assigner explicitly made public. No auth required.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Reviews",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reviews: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          decision: { type: "string", nullable: true, enum: ["approve", "reject", "revise"] },
                          comment: { type: "string", nullable: true },
                          reviewerName: { type: "string", nullable: true },
                          completedAt: { type: "string", nullable: true },
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
} as const;
