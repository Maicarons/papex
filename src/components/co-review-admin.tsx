"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface ReviewItem {
  id: number;
  paperId: string;
  status: "pending" | "accepted" | "declined" | "completed" | "expired";
  decision: "approve" | "reject" | "revise" | null;
  reviewerName: string;
  assignedByName: string;
  paperTitle: string;
  createdAt: string;
}

export interface AssignablePaper {
  paperId: string;
  title: string;
}

export interface SelectableUser {
  id: string;
  username: string;
  displayName: string;
}

const STATUS_LABEL: Record<ReviewItem["status"], string> = {
  pending: "待确认",
  accepted: "进行中",
  declined: "已拒绝",
  completed: "已完成",
  expired: "已过期",
};

export function CoReviewAdmin({
  reviews,
  papers,
  users,
}: {
  reviews: ReviewItem[];
  papers: AssignablePaper[];
  users: SelectableUser[];
}) {
  const router = useRouter();
  const [paperId, setPaperId] = React.useState(papers[0]?.paperId ?? "");
  const [reviewerId, setReviewerId] = React.useState(users[0]?.id ?? "");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function assign() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/co-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId, reviewerId, note }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "指派失败");
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "指派失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            指派协审
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="paper">论文</Label>
            <select
              id="paper"
              value={paperId}
              onChange={(e) => setPaperId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {papers.length === 0 && <option value="">暂无可指派论文</option>}
              {papers.map((p) => (
                <option key={p.paperId} value={p.paperId}>
                  {p.title}（{p.paperId}）
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reviewer">评审人</Label>
            <select
              id="reviewer"
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}（{u.username}）
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">指派备注（可选）</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="向评审人说明评审重点……"
            />
          </div>
          <Button onClick={assign} disabled={busy || !paperId || !reviewerId} className="gap-1">
            <ClipboardCheck className="h-4 w-4" />
            发送协审请求
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">协审进度（{reviews.length}）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无协审任务</p>
          ) : (
            reviews.map((r) => (
              <Link
                key={r.id}
                href={`/admin/co-reviews/${r.id}`}
                className="block rounded-lg border p-3 transition-colors hover:border-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{r.paperTitle}</p>
                  <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  评审人 {r.reviewerName} · 指派人 {r.assignedByName}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
