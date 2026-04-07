import {
  mockDashboardStats,
  mockCaseActivity,
  mockVisaBreakdown,
  mockActivityEntries,
} from "@/lib/mock-data/immigration-mock";

export const dashboardService = {
  getStats: async () => mockDashboardStats,
  getCaseActivity: async () => mockCaseActivity,
  getVisaBreakdown: async () => mockVisaBreakdown,
  getRecentActivity: async (limit = 6) => mockActivityEntries.slice(0, limit),
};
