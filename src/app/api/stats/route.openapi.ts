// AUTO-GENERATED OpenAPI fragment for /api/stats.
export default {
    "/api/stats": {
      get: {
        tags: ["Misc"],
        summary: "Site statistics snapshot",
        description:
          "Latest daily site statistics (papers / users counts) plus a short history. Values come from site_daily_stats, written by the daily cron.",
        security: [],
        parameters: [
          {
            name: "days",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 90, default: 30 },
          },
        ],
        responses: {
          200: {
            description: "Statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    latest: { type: ["object", "null"] },
                    history: { type: "array", items: { type: "object" } },
                    days: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
} as const;
