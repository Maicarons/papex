"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  BarChart3,
  ListChecks,
  ClipboardCheck,
  Users,
  KeyRound,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/i18n-provider";

const NAV = [
  { href: "/admin", label: "nav.adminOverview", icon: LayoutDashboard, exact: true },
  { href: "/admin/review", label: "nav.adminReview", icon: ShieldCheck },
  { href: "/admin/stats", label: "nav.adminStats", icon: BarChart3 },
  { href: "/admin/tickets", label: "nav.adminTickets", icon: ListChecks },
  { href: "/admin/co-reviews", label: "nav.adminCoReviews", icon: ClipboardCheck },
  { href: "/admin/users", label: "nav.adminUsers", icon: Users },
  { href: "/admin/roles", label: "nav.adminRoles", icon: KeyRound },
  { href: "/admin/messages", label: "nav.adminMessages", icon: Megaphone },
];

export function AdminNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="flex flex-wrap gap-1">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {t(item.label)}
          </Link>
        );
      })}
    </nav>
  );
}
