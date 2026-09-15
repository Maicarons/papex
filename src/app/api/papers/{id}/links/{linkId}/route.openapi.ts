// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/links/{linkId}.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/links/{linkId}": {
      delete: {
        tags: ["Papers"],
        summary: "Remove a code / dataset / website link (owner or staff)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "linkId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Deleted", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { description: "Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
