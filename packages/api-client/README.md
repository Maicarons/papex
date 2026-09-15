# @papex/api-client

Zero-dependency, typed client for the Papex HTTP API — the shared API surface
for **cross-end clients** (Phase 0 of `多端扩展方案-桌面与移动.md`). The web
app, a React Native app and an Electron desktop app can all talk to the same
backend through this client.

- **No runtime dependencies** — works in browsers, React Native and Node 18+.
- The server's OpenAPI document (`GET /api/openapi.json`) is the source of
  truth; regenerate types from it when the API grows (or hand-extend the
  interfaces here, mirroring the fragments in `src/app/api/**/route.openapi.ts`).
- Auth is a pluggable token provider, so each platform keeps its own token
  storage (secure storage / Keychain / safeStorage).

## Usage

```ts
import { PapexClient } from "@papex/api-client";

const client = new PapexClient({
  baseUrl: "https://papex.example.com",
  accessToken: () => mySecureStore.get("accessToken"),
  onRefresh: async (pair) => mySecureStore.set("tokens", pair),
});

// public
const { rows } = await client.listPapers({ q: "LLM", semantic: true, pageSize: 10 });
const bundle = await client.exportPaper(rows[0].paper.id); // offline bundle

// signed-in
const recs = await client.recommendations();
await client.putReadingProgress("abc123", { percent: 40, page: 3 });
await client.createNote({ paperId: "abc123", kind: "highlight", content: "…" });
await client.registerPushDevice(JSON.stringify(subscription), "web");
```

## QR login (web <- app confirm)

The flow for logging a **web** client in via the **app**:

1. Web: `POST /api/auth/qr/sessions` → render `papex:login:{sessionId}` as QR.
2. App: scan the code, then with its own Bearer session call
   `POST /api/auth/qr/sessions/{sessionId}/confirm`.
3. Web: poll `GET /api/auth/qr/sessions/{sessionId}` until `confirmed`, then
   one-time `POST /api/auth/qr/sessions/{sessionId}/exchange` → token pair.

## Development

```bash
cd packages/api-client
npm run build   # tsc -> dist/
```

Keep this package decoupled from the Next.js app: no imports from `@/`.
