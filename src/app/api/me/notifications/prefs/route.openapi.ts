// AUTO-GENERATED OpenAPI fragment for /api/me/notifications/prefs.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/me/notifications/prefs": {
      get: {
        tags: ["Users"],
        summary: "Per-kind push notification preferences (effective on/off)",
        description:
          "Opt-out model — a missing row means enabled by default. Returns a map kind -> boolean.",
        responses: {
          200: {
            description: "Preferences",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    prefs: {
                      type: "object",
                      additionalProperties: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Update per-kind push preferences",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["prefs"],
                properties: {
                  prefs: {
                    type: "object",
                    additionalProperties: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
} as const;