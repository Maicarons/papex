"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardCheck, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

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
  pending: "待确认",
  accepted: "进行中",
  declined: "已拒绝",
  completed: "已完成",
  expired: "已过期",
};

export default function MyCoReviewsPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">我的协审任务</h1>
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
            <p>暂无协审任务</p>
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
                      指派人 {r.assignedByName} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>
                    {STATUS_LABEL[r.status]}
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
