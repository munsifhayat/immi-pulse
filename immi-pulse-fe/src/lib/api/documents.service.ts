import { mockDocuments } from "@/lib/mock-data/immigration-mock";
import type { DocumentStatus } from "@/lib/types/immigration";

export const documentsService = {
  getDocuments: async (status?: DocumentStatus) => {
    if (status) return mockDocuments.filter((d) => d.status === status);
    return mockDocuments;
  },
  getDocumentStats: async () => ({
    pending: mockDocuments.filter((d) => d.status === "pending").length,
    validated: mockDocuments.filter((d) => d.status === "validated").length,
    flagged: mockDocuments.filter((d) => d.status === "flagged").length,
    total: mockDocuments.length,
  }),
};
