"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/i18n-provider";

/**
 * Publish-toggle for a co-review (P1-E): the assigner can make a completed
 * review visible on the paper page (OpenReview-style transparency).
 */
export function CoReviewVisibility({
  reviewId,
  initialPublic,
}: {
  reviewId: number;
  initialPublic: boolean;
}) {
  const { t } = useI18n();
  const [enabled, setEnabled] = React.useState(initialPublic);
  const [busy, setBusy] = React.useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/co-reviews/${reviewId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public: next }),
      });
      if (res.ok) setEnabled(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{t("coReviews.publishReview")}</p>
        <p className="text-xs text-muted-foreground">{t("coReviews.publishReviewHint")}</p>
      </div>
      <Switch
        checked={enabled}
        disabled={busy}
        onCheckedChange={toggle}
        aria-label={t("coReviews.publishReview")}
      />
      {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
