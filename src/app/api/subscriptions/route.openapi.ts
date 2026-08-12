// AUTO-GENERATED OpenAPI fragment for /api/subscriptions.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/subscriptions": {
      get: {
        tags: ["Subscriptions"],
        summary: "List my subscriptions (requires login)",
        responses: {
          200: { description: "Subscriptions", content: { "application/json": { schema: { type: "object", properties: { subscriptions: { type: "array", items: { type: "object" } } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Subscriptions"],
        summary: "Subscribe / unsubscribe (toggle)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "refId"],
                properties: {
                  type: { type: "string", enum: ["category", "author", "paper"] },
                  refId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Toggled", content: { "application/json": { schema: { type: "object", properties: { subscribed: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
      delete: {
        tags: ["Subscriptions"],
        summary: "Unsubscribe",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "refId"],
                properties: {
                  type: { type: "string", enum: ["category", "author", "paper"] },
                  refId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Removed", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
