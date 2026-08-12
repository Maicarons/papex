// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/pdf/{version}.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/pdf/{version}": {
      get: {
        tags: ["Papers"],
        summary: "Download a paper PDF (binary)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "version", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "application/pdf stream" },
          400: { $ref: "#/components/responses/BadRequest" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
