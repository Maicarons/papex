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

const NAV = [
  { href: "/admin", label: "概览", icon: LayoutDashboard, exact: true },
  { href: "/admin/review", label: "审核队列", icon: ShieldCheck },
  { href: "/admin/stats", label: "统计面板", icon: BarChart3 },
  { href: "/admin/tickets", label: "工单管理", icon: ListChecks },
  { href: "/admin/co-reviews", label: "协审管理", icon: ClipboardCheck },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/roles", label: "角色权限", icon: KeyRound },
  { href: "/admin/messages", label: "站内信广播", icon: Megaphone },
];

export function AdminNav() {
  const pathname = usePathname();
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
