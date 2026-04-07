import {
  mockClients,
  mockCases,
  mockClientJourneys,
} from "@/lib/mock-data/immigration-mock";

export const clientsService = {
  getClients: async () => mockClients,
  getClient: async (id: string) => mockClients.find((c) => c.id === id) ?? null,
  getClientCases: async (clientId: string) =>
    mockCases.filter((c) => c.client_id === clientId),
  getClientJourneys: async (clientId: string) =>
    mockClientJourneys.filter((j) => j.client_id === clientId),
  getJourneyByCase: async (caseId: string) =>
    mockClientJourneys.find((j) => j.case_id === caseId) ?? null,
  getAllJourneys: async () => mockClientJourneys,
};
