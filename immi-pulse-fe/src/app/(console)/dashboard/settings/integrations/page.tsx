"use client";

import { useState } from "react";
import {
  Mail,
  BrainCircuit,
  FileCheck,
  ListChecks,
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

const mockMailboxes = [
  { id: "1", email: "info@migrationfirm.com.au" },
  { id: "2", email: "cases@migrationfirm.com.au" },
];

const agentDefinitions = [
  {
    id: "email_intake",
    name: "Email Intake",
    description: "Detects new client inquiries and matches emails to existing cases",
    icon: Mail,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40",
  },
  {
    id: "visa_classifier",
    name: "Visa Classifier",
    description: "Classifies visa type and stream from client communications",
    icon: BrainCircuit,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/40",
  },
  {
    id: "document_reviewer",
    name: "Document Reviewer",
    description: "AI validation of uploaded immigration documents using OCR",
    icon: FileCheck,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/40",
  },
  {
    id: "checklist_engine",
    name: "Checklist Engine",
    description: "Generates and tracks visa requirement checklists",
    icon: ListChecks,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/40",
  },
];

export default function IntegrationsSettingsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [agentStates, setAgentStates] = useState<Record<string, boolean>>({
    email_intake: true,
    visa_classifier: true,
    document_reviewer: true,
    checklist_engine: false,
  });

  const toggleAgent = (id: string) =>
    setAgentStates((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Email & AI agents</h2>
          <p className="text-xs text-muted-foreground">
            Connect mail, decide which agents work for you.
          </p>
        </div>
        <Badge variant="outline" className="border-amber-200 bg-amber-50/60 text-amber-700">
          Demo data
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5">
                  <Plug className="h-4.5 w-4.5 text-primary/70" />
                </div>
                <div>
                  <CardTitle className="text-base">Email Integration</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Connect your email to start receiving client communications
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isConnected ? (
                <div className="rounded-lg border border-green-200/60 bg-green-50/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Connected</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          consultant@firm.com.au
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsConnected(false)}
                      className="text-xs hover:text-destructive"
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
                    <p className="text-sm font-medium text-muted-foreground">Not connected</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 mb-4 max-w-xs">
                      Connect your Microsoft 365 account to start monitoring client emails
                    </p>
                    <Button size="sm" className="gap-1.5" onClick={() => setIsConnected(true)}>
                      <Plug className="h-3.5 w-3.5" />
                      Connect Microsoft 365
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5">
                  <Mail className="h-4.5 w-4.5 text-primary/70" />
                </div>
                <div>
                  <CardTitle className="text-base">Monitored mailboxes</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Mailboxes being monitored for incoming client communications
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
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Separator className="my-2" />
              <Button variant="outline" size="sm" className="w-full gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add mailbox
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5">
                  <BrainCircuit className="h-4.5 w-4.5 text-primary/70" />
                </div>
                <div>
                  <CardTitle className="text-base">AI agents</CardTitle>
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
                        <p className="text-xs text-muted-foreground">{agent.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <Badge
                        variant="outline"
                        className={
                          enabled
                            ? "border-green-200 bg-green-50/50 text-green-700 text-xs"
                            : "border-border text-muted-foreground text-xs"
                        }
                      >
                        {enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <Switch checked={enabled} onCheckedChange={() => toggleAgent(agent.id)} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
