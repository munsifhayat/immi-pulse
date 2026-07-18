import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  env: {
    NEXT_PUBLIC_APP_VERSION: require("./package.json").version,
  },
  // Retired surfaces are redirected, never deleted. The page files stay in the
  // tree so bringing any of them back is one entry removed from this list —
  // and so a decision to hide something is never confused with a decision to
  // throw the work away.
  //
  // `/find-consultants` is the original of this pattern (the agent directory,
  // hidden while the public experience focuses on the community). The rest were
  // retired when the homepage stopped selling and became the room: a platform
  // does not have a pricing page in its main nav.
  async redirects() {
    return [
      // Agent directory — hidden, not removed.
      {
        source: "/find-consultants",
        destination: "/",
        permanent: false,
      },
      {
        source: "/find-consultants/:path*",
        destination: "/",
        permanent: false,
      },
      // The community IS the homepage now. Note this matches `/community`
      // exactly — `/community/journey/:id` is untouched, because those pages
      // are indexed and are the organic growth engine.
      {
        source: "/community",
        destination: "/",
        permanent: false,
      },
      // Marketing surfaces from the SaaS-site era.
      {
        source: "/pricing",
        destination: "/",
        permanent: false,
      },
      {
        source: "/features",
        destination: "/",
        permanent: false,
      },
      {
        source: "/get-started",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
