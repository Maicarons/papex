// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/pdf.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/pdf": {
      post: {
        tags: ["Papers"],
        summary: "Upload / generate a paper PDF (owner or staff)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", required: ["pdf"], properties: { pdf: { type: "string", format: "binary" } } } } },
        },
        responses: {
          200: {
            description: "Stored",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    storedPath: { type: "string" },
                    pdfUrl: { type: "string" },
                    pages: { type: "integer" },
                    referencesExtracted: { type: "boolean" },
                    referencesLinked: { type: "boolean" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          400: { $ref: "#/components/responses/BadRequest" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
