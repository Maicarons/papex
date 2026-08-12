"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/use-session";
import { useI18n } from "@/i18n/i18n-provider";
import { ApiKeyCreateForm } from "@/components/settings/api-key-create-form";
import { ApiKeyList, type ApiKeyPublic } from "@/components/settings/api-key-list";

/**
 * API Keys 设置页（容器）。
 * 负责：会话判定、列表数据获取、吊销动作；
 * 创建表单与列表渲染下放到子组件，避免单文件职责过载。
 */
export default function ApiKeysSettingsPage() {
  const { t } = useI18n();
  const { user, loaded } = useSession();

  const [keys, setKeys] = React.useState<ApiKeyPublic[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchKeys = React.useCallback(async () => {
    try {
      const res = await fetch("/api/settings/api-keys", { cache: "no-store" });
      const d = await res.json();
      setKeys(d.apiKeys ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (loaded && user) void fetchKeys();
  }, [loaded, user, fetchKeys]);

  async function onRevoke(id: string) {
    if (!confirm(t("apiKeys.confirmRevoke"))) return;
    const res = await fetch(`/api/settings/api-keys?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) await fetchKeys();
  }

  if (loaded && !user) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">{t("settings.loginRequired")}</p>
        <Button asChild>
          <Link href="/login">{t("settings.goLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">{t("apiKeys.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("apiKeys.subtitle")}</p>
      </div>

      <ApiKeyCreateForm onCreated={fetchKeys} />
      <ApiKeyList keys={keys} loading={loading} onRevoke={onRevoke} />
    </div>
  );
}
