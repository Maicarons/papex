// AUTO-GENERATED OpenAPI fragment for /api/push/register.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/push/register": {
      post: {
        tags: ["Users"],
        summary: "Register a push device token",
        description:
          "Upserts on (userId, token). For Web Push the `deviceToken` is the JSON-serialized PushSubscription.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["deviceToken"],
                properties: {
                  deviceToken: { type: "string", minLength: 8, maxLength: 512 },
                  platform: { type: "string", default: "unknown" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Registered", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
} as const;
