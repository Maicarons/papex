// AUTO-GENERATED OpenAPI fragment for /api/endorsements.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/endorsements": {
      get: {
        tags: ["Endorsements"],
        summary: "List endorsements (requires login)",
        parameters: [
          { name: "endorseeId", in: "query", required: false, schema: { type: "string" } },
          { name: "endorserId", in: "query", required: false, schema: { type: "string" } },
          { name: "categoryId", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Endorsements", content: { "application/json": { schema: { type: "object", properties: { items: { type: "array", items: { type: "object" } } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Endorsements"],
        summary: "Endorse a user for a category (requires endorse:create)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["endorseeId", "categoryId"],
                properties: { endorseeId: { type: "string" }, categoryId: { type: "string" } },
              },
            },
          },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { endorsement: { type: "object" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
