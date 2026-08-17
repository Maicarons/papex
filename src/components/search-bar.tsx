"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/i18n-provider";

export function SearchBar({ defaultValue = "", defaultSemantic = false }: { defaultValue?: string; defaultSemantic?: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [q, setQ] = React.useState(defaultValue);
  const [semantic, setSemantic] = React.useState(defaultSemantic);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (semantic) params.set("semantic", "1");
    router.push(`/papers?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2">
      <div className="flex w-full gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("common.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Button type="submit">{t("common.search")}</Button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Switch id="semantic-search" checked={semantic} onCheckedChange={setSemantic} />
        <Label htmlFor="semantic-search" className="cursor-pointer">
          {t("common.semanticSearch")}
        </Label>
        <span className="hidden sm:inline">· {t("common.semanticSearchHint")}</span>
      </div>
    </form>
  );
}
