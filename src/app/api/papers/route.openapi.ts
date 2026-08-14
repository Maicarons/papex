// AUTO-GENERATED OpenAPI fragment for /api/papers.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers": {
      get: {
        tags: ["Papers"],
        summary: "List papers (default: approved)",
        parameters: [
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["pending", "approved", "rejected", "withdrawn"], default: "approved" } },
          { name: "category", in: "query", required: false, schema: { type: "string" } },
          { name: "authorId", in: "query", required: false, schema: { type: "integer" } },
          { name: "q", in: "query", required: false, schema: { type: "string" } },
          { name: "sort", in: "query", required: false, schema: { type: "string", enum: ["new", "updated"], default: "new" } },
          { name: "page", in: "query", required: false, schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", required: false, schema: { type: "integer", default: 20, maximum: 50 } },
        ],
        responses: {
          200: {
            description: "Paper list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    rows: { type: "array", items: { $ref: "#/components/schemas/PaperListItem" } },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    pageSize: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Papers"],
        summary: "Submit a new paper (requires paper:publish)",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["meta"],
                properties: {
                  meta: {
                    type: "string",
                    description:
                      "JSON string of paper fields: title, abstract, primaryCategoryId, secondaryCategoryIds[], authors[], sourceUrl, doi, license, comments, basePaperId",
                  },
                  pdf: {
                    type: "string",
                    format: "binary",
                    description: "Full-text PDF file (≤50MB, optional). Uploaded and stored automatically.",
                  },
                },
              },
            },
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "abstract", "primaryCategoryId", "authors"],
                properties: {
                  title: { type: "string" },
                  abstract: { type: "string" },
                  primaryCategoryId: { type: "string" },
                  secondaryCategoryIds: { type: "array", items: { type: "string" }, default: [] },
                  authors: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      required: ["name"],
                      properties: {
                        name: { type: "string" },
                        orcid: { type: "string" },
                        affiliationId: { type: "integer" },
                        order: { type: "integer", default: 0 },
                      },
                    },
                  },
                  sourceUrl: { type: "string" },
                  doi: { type: "string" },
                  license: { type: "string", default: "CC-BY-4.0" },
                  comments: { type: "string" },
                  basePaperId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    paperId: { type: "string" },
                    version: { type: "integer" },
                    pdf: {
                      type: "object",
                      description: "Present when a PDF was uploaded",
                      properties: {
                        pdfUrl: { type: "string" },
                        pages: { type: "integer" },
                        referencesExtracted: { type: "integer" },
                        referencesLinked: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          400: { $ref: "#/components/responses/BadRequest" },
          413: { description: "PDF exceeds the 50MB limit" },
          500: { description: "ENDORSEMENT_REQUIRED or ID generation failed" },
        },
      },
    },
} as const;
