// AUTO-GENERATED OpenAPI fragment for /api/me/devices/{id}.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/me/devices/{id}": {
      delete: {
        tags: ["Users"],
        summary: "Revoke a single device",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Revoked", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
