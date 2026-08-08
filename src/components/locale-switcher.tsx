"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useI18n, locales, localeNames } from "@/i18n/i18n-provider";
import type { Locale } from "@/i18n/config";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  const router = useRouter();

  async function change(next: Locale) {
    setLocale(next);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
    } catch {
      // cookie already set client-side; ignore network errors
    }
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Language">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => change(l)}
            className={l === locale ? "font-semibold text-primary" : ""}
          >
            {localeNames[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
