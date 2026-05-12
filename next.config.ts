import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/RMNDooh" : "",
  assetPrefix: isProd ? "/RMNDooh/" : "",
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
