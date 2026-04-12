// Legacy mock-backed service. Being replaced by src/lib/api/hooks/cases.ts
// in Phase 2 as the cases page is wired to the real backend.
import { mockCases } from "@/lib/mock-data/immigration-mock";
import type { CaseStage, CasePriority } from "@/lib/types/immigration";

export const casesService = {
  getCases: async (filters?: {
    stage?: CaseStage;
    priority?: CasePriority;
    visa_subclass?: string;
  }) => {
    let cases = [...mockCases];
    if (filters?.stage) cases = cases.filter((c) => c.stage === filters.stage);
    if (filters?.priority)
      cases = cases.filter((c) => c.priority === filters.priority);
    if (filters?.visa_subclass)
      cases = cases.filter((c) => c.visa_subclass === filters.visa_subclass);
    return cases;
  },
  getCase: async (id: string) => mockCases.find((c) => c.id === id) ?? null,
  getStageBreakdown: async () => {
    const stages = mockCases.reduce(
      (acc, c) => {
        acc[c.stage] = (acc[c.stage] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(stages).map(([stage, count]) => ({ stage, count }));
  },
};
