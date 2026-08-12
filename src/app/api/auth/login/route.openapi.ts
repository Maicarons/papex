// AUTO-GENERATED OpenAPI fragment for /api/auth/login.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in (issue session cookie)",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["identifier", "password"],
                properties: {
                  identifier: { type: "string", description: "Username or email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Logged in",
            content: {
              "application/json": { schema: { type: "object", properties: { id: { type: "string" }, username: { type: "string" } } } },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
} as const;
