"use client";

import * as React from "react";
import { useI18n } from "@/i18n/i18n-provider";
import { Button } from "@/components/ui/button";

interface CategoryNode {
  id: string;
  name: string;
  children: CategoryNode[];
}

interface CategoryOption {
  id: string;
  name: string;
}

function flatten(tree: CategoryNode[]): CategoryOption[] {
  const out: CategoryOption[] = [];
  const walk = (nodes: CategoryNode[]) => {
    for (const n of nodes) {
      out.push({ id: n.id, name: n.name });
      if (n.children?.length) walk(n.children);
    }
  };
  walk(tree);
  return out;
}

export function EndorseUserButton({ endorseeId }: { endorseeId: string }) {
  const { t } = useI18n();
  const [self, setSelf] = React.useState<boolean | null>(null);
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [categoryId, setCategoryId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setSelf(!!d.user && d.user.id === endorseeId);
      })
      .catch(() => active && setSelf(false));
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setCategories(flatten(d.categories ?? []));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [endorseeId]);

  // Still resolving viewer identity, or viewing your own profile.
  if (self === null || self) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!categoryId) {
      setMsg(t("endorsements.selectCategory"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/endorsements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endorseeId, categoryId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(t("endorsements.endorsed"));
        setCategoryId("");
      } else {
        setMsg(data.error ?? t("endorsements.alreadyEndorsed"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">{t("endorsements.fromCategory")}</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">{t("endorsements.selectCategory")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={busy} size="sm">
        {t("endorsements.endorseBtn")}
      </Button>
      {msg && <p className="w-full text-xs text-muted-foreground">{msg}</p>}
    </form>
  );
}
