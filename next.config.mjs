/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow Server Components to import server-only db module safely
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Vercel-friendly: keep server external packages out of bundling where needed
  serverExternalPackages: ["postgres", "bcryptjs", "nodemailer", "pdf-parse"],
};

export default nextConfig;
