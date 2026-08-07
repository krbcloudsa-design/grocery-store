import type { NextConfig } from "next";

const repo = "grocery-store";
const basePath = process.env.GITHUB_PAGES === "true" ? `/${repo}` : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
