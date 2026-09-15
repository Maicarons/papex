// AUTO-GENERATED OpenAPI fragment for /api/push/vapid.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/push/vapid": {
      get: {
        tags: ["Misc"],
        summary: "VAPID public key for Web Push subscriptions",
        description:
          "Public. `enabled: false` when Web Push is not configured on this deployment.",
        responses: {
          200: {
            description: "VAPID info",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    enabled: { type: "boolean" },
                    publicKey: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
} as const;
