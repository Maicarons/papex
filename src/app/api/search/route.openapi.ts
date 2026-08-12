// AUTO-GENERATED OpenAPI fragment for /api/search.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/search": {
      get: {
        tags: ["Discovery"],
        summary: "Search papers (same shape as /api/papers)",
        parameters: [
          { name: "status", in: "query", required: false, schema: { type: "string", default: "approved" } },
          { name: "category", in: "query", required: false, schema: { type: "string" } },
          { name: "authorId", in: "query", required: false, schema: { type: "integer" } },
          { name: "q", in: "query", required: false, schema: { type: "string" } },
          { name: "sort", in: "query", required: false, schema: { type: "string", enum: ["new", "updated"], default: "new" } },
          { name: "page", in: "query", required: false, schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", required: false, schema: { type: "integer", default: 20, maximum: 50 } },
        ],
        responses: {
          200: {
            description: "Search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    rows: { type: "array", items: { $ref: "#/components/schemas/PaperListItem" } },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    pageSize: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
} as const;
