// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}": {
      get: {
        tags: ["Papers"],
        summary: "Get a paper's detail",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Paper detail",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    paper: { type: "object" },
                    primaryCategory: { type: "object", nullable: true },
                    latest: { type: "object" },
                    authors: { type: "array", items: { $ref: "#/components/schemas/Author" } },
                    categories: { type: "array", items: { type: "object" } },
                    commentCount: { type: "integer" },
                  },
                },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
