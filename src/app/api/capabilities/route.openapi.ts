// AUTO-GENERATED OpenAPI fragment for /api/capabilities.
// Source of truth for this route's API docs. Edit here, then run:
//   npm run openapi:generate
// (it is wired into predev / prebuild automatically)

export default {
    "/api/capabilities": {
      get: {
        tags: ["Misc"],
        summary: "Server capabilities",
        description:
          "Reports which optional features are available on this deployment. " +
          "`pdfUpload` is false when PDF storage is unavailable (no writable local " +
          "directory and no S3 configuration). `latex` is false when the server " +
          "lacks a LaTeX toolchain, disabling online authoring and source-package " +
          "submission.",
        security: [],
        responses: {
          200: {
            description: "Capabilities",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    pdfUpload: { type: "boolean" },
                    latex: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    },
} as const;
