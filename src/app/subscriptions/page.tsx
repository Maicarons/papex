"use client";

import * as React from "react";
import Link from "next/link";
import { BellOff, Inbox, Rss } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/i18n-provider";
import { formatDate } from "@/lib/utils";

interface Subscription {
  id: number;
  type: "category" | "author" | "paper";
  refId: string;
  title: string;
  href: string;
  createdAt: string;
}

const TYPE_BADGE: Record<Subscription["type"], string> = {
  category: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  author: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  paper: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

export default function SubscriptionsPage() {
  const { t } = useI18n();
  const [subs, setSubs] = React.useState<Subscription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [needsLogin, setNeedsLogin] = React.useState(false);
  const [removing, setRemoving] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch("/api/subscriptions", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) {
          setNeedsLogin(true);
          return null;
        }
        return r.ok ? r.json() : Promise.reject(new Error("load failed"));
      })
      .then((d) => {
        if (d) {
          const list = (d.subscriptions ?? []) as Subscription[];
          list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setSubs(list);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function unsubscribe(sub: Subscription) {
    setRemoving(sub.id);
    setSubs((prev) => prev.filter((s) => s.id !== sub.id));
    const res = await fetch("/api/subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: sub.type, refId: sub.refId }),
    }).catch(() => null);
    if (!res?.ok) {
      // Roll back on failure.
      const refreshed = await fetch("/api/subscriptions", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
      if (refreshed?.subscriptions) {
        const list = refreshed.subscriptions as Subscription[];
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setSubs(list);
      }
    }
    setRemoving(null);
  }

  if (needsLogin) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("subscriptions.title")}</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Rss className="h-8 w-8" />
            <p>{t("feed.loginHint")}</p>
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
      <h1 className="text-2xl font-semibold tracking-tight">{t("subscriptions.title")}</h1>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : subs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Inbox className="h-8 w-8" />
            <p>{t("subscriptions.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <Card key={s.id} className="bg-background">
              <CardContent className="flex items-center gap-3 p-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_BADGE[s.type]}`}
                >
                  {t(`subscriptions.type${s.type[0].toUpperCase()}${s.type.slice(1)}` as const)}
                </span>
                <Link href={s.href} className="min-w-0 flex-1 truncate font-medium hover:underline">
                  {s.title}
                </Link>
                <span className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => unsubscribe(s)}
                  disabled={removing === s.id}
                  aria-label={t("subscriptions.unsubscribe")}
                >
                  <BellOff className="h-4 w-4" />
                  {t("subscriptions.unsubscribe")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
