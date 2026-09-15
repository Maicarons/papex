"use client";

import * as React from "react";
import { Eye } from "lucide-react";
import { useI18n } from "@/i18n/i18n-provider";

interface PublicReview {
  id: number;
  decision: "approve" | "reject" | "revise" | null;
  comment: string | null;
  reviewerName: string | null;
  completedAt: string | null;
}

const DECISION_KEYS: Record<string, string> = {
  approve: "coReviews.recommendApprove",
  reject: "coReviews.recommendReject",
  revise: "coReviews.recommendRevision",
};

/**
 * Public co-reviews card (P1-E, OpenReview-style). Rendered on the paper page;
 * only completed reviews the assigner explicitly published are shown.
 */
export function PublicReviews({ paperId }: { paperId: string }) {
  const { t } = useI18n();
  const [reviews, setReviews] = React.useState<PublicReview[] | null>(null);

  React.useEffect(() => {
    fetch(`/api/papers/${encodeURIComponent(paperId)}/co-reviews`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { reviews?: PublicReview[] } | null) => setReviews(d?.reviews ?? []))
      .catch(() => setReviews([]));
  }, [paperId]);

  if (reviews === null) return null;
  if (reviews.length === 0) return null;

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-primary" />
            {r.decision && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {t(DECISION_KEYS[r.decision] ?? r.decision)}
              </span>
            )}
            {r.reviewerName && (
              <span className="text-xs text-muted-foreground">{r.reviewerName}</span>
            )}
          </div>
          {r.comment && <p className="mt-2 whitespace-pre-wrap leading-relaxed">{r.comment}</p>}
        </li>
      ))}
    </ul>
  );
}
