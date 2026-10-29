import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cloudinary delivery URLs, including private-CDN subdomains
    // (`<cloud>.res.cloudinary.com`).
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.res.cloudinary.com" },
    ],
  },
  experimental: {
    agentFeedback: true,
    // Document uploads are posted to Server Actions. Keep this comfortably
    // above `UPLOAD_MAX_FILE_SIZE_BYTES` (default 5 MB) plus multipart overhead.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
