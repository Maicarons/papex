// AUTO-GENERATED OpenAPI fragment for /api/me/orcid/import.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/me/orcid/import": {
      post: {
        tags: ["Users"],
        summary: "Import the user's own publications from their ORCID record",
        description:
          "Fetches public ORCID works; works whose DOI already exists locally are reported as matched, the rest are submitted through the standard external-import pipeline. Rate-limited (2/min).",
        responses: {
          200: {
            description: "Import report",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    total: { type: "integer" },
                    imported: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          doi: { type: "string" },
                          paperId: { type: "string" },
                        },
                      },
                    },
                    matched: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          doi: { type: "string" },
                          paperId: { type: "string" },
                        },
                      },
                    },
                    failed: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          doi: { type: "string", nullable: true },
                          error: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "ORCID not set in profile" },
          401: { $ref: "#/components/responses/Unauthorized" },
          429: { description: "Rate limited" },
          502: { description: "ORCID service unavailable" },
        },
      },
    },
} as const;
