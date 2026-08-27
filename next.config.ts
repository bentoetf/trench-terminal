import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // webpack: (config) => {
  //   // fix Module not found: Can't resolve 'pino-pretty' warning https://github.com/pinojs/pino/issues/688
  //   config.externals = [...config.externals, "pino-pretty"];
  //   return config;
  // },
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
