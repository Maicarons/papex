// AUTO-GENERATED OpenAPI fragment for /api/auth/qr/sessions.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/auth/qr/sessions": {
      post: {
        tags: ["Auth"],
        summary: "Create a QR-code login session (web <- app confirm)",
        description:
          "The web client renders `papex:login:{sessionId}` as a QR code, then polls GET /api/auth/qr/sessions/{sessionId}.",
        responses: {
          201: {
            description: "Session created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessionId: { type: "string" },
                    expiresAt: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
} as const;
