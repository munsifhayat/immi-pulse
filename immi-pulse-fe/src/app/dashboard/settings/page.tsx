"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  configService,
  type MonitoredMailbox,
} from "@/lib/api/config.service";
import { activityService } from "@/lib/api/activity.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  Trash2,
  Plus,
  RefreshCw,
  Layers,
  CircleDot,
  Receipt,
  Timer,
  ClipboardList,
  Clock,
  ShieldAlert,
  ExternalLink,
  Unplug,
  Building2,
  Shield,
  Radio,
} from "lucide-react";

const agentMeta: Record<
  string,
  { label: string; description: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  invoice: {
    label: "Financials",
    description: "Detects invoices, receipts, and financial documents",
    icon: Receipt,
    color: "text-blue-600 dark:text-blue-400",
  },
  p1_classifier: {
    label: "Urgent Issues",
    description: "Classifies issue severity and tracks SLA compliance",
    icon: Timer,
    color: "text-red-600 dark:text-red-400",
  },
  emergent_work: {
    label: "Scope Watch",
    description: "Detects scope creep and out-of-contract work",
    icon: ClipboardList,
    color: "text-amber-600 dark:text-amber-400",
  },
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [newEmail, setNewEmail] = useState("");
  const [consentMessage, setConsentMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Handle consent callback query params
  useEffect(() => {
    const consent = searchParams.get("consent");
    if (consent === "success") {
      setConsentMessage({
        type: "success",
        text: "Microsoft 365 authorized successfully. You can now add mailboxes to monitor.",
      });
      queryClient.invalidateQueries({ queryKey: ["microsoft-status"] });
      window.history.replaceState({}, "", "/dashboard/settings");
    } else if (consent === "error") {
      const reason = searchParams.get("reason") || "Unknown error";
      setConsentMessage({
        type: "error",
        text: `Authorization failed: ${reason}`,
      });
      window.history.replaceState({}, "", "/dashboard/settings");
    } else if (consent === "denied") {
      setConsentMessage({
        type: "error",
        text: "Authorization was not granted. Please try again and accept the permissions.",
      });
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, [searchParams, queryClient]);

  const consentMutation = useMutation({
    mutationFn: () => configService.getConsentUrl(),
    onSuccess: (data) => {
      window.location.href = data.consent_url;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => configService.disconnect(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microsoft-status"] });
      queryClient.invalidateQueries({ queryKey: ["active-mailboxes"] });
      queryClient.invalidateQueries({ queryKey: ["agent-status"] });
    },
  });

  const { data: msStatus, isLoading: msLoading } = useQuery({
    queryKey: ["microsoft-status"],
    queryFn: () => configService.getMicrosoftStatus(),
  });

  const { data: activeMailboxes, isLoading: mailboxesLoading } = useQuery({
    queryKey: ["active-mailboxes"],
    queryFn: () => configService.getActiveMailboxes(),
  });

  const { data: agentStatus } = useQuery({
    queryKey: ["agent-status"],
    queryFn: () => activityService.getAgentStatus(),
  });

  const addMutation = useMutation({
    mutationFn: (email: string) => configService.addMailbox(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-mailboxes"] });
      queryClient.invalidateQueries({ queryKey: ["microsoft-status"] });
      setNewEmail("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => configService.removeMailbox(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-mailboxes"] });
      queryClient.invalidateQueries({ queryKey: ["microsoft-status"] });
    },
  });

  const webhookMutation = useMutation({
    mutationFn: () => configService.setupWebhooks(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microsoft-status"] });
      queryClient.invalidateQueries({ queryKey: ["active-mailboxes"] });
    },
  });

  const handleAddMailbox = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    addMutation.mutate(email);
  };

  const mailboxCount = activeMailboxes?.length ?? 0;
  const tenantDisplay = msStatus?.tenant_name || msStatus?.tenant_id;

  return (
    <div className="space-y-6">
      {/* Consent callback message */}
      {consentMessage && (
        <div
          className={`rounded-xl border px-5 py-4 ${
            consentMessage.type === "success"
              ? "border-green-200/50 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/20"
              : "border-red-200/50 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {consentMessage.type === "success" ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <p
                className={`text-sm ${
                  consentMessage.type === "success"
                    ? "text-green-800 dark:text-green-300"
                    : "text-red-800 dark:text-red-300"
                }`}
              >
                {consentMessage.text}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConsentMessage(null)}
              className="h-7 w-7 p-0 text-muted-foreground"
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
      {/* ─── Left Column ─────────────────────────────────────────── */}
      <div className="space-y-6">

      {/* ─── Microsoft 365 Connection ─────────────────────────────── */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 dark:bg-primary/10">
              <Shield className="h-4.5 w-4.5 text-primary/70" />
            </div>
            <div>
              <CardTitle className="text-base">Microsoft 365 Connection</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your organization&apos;s Microsoft 365 to monitor mailboxes
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {msLoading ? (
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Checking connection...
              </span>
            </div>
          ) : msStatus?.needs_reauth ? (
            /* Permission error */
            <div className="rounded-lg border border-red-200/60 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      Permission Issue
                    </p>
                    <p className="text-xs text-red-600/80 dark:text-red-400/60 mt-1 max-w-md">
                      {msStatus.permission_error ||
                        "Cannot access mailbox emails. An admin needs to re-authorize the app."}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => consentMutation.mutate()}
                  disabled={consentMutation.isPending}
                  size="sm"
                  className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shrink-0"
                >
                  {consentMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                  Re-authorize
                </Button>
              </div>
            </div>
          ) : msStatus?.connected ? (
            /* Connected state */
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200/60 bg-green-50/30 dark:border-green-900/40 dark:bg-green-950/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
                      <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {tenantDisplay}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {msStatus.token_healthy ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CircleDot className="h-2.5 w-2.5" />
                            Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-500">
                            <XCircle className="h-2.5 w-2.5" />
                            Token expired
                          </span>
                        )}
                        {msStatus.active_subscriptions > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Radio className="h-2.5 w-2.5" />
                            {msStatus.active_subscriptions} webhook{msStatus.active_subscriptions !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Disconnect from this Microsoft 365 organization? All webhooks will be removed. You can reconnect anytime."
                        )
                      ) {
                        disconnectMutation.mutate();
                      }
                    }}
                    disabled={disconnectMutation.isPending}
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive gap-1.5"
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Unplug className="h-3 w-3" />
                    )}
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Not connected */
            <div className="rounded-lg border border-amber-200/60 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      No Organization Connected
                    </p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/60 mt-1 max-w-md">
                      {msStatus?.reason ||
                        "Connect your Microsoft 365 organization to start monitoring mailboxes. An admin account is required for authorization."}
                    </p>
                  </div>
                </div>
                {msStatus?.app_configured && (
                  <Button
                    onClick={() => consentMutation.mutate()}
                    disabled={consentMutation.isPending}
                    size="sm"
                    className="gap-1.5 shrink-0"
                  >
                    {consentMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                    Authorize
                  </Button>
                )}
              </div>
            </div>
          )}
          {consentMutation.isError && (
            <p className="text-xs text-destructive mt-2">
              Failed to generate authorization URL. Check server configuration.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Monitored Mailboxes ──────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 dark:bg-primary/10">
                <Mail className="h-4.5 w-4.5 text-primary/70" />
              </div>
              <div>
                <CardTitle className="text-base">Monitored Properties</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mailboxCount > 0
                    ? `${mailboxCount} propert${mailboxCount !== 1 ? "ies" : "y"} being monitored for incoming communications`
                    : "Add property mailboxes to start AI-powered operations"}
                </p>
              </div>
            </div>
            {mailboxCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => webhookMutation.mutate()}
                disabled={webhookMutation.isPending}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8"
              >
                {webhookMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Refresh webhooks
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Mailbox list */}
          {mailboxesLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading mailboxes...</span>
            </div>
          ) : mailboxCount > 0 ? (
            <div className="space-y-2">
              {activeMailboxes!.map((mb: MonitoredMailbox) => (
                <div
                  key={mb.id}
                  className="group flex items-center justify-between rounded-lg border border-border/40 bg-card px-4 py-3 transition-colors hover:border-border hover:bg-accent/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{mb.email}</p>
                      {mb.display_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {mb.display_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {mb.subscription_id ? (
                      <Badge
                        variant="outline"
                        className="border-green-200 bg-green-50/50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 text-[11px] gap-1"
                      >
                        <Radio className="h-2.5 w-2.5" />
                        Live webhooks
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50/50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 text-[11px] gap-1"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        Polling
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Stop monitoring ${mb.email}? This will remove the webhook subscription.`
                          )
                        ) {
                          removeMutation.mutate(mb.id);
                        }
                      }}
                      disabled={removeMutation.isPending}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mb-3">
                <Mail className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No properties being monitored
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm">
                Add a property mailbox below to start AI-powered operations.
                All incoming communications will be processed automatically.
              </p>
            </div>
          )}

          {/* Add mailbox */}
          {msStatus?.connected && (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 block">
                Add property mailbox
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder={`e.g. dispatch@${tenantDisplay || "company.com"}`}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddMailbox();
                  }}
                  className="flex-1 h-9 text-sm bg-background"
                />
                <Button
                  onClick={handleAddMailbox}
                  disabled={
                    addMutation.isPending ||
                    !newEmail.trim() ||
                    !newEmail.includes("@")
                  }
                  size="sm"
                  className="h-9 px-4 gap-1.5"
                >
                  {addMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Add
                </Button>
              </div>
              {addMutation.isError && (
                <p className="text-xs text-destructive mt-2">
                  {(
                    addMutation.error as Error & {
                      response?: { data?: { detail?: string } };
                    }
                  )?.response?.data?.detail ||
                    "Failed to add mailbox. Make sure the email belongs to the connected organization."}
                </p>
              )}
              {addMutation.isSuccess && (
                <p className="text-xs text-green-600 mt-2">
                  Mailbox added. Webhook subscription created automatically.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground/50 mt-2">
                The mailbox must belong to the connected organization. Emails
                are monitored via webhooks with a 5-minute polling backup.
              </p>
            </div>
          )}

          {webhookMutation.isSuccess && (
            <p className="text-xs text-green-600">Webhooks refreshed successfully.</p>
          )}
          {webhookMutation.isError && (
            <p className="text-xs text-destructive">
              Webhook refresh failed. Check server logs.
            </p>
          )}
        </CardContent>
      </Card>

      </div>{/* end left column */}

      {/* ─── Right Column ────────────────────────────────────────── */}
      <div className="space-y-6">

      {/* ─── Agent status ──────────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
              <Layers className="h-4.5 w-4.5 text-foreground/70" />
            </div>
            <div>
              <CardTitle className="text-base">AI Assistants</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                All assistants process every communication in a single AI pass
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {Object.entries(agentMeta).map(
              ([key, { label, description, icon: Icon, color }]) => {
                const status = agentStatus?.[key];
                const isActive = status?.total_processed
                  ? status.total_processed > 0
                  : false;
                const hasErrors =
                  status?.error_count && status.error_count > 0;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60">
                        <Icon className={`h-4.5 w-4.5 ${color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {description}
                          {status?.total_processed
                            ? ` \u00b7 ${status.total_processed} processed`
                            : ""}
                          {hasErrors ? (
                            <span className="text-red-500 ml-1">
                              \u00b7 {status!.error_count} errors
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {status?.last_active && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {timeAgo(status.last_active)}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          isActive
                            ? "border-green-200 bg-green-50/50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs"
                            : "border-border text-muted-foreground text-xs"
                        }
                      >
                        {isActive ? "Active" : "Idle"}
                      </Badge>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── How It Works ──────────────────── */}
      <Card className="border-border/50 border-dashed">
        <CardContent className="pt-6 pb-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            How it works
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/20 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">1. Communication arrives</span>
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Emails to monitored properties are detected instantly via
                webhooks (with 5-min polling backup).
              </p>
            </div>
            <div className="rounded-lg bg-muted/20 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">
                  2. AI classification
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                One AI pass classifies urgency, detects financial documents, and flags scope deviations.
              </p>
            </div>
            <div className="rounded-lg bg-muted/20 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">3. Actions executed</span>
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Invoices auto-filed, urgent issues tracked with SLA deadlines,
                and scope creep flagged for review.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      </div>{/* end right column */}
      </div>{/* end grid */}
    </div>
  );
}
