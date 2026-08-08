"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Globe,
  HardDrive,
  Mail,
  RefreshCw,
  Search,
  Server,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-provider";

type Status = "operational" | "degraded" | "down";

interface HealthComponent {
  key: string;
  status: Status;
  latency: number | null;
  detail: string | null;
}

interface Health {
  service: string;
  time: string;
  overall: Status;
  components: HealthComponent[];
  uptime: number;
}

const COMP_ICON: Record<string, LucideIcon> = {
  web: Globe,
  api: Server,
  database: Database,
  search: Search,
  notifications: Mail,
  storage: HardDrive,
};

const STATUS_META: Record<Status, { dot: string; badge: string }> = {
  operational: {
    dot: "bg-emerald-500",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  degraded: {
    dot: "bg-amber-500",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  down: {
    dot: "bg-red-500",
    badge: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

const OVERALL_META: Record<Status, { Icon: LucideIcon; wrap: string; text: string }> = {
  operational: {
    Icon: CheckCircle2,
    wrap: "border-emerald-500/30 bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  degraded: {
    Icon: AlertTriangle,
    wrap: "border-amber-500/30 bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
  },
  down: {
    Icon: XCircle,
    wrap: "border-red-500/30 bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
  },
};

function StatusBadge({ status, label }: { status: Status; label: string }) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        m.badge,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", m.dot)} />
      {label}
    </span>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function StatusPage() {
  const { t } = useI18n();
  const [data, setData] = React.useState<Health | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  const load = React.useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      setData((await res.json()) as Health);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const overallText = (s: Status) =>
    t(`status.overall${s[0].toUpperCase()}${s.slice(1)}`);

  const overallMeta = data ? OVERALL_META[data.overall] : null;
  const OverallIcon = overallMeta?.Icon;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Activity className="h-6 w-6 text-primary" />
          {t("status.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("status.subtitle")}</p>
      </div>

      {loading && !data && (
        <>
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </>
      )}

      {error && !data && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <XCircle className="h-10 w-10 text-red-500" />
            <p className="text-sm text-muted-foreground">{t("status.error")}</p>
            <Button variant="outline" size="sm" onClick={load}>
              {t("status.refresh")}
            </Button>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card className={cn("border", OVERALL_META[data.overall].wrap)}>
            <CardContent className="flex items-center gap-4 p-5">
              {OverallIcon && (
                <OverallIcon
                  className={cn("h-10 w-10 shrink-0", overallMeta.text)}
                />
              )}
              <div className="min-w-0">
                <p className={cn("text-lg font-semibold", OVERALL_META[data.overall].text)}>
                  {overallText(data.overall)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("status.lastUpdated")} {fmtTime(data.time)}
                </p>
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
                <div className="flex items-center gap-2">
                  <Switch id="autorefresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                  <Label htmlFor="autorefresh" className="text-xs text-muted-foreground">
                    {t("status.autoRefresh")}
                  </Label>
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  {t("status.refresh")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("status.components")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {data.components.map((c, i) => {
                const Icon = COMP_ICON[c.key] ?? Activity;
                return (
                  <React.Fragment key={c.key}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center gap-3 py-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{t(`status.${c.key}`)}</p>
                        {c.detail === "not_configured" && (
                          <p className="text-xs text-muted-foreground">{t("status.notConfigured")}</p>
                        )}
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        {c.latency != null && (
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {c.latency} ms
                          </span>
                        )}
                        <StatusBadge status={c.status} label={t(`status.${c.status}`)} />
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("status.uptime")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-3xl font-semibold tabular-nums">{data.uptime.toFixed(2)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("status.incidents")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  {t("status.noIncidents")}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
