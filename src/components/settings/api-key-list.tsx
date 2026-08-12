"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";
import { Trash2 } from "lucide-react";

export interface ApiKeyPublic {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ("read" | "write")[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/**
 * API Key 列表 + 单项吊销。
 * 仅负责渲染；加载/拉取/吊销均委托父组件（loading 态也由父组件传入）。
 */
export function ApiKeyList({
  keys,
  loading,
  onRevoke,
}: {
  keys: ApiKeyPublic[];
  loading: boolean;
  onRevoke: (id: string) => void;
}) {
  const { t } = useI18n();

  function fmtDate(d: string | null) {
    if (!d) return t("apiKeys.never");
    return new Date(d).toLocaleString();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("apiKeys.listTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("apiKeys.empty")}</p>
        ) : (
          <ul className="divide-y">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{k.name}</span>
                    {k.scopes.map((s) => (
                      <Badge key={s} variant={s === "write" ? "default" : "secondary"}>
                        {s}
                      </Badge>
                    ))}
                    {k.revokedAt && (
                      <Badge variant="destructive">{t("apiKeys.revoked")}</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {k.keyPrefix}…
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("apiKeys.lastUsed")}: {fmtDate(k.lastUsedAt)}
                  </p>
                </div>
                {!k.revokedAt && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRevoke(k.id)}
                    aria-label={t("apiKeys.revoke")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
