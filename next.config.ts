import type { NextConfig } from "next";

const repo = "grocery-store";
const basePath = process.env.GITHUB_PAGES === "true" ? `/${repo}` : "";

const isStaticExport = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: "export" as const } : {}),
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
