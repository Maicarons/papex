"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Loader2, ArrowLeft, RotateCcw, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/ticket-badges";
import { useI18n } from "@/i18n/i18n-provider";
import { formatDate } from "@/lib/utils";

interface Reply {
  id: number;
  body: string;
  isAdmin: boolean;
  createdAt: string;
}
interface Ticket {
  id: number;
  code: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  replies: Reply[];
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useI18n();
  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [reply, setReply] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [status, setStatus] = React.useState("open");
  const [priority, setPriority] = React.useState("normal");

  React.useEffect(() => {
    fetch(`/api/tickets/${id}`, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => {
        if (d?.ticket) {
          setTicket(d.ticket);
          setStatus(d.ticket.status);
          setPriority(d.ticket.priority);
        }
      })
      .catch(() => {});
    // detect admin via /api/auth/me
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setIsAdmin(u?.role && u.role !== "author"))
      .catch(() => {});
  }, [id]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/tickets/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    });
    setBusy(false);
    if (res.ok) {
      setReply("");
      const d = await res.json();
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              replies: [...prev.replies, d.reply],
              status: (d.status as string) ?? prev.status,
            }
          : prev,
      );
    }
  }

  async function patch(field: "status" | "priority", value: string) {
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const d = await res.json();
      setTicket((prev) => (prev ? { ...prev, ...d.ticket } : prev));
    }
  }

  if (notFound) {
    return <p className="text-muted-foreground">{t("tickets.empty")}</p>;
  }
  if (!ticket) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" />
        {t("tickets.title")}
      </Link>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{ticket.subject}</h1>
            <span className="font-mono text-xs text-muted-foreground">{ticket.code}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(ticket.createdAt)}</p>

          {isAdmin && (
            <div className="flex flex-wrap gap-3 border-t pt-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("tickets.status")}</span>
                <Select value={status} onValueChange={(v) => { setStatus(v); patch("status", v); }}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t("tickets.statusOpen")}</SelectItem>
                    <SelectItem value="awaiting_user">{t("tickets.statusAwaitingUser")}</SelectItem>
                    <SelectItem value="in_progress">{t("tickets.statusInProgress")}</SelectItem>
                    <SelectItem value="resolved">{t("tickets.statusResolved")}</SelectItem>
                    <SelectItem value="closed">{t("tickets.statusClosed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("tickets.priority")}</span>
                <Select value={priority} onValueChange={(v) => { setPriority(v); patch("priority", v); }}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("tickets.priorityLow")}</SelectItem>
                    <SelectItem value="normal">{t("tickets.priorityNormal")}</SelectItem>
                    <SelectItem value="high">{t("tickets.priorityHigh")}</SelectItem>
                    <SelectItem value="urgent">{t("tickets.priorityUrgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {!isAdmin && ticket.status !== "closed" && (
            <div className="flex items-center gap-3 border-t pt-3">
              {ticket.status === "resolved" ? (
                <Button variant="outline" size="sm" onClick={() => patch("status", "open")}>
                  <RotateCcw className="h-4 w-4" />
                  {t("tickets.reopen")}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => patch("status", "resolved")}>
                  <CheckCircle2 className="h-4 w-4" />
                  {t("tickets.markResolved")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {ticket.replies.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-1 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={r.isAdmin ? "font-semibold text-primary" : ""}>
                  {r.isAdmin ? t("tickets.fromAdmin") : t("tickets.from")}
                </span>
                <span>{formatDate(r.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{r.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <form onSubmit={sendReply} className="space-y-2">
        <Textarea
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={t("tickets.replyPlaceholder")}
        />
        <Button type="submit" disabled={busy || !reply.trim()}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("tickets.sendReply")}
        </Button>
      </form>
    </div>
  );
}
