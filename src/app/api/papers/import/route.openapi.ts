// AUTO-GENERATED OpenAPI fragment for /api/papers/import.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
  "/api/papers/import": {
    post: {
      tags: ["Papers"],
      summary: "Import a paper from Crossref / arXiv / Semantic Scholar",
      description:
        "Import metadata (and optionally references) by DOI, arXiv id, or URL. Moderator/admin only. Idempotent: re-importing an existing identifier returns the existing paper.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                doi: { type: "string", description: "e.g. 10.1000/xyz123" },
                arxivId: { type: "string", description: "e.g. 2310.12345" },
                url: { type: "string", format: "uri" },
                backfillCitations: {
                  type: "boolean",
                  description: "Also fetch + link the paper's reference list",
                },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Imported (new paper created)" },
        200: { description: "Already imported (existing paper returned)" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        400: { $ref: "#/components/responses/BadRequest" },
        502: { description: "Upstream fetch failed" },
      },
    },
  },
} as const;
