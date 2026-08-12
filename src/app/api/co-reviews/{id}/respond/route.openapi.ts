// AUTO-GENERATED OpenAPI fragment for /api/co-reviews/{id}/respond.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/co-reviews/{id}/respond": {
      post: {
        tags: ["CoReviews"],
        summary: "Accept/decline a co-review assignment (reviewer)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["accepted"], properties: { accepted: { type: "boolean" } } } } },
        },
        responses: {
          200: { description: "Responded", content: { "application/json": { schema: { type: "object", properties: { review: { type: "object" } } } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          400: { $ref: "#/components/responses/BadRequest" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
