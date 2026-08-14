// AUTO-GENERATED OpenAPI fragment for /api/bookmarks.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/bookmarks": {
      get: {
        tags: ["Bookmarks"],
        summary: "List my bookmarks or check a single paper (requires login)",
        parameters: [{ name: "paperId", in: "query", required: false, schema: { type: "string" }, description: "When provided, returns { bookmarked: boolean } for that paper instead of the full list." }],
        responses: {
          200: {
            description: "Either the bookmark list, or a single-bookmark check.",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      required: ["bookmarks"],
                      properties: {
                        bookmarks: {
                          type: "array",
                          items: {
                            type: "object",
                            required: ["id", "paperId", "paperTitle", "createdAt"],
                            properties: {
                              id: { type: "integer", description: "Bookmark row id." },
                              paperId: { type: "string", description: "Paper id (literature number)." },
                              paperTitle: { type: "string", description: "Resolved paper title." },
                              createdAt: { type: "string", format: "date-time" },
                            },
                          },
                        },
                      },
                    },
                    {
                      type: "object",
                      required: ["bookmarked"],
                      properties: { bookmarked: { type: "boolean", description: "Whether the current user bookmarked paperId." } },
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Bookmarks"],
        summary: "Toggle a bookmark",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["paperId"],
                properties: { paperId: { type: "string", description: "Paper id to bookmark / un-bookmark." } },
              },
            },
          },
        },
        responses: {
          200: { description: "Toggled", content: { "application/json": { schema: { type: "object", properties: { bookmarked: { type: "boolean", description: "true if now bookmarked, false if removed." } } } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      delete: {
        tags: ["Bookmarks"],
        summary: "Remove a bookmark",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["paperId"],
                properties: { paperId: { type: "string", description: "Paper id to remove from bookmarks." } },
              },
            },
          },
        },
        responses: {
          200: { description: "Removed", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
} as const;
