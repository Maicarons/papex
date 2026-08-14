"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardCheck, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-provider";

interface CoReview {
  id: number;
  paperId: string;
  status: "pending" | "accepted" | "declined" | "completed" | "expired";
  decision: "approve" | "reject" | "revise" | null;
  paperTitle: string;
  assignedByName: string;
  createdAt: string;
}

const STATUS_LABEL: Record<CoReview["status"], string> = {
  pending: "coReviews.statusPending",
  accepted: "coReviews.statusInProgress",
  declined: "coReviews.statusRejected",
  completed: "coReviews.statusCompleted",
  expired: "coReviews.statusExpired",
};

export default function MyCoReviewsPage() {
  const { t, format } = useI18n();
  const [items, setItems] = React.useState<CoReview[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/co-reviews?scope=mine", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(d.reviews ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">{t("coReviews.myTasks")}</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Inbox className="h-8 w-8" />
            <p>{t("coReviews.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Link key={r.id} href={`/co-reviews/${r.id}`}>
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.paperTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(t("coReviews.assignedBy"), { name: r.assignedByName, date: formatDate(r.createdAt) })}
                    </p>
                  </div>
                  <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>
                    {t(STATUS_LABEL[r.status])}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
