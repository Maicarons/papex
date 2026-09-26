// AUTO-GENERATED OpenAPI fragment for /api/stats/cron.
export default {
    "/api/stats/cron": {
      get: {
        tags: ["Misc"],
        summary: "Record daily site statistics",
        description:
          "Upserts today's paper/user counters into site_daily_stats. Called by Vercel Cron (and from /api/health/cron). Honors CRON_SECRET when set.",
        security: [],
        responses: {
          200: {
            description: "Snapshot recorded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    snapshot: { type: "object" },
                  },
                },
              },
            },
          },
          401: { description: "Missing or invalid CRON_SECRET" },
        },
      },
      post: {
        tags: ["Misc"],
        summary: "Record daily site statistics",
        security: [],
        responses: {
          200: { description: "Snapshot recorded" },
          401: { description: "Missing or invalid CRON_SECRET" },
        },
      },
    },
} as const;
