"use client";

import * as React from "react";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: "author" | "moderator" | "admin";
  bio?: string | null;
  orcid?: string | null;
}

/**
 * Fetch the current session on the client side.
 *
 * The root layout is statically rendered and must not read cookies, so any
 * per-user UI (header menu, owner-only actions) fetches its own session here
 * instead of relying on a server component passing `user` down.
 *
 * Returns `loaded = false` until the request settles; callers should render a
 * safe default (logged-out / no owner actions) until then.
 */
export function useSession() {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setUser(d?.user ?? null);
      })
      .catch(() => {
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { user, loaded };
}
