"use client";

import * as React from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface PendingItem {
  paperId: string;
  title: string;
  categoryId: string;
}

export function ReviewQueue({ initial }: { initial: PendingItem[] }) {
  const [items, setItems] = React.useState(initial);
  const [rejecting, setRejecting] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function act(paperId: string, action: "approve" | "reject") {
    setBusy(true);
    const res = await fetch(`/api/papers/${paperId}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: action === "reject" ? reason : undefined }),
    });
    setBusy(false);
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.paperId !== paperId));
      setRejecting(null);
      setReason("");
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">队列为空，暂无待审核投稿。</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.paperId}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              <Link href={`/papers/${item.paperId}`} className="hover:underline">
                {item.title}
              </Link>
            </CardTitle>
            <Badge variant="secondary">{item.categoryId}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {rejecting === item.paperId ? (
              <div className="space-y-2">
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="填写拒绝理由（将通知作者）……"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => act(item.paperId, "reject")}
                  >
                    确认拒绝
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setRejecting(null);
                      setReason("");
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} onClick={() => act(item.paperId, "approve")}>
                  <Check className="h-4 w-4" />
                  通过
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setRejecting(item.paperId)}
                >
                  <X className="h-4 w-4" />
                  拒绝
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
