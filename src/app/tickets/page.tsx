"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Ticket as TicketIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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

interface Ticket {
  id: number;
  code: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

export default function TicketsPage() {
  const { t } = useI18n();
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [composing, setComposing] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [type, setType] = React.useState("other");
  const [priority, setPriority] = React.useState("normal");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/tickets", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setTickets(d.tickets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, type, priority, message }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "提交失败");
      return;
    }
    setComposing(false);
    setSubject("");
    setMessage("");
    setTickets((prev) => [data.ticket, ...prev]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("tickets.title")}</h1>
        <Button size="sm" onClick={() => setComposing((v) => !v)}>
          <Plus className="h-4 w-4" />
          {t("tickets.newTicket")}
        </Button>
      </div>

      {composing && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="subject">{t("tickets.subject")}</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("feedback.type")}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">{t("feedback.typeBug")}</SelectItem>
                    <SelectItem value="feature">{t("feedback.typeFeature")}</SelectItem>
                    <SelectItem value="other">{t("feedback.typeOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("tickets.priority")}</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="msg">{t("feedback.message")}</Label>
              <Textarea id="msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} onClick={submit}>
                {t("submitBtn")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setComposing(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <TicketIcon className="h-8 w-8" />
            <p>{t("tickets.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((tk) => (
            <Link key={tk.id} href={`/tickets/${tk.id}`}>
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{tk.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {tk.code} · {formatDate(tk.createdAt)}
                    </p>
                  </div>
                  <PriorityBadge priority={tk.priority} />
                  <StatusBadge status={tk.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
