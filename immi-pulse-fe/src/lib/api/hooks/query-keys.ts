// Centralized React Query key factory for all IMMI-PULSE features.
// Feature hooks under src/lib/api/hooks/ import these to stay consistent.

export const queryKeys = {
  cases: {
    all: ["cases"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.cases.all, "list", filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.cases.all, "detail", id] as const,
    documents: (id: string) => [...queryKeys.cases.all, "documents", id] as const,
    timeline: (id: string) => [...queryKeys.cases.all, "timeline", id] as const,
  },
  marketplace: {
    all: ["marketplace"] as const,
    agents: (filters?: Record<string, unknown>) =>
      [...queryKeys.marketplace.all, "agents", filters ?? {}] as const,
    agent: (id: string) => [...queryKeys.marketplace.all, "agent", id] as const,
    pendingApplications: () =>
      [...queryKeys.marketplace.all, "pending"] as const,
  },
  community: {
    all: ["community"] as const,
    stats: () => [...queryKeys.community.all, "stats"] as const,
    spaces: () => [...queryKeys.community.all, "spaces"] as const,
    space: (slug: string) => [...queryKeys.community.all, "space", slug] as const,
    recentThreads: () => [...queryKeys.community.all, "recent-threads"] as const,
    threads: (spaceSlug: string, sort?: string) =>
      [...queryKeys.community.all, "threads", spaceSlug, sort ?? "new"] as const,
    thread: (id: string) => [...queryKeys.community.all, "thread", id] as const,
    reports: () => [...queryKeys.community.all, "reports"] as const,
  },
  portal: {
    all: ["portal"] as const,
    case: () => [...queryKeys.portal.all, "case"] as const,
    documents: () => [...queryKeys.portal.all, "documents"] as const,
  },
} as const;
