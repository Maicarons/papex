// AUTO-GENERATED OpenAPI fragment for /api/me/devices.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/me/devices": {
      get: {
        tags: ["Users"],
        summary: "List the current user's logged-in devices (cross-end sync)",
        responses: {
          200: {
            description: "Devices",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { devices: { type: "array", items: { type: "object" } } },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Revoke all devices (optional: keep the current one)",
        description: "Logs out other devices by revoking their refresh tokens.",
        responses: {
          200: { description: "Revoked", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, revoked: { type: "integer" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
} as const;
