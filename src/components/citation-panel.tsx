"use client";

import * as React from "react";
import { Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CitationGraph } from "@/components/citation-graph";
import type { CitationOut } from "@/lib/services/citations";
import { useI18n } from "@/i18n/i18n-provider";
import { format } from "@/i18n";

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
  const { t } = useI18n();
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
      setMsg(t("citations.addHint"));
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
      setMsg(t("citations.added"));
      await refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? t("citations.addFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Link2 className="h-4 w-4" /> {format(t("citations.referencedCount"), { n: outgoing.length })}
        </span>
        <span>{format(t("citations.citedBy"), { n: incoming.length })}</span>
      </div>

      {(outgoing.length > 0 || incoming.length > 0) && (
        <Card>
          <CardContent className="pt-4">
            <CitationGraph
              paperId={paperId}
              paperTitle={t("citations.thisPaper")}
              outgoing={outgoing}
              incoming={incoming}
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{t("citations.incomingLabel")}</span>
              <span>{t("citations.outgoingLabel")}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("citations.addTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Input
                value={arxiv}
                onChange={(e) => setArxiv(e.target.value)}
                placeholder={t("citations.phArxiv")}
                className="sm:w-48"
              />
              <Input
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder={t("citations.phDoi")}
                className="sm:w-48"
              />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("citations.phTitle")}
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
