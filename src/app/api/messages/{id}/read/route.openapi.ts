// AUTO-GENERATED OpenAPI fragment for /api/messages/{id}/read.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/messages/{id}/read": {
      post: {
        tags: ["Messages"],
        summary: "Mark a message read (requires login)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
