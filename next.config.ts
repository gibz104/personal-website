import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `.wgsl` files are compiled by @vgpu/wgsl, which resolves their import graph
  // at build time and hands vgpu one finished shader.
  turbopack: {
    rules: {
      "*.wgsl": { loaders: ["@vgpu/wgsl/loader-webpack"], as: "*.js" },
    },
  },
  webpack(config: { module?: { rules?: unknown[] } }) {
    config.module ??= {};
    config.module.rules ??= [];
    config.module.rules.push({
      test: /\.wgsl$/,
      loader: "@vgpu/wgsl/loader-webpack",
    });
    return config;
  },
};

export default nextConfig;
