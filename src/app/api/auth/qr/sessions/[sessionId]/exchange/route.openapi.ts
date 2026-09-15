// AUTO-GENERATED OpenAPI fragment for /api/auth/qr/sessions/{sessionId}/exchange.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/auth/qr/sessions/{sessionId}/exchange": {
      post: {
        tags: ["Auth"],
        summary: "Exchange a confirmed QR session for the token pair (one-time)",
        description:
          "The web client redeems a confirmed session; the session is marked consumed so a sessionId can only be exchanged once.",
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Token pair",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accessToken: { type: "string" },
                    refreshToken: { type: "string" },
                    user: { type: "string" },
                  },
                },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
          409: { description: "Session not confirmed / already consumed" },
          410: { description: "Session expired" },
        },
      },
    },
} as const;
