import { create } from "zustand";

// Shared, client-only source of truth for the two header notification badges
// (FeedBell + MessagesBell). Pages call the setters when the user marks items
// read, so the badges update instantly without a reload; the bells also
// refetch on navigation (see their usePathname effects) to pick up
// server-side changes. Values are only ever populated in the browser after
// mount, so SSR always renders the initial 0 — no user data leaks across
// requests.
interface NotificationsState {
  feedUnread: number;
  messageUnread: number;
  setFeedUnread: (n: number) => void;
  setMessageUnread: (n: number) => void;
  refreshFeed: () => Promise<void>;
  refreshMessages: () => Promise<void>;
}

export const useNotifications = create<NotificationsState>((set) => ({
  feedUnread: 0,
  messageUnread: 0,
  setFeedUnread: (n) => set({ feedUnread: Math.max(0, n) }),
  setMessageUnread: (n) => set({ messageUnread: Math.max(0, n) }),
  refreshFeed: async () => {
    try {
      const r = await fetch("/api/feed", { cache: "no-store" });
      const d = r.ok ? await r.json() : null;
      if (Array.isArray(d?.announcements)) {
        set({
          feedUnread: d.announcements.filter((a: { read: boolean }) => !a.read).length,
        });
      }
    } catch {
      // Network errors are non-fatal for a badge.
    }
  },
  refreshMessages: async () => {
    try {
      const r = await fetch("/api/messages/stats", { cache: "no-store" });
      const d = r.ok ? await r.json() : null;
      if (d?.unread != null) set({ messageUnread: d.unread });
    } catch {
      // Network errors are non-fatal for a badge.
    }
  },
}));
