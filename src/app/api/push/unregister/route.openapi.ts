// AUTO-GENERATED OpenAPI fragment for /api/push/unregister.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/push/unregister": {
      post: {
        tags: ["Users"],
        summary: "Unregister push device token(s)",
        description:
          "With `deviceToken`: removes only that token (keeps other platforms). Without a body: removes every token of the user.",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { deviceToken: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Unregistered", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
} as const;
