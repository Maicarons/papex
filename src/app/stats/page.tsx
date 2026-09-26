import type { Metadata } from "next";
import { BarChart3, BookOpen, Users, UserCheck, MessageSquare, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart } from "@/components/charts";
import { getLatestSiteStats, getSiteStatsHistory, type SiteDailyStat } from "@/lib/services/site-stats";
import { getServerLocale } from "@/i18n/server";
import { getDictionary, t as translate } from "@/i18n";

// Stats are read from the daily cron snapshot (site_daily_stats). Keep the
// route dynamic so a fresh snapshot is picked up without a redeploy.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Site statistics",
    description: "Paper, user and community counts for this Papex instance.",
  };
}

function fmtDay(day: string) {
  return day.slice(5); // MM-DD
}

export default async function StatsPage() {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const t = (path: string) => translate(dict, path);

  const [latest, history] = await Promise.all([
    getLatestSiteStats(),
    getSiteStatsHistory(30),
  ]);

  const cards = [
    {
      key: "papersTotal",
      icon: BookOpen,
      value: latest?.papersTotal ?? 0,
      label: t("stats.papers"),
    },
    {
      key: "usersTotal",
      icon: Users,
      value: latest?.usersTotal ?? 0,
      label: t("stats.users"),
    },
    {
      key: "papersApproved",
      icon: FileText,
      value: latest?.papersApproved ?? 0,
      label: t("stats.papersApproved"),
    },
    {
      key: "papersSubmitted",
      icon: BarChart3,
      value: latest?.papersSubmitted ?? 0,
      label: t("stats.papersSubmitted"),
    },
    {
      key: "authorsTotal",
      icon: UserCheck,
      value: latest?.authorsTotal ?? 0,
      label: t("stats.authors"),
    },
    {
      key: "commentsTotal",
      icon: MessageSquare,
      value: latest?.commentsTotal ?? 0,
      label: t("stats.comments"),
    },
  ] as const;

  const papersSeries = history
    .filter((d: SiteDailyStat) => d.papersTotal > 0)
    .map((d) => ({ label: fmtDay(d.day), value: d.papersTotal }));
  const usersSeries = history
    .filter((d: SiteDailyStat) => d.usersTotal > 0)
    .map((d) => ({ label: fmtDay(d.day), value: d.usersTotal }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart3 className="h-6 w-6 text-primary" />
          {t("stats.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("stats.subtitle")}</p>
        {latest && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("stats.lastUpdated")}: {latest.day}
          </p>
        )}
      </div>

      {!latest && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      )}

      {latest && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.key}>
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <c.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("stats.papersTrend")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("stats.trendSubtitle")}</p>
        </CardHeader>
        <CardContent>
          {papersSeries.length > 1 ? (
            <BarChart height={240} data={papersSeries} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("stats.noHistory")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("stats.usersTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          {usersSeries.length > 1 ? (
            <BarChart height={240} data={usersSeries} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("stats.noHistory")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
