"use client";

import * as React from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BookmarkButton({ paperId }: { paperId: string }) {
  const [bookmarked, setBookmarked] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  // Resolve the initial state on the client so the paper detail page stays
  // statically rendered (no server-side cookie/session read).
  React.useEffect(() => {
    fetch(`/api/bookmarks?paperId=${encodeURIComponent(paperId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.bookmarked === "boolean") setBookmarked(d.bookmarked);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [paperId]);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId }),
      });
      if (res.status === 401) {
        // Full reload (not router.push) so the client session state resets on re-auth.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (typeof data.bookmarked === "boolean") setBookmarked(data.bookmarked);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={bookmarked ? "secondary" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={loading || !ready}
      aria-pressed={bookmarked}
    >
      {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {bookmarked ? "已收藏" : "收藏"}
    </Button>
  );
}
