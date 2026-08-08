import { defaultLocale, type Locale } from "./config";
import { zh, type Dictionary } from "./dictionaries/zh";
import { en } from "./dictionaries/en";

const dictionaries: Record<Locale, Dictionary> = { zh, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

/** Resolve a nested translation by dot-path, e.g. t(dict, "home.heroTitle"). */
export function t(dict: Dictionary, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), dict);
  return typeof value === "string" ? value : path;
}

/** Interpolate `{n}` style placeholders. */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
