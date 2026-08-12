// AUTO-GENERATED OpenAPI fragment for /api/feed.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/feed": {
      get: {
        tags: ["Discovery"],
        summary: "Latest announcements feed (requires login)",
        parameters: [{ name: "markRead", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "Feed", content: { "application/json": { schema: { type: "object", properties: { announcements: { type: "array", items: { type: "object" } } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
} as const;
