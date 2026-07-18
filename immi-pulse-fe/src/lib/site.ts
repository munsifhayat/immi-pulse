// Canonical public origin, used for metadataBase, Open Graph URLs, and the
// sitemap. Override per environment with NEXT_PUBLIC_SITE_URL (no trailing slash).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://immi-pulse-fe.vercel.app"
).replace(/\/$/, "");

// Server-side base for the public community API. Reuses the same env the axios
// client uses; the /community/public/* endpoints need no API key.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
