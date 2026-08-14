import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";
import { listCoReviews, listAssignablePapers } from "@/lib/services/co-reviews";
import { listUsers } from "@/lib/services/rbac";
import { CoReviewAdmin } from "@/components/co-review-admin";
import { getServerLocale } from "@/i18n/server";
import { getDictionary, t as translate } from "@/i18n";

export const dynamic = "force-dynamic";

export default async function AdminCoReviewsPage() {
  const user = await getCurrentUser();
  if (!user || !(await userCan(user, "co_review:manage"))) {
    redirect("/");
  }
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const t = (path: string) => translate(dict, path);
  const [reviews, papers, users] = await Promise.all([
    listCoReviews({ scope: "all" }),
    listAssignablePapers(50),
    listUsers({ pageSize: 200 }),
  ]);

  // Enrich reviews with names for the client component.
  const { getCoReviewDetail } = await import("@/lib/services/co-reviews");
  const enriched = await Promise.all(reviews.map((r) => getCoReviewDetail(r.id)));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("nav.adminCoReviews")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.coReviewsSubtitle")}</p>
      </div>
      <CoReviewAdmin
        reviews={enriched
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .map((r) => ({
            id: r.id,
            paperId: r.paperId,
            status: r.status,
            decision: r.decision,
            reviewerName: r.reviewerName,
            assignedByName: r.assignedByName,
            paperTitle: r.paperTitle,
            createdAt: r.createdAt.toISOString(),
          }))}
        papers={papers.map((p) => ({ paperId: p.paperId, title: p.title }))}
        users={users.rows.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
        }))}
      />
    </div>
  );
}
