"use client";

import * as React from "react";
import { useI18n } from "@/i18n/i18n-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MetadataEditor } from "./metadata-editor";
import { SectionsEditor } from "./sections-editor";
import { ExportPanel, type ExportResult } from "./export-panel";
import {
  type WritespaceDraft,
  createDefaultDraft,
  validateDraft,
} from "@/lib/writespace/manifest";
import { buildArchiveFiles, type BuildAssets } from "@/lib/writespace/latex-gen";
import { createTarGz } from "@/lib/writespace/targz";

const STORAGE_KEY = "papex-writespace-draft";

export function WritespaceClient({
  categoryOptions,
}: {
  categoryOptions: { id: string; name: string }[];
}) {
  const { t } = useI18n();
  const [draft, setDraft] = React.useState<WritespaceDraft>(() => createDefaultDraft());
  const [activeTab, setActiveTab] = React.useState("meta");
  const [exporting, setExporting] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [result, setResult] = React.useState<ExportResult | null>(null);
  const [restored, setRestored] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(false);
  const skipFirstSave = React.useRef(true);

  // 载入本地草稿：必须在挂载后读取，不能用惰性 useState 初始化（否则客户端首屏与
  // SSR 输出不一致会触发 hydration mismatch）。此处的同步 setState 是刻意且只执行一次。
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WritespaceDraft;
        if (parsed && parsed.manifest && Array.isArray(parsed.manifest.sections)) {
          setDraft(parsed);
          setRestored(true);
        }
      }
    } catch {
      /* 忽略损坏的草稿 */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 自动保存到本地（跳过首次，避免覆盖已载入的草稿）
  React.useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setSavedAt(true);
      } catch {
        /* 容量或隐私模式限制，忽略 */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [draft]);

  const validation = React.useMemo(() => validateDraft(draft), [draft]);

  async function loadAssets(): Promise<BuildAssets> {
    const [tRes, cRes] = await Promise.all([
      fetch("/writespace/papex-template.tex"),
      fetch("/writespace/papex.cls"),
    ]);
    if (!tRes.ok || !cRes.ok) throw new Error(t("writespace.fetchAssetsFailed"));
    return { templateTex: await tRes.text(), cls: await cRes.text() };
  }

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleExport() {
    setExporting(true);
    setResult(null);
    try {
      const assets = await loadAssets();
      const files = buildArchiveFiles(draft.manifest, draft.contents, assets);
      const blob = await createTarGz(files);
      downloadBlob(blob, t("writespace.expDownloadName"));
    } catch (e) {
      setResult({ status: "error", message: (e as Error).message });
    } finally {
      setExporting(false);
    }
  }

  async function handlePublish() {
    if (!validation.valid) return;
    setPublishing(true);
    setResult(null);
    try {
      const assets = await loadAssets();
      const files = buildArchiveFiles(draft.manifest, draft.contents, assets);
      const blob = await createTarGz(files);
      const fd = new FormData();
      fd.append("file", blob, t("writespace.expDownloadName"));
      const res = await fetch("/api/submit/archive", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setResult({ status: "error", message: data.error ?? t("writespace.expError") });
        return;
      }
      setResult({ status: "success", data });
      setRestored(false);
    } catch (e) {
      setResult({ status: "error", message: (e as Error).message });
    } finally {
      setPublishing(false);
    }
  }

  function handleNew() {
    if (!confirm(t("writespace.confirmNew"))) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setDraft(createDefaultDraft());
    setResult(null);
    setRestored(false);
    setActiveTab("meta");
  }

  const onDraftChange = (next: WritespaceDraft) => {
    setDraft(next);
    setResult(null);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("writespace.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("writespace.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {restored ? (
            <span className="text-xs text-muted-foreground">{t("writespace.draftRestored")}</span>
          ) : savedAt ? (
            <span className="text-xs text-muted-foreground">{t("writespace.draftSaved")}</span>
          ) : null}
          <Button variant="outline" size="sm" onClick={handleNew}>
            {t("writespace.newDraft")}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="meta">{t("writespace.tabMeta")}</TabsTrigger>
          <TabsTrigger value="sections">{t("writespace.tabSections")}</TabsTrigger>
          <TabsTrigger value="export">{t("writespace.tabExport")}</TabsTrigger>
        </TabsList>
        <TabsContent value="meta">
          <MetadataEditor
            draft={draft}
            onDraftChange={onDraftChange}
            categoryOptions={categoryOptions}
          />
        </TabsContent>
        <TabsContent value="sections">
          <SectionsEditor draft={draft} onDraftChange={onDraftChange} />
        </TabsContent>
        <TabsContent value="export">
          <ExportPanel
            draft={draft}
            validation={validation}
            exporting={exporting}
            publishing={publishing}
            result={result}
            onExport={handleExport}
            onPublish={handlePublish}
            onReset={() => {
              setResult(null);
              setRestored(false);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
