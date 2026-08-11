/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
