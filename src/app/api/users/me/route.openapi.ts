// AUTO-GENERATED OpenAPI fragment for /api/users/me.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/users/me": {
      patch: {
        tags: ["Users"],
        summary: "Update my profile (requires login)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  displayName: { type: "string", minLength: 1, maxLength: 80 },
                  bio: { type: "string", maxLength: 2000 },
                  institution: { type: "string", maxLength: 160 },
                  website: { type: "string", maxLength: 500 },
                  location: { type: "string", maxLength: 120 },
                  orcid: { type: "string", pattern: "^\\d{4}-\\d{4}-\\d{4}-\\d{3}[\\dX]$" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
