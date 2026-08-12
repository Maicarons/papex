// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/versions.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/versions": {
      get: {
        tags: ["Papers"],
        summary: "List a paper's versions",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Versions", content: { "application/json": { schema: { type: "object", properties: { versions: { type: "array", items: { type: "object" } } } } } } },
        },
      },
    },
} as const;
