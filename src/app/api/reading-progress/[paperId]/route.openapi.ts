// AUTO-GENERATED OpenAPI fragment for /api/reading-progress/{paperId}.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/reading-progress/{paperId}": {
      get: {
        tags: ["Users"],
        summary: "Get reading progress for a paper version",
        parameters: [
          { name: "paperId", in: "path", required: true, schema: { type: "string" } },
          { name: "version", in: "query", required: false, schema: { type: "integer", default: 1 } },
        ],
        responses: {
          200: {
            description: "Progress",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    progress: {
                      type: "object",
                      nullable: true,
                      properties: {
                        paperId: { type: "string" },
                        version: { type: "integer" },
                        page: { type: "integer" },
                        percent: { type: "integer", minimum: 0, maximum: 100 },
                        updatedAt: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Upsert reading progress for a paper version (cross-device sync)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  page: { type: "integer", minimum: 0, default: 0 },
                  percent: { type: "integer", minimum: 0, maximum: 100, default: 0 },
                  version: { type: "integer", default: 1 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Upserted", content: { "application/json": { schema: { type: "object", properties: { progress: { type: "object" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
} as const;
