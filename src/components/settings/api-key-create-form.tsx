"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/i18n-provider";
import { Copy, Check, AlertTriangle } from "lucide-react";

/**
 * API Key 创建表单 + 一次性明文 token 展示。
 * 自身管理 name / 权限 / 创建态 / 明文 token / 复制态 / 错误态；
 * 创建成功后通过 onCreated 通知父组件刷新列表。
 */
export function ApiKeyCreateForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useI18n();
  const [name, setName] = React.useState("");
  const [allowWrite, setAllowWrite] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [newToken, setNewToken] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState("");

  async function copyToken() {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "default",
          scopes: allowWrite ? ["read", "write"] : ["read"],
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? t("apiKeys.createFailed"));
        return;
      }
      setNewToken(d.apiKey.token);
      setName("");
      setAllowWrite(false);
      onCreated();
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("apiKeys.createTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {newToken && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">{t("apiKeys.secretWarning")}</p>
                <p className="mt-1 break-all font-mono text-xs">{newToken}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={copyToken}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? t("apiKeys.copied") : t("apiKeys.copy")}
                </Button>
                <button className="ml-3 text-xs underline" onClick={() => setNewToken(null)}>
                  {t("apiKeys.dismiss")}
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={onCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyName">{t("apiKeys.nameLabel")}</Label>
            <Input
              id="keyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("apiKeys.namePlaceholder")}
              maxLength={80}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{t("apiKeys.writeScope")}</p>
              <p className="text-xs text-muted-foreground">{t("apiKeys.writeScopeHint")}</p>
            </div>
            <Switch checked={allowWrite} onCheckedChange={setAllowWrite} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={creating}>
            {creating ? t("apiKeys.creating") : t("apiKeys.createBtn")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
