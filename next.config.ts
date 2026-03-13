import withPWA from "next-pwa";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname:  "res.cloudinary.com",
        pathname:  "/**",
      },
      {
        protocol: "https",
        hostname:  "images.unsplash.com",
        pathname:  "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Compress output
  compress: true,

  // Strict transport
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key:   "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

const pwa = withPWA({
  dest:        "public",
  register:    true,
  skipWaiting: true,
  disable:     process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
  publicExcludes: ["!robots.txt", "!sitemap.xml"],
});

export default pwa(nextConfig);
