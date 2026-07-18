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

async function recentJourneys(): Promise<JourneyStub[]> {
  try {
    const res = await fetch(
      `${API_URL}/community/public/journeys?limit=200&sort=new`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as JourneyStub[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/community", priority: 0.9, changeFrequency: "daily" },
    { path: "/for-applicants", priority: 0.7, changeFrequency: "monthly" },
    { path: "/for-consultants", priority: 0.7, changeFrequency: "monthly" },
    { path: "/features", priority: 0.6, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.6, changeFrequency: "monthly" },
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
