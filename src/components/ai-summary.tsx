"use client";

import * as React from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";

export interface AiPoint {
  claim: string;
  evidence: string;
  confidence: number;
}

export interface AiSummaryData {
  summary: string;
  points: AiPoint[];
}

/**
 * AI summary card (P1-C). Shown only when the deployment has an LLM backend
 * (`enabled` from the API). Generating is signed-in + rate-limited server-side;
 * the result carries provenance (each point quotes its evidence) and is cached.
 */
export function AiSummary({
  paperId,
  version,
}: {
  paperId: string;
  version: number;
}) {
  const { t, locale } = useI18n();
  const [enabled, setEnabled] = React.useState<boolean | null>(null);
  const [summary, setSummary] = React.useState<AiSummaryData | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`/api/papers/${encodeURIComponent(paperId)}/ai?version=${version}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean; summary?: AiSummaryData | null } | null) => {
        setEnabled(d?.enabled ?? false);
        setSummary(d?.summary ?? null);
      })
      .catch(() => setEnabled(false));
  }, [paperId, version]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/papers/${encodeURIComponent(paperId)}/ai?version=${version}&lang=${locale === "zh" ? "zh" : "en"}`,
        { method: "POST", cache: "no-store" },
      );
      if (res.status === 401) {
        setError(t("paper.aiLoginHint"));
        return;
      }
      if (res.status === 429) {
        setError(t("paper.aiRateLimited"));
        return;
      }
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? t("paper.aiError"));
        return;
      }
      setSummary(d.summary);
    } catch {
      setError(t("paper.aiError"));
    } finally {
      setBusy(false);
    }
  }

  if (enabled === false) return null;
  if (enabled === null) return null;

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("paper.aiSummary")}
        </h3>
        {summary ? (
          <Button size="sm" variant="ghost" onClick={generate} disabled={busy}>
            {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {t("paper.aiRegenerate")}
          </Button>
        ) : (
          <Button size="sm" onClick={generate} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bot className="mr-1.5 h-3.5 w-3.5" />
            )}
            {t("paper.aiGenerate")}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {summary && (
        <div className="space-y-3 text-sm">
          <p className="leading-relaxed">{summary.summary}</p>
          {summary.points.length > 0 && (
            <ul className="space-y-2.5">
              {summary.points.map((p, i) => (
                <li key={i} className="rounded-lg bg-muted/40 p-3">
                  <div className="flex items-start gap-2">
                    <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium leading-snug">{p.claim}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("paper.aiEvidence")}：“{p.evidence}”
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {t("paper.aiConfidence")}
                        </span>
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.round(p.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {Math.round(p.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
