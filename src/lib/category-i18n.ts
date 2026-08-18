import type { Locale } from "@/i18n/config";

/**
 * Client-safe pure helpers for choosing a category's localized name/description.
 *
 * Kept free of any server-only imports (no `db`, no `next/headers`) so it can be
 * pulled into both server components and client components without dragging the
 * database client into the browser bundle. The `categories` service re-exports
 * these for server-side callers.
 *
 * `name`/`description` are the canonical English (arXiv-aligned) values; the
 * `Zh` variants are Simplified-Chinese translations. When the locale is `zh`
 * and a zh value exists we prefer it, otherwise we fall back to English.
 */

export function localizeCategoryName(
  name: string,
  nameZh: string | null | undefined,
  locale: Locale,
): string {
  return locale === "zh" && nameZh ? nameZh : name;
}

export function localizeCategoryDescription(
  description: string | null | undefined,
  descriptionZh: string | null | undefined,
  locale: Locale,
): string | null {
  if (locale === "zh" && descriptionZh) return descriptionZh;
  return description ?? null;
}
