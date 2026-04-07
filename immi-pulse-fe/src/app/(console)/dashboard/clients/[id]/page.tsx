"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Calendar,
  CreditCard,
  Briefcase,
  Clock,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Minus,
} from "lucide-react";
import { clientsService } from "@/lib/api/clients.service";
import type { Client, Case, ClientJourney } from "@/lib/types/immigration";
import { JOURNEY_STAGE_MAP, getCompletionPercentage } from "@/lib/journey-config";
import { JourneyTimeline } from "@/components/journey/journey-timeline";
import { JourneyProgressBar } from "@/components/journey/journey-progress-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function OutcomeBadge({ outcome }: { outcome: ClientJourney["outcome"] }) {
  if (!outcome) return null;
  const styles = {
    granted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    refused: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    withdrawn: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  const icons = {
    granted: CheckCircle2,
    refused: XCircle,
    withdrawn: Minus,
  };
  const Icon = icons[outcome];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase",
        styles[outcome]
      )}
    >
      <Icon className="h-3 w-3" />
      {outcome}
    </span>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [journeys, setJourneys] = useState<ClientJourney[]>([]);
  const [activeJourney, setActiveJourney] = useState<string | null>(null);

  useEffect(() => {
    clientsService.getClient(clientId).then(setClient);
    clientsService.getClientCases(clientId).then(setCases);
    clientsService.getClientJourneys(clientId).then((j) => {
      setJourneys(j);
      // Default to the most active journey (non-completed, most recent)
      const active =
        j.find((jn) => !jn.outcome) ?? j[0];
      if (active) setActiveJourney(active.case_id);
    });
  }, [clientId]);

  if (!client) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const selectedJourney = journeys.find((j) => j.case_id === activeJourney);
  const selectedCase = cases.find((c) => c.id === activeJourney);

  // Count stats
  const activeCases = cases.filter(
    (c) => !["granted", "refused", "withdrawn"].includes(c.stage)
  ).length;
  const completedCases = cases.filter((c) =>
    ["granted", "refused", "withdrawn"].includes(c.stage)
  ).length;
  const blockedJourneys = journeys.filter((j) =>
    j.steps.some((s) => s.status === "blocked")
  ).length;

  return (
    <motion.div
      className="space-y-6 text-foreground"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Back button + header */}
      <motion.div variants={fadeUp} custom={0}>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2 gap-1.5 text-muted-foreground"
          onClick={() => router.push("/dashboard/clients")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {getInitials(client.first_name, client.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {client.first_name} {client.last_name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {client.email}
                </span>
                {client.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {client.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  {client.nationality}
                </span>
              </div>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/10">
            Demo Data
          </Badge>
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        variants={fadeUp}
        custom={1}
        className="grid gap-4 grid-cols-2 lg:grid-cols-4"
      >
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cases.length}</p>
              <p className="text-xs text-muted-foreground">Total Cases</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCases}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCases}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{blockedJourneys}</p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Client info + journey section */}
      <motion.div
        variants={fadeUp}
        custom={2}
        className="grid gap-6 lg:grid-cols-[320px_1fr]"
      >
        {/* Left: Client info + case selector */}
        <div className="space-y-4">
          {/* Client details card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Client Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date of Birth</span>
                <span className="font-medium">
                  {new Date(client.date_of_birth).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nationality</span>
                <span className="font-medium">{client.nationality}</span>
              </div>
              <Separator />
              {client.passport_number && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Passport</span>
                    <span className="font-medium font-mono text-xs">
                      {client.passport_number}
                    </span>
                  </div>
                  <Separator />
                </>
              )}
              {client.current_visa && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Visa</span>
                    <span className="font-medium">
                      Subclass {client.current_visa}
                    </span>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client Since</span>
                <span className="font-medium">
                  {formatDate(client.created_at)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Case selector */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Visa Applications ({journeys.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {journeys.map((journey) => {
                const isActive = journey.case_id === activeJourney;
                const stageConfig = JOURNEY_STAGE_MAP[journey.current_stage];
                const completion = getCompletionPercentage(
                  journey.current_stage
                );
                const hasBlocker = journey.steps.some(
                  (s) => s.status === "blocked"
                );

                return (
                  <button
                    key={journey.case_id}
                    onClick={() => setActiveJourney(journey.case_id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-all duration-200",
                      isActive
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : "border-border/60 hover:border-border hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-foreground">
                            {journey.visa_subclass}
                          </span>
                          <span className="truncate text-[12px] text-muted-foreground">
                            {journey.visa_name}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          {journey.outcome ? (
                            <OutcomeBadge outcome={journey.outcome} />
                          ) : (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                stageConfig?.colorBg,
                                stageConfig?.colorText
                              )}
                            >
                              {stageConfig?.shortLabel}
                            </span>
                          )}
                          {hasBlocker && !journey.outcome && (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] font-semibold text-foreground">
                          {completion}%
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isActive && "text-primary rotate-90"
                          )}
                        />
                      </div>
                    </div>

                    {/* Mini progress bar */}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          journey.outcome === "granted"
                            ? "bg-emerald-500"
                            : journey.outcome === "refused"
                              ? "bg-red-500"
                              : hasBlocker
                                ? "bg-red-400"
                                : "bg-primary"
                        )}
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right: Journey Timeline */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  {selectedJourney
                    ? `${selectedJourney.visa_subclass} — ${selectedJourney.visa_name}`
                    : "Select a case"}
                </CardTitle>
                {selectedJourney && (
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Started {formatDate(selectedJourney.started_at)} &middot;
                    Last updated {formatTimeAgo(selectedJourney.updated_at)}
                  </p>
                )}
              </div>
              {selectedJourney && (
                <div className="flex items-center gap-3">
                  {selectedJourney.outcome ? (
                    <OutcomeBadge outcome={selectedJourney.outcome} />
                  ) : (
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {getCompletionPercentage(
                          selectedJourney.current_stage
                        )}
                        %
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Complete
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedJourney && !selectedJourney.outcome && (
              <div className="mt-3">
                <JourneyProgressBar steps={selectedJourney.steps} />
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selectedJourney ? (
              <JourneyTimeline
                steps={selectedJourney.steps}
                outcome={selectedJourney.outcome}
              />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Select a visa application to view the journey
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
