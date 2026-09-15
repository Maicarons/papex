"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";

interface ImportReport {
  total: number;
  imported: { title: string; doi: string; paperId: string }[];
  matched: { title: string; doi: string; paperId: string }[];
  failed: { title: string; doi: string | null; error: string }[];
}

/**
 * ORCID publication import (P1-E): fetch the user's own works from ORCID,
 * match them against locally indexed papers by DOI, and submit the rest
 * through the standard external-import pipeline.
 */
export function OrcidImport({ orcid }: { orcid: string }) {
  const { t, format } = useI18n();
  const [busy, setBusy] = React.useState(false);
  const [report, setReport] = React.useState<ImportReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/me/orcid/import", { method: "POST" });
      if (res.status === 429) {
        setError(t("settings.orcidRateLimited"));
        return;
      }
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? t("settings.orcidFailed"));
        return;
      }
      setReport(d);
    } catch {
      setError(t("settings.orcidFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!orcid.trim()) {
    return <p className="text-sm text-muted-foreground">{t("settings.orcidMissing")}</p>;
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <UserRoundSearch className="mt-0.5 h-5 w-5 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">{t("settings.orcidImport")}</p>
          <p className="text-sm text-muted-foreground">{t("settings.orcidHint")}</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {report && (
            <div className="space-y-1 pt-1 text-sm">
              <p className="text-muted-foreground">
                {format(t("settings.orcidSummary"), {
                  imported: String(report.imported.length),
                  matched: String(report.matched.length),
                  failed: String(report.failed.length),
                })}
              </p>
              {report.imported.length > 0 && (
                <ul className="space-y-1">
                  {report.imported.map((r, i) => (
                    <li key={i}>
                      <Link href={`/papers/${r.paperId}`} className="text-primary hover:underline">
                        {r.title}
                      </Link>
                      <span className="ml-2 text-xs text-green-600">{t("settings.orcidImported")}</span>
                    </li>
                  ))}
                </ul>
              )}
              {report.failed.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {report.failed.length} {t("settings.orcidFailedCount")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={run} disabled={busy}>
        {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        {busy ? t("settings.orcidImporting") : t("settings.orcidBtn")}
      </Button>
    </div>
  );
}
