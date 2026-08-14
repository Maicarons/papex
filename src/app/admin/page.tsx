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
import { getServerLocale } from "@/i18n/server";
import { getDictionary, t as translate, format } from "@/i18n";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  submitted: "paper.statusSubmitted",
  approved: "paper.statusApproved",
  withdrawn: "paper.statusWithdrawn",
  rejected: "paper.statusRejected",
};

const MODULES = [
  {
    href: "/admin/review",
    label: "nav.adminReview",
    desc: "admin.reviewQueueDesc",
    icon: ShieldCheck,
  },
  {
    href: "/admin/stats",
    label: "nav.adminStats",
    desc: "admin.statsDesc",
    icon: BarChart3,
  },
  {
    href: "/admin/tickets",
    label: "nav.adminTickets",
    desc: "admin.ticketsDesc",
    icon: ListChecks,
  },
  {
    href: "/admin/co-reviews",
    label: "nav.adminCoReviews",
    desc: "admin.coReviewsDesc",
    icon: ClipboardCheck,
  },
  {
    href: "/admin/users",
    label: "nav.adminUsers",
    desc: "admin.usersDesc",
    icon: Users,
  },
  {
    href: "/admin/roles",
    label: "nav.adminRoles",
    desc: "admin.rolesDesc",
    icon: KeyRound,
  },
  {
    href: "/admin/messages",
    label: "nav.adminMessages",
    desc: "admin.messagesDesc",
    icon: Megaphone,
  },
];

export default async function AdminOverviewPage() {
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
    { label: "admin.totalUsers", value: stats.totalUsers },
    { label: "admin.totalAuthors", value: stats.totalAuthors },
    { label: "admin.totalComments", value: stats.totalComments },
    { label: "admin.totalCitations", value: stats.totalCitations },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.overviewTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {format(t("admin.welcome"), { name: user.displayName })}
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
          <CardTitle className="text-base">{t("admin.paperStatusDist")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {stats.byStatus.map((s) => (
            <span
              key={s.status}
              className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-sm"
            >
              {t(STATUS_LABEL[s.status] ?? s.status)}
              <span className="font-semibold">{s.count}</span>
            </span>
          ))}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("admin.modules")}</h2>
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
                      <div className="font-medium">{t(m.label)}</div>
                      <div className="text-xs text-muted-foreground">{t(m.desc)}</div>
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
        {t("admin.noticeHint")}
      </p>
    </div>
  );
}
