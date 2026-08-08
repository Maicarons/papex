"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/use-session";
import { useI18n } from "@/i18n/i18n-provider";

interface ProfileForm {
  displayName: string;
  bio: string;
  institution: string;
  location: string;
  website: string;
  orcid: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function SettingsPage() {
  const { t } = useI18n();
  const { user, loaded } = useSession();

  const [form, setForm] = React.useState<ProfileForm>({
    displayName: "",
    bio: "",
    institution: "",
    location: "",
    website: "",
    orcid: "",
  });
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [profileLoaded, setProfileLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!loaded || !user) return;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d?.user;
        if (!u) return;
        setForm({
          displayName: u.displayName ?? "",
          bio: u.bio ?? "",
          institution: u.institution ?? "",
          location: u.location ?? "",
          website: u.website ?? "",
          orcid: u.orcid ?? "",
        });
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, [loaded, user]);

  const update =
    (key: keyof ProfileForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setErrorMsg(d?.error ?? `${t("settings.save")}失败`);
        setStatus("error");
        return;
      }
      setStatus("saved");
    } catch {
      setErrorMsg(`${t("settings.save")}失败`);
      setStatus("error");
    }
  }

  // Not signed in.
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

  // Still fetching profile / session.
  if (!profileLoaded) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">{t("settings.displayName")}</Label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={update("displayName")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">{t("settings.institution")}</Label>
              <Input
                id="institution"
                placeholder={t("settings.institutionPlaceholder")}
                value={form.institution}
                onChange={update("institution")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t("settings.location")}</Label>
              <Input
                id="location"
                placeholder={t("settings.locationPlaceholder")}
                value={form.location}
                onChange={update("location")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">{t("settings.website")}</Label>
              <Input
                id="website"
                type="url"
                placeholder={t("settings.websitePlaceholder")}
                value={form.website}
                onChange={update("website")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orcid">{t("settings.orcid")}</Label>
              <Input
                id="orcid"
                placeholder={t("settings.orcidPlaceholder")}
                value={form.orcid}
                onChange={update("orcid")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t("settings.bio")}</Label>
              <Textarea
                id="bio"
                placeholder={t("settings.bioPlaceholder")}
                value={form.bio}
                onChange={update("bio")}
                className="min-h-[120px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={status === "saving"}>
                {status === "saving" ? t("settings.saving") : t("settings.save")}
              </Button>
              {status === "saved" && (
                <span className="text-sm text-green-600">{t("settings.saved")}</span>
              )}
              {status === "error" && <span className="text-sm text-red-600">{errorMsg}</span>}
              <Button variant="ghost" asChild className="ml-auto">
                <Link href={`/u/${user?.username ?? ""}`}>{t("settings.viewProfile")}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
