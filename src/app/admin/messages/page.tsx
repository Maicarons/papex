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

// Base user roles (must match the user_role enum). `reader` is a RBAC-only
// role and cannot be a user's base role, so it is excluded here.
const BASE_ROLES = ["admin", "moderator", "author"] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: "管理员",
  moderator: "审核员",
  author: "作者",
  reader: "读者",
};

const KIND_LABEL: Record<string, string> = {
  announcement: "公告",
  system: "系统通知",
  admin_message: "管理员私信",
};

export default function AdminMessagesPage() {
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
      if (!r.ok) throw new Error(d.error ?? "发送失败");
      setResult({ ok: true, sent: d.sent });
      setTitle("");
      setBody("");
      setLink("");
      setUserIdsText("");
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "发送失败" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">站内信广播</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          向指定范围的用户群发站内信。所有发送均通过统一通知中心投递。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">新建广播</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scope */}
          <div className="space-y-2">
            <Label>接收范围</Label>
            <div className="flex flex-wrap gap-2">
              {([
                { v: "all", label: "全部用户" },
                { v: "role", label: "按角色" },
                { v: "userIds", label: "指定用户" },
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
                      {ROLE_LABEL[k] ?? k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {scope === "userIds" && (
              <Textarea
                placeholder="粘贴用户 ID，用逗号、空格或换行分隔"
                value={userIdsText}
                onChange={(e) => setUserIdsText(e.target.value)}
                rows={3}
              />
            )}
          </div>

          {/* Kind */}
          <div className="space-y-2">
            <Label>消息类型</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_LABEL).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-title">标题</Label>
            <Input
              id="msg-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="通知标题"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-body">内容</Label>
            <Textarea
              id="msg-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="通知正文"
              rows={6}
              maxLength={5000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-link">跳转链接（可选）</Label>
            <Input
              id="msg-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="例如 /papers/2608.00001"
              maxLength={500}
            />
          </div>

          <Button onClick={submit} disabled={submitting || !title || !body}>
            {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
            发送广播
          </Button>

          {result?.ok && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> 已成功发送给 {result.sent} 位用户
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
