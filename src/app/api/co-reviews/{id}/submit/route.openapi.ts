// AUTO-GENERATED OpenAPI fragment for /api/co-reviews/{id}/submit.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/co-reviews/{id}/submit": {
      post: {
        tags: ["CoReviews"],
        summary: "Submit a co-review decision (reviewer)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["decision", "comment"],
                properties: {
                  decision: { type: "string", enum: ["approve", "reject", "revise"] },
                  comment: { type: "string", minLength: 1, maxLength: 5000 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Submitted", content: { "application/json": { schema: { type: "object", properties: { review: { type: "object" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          400: { $ref: "#/components/responses/BadRequest" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
