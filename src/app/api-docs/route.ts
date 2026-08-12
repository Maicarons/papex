// Scalar-based interactive API reference. Loads the OpenAPI document from
// /api/openapi.json and renders a dark, Try-it-capable explorer.
export const dynamic = "force-static";

const SCALAR_CDN = "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.28.5/dist/browser/standalone.min.js";

export async function GET() {
  const specUrl = "/api/openapi.json";

  const html = `<!doctype html>
<html lang="zh">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Papex API 文档 · Papex API Reference</title>
    <style>
      :root { color-scheme: dark; }
      html, body { margin: 0; padding: 0; background: #0d1117; }
      .loading {
        position: fixed; inset: 0; display: flex; align-items: center;
        justify-content: center; color: #8b949e; font-family: system-ui, sans-serif;
      }
    </style>
    <script src="${SCALAR_CDN}"></script>
  </head>
  <body>
    <div class="loading">加载 API 文档中…</div>
    <script>
      window.addEventListener("DOMContentLoaded", function () {
        Scalar.createApiReference(document.body, {
          url: "${specUrl}",
          hideDownloadButton: false,
          theme: "default",
          layout: "modern",
          defaultOpenAllTags: false,
          metaData: {
            title: "Papex API Reference",
            description: "Papex 学术文献平台 REST API",
          },
        });
      });
    </script>
  </body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
