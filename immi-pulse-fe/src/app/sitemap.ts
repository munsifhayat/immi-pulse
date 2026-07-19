import type { MetadataRoute } from "next";
import { API_URL, SITE_URL } from "@/lib/site";

// Refresh the sitemap hourly so newly shared timelines get discovered without a
// redeploy. This is the organic growth engine: every indexable timeline page is
// a long-tail landing surface for "is subclass X processing time normal".
export const revalidate = 3600;

interface JourneyStub {
  id: string;
  created_at: string;
}

// The API caps `limit` at 100 and 422s above it, so page through with `offset`
// instead of asking for more than it will give.
//
// This was silently broken: the old call asked for limit=200, got a 422, and
// the `!res.ok` guard turned that into an empty list — so the sitemap has been
// emitting zero journey URLs while still describing itself as the organic
// growth engine. A failure that degrades to "no entries" is the kind that hides
// for months, which is why the page size is now pinned to the documented cap.
const PAGE = 100;
const MAX_JOURNEY_URLS = 500;

async function recentJourneys(): Promise<JourneyStub[]> {
  const out: JourneyStub[] = [];
  for (let offset = 0; offset < MAX_JOURNEY_URLS; offset += PAGE) {
    try {
      const res = await fetch(
        `${API_URL}/community/public/journeys?limit=${PAGE}&offset=${offset}&sort=new`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) break;
      const data = (await res.json()) as JourneyStub[];
      if (!Array.isArray(data) || data.length === 0) break;
      out.push(...data);
      if (data.length < PAGE) break;
    } catch {
      break;
    }
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    // The homepage is the room itself, so it changes daily now.
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/wait-check", priority: 0.9, changeFrequency: "daily" },
    { path: "/questions", priority: 0.8, changeFrequency: "daily" },
    { path: "/timelines", priority: 0.8, changeFrequency: "daily" },
    { path: "/for-applicants", priority: 0.7, changeFrequency: "monthly" },
    { path: "/for-consultants", priority: 0.7, changeFrequency: "monthly" },
    // /features, /pricing and /get-started are deliberately absent: they
    // redirect and are disallowed in robots.ts. /community is absent for the
    // same reason — but the per-journey pages below are NOT, see the note there.
    { path: "/about", priority: 0.5, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.5, changeFrequency: "weekly" },
    { path: "/news", priority: 0.5, changeFrequency: "weekly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // The organic growth engine. `/community` itself redirects to the room now,
  // but `/community/journey/<id>` does NOT — every shared timeline is a
  // long-tail landing page for "is subclass X processing time normal", they are
  // already indexed, and breaking those URLs would throw away the traffic this
  // whole product is built to earn. Keep them.
  const journeyEntries: MetadataRoute.Sitemap = (await recentJourneys()).map(
    (j) => ({
      url: `${SITE_URL}/community/journey/${j.id}`,
      lastModified: j.created_at ? new Date(j.created_at) : now,
      changeFrequency: "weekly",
      priority: 0.6,
    })
  );

  return [...staticEntries, ...journeyEntries];
}
