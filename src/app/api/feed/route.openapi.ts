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
          200: {
            description: "Announcements for the current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["announcements"],
                  properties: {
                    announcements: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "kind", "title", "read", "createdAt"],
                        properties: {
                          id: { type: "integer", description: "Announcement row id." },
                          kind: {
                            type: "string",
                            enum: ["new_in_category", "new_from_author", "comment_reply", "announcement"],
                            description: "What triggered the announcement.",
                          },
                          refId: { type: "string", nullable: true, description: "Related resource id (e.g. paper id), if any." },
                          title: { type: "string" },
                          body: { type: "string", nullable: true },
                          read: { type: "boolean", description: "Whether the user has marked it read." },
                          createdAt: { type: "string", format: "date-time" },
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
        tags: ["Discovery"],
        summary: "Mark a single announcement as read",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: { id: { type: "integer", description: "Announcement id to mark read." } },
              },
            },
          },
        },
        responses: {
          200: { description: "Marked read", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
} as const;
