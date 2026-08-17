"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/i18n-provider";

interface CategoryOption {
  id: string;
  name: string;
}

// Field -> query prefix. Empty prefix = full-text search.
const FIELD_PREFIX: Record<string, string> = {
  fieldAll: "",
  fieldTitle: "title:",
  fieldAuthor: "au:",
  fieldAbstract: "abs:",
  fieldCategory: "cat:",
};

// Time range (years) -> ISO date for the `from` filter.
const TIME_YEARS: Record<string, number | null> = {
  timeAll: null,
  time1y: 1,
  time3y: 3,
  time5y: 5,
  time10y: 10,
};

function yearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export function PapersFilter({
  categories,
  initialQ = "",
  initialCategory = "",
  initialSort = "new",
  initialField = "fieldAll",
  initialTime = "timeAll",
  initialSemantic = false,
}: {
  categories: CategoryOption[];
  initialQ?: string;
  initialCategory?: string;
  initialSort?: "new" | "updated" | "by_citations";
  initialField?: string;
  initialTime?: string;
  initialSemantic?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [q, setQ] = React.useState(initialQ);
  const [category, setCategory] = React.useState(initialCategory);
  const [sort, setSort] = React.useState(initialSort);
  const [field, setField] = React.useState(initialField);
  const [time, setTime] = React.useState(initialTime);
  const [semantic, setSemantic] = React.useState(initialSemantic);

  function apply() {
    const params = new URLSearchParams();
    const query = q.trim();
    if (query) {
      const prefix = FIELD_PREFIX[field] ?? "";
      params.set("q", `${prefix}${query}`);
    }
    if (semantic) params.set("semantic", "1");
    if (category && category !== "__all") params.set("category", category);
    if (sort !== "new") params.set("sort", sort);
    const from = TIME_YEARS[time] ? yearsAgo(TIME_YEARS[time]!) : null;
    if (from) params.set("from", from);
    router.push(`/papers?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder={t("papers.filterPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select value={field} onValueChange={setField}>
          <SelectTrigger className="md:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fieldAll">{t("papers.fieldAll")}</SelectItem>
            <SelectItem value="fieldTitle">{t("papers.fieldTitle")}</SelectItem>
            <SelectItem value="fieldAuthor">{t("papers.fieldAuthor")}</SelectItem>
            <SelectItem value="fieldAbstract">{t("papers.fieldAbstract")}</SelectItem>
            <SelectItem value="fieldCategory">{t("papers.fieldCategory")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder={t("papers.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">{t("papers.allCategories")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.id} · {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={time} onValueChange={setTime}>
          <SelectTrigger className="md:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="timeAll">{t("papers.timeAll")}</SelectItem>
            <SelectItem value="time1y">{t("papers.time1y")}</SelectItem>
            <SelectItem value="time3y">{t("papers.time3y")}</SelectItem>
            <SelectItem value="time5y">{t("papers.time5y")}</SelectItem>
            <SelectItem value="time10y">{t("papers.time10y")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as "new" | "updated" | "by_citations")}>
          <SelectTrigger className="md:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">{t("papers.latestSubmissions")}</SelectItem>
            <SelectItem value="updated">{t("papers.recentUpdates")}</SelectItem>
            <SelectItem value="by_citations">{t("papers.sortByCitations")}</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={apply}>{t("papers.filter")}</Button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Switch id="semantic-filter" checked={semantic} onCheckedChange={setSemantic} />
        <Label htmlFor="semantic-filter" className="cursor-pointer">
          {t("common.semanticSearch")}
        </Label>
      </div>
    </div>
  );
}
