// AUTO-GENERATED OpenAPI fragment for /api/admin/ingest.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/admin/ingest": {
      post: {
        tags: ["Admin"],
        summary: "Ingest papers (moderator/admin)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items"],
                properties: {
                  items: {
                    type: "array",
                    minItems: 1,
                    maxItems: 50,
                    items: {
                      type: "object",
                      properties: {
                        pdfUrl: { type: "string" },
                        title: { type: "string" },
                        abstract: { type: "string" },
                        primaryCategoryId: { type: "string" },
                        authors: { type: "array", items: { type: "object" } },
                        doi: { type: "string" },
                        sourceUrl: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Ingested", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, count: { type: "integer" }, results: { type: "array", items: { type: "object" } } } } } } },
          403: { $ref: "#/components/responses/Forbidden" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
