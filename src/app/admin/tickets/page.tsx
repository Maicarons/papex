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

  React.useEffect(() => {
    fetch("/api/tickets?scope=all", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTickets(d?.tickets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("tickets.title")}</h1>

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
