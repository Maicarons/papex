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

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "待确认",
  accepted: "进行中",
  declined: "已拒绝",
  completed: "已完成",
  expired: "已过期",
};

const DECISION_LABEL: Record<string, string> = {
  approve: "建议通过",
  reject: "建议拒绝",
  revise: "建议修改",
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
          协审管理
        </Link>
      </Button>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{review.paperTitle}</h1>
          <Badge variant={review.status === "pending" ? "destructive" : "secondary"}>
            {STATUS_LABEL[review.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          论文编号 {review.paperId}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">协审信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="评审人" value={review.reviewerName} />
          <Row label="指派人" value={review.assignedByName} />
          <Row label="创建时间" value={formatDate(review.createdAt.toISOString())} />
          {review.respondedAt && (
            <Row label="回应时间" value={formatDate(review.respondedAt.toISOString())} />
          )}
          {review.completedAt && (
            <Row label="完成时间" value={formatDate(review.completedAt.toISOString())} />
          )}
          {review.note && (
            <div className="rounded-lg bg-muted p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">指派备注</p>
              <p className="whitespace-pre-wrap">{review.note}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {review.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">评审结论</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {review.decision && (
              <p>
                结论：<span className="font-medium">{DECISION_LABEL[review.decision]}</span>
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
