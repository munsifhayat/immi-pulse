"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Inbox,
  FolderKanban,
  ArrowRight,
  CheckCircle2,
  Share2,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fadeUp, stagger } from "@/lib/motion";
import { PageHeader } from "@/components/layout/page-header";
import {
  preCasesApi,
  questionnairesApi,
  type PreCaseListItem,
  type QuestionnaireListItem,
} from "@/lib/api/services";
import { useCases } from "@/lib/api/hooks/cases";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const onboardingSteps = [
  {
    icon: ClipboardList,
    title: "Build your intake questionnaire",
    description:
      "Create a custom form with the questions you ask every prospect. We'll generate a public link you can share.",
    cta: { label: "Build a questionnaire", href: "/dashboard/questionnaires/new" },
  },
  {
    icon: Share2,
    title: "Share the public link",
    description:
      "Add the link to your website, Instagram bio, or email signature. Prospects fill it in — no login required.",
    cta: { label: "View questionnaires", href: "/dashboard/questionnaires" },
  },
  {
    icon: Inbox,
    title: "Review pre-cases",
    description:
      "Each submission lands in your Pre-Cases inbox with a structured summary. Promote the strong ones into a paying case.",
    cta: { label: "Open pre-cases", href: "/dashboard/precases" },
  },
  {
    icon: FolderKanban,
    title: "Manage cases end-to-end",
    description:
      "Track stages, collect documents through a secure client portal, and bill in checkpoints — all in one place.",
    cta: { label: "Go to cases", href: "/dashboard/cases" },
  },
];

export default function DashboardPage() {
  const { user, org } = useAuth();
  const [preCases, setPreCases] = useState<PreCaseListItem[] | null>(null);
  const [questionnaires, setQuestionnaires] = useState<
    QuestionnaireListItem[] | null
  >(null);
  const casesQuery = useCases({});
  const cases = casesQuery.data ?? [];

  useEffect(() => {
    preCasesApi.list().then(setPreCases).catch(() => setPreCases([]));
    questionnairesApi.list().then(setQuestionnaires).catch(() => setQuestionnaires([]));
  }, []);

  const isLoading =
    preCases === null || questionnaires === null || casesQuery.isLoading;

  const stats = {
    activeCases: cases.filter((c) => c.stage !== "decision").length,
    preCasesUnread: (preCases ?? []).filter(
      (p) => p.status === "pending" && !p.read_at,
    ).length,
    questionnaires: (questionnaires ?? []).filter((q) => q.is_active).length,
    casesThisMonth: cases.filter((c) => {
      const created = new Date(c.created_at);
      const now = new Date();
      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length,
  };

  const stepStates = onboardingSteps.map((_, idx) =>
    checkStepDone(idx, {
      questionnaires: questionnaires ?? [],
      preCases: preCases ?? [],
      cases,
    }),
  );
  const stepsDone = stepStates.filter(Boolean).length;
  const setupComplete = !isLoading && stepsDone === onboardingSteps.length;
  const isFreshAccount =
    !isLoading &&
    cases.length === 0 &&
    (preCases ?? []).length === 0 &&
    (questionnaires ?? []).length === 0;

  // Find the next undone step so we can surface a single "next action" CTA.
  const nextStepIndex = stepStates.findIndex((d) => !d);
  const nextStep =
    nextStepIndex >= 0 ? onboardingSteps[nextStepIndex] : null;

  const statCards = [
    {
      label: "Active cases",
      value: stats.activeCases,
      href: "/dashboard/cases",
      hint: "In-progress applications",
      emptyHint: "Promote your first pre-case to open one",
    },
    {
      label: "New pre-cases",
      value: stats.preCasesUnread,
      href: "/dashboard/precases",
      hint: "Unread submissions waiting for review",
      emptyHint: "Submissions appear here once shared",
    },
    {
      label: "Live questionnaires",
      value: stats.questionnaires,
      href: "/dashboard/questionnaires",
      hint: "Forms accepting submissions",
      emptyHint: "Build one to start collecting leads",
    },
    {
      label: "Cases this month",
      value: stats.casesThisMonth,
      href: "/dashboard/cases",
      hint: "Opened in the current month",
      emptyHint: "Track new engagements monthly",
    },
  ];

  return (
    <motion.div
      className="space-y-8"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Editorial folio header */}
      <PageHeader
        eyebrow="Folio Nº 001 — Practice"
        title={
          user?.first_name ? (
            <>
              Welcome, <em>{user.first_name}</em>.
            </>
          ) : (
            <>
              The <em>practice</em>.
            </>
          )
        }
        description={
          <>
            {org?.name ? `${org.name} · ` : ""}
            {isFreshAccount
              ? "Let's get your practice set up — it takes about 5 minutes."
              : setupComplete
                ? "Your practice is fully configured. Here's what's happening today."
                : "Here's what's happening in your practice today."}
          </>
        }
        actions={
          !isLoading && !setupComplete ? (
            <SetupProgressStrip done={stepsDone} total={onboardingSteps.length} />
          ) : undefined
        }
      />

      {/* Next action callout — single CTA when setup is incomplete */}
      {!isLoading && nextStep && !isFreshAccount && (
        <motion.div variants={fadeUp} custom={1}>
          <Link
            href={nextStep.cta.href}
            className="group flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.06] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Next up
                </p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {nextStep.title}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary sm:self-auto">
              {nextStep.cta.label}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </motion.div>
      )}

      {/* Stats — only show once there's any real data */}
      {!isFreshAccount && (
        <motion.div
          variants={fadeUp}
          custom={2}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {statCards.map((card, idx) => {
            const isZero = !isLoading && card.value === 0;
            return (
              <Link key={card.label} href={card.href} className="group block">
                <div
                  className={cn(
                    "relative h-full border border-border/60 bg-card/40 p-5 transition-all",
                    isZero
                      ? "hover:border-border hover:bg-card/60"
                      : "hover:border-foreground/30 hover:bg-card/70",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-d text-[9px] uppercase tracking-[0.24em] text-muted-foreground/70">
                      {String(idx + 1).padStart(2, "0")} / {card.label}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <p
                    className={cn(
                      "font-serif-d mt-3 text-[44px] leading-none tracking-tight tabular-nums",
                      isZero ? "text-muted-foreground/50" : "text-foreground",
                    )}
                  >
                    {isLoading ? "—" : card.value}
                  </p>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                    {isZero ? card.emptyHint : card.hint}
                  </p>
                </div>
              </Link>
            );
          })}
        </motion.div>
      )}

      {/* Setup checklist — only show until everything's done */}
      {!setupComplete && (
        <motion.div variants={fadeUp} custom={3}>
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {isFreshAccount ? "Get started" : "Setup checklist"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Four steps to start receiving and managing immigration cases.
              </p>
            </div>
            {!isLoading && (
              <p className="text-xs font-medium tabular-nums text-muted-foreground">
                {stepsDone} of {onboardingSteps.length} done
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {onboardingSteps.map((step, idx) => {
              const Icon = step.icon;
              const isDone = stepStates[idx];
              const isNext = idx === nextStepIndex;
              return (
                <Link
                  key={step.title}
                  href={step.cta.href}
                  className={cn(
                    "group flex items-start gap-4 rounded-xl border bg-card p-5 transition-all",
                    isDone
                      ? "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                      : isNext
                        ? "border-primary/40 bg-primary/[0.03] hover:border-primary/60 hover:bg-primary/[0.06]"
                        : "border-border/60 hover:border-border hover:bg-muted/30",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      isDone
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : isNext
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {step.title}
                      </p>
                      {isDone ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          Done
                        </span>
                      ) : isNext ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          Next
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                    {!isDone && (
                      <p
                        className={cn(
                          "mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary transition-opacity",
                          isNext ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        )}
                      >
                        {step.cta.label}
                        <ArrowRight className="h-3 w-3" />
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Invite team CTA — only on a brand-new account */}
      {isFreshAccount && (
        <motion.div variants={fadeUp} custom={4}>
          <Card className="flex flex-col items-start gap-4 border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Bring your team along
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Invite consultants and admins so everyone shares the same
                  caseload, documents, and questionnaires.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/settings/team"
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Invite teammates
            </Link>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

function SetupProgressStrip({ done, total }: { done: number; total: number }) {
  const pct = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-3 border border-border/60 bg-card/40 px-4 py-2.5">
      <span className="font-mono-d text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
        Setup
      </span>
      <div className="relative h-px w-32 overflow-hidden bg-border">
        <div
          className="absolute inset-y-0 left-0 bg-[color:var(--purple)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-mono-d text-[10.5px] tabular-nums tracking-[0.12em] text-foreground">
        {done}/{total}
      </p>
    </div>
  );
}

function checkStepDone(
  index: number,
  data: {
    questionnaires: QuestionnaireListItem[];
    preCases: PreCaseListItem[];
    cases: { id: string }[];
  },
): boolean {
  if (index === 0) return data.questionnaires.length > 0;
  if (index === 1) return data.questionnaires.some((q) => q.is_active);
  if (index === 2) return data.preCases.length > 0;
  if (index === 3) return data.cases.length > 0;
  return false;
}
