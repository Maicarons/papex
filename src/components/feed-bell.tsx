"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/stores/notifications";

export function FeedBell() {
  const unread = useNotifications((s) => s.feedUnread);
  const refreshFeed = useNotifications((s) => s.refreshFeed);
  const pathname = usePathname();

  // Refetch on mount and on every client navigation so the badge reflects
  // server-side changes (e.g. a newly arrived announcement) and stays in sync
  // after the /feed page marks items read.
  React.useEffect(() => {
    void refreshFeed();
  }, [refreshFeed, pathname]);

  return (
    <Button variant="ghost" size="icon" asChild aria-label="Feed" className="relative">
      <Link href="/feed">
        <Rss className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 text-[10px] font-semibold text-cta-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
