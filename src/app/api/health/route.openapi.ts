// AUTO-GENERATED OpenAPI fragment for /api/health.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/health": {
      get: {
        tags: ["Misc"],
        summary: "Health check",
        security: [],
        responses: {
          200: {
            description: "Health",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    service: { type: "string" },
                    time: { type: "string", format: "date-time" },
                    overall: { type: "string", enum: ["operational", "degraded", "down"] },
                    components: { type: "array", items: { $ref: "#/components/schemas/HealthComponent" } },
                    uptime: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
} as const;
