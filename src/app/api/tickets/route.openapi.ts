// AUTO-GENERATED OpenAPI fragment for /api/tickets.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/tickets": {
      get: {
        tags: ["Tickets"],
        summary: "List tickets (mine, or all for staff)",
        parameters: [
          { name: "scope", in: "query", required: false, schema: { type: "string", enum: ["mine", "all"] } },
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["open", "awaiting_user", "in_progress", "resolved", "closed"] } },
        ],
        responses: {
          200: { description: "Tickets", content: { "application/json": { schema: { type: "object", properties: { tickets: { type: "array", items: { type: "object" } } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Tickets"],
        summary: "Create a ticket (requires login)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["subject", "message"],
                properties: {
                  subject: { type: "string", minLength: 2, maxLength: 200 },
                  type: { type: "string", enum: ["bug", "feature", "other"], default: "other" },
                  priority: { type: "string", enum: ["low", "normal", "high", "urgent"], default: "normal" },
                  message: { type: "string", minLength: 1, maxLength: 5000 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { ticket: { type: "object" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
