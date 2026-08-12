// AUTO-GENERATED OpenAPI fragment for /api/auth/me.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user profile (null if anonymous)",
        security: [],
        responses: {
          200: {
            description: "Current user or null",
            content: {
              "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User", nullable: true } } } },
            },
          },
        },
      },
    },
} as const;
