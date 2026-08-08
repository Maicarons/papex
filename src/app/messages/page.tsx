"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCheck, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/i18n-provider";
import { formatDate } from "@/lib/utils";
import {
  MESSAGE_KINDS,
  MESSAGE_CATEGORY_META,
  TONE_CLASSES,
  type MessageKind,
} from "@/lib/message-meta";

interface Message {
  id: number;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
  refId: string | null;
  link: string | null;
  kind: MessageKind;
}

export default function MessagesPage() {
  const { t } = useI18n();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeKind, setActiveKind] = React.useState<MessageKind | null>(null);

  React.useEffect(() => {
    fetch("/api/messages", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => setError(t("messages.empty")))
      .finally(() => setLoading(false));
  }, [t]);

  async function markRead(id: number) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
    await fetch(`/api/messages/${id}/read`, { method: "POST" }).catch(() => {});
  }

  async function markAll() {
    setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read-all" }),
    }).catch(() => {});
  }

  const filtered = activeKind ? messages.filter((m) => m.kind === activeKind) : messages;

  function unreadOf(kind: MessageKind | null): number {
    return messages.filter((m) => (kind ? m.kind === kind : true) && !m.read).length;
  }

  function destination(m: Message): string | null {
    if (m.link) return m.link;
    if (m.refId) return `/tickets/${m.refId}`;
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("messages.title")}</h1>
        <Button variant="outline" size="sm" onClick={markAll} disabled={messages.length === 0}>
          <CheckCheck className="h-4 w-4" />
          {t("messages.markAllRead")}
        </Button>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="全部"
          active={activeKind === null}
          count={unreadOf(null)}
          onClick={() => setActiveKind(null)}
        />
        {MESSAGE_KINDS.map((kind) => (
          <FilterChip
            key={kind}
            label={MESSAGE_CATEGORY_META[kind].label}
            active={activeKind === kind}
            count={unreadOf(kind)}
            onClick={() => setActiveKind(kind)}
          />
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Inbox className="h-8 w-8" />
            <p>{t("messages.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const dest = destination(m);
            const meta = MESSAGE_CATEGORY_META[m.kind];
            const inner = (
              <Card className={m.read ? "bg-background" : "border-primary/40 bg-accent/40"}>
                <CardContent className="space-y-1 p-4">
                  <div className="flex items-center gap-2">
                    {!m.read && <span className="h-2 w-2 rounded-full bg-cta" />}
                    <p className="font-medium">{m.title}</p>
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CLASSES[meta.tone]}`}
                    >
                      {meta.label}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(m.createdAt)}
                    </span>
                  </div>
                  {m.body && <p className="text-sm text-muted-foreground">{m.body}</p>}
                </CardContent>
              </Card>
            );
            return dest ? (
              <Link key={m.id} href={dest} onClick={() => markRead(m.id)}>
                {inner}
              </Link>
            ) : (
              <button key={m.id} className="block w-full text-left" onClick={() => markRead(m.id)}>
                {inner}
              </button>
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
