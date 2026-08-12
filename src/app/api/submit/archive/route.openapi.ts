// AUTO-GENERATED OpenAPI fragment for /api/submit/archive.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/submit/archive": {
      post: {
        tags: ["Misc"],
        summary: "Submit a paper archive bundle (tar.gz, requires login)",
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } } } },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { paperId: { type: "string" }, version: { type: "integer" }, warnings: { type: "array", items: { type: "string" } }, pdfUrl: { type: "string" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          400: { $ref: "#/components/responses/BadRequest" },
          413: { description: "Payload too large (>50MB)" },
        },
      },
    },
} as const;
