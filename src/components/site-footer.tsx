"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/i18n-provider";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t bg-muted/30 py-8 text-sm text-muted-foreground">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p>
          © {new Date().getFullYear()} Papex · {t("footer.rights")} ·{" "}
          <a
            className="underline-offset-4 hover:underline"
            href="https://www.apache.org/licenses/LICENSE-2.0"
            target="_blank"
            rel="noreferrer"
          >
            Apache-2.0
          </a>
        </p>
        <nav className="flex gap-4">
          <Link href="/papers" className="hover:underline">
            {t("nav.papers")}
          </Link>
          <Link href="/categories" className="hover:underline">
            {t("nav.categories")}
          </Link>
          <Link href="/docs" className="hover:underline">
            {t("footer.docs")}
          </Link>
          <Link href="/docs/about/" className="hover:underline">
            {t("footer.about")}
          </Link>
          <Link href="/feedback" className="hover:underline">
            {t("footer.feedback")}
          </Link>
          <Link href="/status" className="hover:underline">
            {t("footer.status")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
