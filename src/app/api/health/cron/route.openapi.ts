// AUTO-GENERATED OpenAPI fragment for /api/health/cron.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/health/cron": {
      get: {
        tags: ["Misc"],
        summary: "Scheduled health probe",
        description:
          "Forces a health snapshot into health_checks for the uptime chart. Called by Vercel Cron and GitHub Actions; when CRON_SECRET is set the Authorization: Bearer <secret> header is required.",
        security: [],
        responses: {
          200: {
            description: "Probe recorded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    time: { type: "string", format: "date-time" },
                    overall: { type: "string", enum: ["operational", "degraded", "down"] },
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
        summary: "Scheduled health probe",
        description: "Same as GET; accepts POST from CI schedulers.",
        security: [],
        responses: {
          200: {
            description: "Probe recorded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    time: { type: "string", format: "date-time" },
                    overall: { type: "string", enum: ["operational", "degraded", "down"] },
                  },
                },
              },
            },
          },
          401: { description: "Missing or invalid CRON_SECRET" },
        },
      },
    },
} as const;
