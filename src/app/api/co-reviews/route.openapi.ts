// AUTO-GENERATED OpenAPI fragment for /api/co-reviews.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/co-reviews": {
      get: {
        tags: ["CoReviews"],
        summary: "List co-reviews (mine, or all with co_review:manage)",
        parameters: [{ name: "scope", in: "query", required: false, schema: { type: "string", enum: ["mine", "all"] } }],
        responses: {
          200: { description: "Co-reviews", content: { "application/json": { schema: { type: "object", properties: { reviews: { type: "array", items: { type: "object" } } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["CoReviews"],
        summary: "Assign a co-review (requires co_review:assign)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["paperId", "reviewerId"],
                properties: {
                  paperId: { type: "string" },
                  reviewerId: { type: "string" },
                  note: { type: "string", maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { review: { type: "object" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
