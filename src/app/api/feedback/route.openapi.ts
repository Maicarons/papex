// AUTO-GENERATED OpenAPI fragment for /api/feedback.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/feedback": {
      post: {
        tags: ["Misc"],
        summary: "Submit feedback (requires login)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["subject", "message"],
                properties: {
                  type: { type: "string", enum: ["bug", "feature", "other"], default: "other" },
                  subject: { type: "string", minLength: 2, maxLength: 200 },
                  message: { type: "string", minLength: 1, maxLength: 5000 },
                  contact: { type: "string", maxLength: 200 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { ticket: { type: "object" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
