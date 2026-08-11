import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://papex.example.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/me/", "/admin/", "/submit/", "/writespace/", "/u/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
