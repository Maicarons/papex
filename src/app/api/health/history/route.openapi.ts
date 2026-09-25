// AUTO-GENERATED OpenAPI fragment for /api/health/history.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/health/history": {
      get: {
        tags: ["Misc"],
        summary: "Health uptime history",
        description:
          "Daily overall uptime (percent) over the last N days, aggregated from health_checks snapshots. Used by the /status chart.",
        security: [],
        parameters: [
          {
            name: "days",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 90, default: 30 },
            description: "History window in days (1–90).",
          },
        ],
        responses: {
          200: {
            description: "Daily uptime history",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    days: { type: "integer" },
                    overallUptimePercent: { type: ["number", "null"] },
                    totalChecks: { type: "integer" },
                    daily: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          date: { type: "string", example: "2026-09-25" },
                          uptimePercent: { type: ["number", "null"] },
                          checks: { type: "integer" },
                          operational: { type: "integer" },
                          degraded: { type: "integer" },
                          down: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
} as const;
