import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  env: {
    NEXT_PUBLIC_APP_VERSION: require("./package.json").version,
  },
  // Temporarily hide the agent directory ("Find an Agent") while the public
  // experience focuses on the community + visa-journey side. Reversible —
  // remove these redirects to bring /find-consultants back.
  async redirects() {
    return [
      {
        source: "/find-consultants",
        destination: "/community",
        permanent: false,
      },
      {
        source: "/find-consultants/:path*",
        destination: "/community",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
