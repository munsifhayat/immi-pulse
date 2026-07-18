import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Private console, auth, and per-token form surfaces.
          "/dashboard",
          "/login",
          "/api/",
          "/q/",
          // A member's own inbox and activity. Pseudonymity is worth very
          // little if a handle accumulates a crawlable dossier.
          "/inbox",
          "/you",
          // Retired surfaces. They redirect, so a crawler would not reach the
          // page anyway — this keeps the old URLs from lingering in an index
          // while the redirect propagates. Reversible with the redirects.
          "/find-consultants",
          "/pricing",
          "/features",
          "/get-started",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
