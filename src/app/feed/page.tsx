"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CheckCheck, Inbox, Rss } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/i18n-provider";
import { formatDate } from "@/lib/utils";
import { useNotifications } from "@/lib/stores/notifications";
import {
  ANNOUNCEMENT_KINDS,
  ANNOUNCEMENT_CATEGORY_META,
  TONE_CLASSES,
  type AnnouncementKind,
} from "@/lib/announcement-meta";

interface Announcement {
  id: number;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
  refId: string | null;
  kind: AnnouncementKind;
}

export default function FeedPage() {
  const { t } = useI18n();
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = React.useState(false);
  const [activeKind, setActiveKind] = React.useState<AnnouncementKind | null>(null);

  React.useEffect(() => {
    fetch("/api/feed", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) {
          setNeedsLogin(true);
          return null;
        }
        return r.ok ? r.json() : Promise.reject(new Error("load failed"));
      })
      .then((d) => setAnnouncements(d?.announcements ?? []))
      .catch(() => setError(t("feed.empty")))
      .finally(() => setLoading(false));
  }, [t]);

  async function markAll() {
    setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })));
    const res = await fetch("/api/feed?markRead=1", { cache: "no-store" }).catch(() => null);
    if (res?.ok) {
      const d = await res.json().catch(() => null);
      if (d?.announcements) {
        setAnnouncements(d.announcements);
        useNotifications
          .getState()
          .setFeedUnread(d.announcements.filter((x: { read: boolean }) => !x.read).length);
      }
    }
  }

  async function markOne(a: Announcement) {
    if (a.read) return;
    setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, read: true } : x)));
    const { feedUnread, setFeedUnread } = useNotifications.getState();
    setFeedUnread(Math.max(0, feedUnread - 1));
    await fetch("/api/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id }),
    }).catch(() => null);
  }

  const filtered = activeKind
    ? announcements.filter((a) => a.kind === activeKind)
    : announcements;

  function unreadOf(kind: AnnouncementKind | null): number {
    return announcements.filter((a) => (kind ? a.kind === kind : true) && !a.read).length;
  }

  function destination(a: Announcement): string | null {
    return a.refId ? `/papers/${a.refId}` : null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Rss className="h-5 w-5" />
          {t("feed.title")}
        </h1>
        <Button variant="outline" size="sm" onClick={markAll} disabled={announcements.length === 0}>
          <CheckCheck className="h-4 w-4" />
          {t("feed.markAllRead")}
        </Button>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label={t("nav.feed")}
          active={activeKind === null}
          count={unreadOf(null)}
          onClick={() => setActiveKind(null)}
        />
        {ANNOUNCEMENT_KINDS.map((kind) => (
          <FilterChip
            key={kind}
            label={ANNOUNCEMENT_CATEGORY_META[kind].label}
            active={activeKind === kind}
            count={unreadOf(kind)}
            onClick={() => setActiveKind(kind)}
          />
        ))}
      </div>

      {needsLogin ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <Rss className="h-8 w-8" />
            <p>{t("feed.loginHint")}</p>
            <Button asChild size="sm">
              <Link href="/login">{t("common.login")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Inbox className="h-8 w-8" />
            <p>{t("feed.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const dest = destination(a);
            const meta = ANNOUNCEMENT_CATEGORY_META[a.kind];
            const inner = (
              <Card className={a.read ? "bg-background" : "border-primary/40 bg-accent/40"}>
                <CardContent className="space-y-1 p-4">
                  <div className="flex items-center gap-2">
                    {!a.read && <span className="h-2 w-2 rounded-full bg-cta" />}
                    <p className="font-medium">{a.title}</p>
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CLASSES[meta.tone]}`}
                    >
                      {meta.label}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </span>
                    {!a.read && (
                      <button
                        type="button"
                        title={t("feed.markRead")}
                        aria-label={t("feed.markRead")}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markOne(a);
                        }}
                        className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {a.body && <p className="text-sm text-muted-foreground">{a.body}</p>}
                </CardContent>
              </Card>
            );
            return dest ? (
              <Link key={a.id} href={dest} onClick={() => markOne(a)}>
                {inner}
              </Link>
            ) : (
              <div key={a.id}>{inner}</div>
            );
          })}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function FilterChip({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/50"
      }`}
    >
      {label}
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 text-[10px] font-semibold ${
            active ? "bg-primary-foreground text-primary" : "bg-cta text-cta-foreground"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
