"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Plus, Users, Briefcase, Globe, ChevronRight } from "lucide-react";
import { clientsService } from "@/lib/api/clients.service";
import { casesService } from "@/lib/api/cases.service";
import type { Client, Case, ClientJourney } from "@/lib/types/immigration";
import { JOURNEY_STAGE_MAP, getCompletionPercentage } from "@/lib/journey-config";
import { JourneyProgressBar } from "@/components/journey/journey-progress-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ── Stage badge colors ──
const stageColors: Record<string, string> = {
  intake: "bg-slate-100 text-slate-700",
  consultation: "bg-blue-100 text-blue-700",
  checklist_sent: "bg-amber-100 text-amber-700",
  documents_collecting: "bg-amber-100 text-amber-700",
  documents_reviewing: "bg-purple-100 text-purple-700",
  lodgement_ready: "bg-teal-100 text-teal-700",
  lodged: "bg-cyan-100 text-cyan-700",
  granted: "bg-emerald-100 text-emerald-700",
  refused: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-700",
};

// ── Stage labels ──
const stageLabels: Record<string, string> = {
  intake: "Intake",
  consultation: "Consultation",
  checklist_sent: "Checklist Sent",
  documents_collecting: "Collecting Docs",
  documents_reviewing: "Reviewing Docs",
  lodgement_ready: "Ready to Lodge",
  lodged: "Lodged",
  granted: "Granted",
  refused: "Refused",
  withdrawn: "Withdrawn",
};

// ── Helpers ──
function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [journeys, setJourneys] = useState<ClientJourney[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    clientsService.getClients().then(setClients);
    casesService.getCases().then(setCases);
    clientsService.getAllJourneys().then(setJourneys);
  }, []);

  // Filter clients by search query
  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [clients, search]);

  // Get latest case stage for each client
  const latestStageMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const client of clients) {
      const clientCases = cases
        .filter((c) => c.client_id === client.id)
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      if (clientCases.length > 0) {
        map[client.id] = clientCases[0].stage;
      }
    }
    return map;
  }, [clients, cases]);

  // Get most active journey for each client (for the progress bar)
  const activeJourneyMap = useMemo(() => {
    const map: Record<string, ClientJourney> = {};
    for (const client of clients) {
      const clientJourneys = journeys.filter(
        (j) => j.client_id === client.id
      );
      // Prefer active (non-completed) journey, fallback to most recent
      const active =
        clientJourneys.find((j) => !j.outcome) ?? clientJourneys[0];
      if (active) map[client.id] = active;
    }
    return map;
  }, [clients, journeys]);

  // Stats
  const totalClients = clients.length;
  const totalActiveCases = cases.length;
  const uniqueNationalities = new Set(clients.map((c) => c.nationality)).size;

  const stats = [
    {
      label: "Total Clients",
      value: totalClients,
      icon: Users,
      color: "text-[#7A5AF8]",
      bg: "bg-[#7A5AF8]/10",
    },
    {
      label: "Active Cases",
      value: totalActiveCases,
      icon: Briefcase,
      color: "text-[#1B7B6F]",
      bg: "bg-[#1B7B6F]/10",
    },
    {
      label: "Nationalities",
      value: uniqueNationalities,
      icon: Globe,
      color: "text-[#7A5AF8]",
      bg: "bg-[#7A5AF8]/10",
    },
  ];

  return (
    <motion.div
      className="space-y-6 text-foreground"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        variants={fadeUp}
        custom={0}
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Clients
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your immigration clients
          </p>
        </div>
        <Badge className="bg-[#7A5AF8]/10 text-[#7A5AF8] border-[#7A5AF8]/30 hover:bg-[#7A5AF8]/10">
          Demo Data
        </Badge>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        className="grid gap-4 sm:grid-cols-3"
        variants={fadeUp}
        custom={1}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="border-border/60 bg-card shadow-sm"
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Search + Add Client */}
      <motion.div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        variants={fadeUp}
        custom={2}
      >
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Enter the client details below. This is a demo form.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Smith" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input id="nationality" placeholder="Australian" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>
                Save (Coming Soon)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Client table */}
      <motion.div variants={fadeUp} custom={3}>
        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Client</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Cases</TableHead>
                  <TableHead>Latest Stage</TableHead>
                  <TableHead>Journey</TableHead>
                  <TableHead className="pr-6 text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((client) => {
                    const stage = latestStageMap[client.id];
                    const journey = activeJourneyMap[client.id];
                    return (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer transition-colors hover:bg-muted/40"
                        onClick={() =>
                          router.push(`/dashboard/clients/${client.id}`)
                        }
                      >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-[#7A5AF8]/10 text-[#7A5AF8] text-xs font-semibold">
                                {getInitials(
                                  client.first_name,
                                  client.last_name
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[13px] font-medium text-foreground">
                              {client.first_name} {client.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          {client.nationality}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          {client.email}
                        </TableCell>
                        <TableCell className="text-center text-[13px] font-medium text-foreground">
                          {client.cases_count}
                        </TableCell>
                        <TableCell>
                          {stage ? (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                stageColors[stage] ?? "bg-gray-100 text-gray-700"
                              )}
                            >
                              {stageLabels[stage] ?? stage}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              --
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {journey ? (
                            <div className="flex items-center gap-2">
                              <JourneyProgressBar
                                steps={journey.steps}
                              />
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {getCompletionPercentage(
                                  journey.current_stage
                                )}
                                %
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              --
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(client.created_at)}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <p className="text-sm text-muted-foreground">
                        No clients found matching &quot;{search}&quot;
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
