// AUTO-GENERATED OpenAPI fragment for /api/auth/refresh.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Exchange a refresh token for a fresh token pair (cross-end clients)",
        description:
          "Public endpoint; the refresh token itself authenticates the request. The token's bound deviceId is authoritative.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                  refreshToken: { type: "string" },
                  deviceId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Fresh token pair",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accessToken: { type: "string" },
                    refreshToken: { type: "string" },
                    user: { type: "object" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid request" },
          401: { description: "Invalid refresh token" },
        },
      },
    },
} as const;
