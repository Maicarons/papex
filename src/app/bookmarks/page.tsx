"use client";

import * as React from "react";
import Link from "next/link";
import { BookmarkX, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/i18n-provider";
import { formatDate } from "@/lib/utils";

interface Bookmark {
  id: number;
  paperId: string;
  paperTitle: string;
  createdAt: string;
}

export default function BookmarksPage() {
  const { t } = useI18n();
  const [items, setItems] = React.useState<Bookmark[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [needsLogin, setNeedsLogin] = React.useState(false);
  const [removing, setRemoving] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch("/api/bookmarks", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) {
          setNeedsLogin(true);
          return null;
        }
        return r.ok ? r.json() : Promise.reject(new Error("load failed"));
      })
      .then((d) => {
        if (d) {
          const list = (d.bookmarks ?? []) as Bookmark[];
          list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setItems(list);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function unbookmark(item: Bookmark) {
    setRemoving(item.id);
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    const res = await fetch("/api/bookmarks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId: item.paperId }),
    }).catch(() => null);
    if (!res?.ok) {
      // Roll back on failure.
      const refreshed = await fetch("/api/bookmarks", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
      if (refreshed?.bookmarks) {
        const list = refreshed.bookmarks as Bookmark[];
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setItems(list);
      }
    }
    setRemoving(null);
  }

  if (needsLogin) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("bookmarks.title")}</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Inbox className="h-8 w-8" />
            <p>{t("bookmarks.loginHint")}</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/login">{t("auth.loginTitle")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("bookmarks.title")}</h1>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Inbox className="h-8 w-8" />
            <p>{t("bookmarks.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="bg-background">
              <CardContent className="flex items-center gap-3 p-4">
                <Link
                  href={`/papers/${item.paperId}`}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {item.paperTitle}
                </Link>
                <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => unbookmark(item)}
                  disabled={removing === item.id}
                  aria-label={t("bookmarks.remove")}
                >
                  <BookmarkX className="h-4 w-4" />
                  {t("bookmarks.remove")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
