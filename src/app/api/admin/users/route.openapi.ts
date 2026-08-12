// AUTO-GENERATED OpenAPI fragment for /api/admin/users.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List users (requires user:manage)",
        parameters: [
          { name: "q", in: "query", required: false, schema: { type: "string" } },
          { name: "page", in: "query", required: false, schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", required: false, schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: { description: "Users", content: { "application/json": { schema: { type: "object", properties: { rows: { type: "array", items: { type: "object" } }, total: { type: "integer" }, page: { type: "integer" }, pageSize: { type: "integer" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
} as const;
