import type { NextConfig } from "next";

// GitHub Pages serves the project site under /<repo>, so the base path is
// injected at build time by the deploy workflow. Local builds stay unprefixed.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
};

export default nextConfig;
