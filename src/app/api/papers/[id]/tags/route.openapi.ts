// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/tags.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/tags": {
      post: {
        tags: ["Papers"],
        summary: "Attach a tag to a paper",
        description:
          "Attach a tag by id, or by name (created on the fly). Requires the paper owner or a moderator/admin.",
        security: [{ session: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tagId: { type: "integer" },
                  name: { type: "string", maxLength: 40 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Attached",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tag: {
                      type: "object",
                      properties: { id: { type: "integer" }, name: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
      delete: {
        tags: ["Papers"],
        summary: "Detach a tag from a paper",
        security: [{ session: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "tagId", in: "query", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Detached" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
} as const;
