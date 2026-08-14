"use client";

import * as React from "react";
import Link from "next/link";
import { BookmarkX, FolderOpen, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/i18n-provider";
import { formatDate } from "@/lib/utils";

interface Bookmark {
  id: number;
  paperId: string;
  paperTitle: string;
  groupName: string | null;
  createdAt: string;
}

export default function BookmarksPage() {
  const { t } = useI18n();
  const [items, setItems] = React.useState<Bookmark[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [needsLogin, setNeedsLogin] = React.useState(false);
  const [removing, setRemoving] = React.useState<number | null>(null);
  const [savingGroup, setSavingGroup] = React.useState<string | null>(null);

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

  async function changeGroup(item: Bookmark, value: string) {
    if (value === "__new") {
      const name = window.prompt(t("bookmarks.groupPrompt"));
      if (!name?.trim()) return;
      value = name.trim();
    }
    setSavingGroup(item.paperId);
    const res = await fetch(`/api/bookmarks/${encodeURIComponent(item.paperId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group: value === "__none" ? null : value }),
    }).catch(() => null);
    if (res?.ok) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === item.id ? { ...x, groupName: value === "__none" ? null : value } : x,
        ),
      );
    }
    setSavingGroup(null);
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

  const groups = [...new Set(items.map((x) => x.groupName).filter((g): g is string => !!g))].sort();
  const grouped: { name: string | null; items: Bookmark[] }[] = [
    { name: null, items: items.filter((x) => !x.groupName) },
    ...groups.map((g) => ({ name: g, items: items.filter((x) => x.groupName === g) })),
  ].filter((g) => g.items.length > 0);

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
        <div className="space-y-6">
          {grouped.map((g) => (
            <section key={g.name ?? "__none"}>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <FolderOpen className="h-4 w-4" />
                {g.name ?? t("bookmarks.ungrouped")}
                <span className="text-xs font-normal">({g.items.length})</span>
              </h2>
              <div className="space-y-3">
                {g.items.map((item) => (
                  <Card key={item.id} className="bg-background">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Link
                        href={`/papers/${item.paperId}`}
                        className="min-w-0 flex-1 truncate font-medium hover:underline"
                      >
                        {item.paperTitle}
                      </Link>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {formatDate(item.createdAt)}
                      </span>
                      <Select
                        value={item.groupName ?? "__none"}
                        disabled={savingGroup === item.paperId}
                        onValueChange={(v) => changeGroup(item, v)}
                      >
                        <SelectTrigger className="h-8 w-32" aria-label={t("bookmarks.group")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">{t("bookmarks.ungrouped")}</SelectItem>
                          <SelectItem value="__new">{t("bookmarks.newGroup")}</SelectItem>
                          {groups.map((grp) => (
                            <SelectItem key={grp} value={grp}>
                              {grp}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unbookmark(item)}
                        disabled={removing === item.id}
                        aria-label={t("bookmarks.remove")}
                      >
                        <BookmarkX className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
