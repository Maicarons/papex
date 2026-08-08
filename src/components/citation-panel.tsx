"use client";

import * as React from "react";
import { Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CitationGraph } from "@/components/citation-graph";
import type { CitationOut } from "@/lib/services/citations";

export function CitationPanel({
  paperId,
  initialOutgoing,
  initialIncoming,
  canEdit,
}: {
  paperId: string;
  initialOutgoing: CitationOut[];
  initialIncoming: CitationOut[];
  canEdit: boolean;
}) {
  const [outgoing, setOutgoing] = React.useState(initialOutgoing);
  const [incoming, setIncoming] = React.useState(initialIncoming);
  const [arxiv, setArxiv] = React.useState("");
  const [doi, setDoi] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/papers/${encodeURIComponent(paperId)}/citations`);
    if (res.ok) {
      const data = await res.json();
      setOutgoing(data.outgoing ?? []);
      setIncoming(data.incoming ?? []);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!arxiv && !doi && !title) {
      setMsg("请至少填写文献编号、DOI 或标题");
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/papers/${encodeURIComponent(paperId)}/citations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetArxivId: arxiv, targetDoi: doi, targetTitle: title }),
    });
    setBusy(false);
    if (res.ok) {
      setArxiv("");
      setDoi("");
      setTitle("");
      setMsg("已添加引用");
      await refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "添加失败");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Link2 className="h-4 w-4" /> 引用 {outgoing.length} 篇
        </span>
        <span>被引 {incoming.length} 次</span>
      </div>

      {(outgoing.length > 0 || incoming.length > 0) && (
        <Card>
          <CardContent className="pt-4">
            <CitationGraph
              paperId={paperId}
              paperTitle="本论文"
              outgoing={outgoing}
              incoming={incoming}
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>← 被以下论文引用</span>
              <span>引用以下文献 →</span>
            </div>
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">添加引用</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Input
                value={arxiv}
                onChange={(e) => setArxiv(e.target.value)}
                placeholder="文献编号，如 2401.12345"
                className="sm:w-48"
              />
              <Input
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="DOI，如 10.1234/abc"
                className="sm:w-48"
              />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="或填写标题"
                className="sm:flex-1"
              />
              <Button type="submit" disabled={busy} size="sm">
                <Plus className="h-4 w-4" /> 添加
              </Button>
            </form>
            {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
