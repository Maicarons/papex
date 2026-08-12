// AUTO-GENERATED OpenAPI fragment for /api/messages.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/messages": {
      get: {
        tags: ["Messages"],
        summary: "List my messages (requires login)",
        parameters: [{ name: "kind", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "Messages", content: { "application/json": { schema: { type: "object", properties: { messages: { type: "array", items: { type: "object" } } }, unread: { type: "integer" } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Messages"],
        summary: "Message action (e.g. read-all)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["action"], properties: { action: { type: "string", enum: ["read-all"] } } },
            },
          },
        },
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
