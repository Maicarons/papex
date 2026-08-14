"use client";

import * as React from "react";
import Link from "next/link";
import { Ticket as TicketIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function AdminTicketsPage() {
  const { t } = useI18n();
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<string>("all");

  React.useEffect(() => {
    const qs = filter === "all" ? "" : `&status=${filter}`;
    fetch(`/api/tickets?scope=all${qs}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTickets(d?.tickets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const statusFilters: { value: string; label: string }[] = [
    { value: "all", label: t("tickets.filterAll") },
    { value: "open", label: t("tickets.statusOpen") },
    { value: "awaiting_user", label: t("tickets.statusAwaitingUser") },
    { value: "in_progress", label: t("tickets.statusInProgress") },
    { value: "resolved", label: t("tickets.statusResolved") },
    { value: "closed", label: t("tickets.statusClosed") },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("tickets.title")}</h1>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("tickets.filterStatus")}>
        {statusFilters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
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
