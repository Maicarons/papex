import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminStats } from "@/lib/services/stats";
import { getServerLocale } from "@/i18n/server";
import { getDictionary, t as translate } from "@/i18n";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  submitted: "paper.statusSubmitted",
  approved: "paper.statusApproved",
  withdrawn: "paper.statusWithdrawn",
  rejected: "paper.statusRejected",
};

export default async function AdminStatsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    redirect("/");
  }
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const t = (path: string) => translate(dict, path);
  const stats = await getAdminStats();

  const cards = [
    { label: "admin.totalPapers", value: stats.totalPapers },
    { label: "admin.pendingReview", value: stats.pendingReviews },
    { label: "admin.totalAuthors", value: stats.totalAuthors },
    { label: "admin.totalUsers", value: stats.totalUsers },
    { label: "admin.totalComments", value: stats.totalComments },
    { label: "admin.totalSubscriptions", value: stats.totalSubscriptions },
    { label: "admin.totalCitations", value: stats.totalCitations },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.statsTitle")}</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/review">{t("nav.adminReview")}</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.recentSubmissions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={stats.submissionsLast14Days.map((d) => ({ label: d.date, value: d.count }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.byStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.byStatus.map((s) => ({
                label: t(STATUS_LABEL[s.status] ?? s.status),
                value: s.count,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.byCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.byCategory.map((c) => ({ label: c.category, value: c.count }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.topAuthors")}</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topAuthors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <BarChart data={stats.topAuthors.map((a) => ({ label: a.name, value: a.count }))} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
