// AUTO-GENERATED OpenAPI fragment for /api/admin/users/{id}.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/admin/users/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update a user's roles/permissions (user:manage / permission:manage)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  roleKeys: { type: "array", items: { type: "string" } },
                  permission: { type: "object", properties: { key: { type: "string" }, grant: { type: "boolean", nullable: true } } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
