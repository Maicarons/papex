// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/citations/complete.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
  "/api/papers/{id}/citations/complete": {
    post: {
      tags: ["Papers"],
      summary: "Backfill a paper's citations from external sources",
      description:
        "Fetch the paper's reference list from Semantic Scholar / OpenCitations using its stored DOI / arXiv id, and link any references that resolve to local papers. Staff or paper owner only.",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: {
          description: "Backfill result",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean" },
                  paperId: { type: "string" },
                  fetched: { type: "integer" },
                  linked: { type: "integer" },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
        502: { description: "Upstream fetch failed" },
      },
    },
  },
} as const;
