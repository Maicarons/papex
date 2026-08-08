"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/i18n-provider";

const statusClass: Record<string, string> = {
  open: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary text-primary-foreground",
  resolved: "bg-cta text-cta-foreground",
  closed: "bg-muted text-muted-foreground",
};

const priorityClass: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-secondary text-secondary-foreground",
  high: "bg-amber-500 text-white",
  urgent: "bg-destructive text-destructive-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  return (
    <Badge className={statusClass[status] ?? statusClass.open}>
      {t(`tickets.status${status.charAt(0).toUpperCase() + status.slice(1)}` as "tickets.statusOpen")}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useI18n();
  return (
    <Badge className={priorityClass[priority] ?? priorityClass.normal}>
      {t(`tickets.priority${priority.charAt(0).toUpperCase() + priority.slice(1)}` as "tickets.priorityLow")}
    </Badge>
  );
}
