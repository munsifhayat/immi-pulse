"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Calendar,
  BrainCircuit,
  ShieldCheck,
  FileCheck,
  Bell,
  TriangleAlert,
  ClipboardList,
  Scale,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENT } from "../_lib/constants";

const PAIN_POINTS = [
  {
    icon: ClipboardList,
    title: "Spreadsheet chaos",
    description:
      "Property managers track compliance in scattered spreadsheets, emails, and filing cabinets. Deadlines slip through the cracks. There's no single source of truth across the portfolio.",
  },
  {
    icon: Scale,
    title: "8 jurisdictions, 16+ obligation types",
    description:
      "Every Australian state has different rules — QLD mandates interconnected smoke alarms, VIC requires gas safety checks, WA expanded RCD rules in 2025. Keeping up manually is unsustainable.",
  },
  {
    icon: TriangleAlert,
    title: "Reactive, not proactive",
    description:
      "Compliance failures are usually discovered at the worst time — during a tribunal hearing, an insurance claim, or a routine inspection. By then, the damage is done and the liability is real.",
  },
];

const LAYERS = [
  {
    icon: Building2,
    title: "Tell us about your property",
    description:
      "Select your state, property type, and features (pool, gas). Our rules engine — built from legislation across all 8 Australian jurisdictions — instantly determines which compliance obligations apply. QLD smoke alarm rules differ from VIC. WA expanded RCD requirements in Oct 2025. We know every variation.",
    color: "text-blue-500/80",
    bg: "bg-blue-500/10",
    border: "ring-blue-500/15",
  },
  {
    icon: Calendar,
    title: "We track every deadline",
    description:
      "Each obligation has a lifecycle: unknown, scheduled, compliant, expiring, expired, non-compliant. As dates approach, statuses update automatically. Your portfolio score is calculated from weighted severity — pool safety and gas checks matter more than pest inspections. Daily lifecycle checks flag anything expiring within 30 days.",
    color: ACCENT.text,
    bg: ACCENT.bg,
    border: ACCENT.ring,
  },
  {
    icon: BrainCircuit,
    title: "Emails auto-update status",
    description:
      "When a compliance email arrives (inspection report, certificate, renewal notice), the AI reads it and its attachments, extracts the compliance type, jurisdiction, deadline, and certificate reference — then automatically updates the matching obligation. No manual data entry. No missed deadlines.",
    color: "text-violet-500/80",
    bg: "bg-violet-500/10",
    border: "ring-violet-500/15",
  },
];

const COMPLIANCE_TYPES_INFO = [
  { type: "Smoke Alarms", states: "All states", note: "QLD strictest — interconnected photoelectric since 2022" },
  { type: "Electrical / RCD", states: "VIC, QLD, WA, NSW", note: "VIC mandates 2-yearly checks. WA expanded RCD requirements Oct 2025" },
  { type: "Pool Barriers", states: "QLD, NSW, VIC, WA", note: "QLD requires certificate before every lease" },
  { type: "Gas Safety", states: "VIC (mandatory)", note: "VIC: 2-yearly gas check by licensed gasfitter" },
  { type: "Fire Safety", states: "NSW (strata), All (short-term)", note: "NSW: Annual fire safety statements for strata buildings" },
  { type: "Insurance", states: "All states", note: "Non-renewal can void coverage and breach management agreement" },
  { type: "Min. Standards", states: "QLD, VIC, NSW, SA, ACT", note: "Locks, ventilation, weatherproofing, mould-free" },
  { type: "Water Efficiency", states: "NSW, QLD, VIC", note: "Must meet WELS standards to pass on water charges" },
  { type: "Blind Cords", states: "VIC", note: "Child-safe requirements from Dec 2025" },
  { type: "Energy Efficiency", states: "ACT, VIC", note: "ACT: EER disclosure. VIC: insulation from Mar 2027" },
];

export function HowItWorks() {
  return (
    <div className="space-y-8">
      {/* Problem Statement */}
      <div className="space-y-5">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-destructive/70">
            The Problem
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground">
            Compliance is the #1 risk for property managers — and most are flying blind.
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Australian property managers are legally responsible for tenant safety compliance across their entire portfolio. A single missed smoke alarm inspection or expired pool certificate can result in fines up to $110,000, voided insurance, and personal liability at tribunal.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {PAIN_POINTS.map((point, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/60 bg-card p-5 shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/8 ring-1 ring-inset ring-destructive/15">
                <point.icon className="h-4.5 w-4.5 text-destructive/70" strokeWidth={1.75} />
              </div>
              <p className="mt-3 text-[13px] font-semibold text-foreground">
                {point.title}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Divider with transition */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-border/60" />
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-1.5 shadow-sm">
          <ArrowRight className="h-3.5 w-3.5 text-primary/70" />
          <span className="text-[11px] font-semibold text-muted-foreground">
            How Compliance Shield Solves This
          </span>
        </div>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Three layers — the solution */}
      <div className="grid gap-4 lg:grid-cols-3">
        {LAYERS.map((layer, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                  layer.bg,
                  layer.border
                )}
              >
                <layer.icon
                  className={cn("h-4.5 w-4.5", layer.color)}
                  strokeWidth={1.75}
                />
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 text-[11px] font-bold text-muted-foreground">
                {i + 1}
              </div>
            </div>
            <p className="text-[13px] font-semibold text-foreground">
              {layer.title}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              {layer.description}
            </p>
          </div>
        ))}
      </div>

      {/* What We Track */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-tight">
            What We Track
          </CardTitle>
          <CardDescription className="text-xs">
            16 compliance categories across all Australian states and territories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] w-[160px]">
                  Compliance Type
                </TableHead>
                <TableHead className="text-[11px] w-[180px]">
                  Key States
                </TableHead>
                <TableHead className="text-[11px]">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPLIANCE_TYPES_INFO.map((item) => (
                <TableRow key={item.type}>
                  <TableCell className="text-[12px] font-medium">
                    {item.type}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {item.states}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {item.note}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Benefit cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/15">
            <ShieldCheck
              className="h-4.5 w-4.5 text-emerald-500/80"
              strokeWidth={1.75}
            />
          </div>
          <p className="mt-3 text-[13px] font-semibold text-foreground">
            Proactive, Not Reactive
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            Compliance issues are detected from incoming emails in real-time —
            not discovered months later during a routine inspection or tribunal
            hearing.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-inset ring-blue-500/15">
            <FileCheck
              className="h-4.5 w-4.5 text-blue-500/80"
              strokeWidth={1.75}
            />
          </div>
          <p className="mt-3 text-[13px] font-semibold text-foreground">
            Insurance Claim Protection
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            Every compliance action is timestamped with its source email. When
            an insurer asks for proof, you have a complete audit trail — not a
            spreadsheet.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-inset ring-violet-500/15">
            <Bell
              className="h-4.5 w-4.5 text-violet-500/80"
              strokeWidth={1.75}
            />
          </div>
          <p className="mt-3 text-[13px] font-semibold text-foreground">
            Jurisdiction-Aware AI
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            The AI understands that QLD smoke alarm rules differ from VIC, that
            WA expanded RCD requirements in 2025, and that only VIC mandates
            gas safety checks.
          </p>
        </div>
      </div>
    </div>
  );
}
