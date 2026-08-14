"use client";

import * as React from "react";
import { Loader2, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PermissionDef } from "@/lib/permission-catalog";
import { useI18n } from "@/i18n/i18n-provider";

interface RoleSummary {
  id: number;
  key: string;
  name: string;
  isSystem: boolean;
  permissionKeys: string[];
}

export function RolePermissionEditor({
  roles,
  permissions,
  groups,
}: {
  roles: RoleSummary[];
  permissions: PermissionDef[];
  groups: { key: string; name: string }[];
}) {
  const [activeId, setActiveId] = React.useState<number>(roles[0]?.id ?? 0);
  // draft[roleId] = Set of permission keys (local edits not yet saved).
  const [drafts, setDrafts] = React.useState<Record<number, Set<string>>>(() => {
    const init: Record<number, Set<string>> = {};
    for (const r of roles) init[r.id] = new Set(r.permissionKeys);
    return init;
  });
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const { t } = useI18n();

  const active = roles.find((r) => r.id === activeId) ?? roles[0];
  if (!active) {
    return <p className="text-sm text-muted-foreground">{t("admin.rolesEmpty")}</p>;
  }
  const activeSet = drafts[active.id] ?? new Set<string>();

  function toggle(key: string) {
    setSaved(false);
    setDrafts((prev) => {
      const next = new Set(prev[active.id]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [active.id]: next };
    });
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const r = await fetch(`/api/admin/roles/${active.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionKeys: [...activeSet] }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? t("admin.saveFailed"));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : t("admin.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Role selector */}
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveId(r.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
              active.id === r.id
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent",
            )}
          >
            {r.name}
            {r.isSystem && <Badge variant="secondary" className="px-1 py-0 text-[10px]">{t("admin.systemRole")}</Badge>}
            <span className="opacity-70">{drafts[r.id]?.size ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Permission matrix for the active role */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{active.name}</div>
            <div className="text-xs text-muted-foreground">
              已选 {activeSet.size} / {permissions.length} 项权限
            </div>
          </div>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            保存
            {saved && <Check className="ml-1 h-4 w-4" />}
          </Button>
        </div>

        {groups.map((g) => {
          const perms = permissions.filter((p) => p.group === g.key);
          if (perms.length === 0) return null;
          return (
            <div key={g.key}>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">{g.name}</div>
              <div className="flex flex-wrap gap-2">
                {perms.map((p) => {
                  const on = activeSet.has(p.key);
                  return (
                    <button
                      key={p.key}
                      onClick={() => toggle(p.key)}
                      title={p.description}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
