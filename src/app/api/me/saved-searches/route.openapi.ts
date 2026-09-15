// AUTO-GENERATED OpenAPI fragment for /api/me/saved-searches.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/me/saved-searches": {
      get: {
        tags: ["Users"],
        summary: "List the current user's saved searches (keyword alerts)",
        responses: {
          200: {
            description: "Saved searches",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    searches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          q: { type: "string" },
                          category: { type: "string", nullable: true },
                          semantic: { type: "boolean" },
                          createdAt: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Create (upsert by user+query) a saved search",
        description:
          "Generates a 'search_match' announcement + push when a newly approved paper matches.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["q"],
                properties: {
                  name: { type: "string", maxLength: 120 },
                  q: { type: "string", minLength: 2, maxLength: 200 },
                  category: { type: "string", maxLength: 60 },
                  semantic: { type: "boolean", default: false },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { search: { type: "object" } },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
} as const;