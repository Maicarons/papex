"use client";

import * as React from "react";
import { defaultLocale, locales, localeNames, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/zh";
import { getDictionary } from "./index";

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  t: (path: string) => string;
  format: (template: string, vars: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale: initialLocale,
  children,
}: {
  locale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale ?? defaultLocale);

  // When the locale isn't provided by the server (the static root layout
  // can't read cookies), sync it from the papex_locale cookie on the client.
  React.useEffect(() => {
    const m = document.cookie.match(/(?:^|; )papex_locale=([^;]+)/);
    const cookieLocale = m?.[1] as Locale | undefined;
    if (cookieLocale && locales.includes(cookieLocale) && cookieLocale !== locale) {
      setLocale(cookieLocale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `papex_locale=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next === "zh" ? "zh-CN" : next;
  }, []);

  const value = React.useMemo<I18nContextValue>(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      dict,
      setLocale,
      t: (path: string) => {
        const v = path
          .split(".")
          .reduce<unknown>(
            (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
            dict,
          );
        return typeof v === "string" ? v : path;
      },
      format: (template, vars) =>
        template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    // Safe fallback so components don't crash outside the provider.
    const dict = getDictionary(defaultLocale);
    return {
      locale: defaultLocale,
      dict,
      setLocale: () => {},
      t: (path: string) => path,
      format: (template, vars) => template,
    };
  }
  return ctx;
}

export { locales, localeNames };
