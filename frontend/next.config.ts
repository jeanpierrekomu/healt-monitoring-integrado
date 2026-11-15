import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Requerido por React Three Fiber (docs oficiales de R3F).
  transpilePackages: ["three"],
  partialPrefetching: true,
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
