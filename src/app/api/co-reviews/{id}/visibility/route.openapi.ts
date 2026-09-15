// AUTO-GENERATED OpenAPI fragment for /api/co-reviews/{id}/visibility.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/co-reviews/{id}/visibility": {
      patch: {
        tags: ["CoReviews"],
        summary: "Toggle whether a review is published on the paper page",
        description:
          "Allowed for the assigner or anyone with co_review:manage. Published reviews are only shown once completed.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["public"], properties: { public: { type: "boolean" } } },
            },
          },
        },
        responses: {
          200: { description: "Updated", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, public: { type: "boolean" } } } } } },
          400: { description: "Invalid params" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { description: "Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
