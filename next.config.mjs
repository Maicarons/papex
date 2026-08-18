/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Limit how many pages are statically generated in parallel. The build
  // prerenders ~250 category/paper/author routes, each opening its own DB
  // connection via the per-worker pool. Without this cap the cumulative
  // connections can exceed Postgres' default max_connections (100) on both
  // local Docker and CI, failing the build with "too many clients already".
  experimental: {
    staticGenerationMaxConcurrency: 4,
  },
  // Vercel-friendly: keep server external packages out of bundling where needed
  serverExternalPackages: ["postgres", "bcryptjs", "nodemailer", "pdf-parse"],
  images: {
    // No wildcard host. Operators may extend the allowed hosts via the
    // NEXT_PUBLIC_IMAGE_HOSTS env var (comma-separated hostnames). The app
    // currently renders avatars/figures without next/image remote sources,
    // so an empty list is safe by default.
    remotePatterns: (process.env.NEXT_PUBLIC_IMAGE_HOSTS || "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean)
      .map((hostname) => ({ protocol: "https", hostname })),
  },
};

export default nextConfig;
