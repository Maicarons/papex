// AUTO-GENERATED OpenAPI fragment for /api/co-reviews/{id}.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/co-reviews/{id}": {
      get: {
        tags: ["CoReviews"],
        summary: "Get a co-review (reviewer or co_review:manage)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Co-review", content: { "application/json": { schema: { type: "object", properties: { review: { type: "object" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
