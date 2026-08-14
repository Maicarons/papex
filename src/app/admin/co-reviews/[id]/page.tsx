import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";
import { getCoReviewDetail } from "@/lib/services/co-reviews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { getServerLocale } from "@/i18n/server";
import { getDictionary, t as translate, format as i18nFormat } from "@/i18n";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "coReviews.statusPending",
  accepted: "coReviews.statusInProgress",
  declined: "coReviews.statusRejected",
  completed: "coReviews.statusCompleted",
  expired: "coReviews.statusExpired",
};

const DECISION_LABEL: Record<string, string> = {
  approve: "coReviews.recommendApprove",
  reject: "coReviews.recommendReject",
  revise: "coReviews.recommendRevision",
};

export default async function AdminCoReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !(await userCan(user, "co_review:manage"))) {
    redirect("/");
  }
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const t = (path: string) => translate(dict, path);
  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId)) notFound();
  const review = await getCoReviewDetail(reviewId);
  if (!review) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-1">
        <Link href="/admin/co-reviews">
          <ArrowLeft className="h-4 w-4" />
          {t("nav.adminCoReviews")}
        </Link>
      </Button>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{review.paperTitle}</h1>
          <Badge variant={review.status === "pending" ? "destructive" : "secondary"}>
            {t(STATUS_LABEL[review.status] ?? review.status)}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {i18nFormat(t("coReviews.paperIdLabel"), { id: review.paperId })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("coReviews.info")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label={t("coReviews.reviewer")} value={review.reviewerName} />
          <Row label={t("coReviews.assigner")} value={review.assignedByName} />
          <Row label={t("coReviews.createdAt")} value={formatDate(review.createdAt.toISOString())} />
          {review.respondedAt && (
            <Row label={t("coReviews.respondedAt")} value={formatDate(review.respondedAt.toISOString())} />
          )}
          {review.completedAt && (
            <Row label={t("coReviews.completedAt")} value={formatDate(review.completedAt.toISOString())} />
          )}
          {review.note && (
            <div className="rounded-lg bg-muted p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">{t("coReviews.assignmentNote")}</p>
              <p className="whitespace-pre-wrap">{review.note}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {review.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("coReviews.conclusion")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {review.decision && (
              <p>
                {t("coReviews.decisionLabel")}
                <span className="font-medium">{t(DECISION_LABEL[review.decision] ?? review.decision)}</span>
              </p>
            )}
            {review.comment && (
              <p className="whitespace-pre-wrap rounded-lg bg-muted p-3">{review.comment}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
