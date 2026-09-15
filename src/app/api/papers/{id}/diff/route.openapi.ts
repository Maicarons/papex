// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/diff.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/diff": {
      get: {
        tags: ["Papers"],
        summary: "Compare two versions of a paper",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "v1", in: "query", required: true, schema: { type: "integer" } },
          { name: "v2", in: "query", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Field-level before/after + abstract line diff",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    version: { type: "object", properties: { from: { type: "integer" }, to: { type: "integer" } } },
                    title: { type: "object" },
                    abstract: {
                      type: "object",
                      properties: {
                        before: { type: "string", nullable: true },
                        after: { type: "string", nullable: true },
                        changed: { type: "boolean" },
                        lines: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              type: { type: "string", enum: ["same", "added", "removed"] },
                              text: { type: "string" },
                            },
                          },
                        },
                      },
                    },
                    authors: { type: "object" },
                    doi: { type: "object" },
                    license: { type: "object" },
                    comments: { type: "object" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid versions" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
