/**
 * @papex/api-client — zero-dependency typed client for the Papex HTTP API.
 *
 * Phase 0 of the cross-end plan (多端扩展方案): a shared API surface that the
 * web app, React Native and Electron clients can all consume. The server's
 * OpenAPI document (/api/openapi.json, generated from route.openapi.ts
 * fragments) is the source of truth; this client mirrors the endpoints that
 * cross-end clients actually need. It intentionally has no runtime
 * dependencies so it can be vendored into any JS/TS runtime (browser, RN
 * fetch, Node 18+).
 *
 * Authentication: pass a token provider (e.g. a function reading your secure
 * storage). The client sends it as a Bearer header and exposes `refresh()` to
 * swap a refresh token for a fresh pair (the server's /api/auth/refresh).
 */

export interface ApiClientOptions {
  baseUrl: string;
  /** Returns the current access token, or null when signed out. */
  accessToken?: () => string | null | Promise<string | null>;
  /** Called with the new pair after a successful refresh (persist it). */
  onRefresh?: (pair: TokenPair) => void | Promise<void>;
  /** Optional global timeout per request (ms). Default 15s. */
  timeoutMs?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: unknown;
}

export interface PaperListItem {
  paper: { id: string; title: string; status: string; createdAt: string; latestVersion: number };
  version: {
    version: number;
    title: string;
    abstract: string | null;
    authorsJson: { name: string }[] | null;
    pdfUrl: string | null;
  };
  category: { id: string; name: string };
  citationCount: number;
  similarity?: number | null;
}

export interface Note {
  id: string;
  paperId: string;
  version: number;
  kind: "highlight" | "note";
  page: number;
  color: string | null;
  content: string | null;
}

export interface ReadingProgress {
  paperId: string;
  version: number;
  page: number;
  percent: number;
}

export interface Device {
  id: string;
  name?: string | null;
  platform?: string | null;
  lastSeenAt?: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class PapexClient {
  private readonly baseUrl: string;
  private readonly opts: ApiClientOptions;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.opts = opts;
  }

  // -------- low-level --------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: { auth?: boolean } = { auth: true },
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (opts.auth !== false) {
      const token = await this.opts.accessToken?.();
      if (token) headers.authorization = `Bearer ${token}`;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 15_000);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (res.status === 401 && opts.auth !== false) {
        throw new ApiError("unauthorized", 401, null);
      }
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const message =
          (data && typeof data.error === "string" ? data.error : null) ?? `HTTP ${res.status}`;
        throw new ApiError(message, res.status, data);
      }
      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  // -------- auth / devices --------

  async refresh(refreshToken: string): Promise<TokenPair> {
    const pair = await this.request<TokenPair>("POST", "/api/auth/refresh", { refreshToken }, { auth: false });
    await this.opts.onRefresh?.(pair);
    return pair;
  }

  async registerPushDevice(deviceToken: string, platform: string): Promise<void> {
    await this.request("POST", "/api/push/register", { deviceToken, platform });
  }

  async unregisterPushDevice(deviceToken?: string): Promise<void> {
    await this.request("POST", "/api/push/unregister", deviceToken ? { deviceToken } : undefined);
  }

  async listDevices(): Promise<Device[]> {
    const d = await this.request<{ devices: Device[] }>("GET", "/api/me/devices");
    return d.devices;
  }

  async revokeDevice(id: string): Promise<void> {
    await this.request("DELETE", `/api/me/devices/${encodeURIComponent(id)}`);
  }

  // -------- discovery --------

  async listPapers(filters: {
    q?: string;
    category?: string;
    tag?: string;
    semantic?: boolean;
    similarToPaperId?: string;
    sort?: "new" | "updated" | "by_citations";
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ rows: PaperListItem[]; total: number; semanticUsed: boolean }> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== "") {
        if (typeof v === "boolean") qs.set(k, v ? "1" : "0");
        else qs.set(k, String(v));
      }
    }
    return this.request("GET", `/api/papers?${qs.toString()}`, undefined, { auth: false });
  }

  async recommendations(): Promise<{ rows: PaperListItem[]; total: number; semanticUsed: boolean }> {
    return this.request("GET", "/api/recommendations");
  }

  async exportPaper(paperId: string, version?: number): Promise<Record<string, unknown>> {
    const qs = version ? `?version=${version}` : "";
    return this.request("GET", `/api/papers/${encodeURIComponent(paperId)}/export${qs}`, undefined, {
      auth: false,
    });
  }

  // -------- notes / reading progress --------

  async listNotes(paperId?: string, version?: number): Promise<Note[]> {
    const qs = new URLSearchParams();
    if (paperId) qs.set("paperId", paperId);
    if (version) qs.set("version", String(version));
    const d = await this.request<{ notes: Note[] }>("GET", `/api/notes${qs ? `?${qs}` : ""}`);
    return d.notes;
  }

  async createNote(input: {
    paperId: string;
    version?: number;
    kind?: "highlight" | "note";
    page?: number;
    color?: string;
    content?: string;
  }): Promise<Note> {
    const d = await this.request<{ note: Note }>("POST", "/api/notes", input);
    return d.note;
  }

  async getReadingProgress(paperId: string, version?: number): Promise<ReadingProgress | null> {
    const qs = version ? `?version=${version}` : "";
    const d = await this.request<{ progress: ReadingProgress | null }>(
      "GET",
      `/api/reading-progress/${encodeURIComponent(paperId)}${qs}`,
    );
    return d.progress;
  }

  async putReadingProgress(
    paperId: string,
    input: { page?: number; percent?: number; version?: number },
  ): Promise<ReadingProgress> {
    const d = await this.request<{ progress: ReadingProgress }>(
      "PUT",
      `/api/reading-progress/${encodeURIComponent(paperId)}`,
      input,
    );
    return d.progress;
  }
}
