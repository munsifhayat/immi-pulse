import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  env: {
    NEXT_PUBLIC_APP_VERSION: require("./package.json").version,
  },
};

export default nextConfig;
