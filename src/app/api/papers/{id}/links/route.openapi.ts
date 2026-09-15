// AUTO-GENERATED OpenAPI fragment for /api/papers/{id}/links.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/papers/{id}/links": {
      get: {
        tags: ["Papers"],
        summary: "List a paper's code / dataset / website links",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Links",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    links: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          kind: { type: "string", enum: ["repository", "dataset", "website"] },
                          url: { type: "string" },
                          title: { type: "string", nullable: true },
                          addedById: { type: "string", nullable: true },
                          createdAt: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Papers"],
        summary: "Add a code / dataset / website link (owner or staff)",
        description:
          "Only metadata is stored — no content is fetched or mirrored. GitHub URLs get an auto-detected title (owner/repo).",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["url"],
                properties: {
                  kind: { type: "string", enum: ["repository", "dataset", "website"], default: "website" },
                  url: { type: "string", maxLength: 1000 },
                  title: { type: "string", maxLength: 200 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { link: { type: "object" } } } } } },
          400: { description: "Invalid URL / params" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
} as const;
