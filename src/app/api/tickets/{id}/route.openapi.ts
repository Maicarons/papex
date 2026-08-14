// AUTO-GENERATED OpenAPI fragment for /api/tickets/{id}.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/tickets/{id}": {
      get: {
        tags: ["Tickets"],
        summary: "Get a ticket with replies (owner or staff)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Ticket", content: { "application/json": { schema: { type: "object", properties: { ticket: { type: "object" }, replies: { type: "array", items: { type: "object" } } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      post: {
        tags: ["Tickets"],
        summary: "Reply to a ticket (owner or staff); auto-advances status",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["body"], properties: { body: { type: "string", minLength: 1, maxLength: 5000 } } } } },
        },
        responses: {
          201: { description: "Replied (status = new ticket status)", content: { "application/json": { schema: { type: "object", properties: { reply: { type: "object" }, status: { type: "string" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Tickets"],
        summary: "Update ticket status/priority (staff: any status; owner: resolve or reopen)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["open", "awaiting_user", "in_progress", "resolved", "closed"] },
                  priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated", content: { "application/json": { schema: { type: "object", properties: { ticket: { type: "object" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
