"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Activity, Search, Upload, User as UserIcon, LogOut, ShieldCheck, BarChart3, Ticket, BookOpen, Info, MessageSquareText, ListChecks, Settings, LayoutDashboard, Users, KeyRound, Megaphone, ClipboardCheck, PenLine, LayoutGrid, Bell, Rss, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MessagesBell } from "@/components/messages-bell";
import { FeedBell } from "@/components/feed-bell";
import { useI18n } from "@/i18n/i18n-provider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { useSession } from "@/lib/use-session";

export interface HeaderUser {
  username: string;
  displayName: string;
  role: "author" | "moderator" | "admin";
}

export function SiteHeader() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useSession();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </span>
          <span>Papex</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/papers">
              <Search className="h-4 w-4" />
              {t("nav.papers")}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/categories">
              <LayoutGrid className="h-4 w-4" />
              {t("nav.categories")}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/submit">
              <Upload className="h-4 w-4" />
              {t("nav.submit")}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/writespace">
              <PenLine className="h-4 w-4" />
              {t("nav.writespace")}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/docs">
              <BookOpen className="h-4 w-4" />
              {t("nav.docs")}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/docs/about/">
              <Info className="h-4 w-4" />
              {t("nav.about")}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/status">
              <Activity className="h-4 w-4" />
              {t("nav.status")}
            </Link>
          </Button>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <LocaleSwitcher />
          {user ? (
            <>
              <MessagesBell />
              <FeedBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" aria-label="用户菜单">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/u/${user.username}`}>
                      <UserIcon className="h-4 w-4" />
                      {t("nav.profile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="h-4 w-4" />
                      {t("nav.settings")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/api-keys">
                      <KeyRound className="h-4 w-4" />
                      {t("apiKeys.title")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/tickets">
                      <Ticket className="h-4 w-4" />
                      {t("nav.tickets")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/feedback">
                      <MessageSquareText className="h-4 w-4" />
                      {t("nav.feedback")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/feed">
                      <Rss className="h-4 w-4" />
                      {t("nav.feed")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/subscriptions">
                      <Bell className="h-4 w-4" />
                      {t("nav.subscriptions")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bookmarks">
                      <Bookmark className="h-4 w-4" />
                      {t("nav.bookmarks")}
                    </Link>
                  </DropdownMenuItem>
                  {user.role !== "author" && (
                    <>
                      <div className="-mx-1 my-1 h-px bg-border" />
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <LayoutDashboard className="h-4 w-4" />
                          {t("nav.adminOverview")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/review">
                          <ShieldCheck className="h-4 w-4" />
                          {t("nav.adminReview")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/stats">
                          <BarChart3 className="h-4 w-4" />
                          {t("nav.adminStats")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/tickets">
                          <ListChecks className="h-4 w-4" />
                          {t("tickets.title")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/co-reviews">
                          <ClipboardCheck className="h-4 w-4" />
                          {t("nav.adminCoReviews")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/users">
                          <Users className="h-4 w-4" />
                          {t("nav.adminUsers")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/roles">
                          <KeyRound className="h-4 w-4" />
                          {t("nav.adminRoles")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/messages">
                          <Megaphone className="h-4 w-4" />
                          {t("nav.adminMessages")}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <div className="-mx-1 my-1 h-px bg-border" />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="h-4 w-4" />
                    {t("common.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">{t("common.login")}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">{t("common.register")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
