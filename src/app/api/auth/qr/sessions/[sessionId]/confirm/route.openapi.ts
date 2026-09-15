// AUTO-GENERATED OpenAPI fragment for /api/auth/qr/sessions/{sessionId}/confirm.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/auth/qr/sessions/{sessionId}/confirm": {
      post: {
        tags: ["Auth"],
        summary: "Confirm a QR login session from the app (signed-in)",
        description:
          "The app (with its own Bearer session) confirms the scanned code; a fresh token pair is minted for the web client and held until exchanged.",
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  deviceName: { type: "string", maxLength: 120 },
                  platform: { type: "string", maxLength: 40 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Confirmed" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { description: "Session already processed" },
          410: { description: "Session expired" },
        },
      },
    },
} as const;
