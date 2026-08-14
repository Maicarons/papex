"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const { t } = useI18n();
  // Hydration-safe "is mounted" flag: server snapshot is false (matches SSR
  // output), client snapshot flips to true after hydration. Replaces the
  // useState+useEffect mounted pattern (no setState-in-effect).
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("common.toggleTheme")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
