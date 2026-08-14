"use client";

import * as React from "react";
import { Quote, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/i18n-provider";

interface CiteButtonProps {
  paperId: string;
  title: string;
  authors: { name: string }[];
  year: number;
  url: string;
}

/** Build citation strings in GB/T 7714, BibTeX and APA formats. */
function buildCitations({ paperId, title, authors, year, url }: CiteButtonProps): {
  gbt: string;
  bibtex: string;
  apa: string;
} {
  const names = authors.map((a) => a.name);
  const authorList = names.join(", ");
  const bibAuthors = names.join(" and ") || "Anonymous";
  const apaAuthors =
    names
      .map((n) => {
        const parts = n.trim().split(/\s+/);
        if (parts.length <= 1) return n;
        const last = parts[parts.length - 1];
        const initials = parts.slice(0, -1).map((p) => `${p[0]}.`).join(" ");
        return `${last}, ${initials}`;
      })
      .join(", ") || "Anonymous";

  return {
    gbt: `${authorList || "佚名"}. ${title}[EB/OL]. Papex, ${year}. ${url}`,
    bibtex: `@misc{${paperId},\n  title = {${title}},\n  author = {${bibAuthors}},\n  year = {${year}},\n  publisher = {Papex},\n  note = {${url}}\n}`,
    apa: `${apaAuthors} (${year}). ${title}. Papex. ${url}`,
  };
}

export function CiteButton(props: CiteButtonProps) {
  const { t } = useI18n();
  const [copied, setCopied] = React.useState<"gbt" | "bibtex" | "apa" | null>(null);

  async function copy(kind: "gbt" | "bibtex" | "apa") {
    const c = buildCitations(props);
    try {
      await navigator.clipboard.writeText(c[kind]);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Quote className="mr-1.5 h-4 w-4" />
          {t("paper.cite")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {(
          [
            { kind: "gbt", label: t("paper.citeGbt") },
            { kind: "bibtex", label: t("paper.citeBibtex") },
            { kind: "apa", label: t("paper.citeApa") },
          ] as const
        ).map((item) => (
          <DropdownMenuItem key={item.kind} onClick={() => copy(item.kind)}>
            <span className="flex-1">{item.label}</span>
            {copied === item.kind && <Check className="h-3.5 w-3.5 text-emerald-500" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
