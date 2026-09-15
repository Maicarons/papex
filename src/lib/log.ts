/**
 * Minimal structured logger (C3). Level-aware, JSON-shaped output keyed by
 * scope, with no heavy dependency — an operator can point LOG_LEVEL at
 * debug|info|warn|error. A production pipeline (pino/Sentry) can replace the
 * implementation later without touching call sites.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function emit(level: LogLevel, scope: string, message: string, fields: Record<string, unknown> = {}) {
  const configured = process.env.LOG_LEVEL;
  const min = (configured && LEVEL_ORDER[configured as LogLevel]) || LEVEL_ORDER.info;
  if (LEVEL_ORDER[level] < min) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    msg: message,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (scope: string, message: string, fields?: Record<string, unknown>) =>
    emit("debug", scope, message, fields),
  info: (scope: string, message: string, fields?: Record<string, unknown>) =>
    emit("info", scope, message, fields),
  warn: (scope: string, message: string, fields?: Record<string, unknown>) =>
    emit("warn", scope, message, fields),
  error: (scope: string, message: string, fields?: Record<string, unknown>) =>
    emit("error", scope, message, fields),
};