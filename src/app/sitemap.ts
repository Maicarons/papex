import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { papers, categories, authors } from "@/lib/db/schema";
import { desc, isNotNull } from "drizzle-orm";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://papex.example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/categories",
    "/feedback",
    "/login",
    "/register",
    "/messages",
    "/status",
    "/tickets",
    "/submit",
    "/writespace",
    "/docs",
  ].map((path) => ({
    url: `${SITE}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  // Dynamic routes are best-effort: if the DB is unreachable at build time
  // we simply fall back to the static routes above so the build never fails.
  let dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const [paperRows, categoryRows, authorRows] = await Promise.all([
      db
        .select({ id: papers.id, updatedAt: papers.updatedAt })
        .from(papers)
        .where(isNotNull(papers.updatedAt))
        .orderBy(desc(papers.updatedAt))
        .limit(5000),
      db.select({ id: categories.id }).from(categories),
      db.select({ id: authors.id }).from(authors).limit(5000),
    ]);

    dynamicRoutes = [
      ...paperRows.map((p) => ({
        url: `${SITE}/papers/${p.id}`,
        lastModified: p.updatedAt ?? new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
      ...categoryRows.map((c) => ({
        url: `${SITE}/categories/${c.id}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...authorRows.map((a) => ({
        url: `${SITE}/authors/${a.id}`,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ];
  } catch (err) {
    console.error("[sitemap] skipped dynamic routes due to DB error:", err);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
