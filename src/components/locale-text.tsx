"use client";

import * as React from "react";
import { useI18n } from "@/i18n/i18n-provider";

/**
 * Client-side locale-aware text node.
 *
 * Use inside statically rendered (SSG/ISR) pages where reading cookies on the
 * server would defeat static generation: the server bakes in the default
 * locale and the client swaps to the cookie locale after hydration.
 */
export function LocaleText({
  path,
  vars,
  as: Tag = "span",
  className,
}: {
  path: string;
  vars?: Record<string, string | number>;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div" | "li";
  className?: string;
}) {
  const { t, format } = useI18n();
  return <Tag className={className}>{vars ? format(t(path), vars) : t(path)}</Tag>;
}
