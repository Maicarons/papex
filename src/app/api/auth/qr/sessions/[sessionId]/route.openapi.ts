// AUTO-GENERATED OpenAPI fragment for /api/auth/qr/sessions/{sessionId}.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/auth/qr/sessions/{sessionId}": {
      get: {
        tags: ["Auth"],
        summary: "Poll a QR login session (web client)",
        description:
          "Returns pending / confirmed / expired; on confirmed also returns the confirmed user's public profile.",
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Session state",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["pending", "confirmed", "expired", "consumed"] },
                    user: {
                      type: "object",
                      nullable: true,
                      properties: {
                        id: { type: "string" },
                        username: { type: "string" },
                        displayName: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
} as const;
