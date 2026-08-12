// AUTO-GENERATED OpenAPI fragment for /api/locale.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/locale": {
      post: {
        tags: ["Auth"],
        summary: "Switch locale (sets the locale cookie)",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["locale"], properties: { locale: { type: "string", enum: ["zh", "en"] } } },
            },
          },
        },
        responses: {
          200: { description: "Locale set", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, locale: { type: "string" } } } } } },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
} as const;
