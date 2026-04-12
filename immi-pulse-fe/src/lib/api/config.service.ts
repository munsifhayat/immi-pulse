import apiClient from "./client";

export interface AppConfig {
  monitored_mailboxes: string[];
  excluded_mailboxes: string[];
  timezone: string;
  microsoft_configured: boolean;
  aws_configured: boolean;
}

export interface MicrosoftStatus {
  connected: boolean;
  token_healthy: boolean;
  tenant_id: string | null;
  tenant_name: string | null;
  active_subscriptions: number;
  monitored_mailboxes: string[];
  excluded_mailboxes: string[];
  app_configured: boolean;
  reason?: string;
  permission_error?: string;
  needs_reauth?: boolean;
}

export interface MonitoredMailbox {
  id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  subscription_id: string | null;
  subscription_expiry: string | null;
}

export const configService = {
  async getConfig(): Promise<AppConfig> {
    const { data } = await apiClient.get("/config");
    return data;
  },

  async getMicrosoftStatus(): Promise<MicrosoftStatus> {
    const { data } = await apiClient.get("/integrations/microsoft/status");
    return data;
  },

  async getActiveMailboxes(): Promise<MonitoredMailbox[]> {
    const { data } = await apiClient.get(
      "/integrations/microsoft/mailboxes/active"
    );
    return data;
  },

  async addMailbox(email: string): Promise<MonitoredMailbox> {
    const { data } = await apiClient.post(
      "/integrations/microsoft/mailboxes/add",
      { email }
    );
    return data;
  },

  async removeMailbox(mailboxId: string): Promise<{ status: string }> {
    const { data } = await apiClient.delete(
      `/integrations/microsoft/mailboxes/${mailboxId}`
    );
    return data;
  },

  async setupWebhooks(): Promise<{
    results: Record<
      string,
      { status: string; subscription_id?: string; error?: string }
    >;
  }> {
    const { data } = await apiClient.post(
      "/integrations/microsoft/webhooks/setup"
    );
    return data;
  },

  async disconnect(): Promise<{ status: string; tenant_id: string }> {
    const { data } = await apiClient.post(
      "/integrations/microsoft/disconnect"
    );
    return data;
  },

  async getConsentUrl(): Promise<{ consent_url: string; redirect_uri: string }> {
    const { data } = await apiClient.get(
      "/integrations/microsoft/consent-url"
    );
    return data;
  },

  async getHealth(): Promise<{
    status: string;
    agents: Record<string, unknown>;
  }> {
    const { data } = await apiClient.get("/health", {
      baseURL: process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", ""),
    });
    return data;
  },
};
