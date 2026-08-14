"use client";

import * as React from "react";
import { useI18n } from "@/i18n/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import {
  TextField,
  TextAreaField,
  SelectField,
  SwitchField,
  ItemCard,
} from "./fields";
import {
  type WritespaceDraft,
  type PapexAuthor,
  type PapexReference,
  type PapexBuild,
  LICENSE_OPTIONS,
  REF_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/lib/writespace/manifest";

export function MetadataEditor({
  draft,
  onDraftChange,
  categoryOptions,
}: {
  draft: WritespaceDraft;
  onDraftChange: (d: WritespaceDraft) => void;
  categoryOptions: { id: string; name: string }[];
}) {
  const { t } = useI18n();
  const m = draft.manifest;
  const paper = m.paper;

  const setPaper = (patch: Partial<typeof paper>) =>
    onDraftChange({ ...draft, manifest: { ...m, paper: { ...paper, ...patch } } });
  const setBuild = (patch: Partial<PapexBuild>) =>
    onDraftChange({ ...draft, manifest: { ...m, build: { ...(m.build ?? {}), ...patch } } });

  const categoryOptionsLabeled = categoryOptions.map((c) => ({
    value: c.id,
    label: `${c.id} · ${c.name}`,
  }));

  // ---- authors ----
  const authors = m.authors ?? [];
  const setAuthors = (list: PapexAuthor[]) =>
    onDraftChange({ ...draft, manifest: { ...m, authors: list } });
  const updateAuthor = (i: number, patch: Partial<PapexAuthor>) =>
    setAuthors(authors.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const moveAuthor = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= authors.length) return;
    const list = [...authors];
    [list[i], list[j]] = [list[j], list[i]];
    setAuthors(list);
  };

  // ---- references ----
  const references = m.references ?? [];
  const setReferences = (list: PapexReference[]) =>
    onDraftChange({ ...draft, manifest: { ...m, references: list } });
  const updateRef = (i: number, patch: Partial<PapexReference>) =>
    setReferences(references.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const moveRef = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= references.length) return;
    const list = [...references];
    [list[i], list[j]] = [list[j], list[i]];
    setReferences(list);
  };

  const secondary = paper.secondaryCategoryIds ?? [];
  const availableSecondary = categoryOptions.filter(
    (c) => c.id !== paper.primaryCategoryId && !secondary.includes(c.id),
  );

  return (
    <div className="space-y-6">
      {/* 论文信息 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("writespace.metaPaper")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TextField
            label={t("writespace.fTitle")}
            value={paper.title}
            onChange={(v) => setPaper({ title: v })}
            placeholder={t("writespace.paperTitlePlaceholder")}
          />
          <TextField
            label={t("writespace.fSubtitle")}
            value={paper.subtitle ?? ""}
            onChange={(v) => setPaper({ subtitle: v })}
          />
          <TextAreaField
            label={t("writespace.fAbstract")}
            value={paper.abstract}
            onChange={(v) => setPaper({ abstract: v })}
            placeholder={t("writespace.abstractPlaceholder")}
            rows={5}
          />
          <TextField
            label={t("writespace.fKeywords")}
            value={(paper.keywords ?? []).join(", ")}
            onChange={(v) =>
              setPaper({
                keywords: v
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            hint={t("writespace.fKeywordsHint")}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label={t("writespace.fPrimaryCategory")}
              value={paper.primaryCategoryId}
              onChange={(v) => setPaper({ primaryCategoryId: v })}
              options={categoryOptionsLabeled}
              placeholder={t("writespace.selectPrimaryCategory")}
            />
            <SelectField
              label={t("writespace.fLanguage")}
              value={paper.language ?? "auto"}
              onChange={(v) =>
                setPaper({ language: v as typeof paper.language })
              }
              options={LANGUAGE_OPTIONS}
            />
            <SelectField
              label={t("writespace.fLicense")}
              value={paper.license ?? "CC-BY-4.0"}
              onChange={(v) => setPaper({ license: v })}
              options={LICENSE_OPTIONS}
            />
            <TextField
              label={t("writespace.fDoi")}
              value={paper.doi ?? ""}
              onChange={(v) => setPaper({ doi: v })}
              placeholder="10.xxxx/xxxxx"
            />
            <TextField
              label={t("writespace.fVenue")}
              value={paper.venue ?? ""}
              onChange={(v) => setPaper({ venue: v })}
            />
            <TextField
              label={t("writespace.fVersionNote")}
              value={paper.versionNote ?? ""}
              onChange={(v) => setPaper({ versionNote: v })}
            />
          </div>
          <TextField
            label={t("writespace.fPaperId")}
            value={paper.id ?? ""}
            onChange={(v) => setPaper({ id: v || undefined })}
            hint={t("writespace.fPaperIdHint")}
          />

          {/* 次要分类 */}
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">{t("writespace.fSecondaryCategories")}</span>
            <div className="flex flex-wrap gap-2">
              {secondary.map((cid) => (
                <Badge key={cid} variant="secondary" className="gap-1">
                  {cid}
                  <button
                    type="button"
                    className="ml-1 hover:text-destructive"
                    onClick={() =>
                      setPaper({
                        secondaryCategoryIds: secondary.filter((x) => x !== cid),
                      })
                    }
                    aria-label={t("writespace.fRemoveSecondary")}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            {availableSecondary.length > 0 && (
              <SelectField
                label=""
                value=""
                onChange={(v) =>
                  setPaper({ secondaryCategoryIds: [...secondary, v] })
                }
                options={availableSecondary.map((c) => ({
                  value: c.id,
                  label: `${c.id} · ${c.name}`,
                }))}
                placeholder={t("writespace.fAddSecondary")}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* 作者 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t("writespace.metaAuthors")}</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAuthors([...authors, { name: "" }])}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("writespace.addAuthor")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {authors.map((a, i) => (
            <ItemCard
              key={i}
              title={a.name || `(${t("writespace.authorName")} ${i + 1})`}
              onRemove={authors.length > 1 ? () => setAuthors(authors.filter((_, idx) => idx !== i)) : undefined}
              onMoveUp={i > 0 ? () => moveAuthor(i, -1) : undefined}
              onMoveDown={i < authors.length - 1 ? () => moveAuthor(i, 1) : undefined}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label={t("writespace.authorName")}
                  value={a.name}
                  onChange={(v) => updateAuthor(i, { name: v })}
                />
                <TextField
                  label={t("writespace.authorAffiliation")}
                  value={a.affiliation ?? ""}
                  onChange={(v) => updateAuthor(i, { affiliation: v })}
                />
                <TextField
                  label={t("writespace.authorEmail")}
                  value={a.email ?? ""}
                  onChange={(v) => updateAuthor(i, { email: v })}
                  type="email"
                />
                <TextField
                  label={t("writespace.authorOrcid")}
                  value={a.orcid ?? ""}
                  onChange={(v) => updateAuthor(i, { orcid: v })}
                />
                <TextField
                  label={t("writespace.authorHomepage")}
                  value={a.homepage ?? ""}
                  onChange={(v) => updateAuthor(i, { homepage: v })}
                />
                <TextField
                  label={t("writespace.authorOrder")}
                  value={a.order != null ? String(a.order) : String(i)}
                  onChange={(v) =>
                    updateAuthor(i, { order: v === "" ? undefined : Number(v) })
                  }
                  type="number"
                />
              </div>
              <TextAreaField
                label={t("writespace.authorFootnote")}
                value={a.footnote ?? ""}
                onChange={(v) => updateAuthor(i, { footnote: v })}
                rows={2}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <SwitchField
                  label={t("writespace.authorCorresponding")}
                  checked={!!a.corresponding}
                  onChange={(v) => updateAuthor(i, { corresponding: v })}
                />
                <SwitchField
                  label={t("writespace.authorEqual")}
                  checked={!!a.equalContribution}
                  onChange={(v) => updateAuthor(i, { equalContribution: v })}
                />
              </div>
            </ItemCard>
          ))}
        </CardContent>
      </Card>

      {/* 参考文献 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t("writespace.metaReferences")}</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setReferences([...references, { key: "" }])}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("writespace.addReference")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {references.map((r, i) => (
            <ItemCard
              key={i}
              title={r.key || `(${t("writespace.refKey")} ${i + 1})`}
              onRemove={() => setReferences(references.filter((_, idx) => idx !== i))}
              onMoveUp={i > 0 ? () => moveRef(i, -1) : undefined}
              onMoveDown={i < references.length - 1 ? () => moveRef(i, 1) : undefined}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <TextField
                  label={t("writespace.refKey")}
                  value={r.key}
                  onChange={(v) => updateRef(i, { key: v })}
                  placeholder="vaswani2017"
                />
                <SelectField
                  label={t("writespace.refType")}
                  value={r.type ?? "misc"}
                  onChange={(v) => updateRef(i, { type: v as PapexReference["type"] })}
                  options={REF_TYPE_OPTIONS}
                />
                <TextField
                  label={t("writespace.refYear")}
                  value={r.year != null ? String(r.year) : ""}
                  onChange={(v) => updateRef(i, { year: v === "" ? undefined : Number(v) })}
                  type="number"
                />
                <TextField
                  label={t("writespace.refTitle")}
                  value={r.title ?? ""}
                  onChange={(v) => updateRef(i, { title: v })}
                />
                <TextField
                  label={t("writespace.refAuthor")}
                  value={r.author ?? ""}
                  onChange={(v) => updateRef(i, { author: v })}
                />
                <TextField
                  label={t("writespace.refJournal")}
                  value={r.journal ?? ""}
                  onChange={(v) => updateRef(i, { journal: v })}
                />
                <TextField
                  label={t("writespace.refBooktitle")}
                  value={r.booktitle ?? ""}
                  onChange={(v) => updateRef(i, { booktitle: v })}
                />
                <TextField
                  label={t("writespace.refVolume")}
                  value={r.volume ?? ""}
                  onChange={(v) => updateRef(i, { volume: v })}
                />
                <TextField
                  label={t("writespace.refNumber")}
                  value={r.number ?? ""}
                  onChange={(v) => updateRef(i, { number: v })}
                />
                <TextField
                  label={t("writespace.refPages")}
                  value={r.pages ?? ""}
                  onChange={(v) => updateRef(i, { pages: v })}
                  placeholder="5998--6008"
                />
                <TextField
                  label={t("writespace.refPublisher")}
                  value={r.publisher ?? ""}
                  onChange={(v) => updateRef(i, { publisher: v })}
                />
                <TextField
                  label={t("writespace.refDoi")}
                  value={r.doi ?? ""}
                  onChange={(v) => updateRef(i, { doi: v })}
                />
                <TextField
                  label={t("writespace.refArxiv")}
                  value={r.arxivId ?? ""}
                  onChange={(v) => updateRef(i, { arxivId: v })}
                />
                <TextField
                  label={t("writespace.refUrl")}
                  value={r.url ?? ""}
                  onChange={(v) => updateRef(i, { url: v })}
                />
                <TextField
                  label={t("writespace.refNote")}
                  value={r.note ?? ""}
                  onChange={(v) => updateRef(i, { note: v })}
                />
              </div>
            </ItemCard>
          ))}
          {references.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("writespace.secEmpty")}</p>
          )}
        </CardContent>
      </Card>

      {/* 构建选项 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("writespace.metaBuild")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label={t("writespace.buildBibStyle")}
              value={m.build?.bibStyle ?? "numeric"}
              onChange={(v) => setBuild({ bibStyle: v as PapexBuild["bibStyle"] })}
              options={[
                { value: "numeric", label: "numeric" },
                { value: "authoryear", label: "authoryear" },
              ]}
            />
            <SelectField
              label={t("writespace.buildColumns")}
              value={String(m.build?.columns ?? 1)}
              onChange={(v) => setBuild({ columns: (Number(v) === 2 ? 2 : 1) as 1 | 2 })}
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
              ]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
