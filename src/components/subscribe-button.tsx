"use client";

import * as React from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubscribeButton({
  type,
  refId,
  initial = false,
}: {
  type: "category" | "author" | "paper";
  refId: string;
  initial?: boolean;
}) {
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
      {subscribed ? "已订阅" : "订阅"}
    </Button>
  );
}
