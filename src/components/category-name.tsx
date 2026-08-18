"use client";

import { useI18n } from "@/i18n/i18n-provider";
import { localizeCategoryName } from "@/lib/category-i18n";

export interface CategoryNameProps {
  /** Category id — used only as a stable React key / data attribute. */
  id: string;
  /** Canonical (English/arXiv-aligned) name. */
  name: string;
  /** Simplified-Chinese translation, if any. */
  nameZh?: string | null;
  className?: string;
}

/**
 * Renders a category's localized name on the client. Picks the Chinese
 * translation when the active locale is `zh` and a translation exists,
 * otherwise falls back to the canonical English name.
 */
export function CategoryName({ id, name, nameZh, className }: CategoryNameProps) {
  const { locale } = useI18n();
  return (
    <span className={className} data-category-id={id}>
      {localizeCategoryName(name, nameZh, locale)}
    </span>
  );
}
