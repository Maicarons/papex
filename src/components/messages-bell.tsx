"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MessagesBell() {
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    fetch("/api/messages/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.unread != null) setUnread(d.unread);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <Button variant="ghost" size="icon" asChild aria-label="Messages" className="relative">
      <Link href="/messages">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 text-[10px] font-semibold text-cta-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
