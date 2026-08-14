"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export function PapersFilter({
  categories,
  initialQ = "",
  initialCategory = "",
  initialSort = "new",
}: {
  categories: CategoryOption[];
  initialQ?: string;
  initialCategory?: string;
  initialSort?: "new" | "updated";
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [q, setQ] = React.useState(initialQ);
  const [category, setCategory] = React.useState(initialCategory);
  const [sort, setSort] = React.useState(initialSort);

  function apply() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category && category !== "__all") params.set("category", category);
    if (sort !== "new") params.set("sort", sort);
    router.push(`/papers?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row">
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
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="md:w-56">
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
      <Select value={sort} onValueChange={(v) => setSort(v as "new" | "updated")}>
        <SelectTrigger className="md:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new">{t("papers.latestSubmissions")}</SelectItem>
          <SelectItem value="updated">{t("papers.recentUpdates")}</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={apply}>{t("papers.filter")}</Button>
    </div>
  );
}
