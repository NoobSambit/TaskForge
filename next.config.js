const path = require("path");

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
      {
        source: "/service-worker.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@service-worker": path.resolve(__dirname, "public/service-worker.js"),
    };

    return config;
  },
  // The App Router is used by default when the `app` directory exists
  // Additional config can go here
};

module.exports = nextConfig;
