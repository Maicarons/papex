import Link from "next/link";
import {
  ShieldCheck,
  BarChart3,
  ListChecks,
  ClipboardCheck,
  Users,
  KeyRound,
  Megaphone,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminStats } from "@/lib/services/stats";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  submitted: "审核中",
  approved: "已发布",
  withdrawn: "已撤稿",
  rejected: "已拒绝",
};

const MODULES = [
  {
    href: "/admin/review",
    label: "审核队列",
    desc: "论文通过 / 拒绝 / 撤稿处理",
    icon: ShieldCheck,
  },
  {
    href: "/admin/stats",
    label: "统计面板",
    desc: "全站数据可视化",
    icon: BarChart3,
  },
  {
    href: "/admin/tickets",
    label: "工单管理",
    desc: "用户反馈与工单处置",
    icon: ListChecks,
  },
  {
    href: "/admin/co-reviews",
    label: "协审管理",
    desc: "发起并跟踪同行审查",
    icon: ClipboardCheck,
  },
  {
    href: "/admin/users",
    label: "用户管理",
    desc: "角色分配与权限覆盖",
    icon: Users,
  },
  {
    href: "/admin/roles",
    label: "角色权限",
    desc: "配置角色与权限矩阵",
    icon: KeyRound,
  },
  {
    href: "/admin/messages",
    label: "站内信广播",
    desc: "向用户群发通知",
    icon: Megaphone,
  },
];

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    redirect("/");
  }
  const stats = await getAdminStats();

  const cards = [
    { label: "论文总数", value: stats.totalPapers },
    { label: "待审核", value: stats.pendingReviews },
    { label: "用户", value: stats.totalUsers },
    { label: "作者", value: stats.totalAuthors },
    { label: "评论", value: stats.totalComments },
    { label: "引用关系", value: stats.totalCitations },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理后台概览</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          欢迎，{user.displayName}。这里汇总全站关键指标，并集中入口到各管理模块。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
          <CardTitle className="text-base">论文状态分布</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {stats.byStatus.map((s) => (
            <span
              key={s.status}
              className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-sm"
            >
              {STATUS_LABEL[s.status] ?? s.status}
              <span className="font-semibold">{s.count}</span>
            </span>
          ))}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">管理模块</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href} className="group">
                <Card className="transition-colors group-hover:border-primary">
                  <CardContent className="flex items-start gap-3 pt-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.desc}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        <FileText className="mr-1 inline h-3 w-3" />
        所有审核、工单、协审与社区操作均会通过统一通知中心联动站内信。
      </p>
    </div>
  );
}
