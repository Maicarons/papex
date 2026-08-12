// AUTO-GENERATED OpenAPI fragment for /api/admin/messages.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/admin/messages": {
      post: {
        tags: ["Admin"],
        summary: "Broadcast a message (requires message:broadcast)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "body"],
                properties: {
                  scope: { type: "string", enum: ["all", "role", "userIds"], default: "all" },
                  role: { type: "string" },
                  userIds: { type: "array", items: { type: "string" } },
                  kind: { type: "string", enum: ["announcement", "system", "admin_message"], default: "announcement" },
                  title: { type: "string", minLength: 1, maxLength: 200 },
                  body: { type: "string", minLength: 1, maxLength: 5000 },
                  link: { type: "string", maxLength: 500 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Sent", content: { "application/json": { schema: { type: "object", properties: { sent: { type: "integer" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
