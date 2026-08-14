"use client";

import * as React from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-provider";

export function SubscribeButton({
  type,
  refId,
  initial = false,
}: {
  type: "category" | "author" | "paper";
  refId: string;
  initial?: boolean;
}) {
  const { t } = useI18n();
  const [subscribed, setSubscribed] = React.useState(initial);
  const [loading, setLoading] = React.useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, refId }),
      });
      if (res.status === 401) {
        // Full reload (not router.push) so the client session state resets on re-auth.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      setSubscribed(data.subscribed as boolean);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={subscribed ? "secondary" : "outline"} size="sm" onClick={toggle} disabled={loading}>
      {subscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {subscribed ? t("subscriptions.alreadySubscribed") : t("subscriptions.subscribe")}
    </Button>
  );
}
