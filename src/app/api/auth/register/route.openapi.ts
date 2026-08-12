// AUTO-GENERATED OpenAPI fragment for /api/auth/register.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new account",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "email", "displayName", "password"],
                properties: {
                  username: { type: "string", minLength: 3, maxLength: 30, pattern: "^[a-zA-Z0-9_]+$" },
                  email: { type: "string", format: "email" },
                  displayName: { type: "string", minLength: 1, maxLength: 80 },
                  password: { type: "string", minLength: 8, maxLength: 128 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Registered",
            content: {
              "application/json": { schema: { type: "object", properties: { id: { type: "string" }, username: { type: "string" } } } },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          409: { description: "Username or email already taken." },
        },
      },
    },
} as const;
