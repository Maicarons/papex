// AUTO-GENERATED OpenAPI fragment for /api/admin/roles/{id}.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/admin/roles/{id}": {
      put: {
        tags: ["Admin"],
        summary: "Set a role's permissions (requires role:manage)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["permissionKeys"], properties: { permissionKeys: { type: "array", items: { type: "string" } } } } } },
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
