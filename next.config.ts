import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // Mock pino and its dependencies for client-side bundling
      // These are Node.js-only logging utilities not needed in the browser
      pino: "./lib/pino-mock.js",
      "pino-pretty": "./lib/empty-mock.js",
      "thread-stream": "./lib/empty-mock.js",
    },
  },
};

export default nextConfig;
