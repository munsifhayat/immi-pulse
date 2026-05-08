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
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fadeUp, stagger } from "@/lib/motion";
import {
  preCasesApi,
  questionnairesApi,
  type PreCaseListItem,
  type QuestionnaireListItem,
} from "@/lib/api/services";
import { useCases } from "@/lib/api/hooks/cases";
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
      hint: "Unread submissions waiting",
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
      className="space-y-12"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* ── Hero ── */}
      <section className="relative">
        <motion.p variants={fadeUp} custom={0} className="editorial-eyebrow">
          <span>
            Dashboard {org?.name ? `· ${org.name}` : ""}
          </span>
        </motion.p>

        <motion.h1
          variants={fadeUp}
          custom={1}
          className="font-heading mt-6 max-w-[18ch] font-normal leading-[1.02] tracking-[-1.2px] text-foreground"
          style={{ fontSize: "clamp(2.4rem, 4.6vw, 3.6rem)" }}
        >
          {user?.first_name ? (
            <>
              Welcome,{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[color:var(--purple)] via-[color:var(--purple)] to-[color:var(--purple-deep)] bg-clip-text text-transparent">
                  {user.first_name}
                </span>
                <svg
                  aria-hidden
                  className="absolute -bottom-1 left-0 h-[10px] w-full"
                  viewBox="0 0 240 10"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,7 Q60,2 120,5 T240,4"
                    fill="none"
                    stroke="url(#welcome-under)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="welcome-under" x1="0" x2="1">
                      <stop offset="0%" stopColor="var(--purple)" stopOpacity="0.2" />
                      <stop offset="50%" stopColor="var(--purple)" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="var(--purple-deep)" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              .
            </>
          ) : (
            <>
              Welcome <span className="text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">back</span>.
            </>
          )}
        </motion.h1>

        <motion.p
          variants={fadeUp}
          custom={2}
          className="mt-6 max-w-[60ch] text-[16px] leading-[1.65] text-muted-foreground"
        >
          {isFreshAccount
            ? "Let's get your practice configured. Four steps, about five minutes — and you're live for intake."
            : setupComplete
              ? "Your practice is fully configured. Here's what's happening today."
              : "Here's what's moving across your desk today. Triage what's new, advance what's in flight."}
        </motion.p>

        <motion.div
          variants={fadeUp}
          custom={3}
          className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-muted-foreground"
        >
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[color:var(--purple)]" />
            <span className="font-medium text-foreground">Live intake</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[color:var(--purple)]" />
            OMARA-aligned
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[color:var(--purple)]" />
            Australian data residency
          </span>
        </motion.div>
      </section>

      {/* ── Next-up callout ── */}
      {!isLoading && nextStep && !isFreshAccount && (
        <motion.div variants={fadeUp} custom={4}>
          <Link
            href={nextStep.cta.href}
            className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-[color:var(--purple)]/20 bg-gradient-to-br from-[color:var(--purple-muted)]/25 via-card to-card p-5 shadow-[0_1px_0_rgba(15,17,23,0.02)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--purple)]/40 hover:shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--purple)_55%,transparent)] dark:from-[color:var(--purple)]/8 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--purple)]/10 ring-1 ring-[color:var(--purple)]/15 transition-colors group-hover:bg-[color:var(--purple)]/15">
                <Sparkles className="h-5 w-5 text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">
                  Next up
                </p>
                <p className="font-heading mt-1 text-[16px] font-semibold text-foreground">
                  {nextStep.title}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 self-start text-[14px] font-medium text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)] sm:self-auto">
              {nextStep.cta.label}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </motion.div>
      )}

      {/* ── Stats ── */}
      {!isFreshAccount && (
        <motion.div
          variants={fadeUp}
          custom={5}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {statCards.map((card, idx) => {
            const isZero = !isLoading && card.value === 0;
            return (
              <Link key={card.label} href={card.href} className="group block">
                <div className="relative h-full rounded-2xl border border-border bg-card p-5 shadow-[0_1px_0_rgba(15,17,23,0.02)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--purple)]/30 hover:shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--purple)_55%,transparent)]">
                  <div className="flex items-start justify-between">
                    <p className="font-heading text-[13.5px] font-semibold text-foreground">
                      {card.label}
                    </p>
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/45">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "font-heading mt-4 text-[44px] font-medium leading-none tracking-[-1.5px] tabular-nums",
                      isZero ? "text-muted-foreground/40" : "text-foreground",
                    )}
                  >
                    {isLoading ? "—" : card.value}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {isZero ? card.emptyHint : card.hint}
                    </p>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-[color:var(--purple-deep)] dark:group-hover:text-[color:var(--purple-light)]" />
                  </div>
                </div>
              </Link>
            );
          })}
        </motion.div>
      )}

      {/* ── Setup checklist ── */}
      {!setupComplete && (
        <motion.div variants={fadeUp} custom={6}>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">
                {isFreshAccount ? "Get started" : "Setup checklist"}
              </p>
              <h2 className="font-heading mt-2 text-[22px] font-semibold tracking-tight text-foreground">
                Four steps to live intake
              </h2>
              <p className="mt-1 text-[13.5px] text-muted-foreground">
                Receive, qualify, and manage immigration cases in one place.
              </p>
            </div>
            {!isLoading && (
              <div className="shrink-0 text-right">
                <p className="font-heading text-[20px] font-semibold tabular-nums text-foreground">
                  {stepsDone}/{onboardingSteps.length}
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  Done
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {onboardingSteps.map((step, idx) => {
              const Icon = step.icon;
              const isDone = stepStates[idx];
              const isNext = idx === nextStepIndex;
              return (
                <Link
                  key={step.title}
                  href={step.cta.href}
                  className={cn(
                    "group relative flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-[0_1px_0_rgba(15,17,23,0.02)] transition-all hover:-translate-y-0.5",
                    isDone
                      ? "border-emerald-500/30 bg-emerald-500/[0.04] hover:border-emerald-500/50 hover:shadow-[0_18px_40px_-24px_rgba(16,185,129,0.45)]"
                      : isNext
                        ? "border-[color:var(--purple)]/30 hover:border-[color:var(--purple)]/45 hover:shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--purple)_55%,transparent)]"
                        : "border-border hover:border-[color:var(--purple)]/30 hover:shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--purple)_55%,transparent)]",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors",
                      isDone
                        ? "bg-emerald-500/10 ring-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : isNext
                          ? "bg-[color:var(--purple)]/10 ring-[color:var(--purple)]/15 text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]"
                          : "bg-muted/60 ring-border text-muted-foreground group-hover:bg-[color:var(--purple)]/10 group-hover:ring-[color:var(--purple)]/15 group-hover:text-[color:var(--purple-deep)] dark:group-hover:text-[color:var(--purple-light)]",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-heading text-[15px] font-semibold text-foreground">
                        {step.title}
                      </p>
                      {isDone ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                          Done
                        </span>
                      ) : isNext ? (
                        <span className="rounded-full border border-[color:var(--purple)]/30 bg-[color:var(--purple)]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">
                          Next
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                    {!isDone && (
                      <p
                        className={cn(
                          "mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium transition-opacity",
                          isNext
                            ? "text-[color:var(--purple-deep)] opacity-100 dark:text-[color:var(--purple-light)]"
                            : "text-muted-foreground opacity-0 group-hover:opacity-100",
                        )}
                      >
                        {step.cta.label}
                        <ArrowRight className="h-3 w-3" />
                      </p>
                    )}
                  </div>
                  <span
                    aria-hidden
                    className="ml-auto self-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/40"
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Trial banner / Invite team CTA ── */}
      {isFreshAccount ? (
        <motion.div variants={fadeUp} custom={7}>
          <div className="flex flex-col gap-4 rounded-2xl border border-[color:var(--purple)]/15 bg-gradient-to-br from-[color:var(--purple-muted)]/30 via-card to-card p-5 shadow-[0_1px_0_rgba(15,17,23,0.02)] dark:from-[color:var(--purple)]/8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--purple)]/10 ring-1 ring-[color:var(--purple)]/15">
                <UserPlus className="h-5 w-5 text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]" />
              </div>
              <div>
                <p className="font-heading text-[15px] font-semibold text-foreground">
                  Bring your team along
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Invite consultants and admins so everyone shares the same caseload, documents, and questionnaires.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/settings/team"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border-2 border-[color:var(--purple)] bg-[color:var(--purple)] px-5 py-2.5 text-[13.5px] font-medium text-white shadow-[0_10px_24px_-10px_rgba(124,92,252,0.55)] transition-all hover:border-[color:var(--purple-deep)] hover:bg-[color:var(--purple-deep)] sm:self-auto"
            >
              Invite teammates
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      ) : (
        !setupComplete && (
          <motion.div variants={fadeUp} custom={7}>
            <div className="flex items-start gap-4 rounded-2xl border border-[color:var(--purple)]/15 bg-gradient-to-br from-[color:var(--purple-muted)]/30 via-card to-card p-5 dark:from-[color:var(--purple)]/8">
              <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]" />
              <div>
                <p className="text-[14px] leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Hosted in Sydney.</span>{" "}
                  Australian data residency, encrypted end-to-end, Privacy Act 1988 aligned.
                </p>
              </div>
            </div>
          </motion.div>
        )
      )}
    </motion.div>
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
