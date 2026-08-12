// AUTO-GENERATED OpenAPI fragment for /api/auth/logout.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out (clear session cookie)",
        security: [],
        responses: {
          200: { description: "Logged out", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
        },
      },
    },
} as const;
