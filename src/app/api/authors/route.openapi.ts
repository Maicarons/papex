// AUTO-GENERATED OpenAPI fragment for /api/authors.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/authors": {
      get: {
        tags: ["Discovery"],
        summary: "Search authors",
        parameters: [{ name: "q", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "Authors", content: { "application/json": { schema: { type: "object", properties: { authors: { type: "array", items: { type: "object", properties: { author: { type: "object" }, affiliation: { type: "object", nullable: true } } } } } } } } },
        },
      },
    },
} as const;
