// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/export.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/export": {
      get: {
        tags: ["Papers"],
        summary: "Offline export bundle for a paper (cross-end clients)",
        description:
          "Paper metadata, authors, categories, tags, citation counts, links and PDF URL in one JSON document, so mobile/desktop clients can render it offline.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "version", in: "query", required: false, schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Export bundle",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    paper: { type: "object" },
                    version: { type: "object" },
                    authors: { type: "array", items: { type: "object" } },
                    categories: { type: "array", items: { type: "object" } },
                    tags: { type: "array", items: { type: "object" } },
                    commentCount: { type: "integer" },
                    citationCounts: {
                      type: "object",
                      properties: { incoming: { type: "integer" }, outgoing: { type: "integer" } },
                    },
                    links: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          kind: { type: "string" },
                          url: { type: "string" },
                          title: { type: "string", nullable: true },
                        },
                      },
                    },
                    pdfUrl: { type: "string", nullable: true },
                    exportedAt: { type: "string" },
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
