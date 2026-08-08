import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminStats } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  submitted: "审核中",
  approved: "已发布",
  withdrawn: "已撤稿",
  rejected: "已拒绝",
};

export default async function AdminStatsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    redirect("/");
  }
  const stats = await getAdminStats();

  const cards = [
    { label: "论文总数", value: stats.totalPapers },
    { label: "待审核", value: stats.pendingReviews },
    { label: "作者", value: stats.totalAuthors },
    { label: "用户", value: stats.totalUsers },
    { label: "评论", value: stats.totalComments },
    { label: "订阅", value: stats.totalSubscriptions },
    { label: "引用关系", value: stats.totalCitations },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">管理统计面板</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/review">审核队列</Link>
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
          <CardTitle className="text-base">近 14 天提交量</CardTitle>
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
            <CardTitle className="text-base">按状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.byStatus.map((s) => ({
                label: STATUS_LABEL[s.status] ?? s.status,
                value: s.count,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">按分类分布（Top 10）</CardTitle>
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
          <CardTitle className="text-base">高产作者（Top 8）</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topAuthors.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无数据</p>
          ) : (
            <BarChart data={stats.topAuthors.map((a) => ({ label: a.name, value: a.count }))} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
