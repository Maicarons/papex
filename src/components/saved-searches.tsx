"use client";

import * as React from "react";
import { BellRing, BellOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/i18n-provider";

interface SavedSearch {
  id: string;
  name: string;
  q: string;
  category: string | null;
  semantic: boolean;
  createdAt: string;
}

/**
 * Saved keyword alerts (B1): lists the user's saved searches and lets them
 * cancel alerts. When a newly approved paper matches, a `search_match`
 * announcement + push is generated.
 */
export function SavedSearches() {
  const { t } = useI18n();
  const [searches, setSearches] = React.useState<SavedSearch[] | null>(null);
  const [needsLogin, setNeedsLogin] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/me/saved-searches", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) {
          setNeedsLogin(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d: { searches?: SavedSearch[] } | null) => setSearches(d?.searches ?? []))
      .catch(() => setSearches([]));
  }, []);

  if (needsLogin) return null;

  async function remove(id: string) {
    setSearches((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
    await fetch(`/api/me/saved-searches/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
      () => null,
    );
  }

  return (
    <div className="space-y-3">
      {searches === null ? null : searches.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("subscriptions.savedSearchesEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {searches.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-lg border bg-background p-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
              <code className="hidden truncate text-xs text-muted-foreground sm:block">{s.q}</code>
              {s.category && <Badge variant="outline" className="text-xs">{s.category}</Badge>}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(s.id)}
                aria-label={t("subscriptions.savedSearchesDelete")}
                className="shrink-0"
              >
                <BellOff className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Compact "save this search as an alert" entry for the results page. */
export function SaveSearchBar({
  q,
  category,
  semantic,
}: {
  q: string;
  category?: string;
  semantic?: boolean;
}) {
  const { t } = useI18n();
  const [status, setStatus] = React.useState<"idle" | "busy" | "saved" | "error" | "login">("idle");

  if (!q.trim()) return null;

  async function save() {
    setStatus("busy");
    try {
      const res = await fetch("/api/me/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: q, q, category, semantic }),
      });
      if (res.status === 401) {
        setStatus("login");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  if (status === "saved") {
    return <p className="inline-flex items-center gap-1.5 text-sm text-green-600">{t("paper.saveSearchSaved")}</p>;
  }
  if (status === "login") {
    return <p className="inline-flex items-center gap-1.5 text-sm text-destructive">{t("paper.saveSearchLogin")}</p>;
  }

  return (
    <Button variant="outline" size="sm" onClick={save} disabled={status === "busy"}>
      <BellRing className="mr-1.5 h-3.5 w-3.5" />
      {status === "error" ? t("paper.saveSearchFailed") : t("paper.saveSearch")}
    </Button>
  );
}