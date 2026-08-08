"use client";

import * as React from "react";
import { Search, Loader2, Check, ShieldCheck, KeyRound, Users as UsersIcon, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  SYSTEM_ROLE_KEYS,
} from "@/lib/permission-catalog";
import { cn } from "@/lib/utils";

interface Override {
  key: string;
  grant: boolean;
}
interface UserRow {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  roleKeys: string[];
  overrideCount: number;
  overrides: Override[];
}

const ROLE_LABEL: Record<string, string> = {
  admin: "管理员",
  moderator: "审核员",
  author: "作者",
  reader: "读者",
};

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Debounced search.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/users?q=${encodeURIComponent(q)}&pageSize=100`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { rows: [] }))
        .then((d) => setUsers(d.rows ?? []))
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_380px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">用户列表</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户名 / 昵称 / 邮箱"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 加载中…
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">无匹配用户</p>
          ) : (
            <ul className="divide-y">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => setSelectedId(u.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent",
                      selectedId === u.id && "bg-accent",
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {u.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{u.displayName}</span>
                        <Badge variant="outline" className="shrink-0">
                          {ROLE_LABEL[u.role] ?? u.role}
                        </Badge>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        @{u.username} · {u.email}
                      </span>
                    </span>
                    {u.overrideCount > 0 && (
                      <Badge variant="secondary" className="shrink-0">
                        {u.overrideCount} 项覆盖
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {selected ? (
        <UserEditor key={selected.id} user={selected} onUpdate={(u) =>
          setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)))
        } />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
            <UsersIcon className="h-8 w-8 opacity-40" />
            从左侧选择一名用户以管理其角色与权限
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UserEditor({
  user,
  onUpdate,
}: {
  user: UserRow;
  onUpdate: (u: UserRow) => void;
}) {
  const baseRole = user.role;
  const assignable = SYSTEM_ROLE_KEYS.filter((k) => k !== baseRole);
  const [roleKeys, setRoleKeys] = React.useState<string[]>(
    user.roleKeys.filter((k) => k !== baseRole),
  );
  const [overrides, setOverrides] = React.useState<Record<string, "inherit" | "allow" | "deny">>(
    () => {
      const map: Record<string, "inherit" | "allow" | "deny"> = {};
      for (const p of PERMISSIONS) map[p.key] = "inherit";
      for (const o of user.overrides) map[o.key] = o.grant ? "allow" : "deny";
      return map;
    },
  );
  const [savingRole, setSavingRole] = React.useState(false);
  const [roleSaved, setRoleSaved] = React.useState(false);
  const [permMsg, setPermMsg] = React.useState<string | null>(null);

  async function saveRoles() {
    setSavingRole(true);
    setRoleSaved(false);
    try {
      const r = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleKeys }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "保存失败");
      setRoleSaved(true);
      setTimeout(() => setRoleSaved(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingRole(false);
    }
  }

  async function changeOverride(key: string, value: "inherit" | "allow" | "deny") {
    const prev = overrides[key];
    setOverrides((o) => ({ ...o, [key]: value }));
    setPermMsg(null);
    const grant = value === "allow" ? true : value === "deny" ? false : null;
    try {
      const r = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: { key, grant } }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "保存失败");
      onUpdate({
        ...user,
        overrides: [
          ...user.overrides.filter((o) => o.key !== key),
          ...(grant === null ? [] : [{ key, grant: grant as boolean }]),
        ],
      });
      setPermMsg("已保存");
      setTimeout(() => setPermMsg(null), 2000);
    } catch (e) {
      setOverrides((o) => ({ ...o, [key]: prev }));
      setPermMsg(e instanceof Error ? e.message : "保存失败");
    }
  }

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle className="text-base">{user.displayName}</CardTitle>
        <p className="text-xs text-muted-foreground">@{user.username} · {user.email}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Base role */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <ShieldCheck className="h-4 w-4" /> 基础角色
          </div>
          <Badge>{ROLE_LABEL[baseRole] ?? baseRole}</Badge>
          <p className="mt-1 text-xs text-muted-foreground">
            基础角色权限始终生效，可被下方分配角色叠加，或被权限覆盖改写。
          </p>
        </div>

        {/* Assigned roles */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <KeyRound className="h-4 w-4" /> 附加角色
          </div>
          <div className="flex flex-wrap gap-2">
            {assignable.length === 0 ? (
              <p className="text-xs text-muted-foreground">无可用附加角色</p>
            ) : (
              assignable.map((k) => {
                const active = roleKeys.includes(k);
                return (
                  <button
                    key={k}
                    onClick={() =>
                      setRoleKeys((prev) =>
                        prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    {ROLE_LABEL[k] ?? k}
                  </button>
                );
              })
            )}
          </div>
          <Button size="sm" className="mt-3" onClick={saveRoles} disabled={savingRole}>
            {savingRole ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            保存角色
            {roleSaved && <Check className="ml-1 h-4 w-4" />}
          </Button>
        </div>

        {/* Permission overrides */}
        <div>
          <div className="mb-2 text-sm font-medium">权限覆盖</div>
          <p className="mb-2 text-xs text-muted-foreground">
            默认继承角色权限；可针对该用户单独「允许」或「禁止」某项权限。
          </p>
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {PERMISSION_GROUPS.map((g) => {
              const perms = PERMISSIONS.filter((p) => p.group === g.key);
              if (perms.length === 0) return null;
              return (
                <div key={g.key}>
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">{g.name}</div>
                  <div className="space-y-1.5">
                    {perms.map((p) => (
                      <div key={p.key} className="flex items-center justify-between gap-2">
                        <span className="text-sm" title={p.description}>
                          {p.name}
                        </span>
                        <Select
                          value={overrides[p.key]}
                          onValueChange={(v) => changeOverride(p.key, v as "inherit" | "allow" | "deny")}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inherit">默认</SelectItem>
                            <SelectItem value="allow">允许</SelectItem>
                            <SelectItem value="deny">禁止</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {permMsg && <p className="mt-2 text-xs text-emerald-600">{permMsg}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
