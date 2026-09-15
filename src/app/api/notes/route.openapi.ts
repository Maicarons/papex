// AUTO-GENERATED OpenAPI fragment for /api/notes.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/notes": {
      get: {
        tags: ["Users"],
        summary: "List the current user's notes / highlights (optionally per paper)",
        parameters: [
          { name: "paperId", in: "query", required: false, schema: { type: "string" } },
          { name: "version", in: "query", required: false, schema: { type: "integer", default: 1 } },
        ],
        responses: {
          200: {
            description: "Notes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    notes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          paperId: { type: "string" },
                          version: { type: "integer" },
                          kind: { type: "string", enum: ["highlight", "note"] },
                          page: { type: "integer" },
                          rect: { type: "object", nullable: true },
                          color: { type: "string", nullable: true },
                          content: { type: "string", nullable: true },
                          deletedAt: { type: "string", nullable: true },
                          createdAt: { type: "string" },
                          updatedAt: { type: "string" },
                        },
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
      post: {
        tags: ["Users"],
        summary: "Create a note / highlight",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["paperId"],
                properties: {
                  paperId: { type: "string" },
                  version: { type: "integer", default: 1 },
                  kind: { type: "string", enum: ["highlight", "note"], default: "highlight" },
                  page: { type: "integer", minimum: 0, default: 0 },
                  rect: { type: "object" },
                  color: { type: "string" },
                  content: { type: "string", maxLength: 20000 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { note: { type: "object" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Update a note (owner only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: { type: "string" },
                  content: { type: "string", maxLength: 20000 },
                  color: { type: "string" },
                  rect: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated", content: { "application/json": { schema: { type: "object", properties: { note: { type: "object" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Soft-delete a note (owner only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
            },
          },
        },
        responses: {
          200: { description: "Deleted", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
} as const;
