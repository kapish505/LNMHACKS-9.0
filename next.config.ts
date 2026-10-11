import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      framer: path.resolve(process.cwd(), 'src/lib/framer-mock.ts'),
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      framer: "./src/lib/framer-mock.ts"
    }
  }
};

export default nextConfig;
