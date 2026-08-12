// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/comments.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/comments": {
      get: {
        tags: ["Papers"],
        summary: "Get a paper's comment thread (tree)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Comments", content: { "application/json": { schema: { type: "object", properties: { comments: { type: "array", items: { $ref: "#/components/schemas/CommentNode" } } } } } } },
        },
      },
      post: {
        tags: ["Papers"],
        summary: "Post a comment (requires comment:create)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["body"],
                properties: { body: { type: "string", minLength: 1, maxLength: 5000 }, parentId: { type: "integer" } },
              },
            },
          },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { comment: { type: "object" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
