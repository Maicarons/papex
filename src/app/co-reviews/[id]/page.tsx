"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, X, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-provider";

interface CoReview {
  id: number;
  paperId: string;
  reviewerId: string;
  assignedById: string;
  status: "pending" | "accepted" | "declined" | "completed" | "expired";
  decision: "approve" | "reject" | "revise" | null;
  comment: string | null;
  note: string | null;
  paperTitle: string;
  authorId: string | null;
  reviewerName: string;
  assignedByName: string;
  createdAt: string;
  respondedAt: string | null;
  completedAt: string | null;
}

const STATUS_LABEL: Record<CoReview["status"], string> = {
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

export default function CoReviewDetailPage() {
  const { t, format } = useI18n();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [review, setReview] = React.useState<CoReview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [decision, setDecision] = React.useState<"approve" | "reject" | "revise">("approve");
  const [comment, setComment] = React.useState("");

  React.useEffect(() => {
    if (!Number.isInteger(id)) return;
    fetch(`/api/co-reviews/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => setReview(d.review))
      .catch((e) => setError(e?.message ?? t("coReviews.loadFailed")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function respond(accepted: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/co-reviews/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? t("coReviews.actionFailed"));
      const d = await res.json();
      setReview(d.review);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("coReviews.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/co-reviews/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? t("coReviews.submitFailed"));
      const d = await res.json();
      setReview(d.review);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("coReviews.submitFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 pt-8">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="mx-auto max-w-2xl pt-8 text-muted-foreground">
        {t("coReviews.notFound")}
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href="/co-reviews">{t("coReviews.backToList")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-1">
        <Link href="/co-reviews">
          <ArrowLeft className="h-4 w-4" />
          {t("coReviews.myTasks")}
        </Link>
      </Button>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{review.paperTitle}</h1>
          <Badge variant={review.status === "pending" ? "destructive" : "secondary"}>
            {t(STATUS_LABEL[review.status])}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {format(t("coReviews.assignedBy"), { name: review.assignedByName, date: formatDate(review.createdAt) })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("coReviews.reviewNote")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {format(t("coReviews.inviteText"), { title: review.paperTitle })}
          </p>
          {review.note && (
            <div className="rounded-lg bg-muted p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">{t("coReviews.assignmentNote")}</p>
              <p className="whitespace-pre-wrap">{review.note}</p>
            </div>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/papers/${review.paperId}`} target="_blank">
              {t("coReviews.viewPaper")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Step 1: accept / decline */}
      {review.status === "pending" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("coReviews.acceptPrompt")}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => respond(true)} disabled={busy} className="gap-1">
              <Check className="h-4 w-4" />
              {t("coReviews.accept")}
            </Button>
            <Button
              onClick={() => respond(false)}
              disabled={busy}
              variant="outline"
              className="gap-1"
            >
              <X className="h-4 w-4" />
              {t("coReviews.decline")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: submit opinion */}
      {review.status === "accepted" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("coReviews.submitReview")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["approve", "revise", "reject"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDecision(d)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    decision === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {t(DECISION_LABEL[d])}
                </button>
              ))}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("coReviews.reviewPlaceholder")}
              rows={6}
            />
            <Button onClick={submit} disabled={busy || comment.trim().length === 0} className="gap-1">
              <Send className="h-4 w-4" />
              {t("coReviews.submitReview")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Final state */}
      {(review.status === "completed" || review.status === "declined") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {review.status === "completed" ? t("coReviews.result") : t("coReviews.statusRejected")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {review.status === "completed" && review.decision && (
              <p>
                {t("coReviews.decisionLabel")}
                <span className="font-medium">{t(DECISION_LABEL[review.decision])}</span>
              </p>
            )}
            {review.comment && (
              <p className="whitespace-pre-wrap rounded-lg bg-muted p-3">{review.comment}</p>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
