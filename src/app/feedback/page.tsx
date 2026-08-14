"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, MessageSquareText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { useI18n } from "@/i18n/i18n-provider";

export default function FeedbackPage() {
  const { t } = useI18n();
  const [type, setType] = React.useState("bug");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, subject, message, contact }),
    });
    setBusy(false);
    if (res.status === 401) {
      setError(t("auth.loginSubtitle"));
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? t("feedback.submitFailed"));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cta text-cta-foreground">
              <MessageSquareText className="h-6 w-6" />
            </span>
            <h1 className="text-xl font-semibold">{t("feedback.success")}</h1>
            <Link href="/tickets" className="text-sm text-primary hover:underline">
              {t("tickets.title")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("feedback.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("feedback.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("feedback.type")}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">{t("feedback.typeBug")}</SelectItem>
                  <SelectItem value="feature">{t("feedback.typeFeature")}</SelectItem>
                  <SelectItem value="other">{t("feedback.typeOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">{t("feedback.subject")}</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="msg">{t("feedback.message")}</Label>
            <Textarea id="msg" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">{t("feedback.contact")}</Label>
            <Input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} onClick={submit}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("feedback.submitBtn")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("feedback.loginHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
