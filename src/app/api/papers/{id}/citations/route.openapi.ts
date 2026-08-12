// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/citations.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/citations": {
      get: {
        tags: ["Papers"],
        summary: "Get a paper's citation graph",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Citations",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    outgoing: { type: "array", items: { $ref: "#/components/schemas/Citation" } },
                    incoming: { type: "array", items: { $ref: "#/components/schemas/Citation" } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Papers"],
        summary: "Add a citation (owner or staff)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  targetArxivId: { type: "string" },
                  targetDoi: { type: "string" },
                  targetTitle: { type: "string" },
                  targetUrl: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Citation" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
