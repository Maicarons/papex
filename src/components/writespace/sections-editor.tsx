"use client";

import * as React from "react";
import { useI18n } from "@/i18n/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { TextField, SelectField, TextAreaField, ItemCard } from "./fields";
import {
  type WritespaceDraft,
  type PapexSection,
  type PapexManifest,
  SECTION_LEVEL_OPTIONS,
} from "@/lib/writespace/manifest";

const SAMPLE_SECTIONS: { id: string; title: string; level: PapexSection["level"]; content: string }[] = [
  {
    id: "intro",
    title: "引言",
    level: "section",
    content:
      "研究背景与动机。说明当前领域面临的挑战，以及本文的贡献。\n\n" +
      "近年来，相关方向取得了显著进展 \\cite{sample2020}。然而，现有方法在……方面仍存在不足。\n\n" +
      "本文的主要贡献包括：\n\\begin{itemize}\n\\item 提出……\n\\item 验证了……\n\\end{itemize}\n",
  },
  {
    id: "related",
    title: "相关工作",
    level: "section",
    content: "综述与本文最相关的工作，并指出其与本文的区别。\n",
  },
  {
    id: "method",
    title: "方法",
    level: "section",
    content:
      "形式化问题描述，并给出核心方法。\n\n" +
      "给定输入 $x$，模型输出 $y = f_\\theta(x)$。损失函数定义为\n" +
      "\\[\n" +
      "\\mathcal{L}(\\theta) = \\mathbb{E}_{(x,y)}\\big[\\ell(f_\\theta(x), y)\\big].\n" +
      "\\]\n",
  },
  {
    id: "experiments",
    title: "实验",
    level: "section",
    content:
      "实验设置、数据集与评价指标。\n\n" +
      "\\begin{table}[h]\n\\centering\n\\caption{主要结果}\\label{tab:main}\n" +
      "\\begin{tabular}{lcc}\\toprule\n方法 & 精度 & 召回 \\\\\\n\\midrule\n基线 & 0.82 & 0.79 \\\\\n本文 & \\textbf{0.91} & \\textbf{0.88} \\\\\n\\bottomrule\\end{tabular}\n\\end{table}\n",
  },
  {
    id: "conclusion",
    title: "结论",
    level: "section",
    content: "总结全文，并指出未来工作方向。\n",
  },
];

function sanitizeId(raw: string): string {
  const s = raw
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || `sec-${Math.random().toString(36).slice(2, 7)}`;
}

function nextId(existing: string[]): string {
  let n = existing.length + 1;
  let cand = `sec-${n}`;
  while (existing.includes(cand)) {
    n += 1;
    cand = `sec-${n}`;
  }
  return cand;
}

export function SectionsEditor({
  draft,
  onDraftChange,
}: {
  draft: WritespaceDraft;
  onDraftChange: (d: WritespaceDraft) => void;
}) {
  const { t } = useI18n();
  const m = draft.manifest;
  const sections = m.sections ?? [];
  const appendices = m.appendices ?? [];

  const setSections = (list: PapexSection[]) =>
    onDraftChange({ ...draft, manifest: { ...m, sections: list } });
  const setAppendices = (list: PapexSection[]) =>
    onDraftChange({ ...draft, manifest: { ...m, appendices: list } });
  const setContent = (file: string, text: string) =>
    onDraftChange({ ...draft, contents: { ...draft.contents, [file]: text } });

  const updateSection = (i: number, patch: Partial<PapexSection>) =>
    setSections(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const moveSection = (i: number, dir: -1 | 1, list: PapexSection[], setter: (l: PapexSection[]) => void) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const arr = [...list];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setter(arr);
  };

  const addSection = (isAppendix: boolean) => {
    const list = isAppendix ? appendices : sections;
    const ids = list.map((s) => s.id ?? "");
    const id = nextId(ids);
    const file = `sections/${id}.tex`;
    const sec: PapexSection = isAppendix
      ? { id, title: "附录", file }
      : { id, title: "新章节", level: "section", file };
    const nextList = [...list, sec];
    const nextContents = { ...draft.contents, [file]: "" };
    const nextManifest: PapexManifest = isAppendix
      ? { ...m, appendices: nextList }
      : { ...m, sections: nextList };
    onDraftChange({ manifest: nextManifest, contents: nextContents });
  };

  const insertSamples = () => {
    const nextContents = { ...draft.contents };
    const nextSections = SAMPLE_SECTIONS.map((s) => {
      const file = `sections/${s.id}.tex`;
      nextContents[file] = s.content;
      return { id: s.id, title: s.title, level: s.level, file } as PapexSection;
    });
    onDraftChange({ ...draft, manifest: { ...m, sections: nextSections }, contents: nextContents });
  };

  const renderItem = (s: PapexSection, i: number, isAppendix: boolean) => {
    const list = isAppendix ? appendices : sections;
    const setter = isAppendix ? setAppendices : setSections;
    const content = draft.contents[s.file] ?? "";
    return (
      <ItemCard
        key={s.file}
        title={s.title || s.file}
        onRemove={() => {
          const nextList = list.filter((_, idx) => idx !== i);
          const nextContents = { ...draft.contents };
          delete nextContents[s.file];
          const nextManifest: PapexManifest = isAppendix
            ? { ...m, appendices: nextList }
            : { ...m, sections: nextList };
          onDraftChange({ manifest: nextManifest, contents: nextContents });
        }}
        onMoveUp={i > 0 ? () => moveSection(i, -1, list, setter) : undefined}
        onMoveDown={i < list.length - 1 ? () => moveSection(i, 1, list, setter) : undefined}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label={t("writespace.secTitle")}
            value={s.title ?? ""}
            onChange={(v) => updateSection(i, { title: v })}
          />
          <SelectField
            label={t("writespace.secLevel")}
            value={s.level ?? "section"}
            onChange={(v) => updateSection(i, { level: v as PapexSection["level"] })}
            options={SECTION_LEVEL_OPTIONS}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <code className="rounded bg-muted px-1.5 py-0.5">{s.file}</code>
        </div>
        <TextAreaField
          label={t("writespace.secContent")}
          value={content}
          onChange={(v) => setContent(s.file, v)}
          hint={t("writespace.secContentHint")}
          rows={14}
          className="font-mono text-xs leading-relaxed"
        />
        <p className="text-right text-xs text-muted-foreground">
          {content.length} {t("writespace.secCharCount")}
        </p>
      </ItemCard>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t("writespace.secList")}</CardTitle>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={insertSamples}>
              {t("writespace.secInsertSample")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addSection(false)}>
              <Plus className="mr-1 h-4 w-4" />
              {t("writespace.secAdd")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sections.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("writespace.secEmpty")}</p>
          )}
          {sections.map((s, i) => renderItem(s, i, false))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t("writespace.secAppendices")}</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => addSection(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t("writespace.secAddAppendix")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {appendices.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("writespace.secEmpty")}</p>
          )}
          {appendices.map((s, i) => renderItem(s, i, true))}
        </CardContent>
      </Card>
    </div>
  );
}
