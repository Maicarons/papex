// AUTO-GENERATED OpenAPI fragment for /api/settings/api-keys.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/settings/api-keys": {
      get: {
        tags: ["Users"],
        summary: "List my API keys (requires login)",
        responses: {
          200: { description: "API keys", content: { "application/json": { schema: { type: "object", properties: { apiKeys: { type: "array", items: { $ref: "#/components/schemas/ApiKey" } } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Create an API key (requires login)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 80 },
                  scopes: { type: "array", items: { type: "string", enum: ["read", "write"] }, minItems: 1, maxItems: 2, default: ["read", "write"] },
                  environment: { type: "string", enum: ["live", "test"], default: "live" },
                  expiresAt: { type: "string", format: "date-time", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created — `token` is returned only once",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    apiKey: {
                      allOf: [{ $ref: "#/components/schemas/ApiKey" }],
                      type: "object",
                      properties: { token: { type: "string", description: "Raw secret (pk_live_…). Shown once." } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Revoke an API key (requires login)",
        parameters: [{ name: "id", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Revoked", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          400: { $ref: "#/components/responses/BadRequest" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
