"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  BrainCircuit,
  FileCheck,
  ListChecks,
  Settings,
  Plug,
  Plus,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { fadeUp, stagger } from "@/lib/motion";

// ── Mock data ──────────────────────────────────────────────────
const mockMailboxes = [
  { id: "1", email: "info@migrationfirm.com.au" },
  { id: "2", email: "cases@migrationfirm.com.au" },
];

const agentDefinitions = [
  {
    id: "email_intake",
    name: "Email Intake",
    description:
      "Detects new client inquiries and matches emails to existing cases",
    icon: Mail,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40",
  },
  {
    id: "visa_classifier",
    name: "Visa Classifier",
    description:
      "Classifies visa type and stream from client communications",
    icon: BrainCircuit,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/40",
  },
  {
    id: "document_reviewer",
    name: "Document Reviewer",
    description:
      "AI validation of uploaded immigration documents using OCR",
    icon: FileCheck,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/40",
  },
  {
    id: "checklist_engine",
    name: "Checklist Engine",
    description:
      "Generates and tracks visa requirement checklists",
    icon: ListChecks,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/40",
  },
];

const howItWorksSteps = [
  {
    step: 1,
    title: "Email Arrives",
    description:
      "Client emails arrive in your connected mailbox. AI detects new inquiries, document submissions, and case updates.",
    icon: Mail,
  },
  {
    step: 2,
    title: "AI Classification",
    description:
      "Each email is analyzed for visa type signals, case matching, document detection, and urgency assessment.",
    icon: BrainCircuit,
  },
  {
    step: 3,
    title: "Actions Executed",
    description:
      "Cases are updated, documents queued for validation, checklists generated, and flagged items surfaced for your review.",
    icon: CheckCircle2,
  },
];

// ── Component ──────────────────────────────────────────────────
export default function SettingsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [agentStates, setAgentStates] = useState<Record<string, boolean>>({
    email_intake: true,
    visa_classifier: true,
    document_reviewer: true,
    checklist_engine: false,
  });

  const toggleAgent = (id: string) => {
    setAgentStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <motion.div
      className="space-y-6"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page header ─────────────────────────────────────────── */}
      <motion.div
        className="flex items-center justify-between"
        variants={fadeUp}
        custom={0}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure integrations, mailboxes, and AI agents
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
        >
          Demo Data
        </Badge>
      </motion.div>

      {/* ── Two-column layout ───────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left Column ────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Email Integration */}
          <motion.div variants={fadeUp} custom={1}>
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 dark:bg-primary/10">
                    <Plug className="h-4.5 w-4.5 text-primary/70" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Email Integration
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Connect your email to start receiving client
                      communications
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  <div className="rounded-lg border border-green-200/60 bg-green-50/30 dark:border-green-900/40 dark:bg-green-950/10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Connected
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            consultant@firm.com.au
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsConnected(false)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mb-3">
                        <Mail className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Not Connected
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1 mb-4 max-w-xs">
                        Connect your Microsoft 365 account to start monitoring
                        client emails automatically
                      </p>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setIsConnected(true)}
                      >
                        <Plug className="h-3.5 w-3.5" />
                        Connect Microsoft 365
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Monitored Mailboxes */}
          <motion.div variants={fadeUp} custom={2}>
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 dark:bg-primary/10">
                    <Mail className="h-4.5 w-4.5 text-primary/70" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Monitored Mailboxes
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Mailboxes being monitored for incoming client
                      communications
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockMailboxes.map((mb) => (
                  <div
                    key={mb.id}
                    className="group flex items-center justify-between rounded-lg border border-border/40 bg-card px-4 py-3 transition-colors hover:border-border hover:bg-accent/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">{mb.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                <Separator className="my-2" />

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-muted-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Mailbox
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Right Column ───────────────────────────────────────── */}
        <div className="space-y-6">
          {/* AI Agents */}
          <motion.div variants={fadeUp} custom={1}>
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 dark:bg-primary/10">
                    <BrainCircuit className="h-4.5 w-4.5 text-primary/70" />
                  </div>
                  <div>
                    <CardTitle className="text-base">AI Agents</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Immigration AI agents and their current status
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {agentDefinitions.map((agent) => {
                  const Icon = agent.icon;
                  const enabled = agentStates[agent.id] ?? false;
                  return (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between rounded-lg border border-border/40 bg-card px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${agent.bgColor}`}
                        >
                          <Icon className={`h-4.5 w-4.5 ${agent.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {agent.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <Badge
                          variant="outline"
                          className={
                            enabled
                              ? "border-green-200 bg-green-50/50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs"
                              : "border-border text-muted-foreground text-xs"
                          }
                        >
                          {enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => toggleAgent(agent.id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* How It Works */}
          <motion.div variants={fadeUp} custom={2}>
            <Card className="border-border/60 border-dashed shadow-sm">
              <CardContent className="pt-6 pb-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
                  How it works
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {howItWorksSteps.map((step) => {
                    const StepIcon = step.icon;
                    return (
                      <div
                        key={step.step}
                        className="rounded-lg bg-muted/20 p-3"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <StepIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">
                            {step.step}. {step.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/70">
                          {step.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
