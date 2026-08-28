import path from "path";
import type { NextConfig } from "next";

// Alias the Orderly TradingView wrapper to our lightweight-charts shim.
// Remove this alias (and the turbopack resolveAlias below) to restore the
// real TradingView advanced charting library once licensed.
const TV_SHIM = path.resolve(
  __dirname,
  "src/components/lightweightChart/orderlyTradingviewShim.tsx",
);

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    resolveAlias: {
      "@orderly.network/ui-tradingview": TV_SHIM,
    },
  },
  webpack: (config) => {
    config.resolve.alias["@orderly.network/ui-tradingview"] = TV_SHIM;
    return config;
  },
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
