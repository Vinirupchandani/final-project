import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-local",
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
