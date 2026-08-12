// AUTO-GENERATED OpenAPI fragment for /api/categories.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/categories": {
      get: {
        tags: ["Discovery"],
        summary: "Category tree",
        responses: {
          200: { description: "Categories", content: { "application/json": { schema: { type: "object", properties: { categories: { type: "array", items: { $ref: "#/components/schemas/CategoryNode" } } } } } } },
        },
      },
    },
} as const;
