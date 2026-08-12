// AUTO-GENERATED OpenAPI fragment for /api/messages/stats.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/messages/stats": {
      get: {
        tags: ["Messages"],
        summary: "Unread / total message counts",
        responses: {
          200: { description: "Stats", content: { "application/json": { schema: { type: "object", properties: { unread: { type: "integer" }, total: { type: "integer" } } } } } },
        },
      },
    },
} as const;
