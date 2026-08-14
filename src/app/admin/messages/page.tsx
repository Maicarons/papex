"use client";

import * as React from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-provider";

// Base user roles (must match the user_role enum). `reader` is a RBAC-only
// role and cannot be a user's base role, so it is excluded here.
const BASE_ROLES = ["admin", "moderator", "author"] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: "admin.roleAdmin",
  moderator: "admin.roleModerator",
  author: "admin.roleAuthor",
  reader: "admin.roleReader",
};

const KIND_LABEL: Record<string, string> = {
  announcement: "admin.typeAnnouncement",
  system: "admin.typeSystem",
  admin_message: "admin.typeAdmin",
};

export default function AdminMessagesPage() {
  const { t, format } = useI18n();
  const [scope, setScope] = React.useState<"all" | "role" | "userIds">("all");
  const [role, setRole] = React.useState<string>(BASE_ROLES[2] ?? "author");
  const [userIdsText, setUserIdsText] = React.useState("");
  const [kind, setKind] = React.useState<"announcement" | "system" | "admin_message">("announcement");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [link, setLink] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; sent?: number; error?: string } | null>(null);

  async function submit() {
    setSubmitting(true);
    setResult(null);
    const userIds = userIdsText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const r = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          role: scope === "role" ? role : undefined,
          userIds: scope === "userIds" ? userIds : undefined,
          kind,
          title,
          body,
          link: link || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? t("admin.sendFailed"));
      setResult({ ok: true, sent: d.sent });
      setTitle("");
      setBody("");
      setLink("");
      setUserIdsText("");
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : t("admin.sendFailed") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("nav.adminMessages")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.broadcastSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.newBroadcast")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scope */}
          <div className="space-y-2">
            <Label>{t("admin.recipientScope")}</Label>
            <div className="flex flex-wrap gap-2">
              {([
                { v: "all", label: t("admin.allUsers") },
                { v: "role", label: t("admin.byRole") },
                { v: "userIds", label: t("admin.specificUsers") },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setScope(opt.v)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    scope === opt.v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {scope === "role" && (
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BASE_ROLES.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(ROLE_LABEL[k] ?? k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {scope === "userIds" && (
              <Textarea
                placeholder={t("admin.pasteUserIds")}
                value={userIdsText}
                onChange={(e) => setUserIdsText(e.target.value)}
                rows={3}
              />
            )}
          </div>

          {/* Kind */}
          <div className="space-y-2">
            <Label>{t("admin.messageType")}</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_LABEL).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {t(label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-title">{t("admin.subject")}</Label>
            <Input
              id="msg-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("admin.subjectPlaceholder")}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-body">{t("admin.content")}</Label>
            <Textarea
              id="msg-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("admin.contentPlaceholder")}
              rows={6}
              maxLength={5000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-link">{t("admin.link")}</Label>
            <Input
              id="msg-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={t("admin.linkPlaceholder")}
              maxLength={500}
            />
          </div>

          <Button onClick={submit} disabled={submitting || !title || !body}>
            {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
            {t("admin.sendBroadcast")}
          </Button>

          {result?.ok && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> {format(t("admin.sentCount"), { n: result.sent ?? 0 })}
            </p>
          )}
          {result && !result.ok && (
            <p className="text-sm text-destructive">{result.error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
