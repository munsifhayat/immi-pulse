"use client";

/**
 * Dashboard / Overview — the first page a freshly-signed-up consultant lands on.
 *
 * Design intent: opening a beautifully bound atelier journal to a fresh page.
 * Today's date and folio number across the top. A welcoming editorial title.
 * Then The Path — four honest stages to the consultant's first case, each
 * driven by REAL data (no fake "DONE" badges). A snapshot of today's desk
 * appears only when there's actually something to count. Finally a guide
 * card ("How it works") links to the full walkthrough.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileSignature,
  Inbox as InboxIcon,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  preCasesApi,
  questionnairesApi,
  type PreCaseListItem,
  type QuestionnaireListItem,
} from "@/lib/api/services";
import { useCases } from "@/lib/api/hooks/cases";
import { cn } from "@/lib/utils";

const SHARED_FLAG_KEY = "ip:dashboard:link-shared";

const ease = [0.22, 1, 0.36, 1] as const;

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function DashboardPage() {
  const { user, org } = useAuth();
  const [preCases, setPreCases] = useState<PreCaseListItem[] | null>(null);
  const [questionnaires, setQuestionnaires] = useState<
    QuestionnaireListItem[] | null
  >(null);
  const casesQuery = useCases({});
  const cases = casesQuery.data ?? [];

  // Local "I shared the link" flag — flipped when the user clicks Copy link.
  const [linkShared, setLinkShared] = useState(false);

  useEffect(() => {
    preCasesApi
      .list({ limit: 200 })
      .then((res) => setPreCases(res.items))
      .catch(() => setPreCases([]));
    questionnairesApi
      .list()
      .then(setQuestionnaires)
      .catch(() => setQuestionnaires([]));
    // Reading from localStorage has to happen post-hydration on the client.
    // The lint rule against setState-in-effect doesn't fit this case.
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLinkShared(localStorage.getItem(SHARED_FLAG_KEY) === "1");
    }
  }, []);

  const isLoading =
    preCases === null || questionnaires === null || casesQuery.isLoading;

  // ── Real progress derivation ────────────────────────────────────────────
  const totalSubmissions = useMemo(
    () =>
      (questionnaires ?? []).reduce(
        (sum, q) => sum + (q.response_count ?? 0),
        0,
      ),
    [questionnaires],
  );

  // Public link = the most-recently-created seed questionnaire's slug.
  // We use it to power the Copy-link CTA on stage I.
  const featuredQuestionnaire = useMemo(() => {
    const list = questionnaires ?? [];
    if (list.length === 0) return null;
    // Prefer a "general" intake form when present.
    const general = list.find((q) => q.audience === "general");
    return general ?? list[0];
  }, [questionnaires]);

  const publicLink =
    typeof window !== "undefined" && featuredQuestionnaire
      ? `${window.location.origin}/q/${featuredQuestionnaire.slug}`
      : "";

  const stageDone = {
    share: linkShared || totalSubmissions > 0,
    received: (preCases ?? []).length > 0,
    engaged: (preCases ?? []).some(
      (p) => !!p.letter_sent_at || !!p.letter_signed_at || !!p.paid_at,
    ),
    converted: cases.length > 0,
  };

  const stageOrder: Array<keyof typeof stageDone> = [
    "share",
    "received",
    "engaged",
    "converted",
  ];
  const stagesDoneCount = stageOrder.filter((k) => stageDone[k]).length;
  const allStagesDone = stagesDoneCount === stageOrder.length;
  const nextStageKey =
    stageOrder.find((k) => !stageDone[k]) ?? stageOrder[stageOrder.length - 1];

  // ── Today snapshot ──────────────────────────────────────────────────────
  const newPreCases = (preCases ?? []).filter(
    (p) => p.status === "pending" && !p.read_at,
  ).length;
  const inFlight = (preCases ?? []).filter(
    (p) => !!p.qualified_at && !p.promoted_case_id,
  ).length;
  const activeCases = cases.filter((c) => c.stage !== "decision").length;

  const hasSnapshot =
    !isLoading && (newPreCases > 0 || inFlight > 0 || activeCases > 0);

  // ── Date & folio meta ───────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const dateLabel = today.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // ── Handlers ────────────────────────────────────────────────────────────
  const onCopyLink = async () => {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
    } catch {
      /* swallow — older browsers */
    }
    setLinkShared(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(SHARED_FLAG_KEY, "1");
    }
  };

  // -----------------------------------------------------------------------------

  return (
    <div className="space-y-14">
      {/* ───── Folio header strip ─────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="editorial-eyebrow">
            <span>
              Folio Nº 001 · Today
              {org?.name ? ` · ${org.name}` : ""}
            </span>
          </p>
          <p className="editorial-meta hidden sm:block">{dateLabel}</p>
        </div>

        <h1
          className="font-heading mt-7 max-w-[20ch] font-normal leading-[1.02] tracking-[-1.4px] text-foreground"
          style={{ fontSize: "clamp(2.4rem, 4.8vw, 3.8rem)" }}
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
                    stroke="url(#dash-under)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="dash-under" x1="0" x2="1">
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
              A fresh{" "}
              <em className="not-italic bg-gradient-to-r from-[color:var(--purple)] to-[color:var(--purple-deep)] bg-clip-text text-transparent">
                page
              </em>
              .
            </>
          )}
        </h1>

        <p className="mt-6 max-w-[58ch] text-[15.5px] leading-[1.7] text-muted-foreground">
          {allStagesDone ? (
            <>
              Your practice has run the full intake loop. Below: what&apos;s
              moving across your desk today.
            </>
          ) : (
            <>
              Your workspace is ready. Below is the path to your first
              signed case — four honest steps, no theatre.
            </>
          )}
        </p>

        {/* Trust strip */}
        <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-2 text-[12.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[color:var(--purple)]" />
            <span className="font-medium text-foreground">Live intake</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[color:var(--purple)]/60" />
            OMARA-aligned
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[color:var(--purple)]/60" />
            Australian data residency
          </span>
        </div>
      </motion.header>

      <div className="editorial-rule" />

      {/* ───── The Path — four honest stages to your first case ─────── */}
      {!allStagesDone && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.05 }}
        >
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="editorial-eyebrow">
                <span>The path · {stagesDoneCount} of 4</span>
              </p>
              <h2 className="font-heading mt-4 text-[28px] font-normal leading-[1.1] tracking-[-0.02em] text-foreground">
                Your first case, in four moves.
              </h2>
            </div>
            <ProgressDial
              done={stagesDoneCount}
              total={stageOrder.length}
            />
          </div>

          <div className="mt-10 grid gap-3">
            {stageOrder.map((key, idx) => {
              const stage = STAGE_CONTENT[key];
              const isDone = stageDone[key];
              const isNext = !isDone && key === nextStageKey;
              return (
                <PathStage
                  key={key}
                  index={idx}
                  title={stage.title}
                  caption={stage.caption}
                  done={isDone}
                  next={isNext}
                  loading={isLoading}
                  primary={
                    isNext
                      ? renderStageAction(key, {
                          onCopyLink,
                          publicLink,
                          hasQuestionnaire: !!featuredQuestionnaire,
                        })
                      : null
                  }
                  secondary={renderStageStatus(key, {
                    totalSubmissions,
                    inboxCount: (preCases ?? []).length,
                    casesCount: cases.length,
                    questionnairesCount: (questionnaires ?? []).length,
                  })}
                />
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ───── Today's desk — only when something to show ─────────── */}
      {(hasSnapshot || allStagesDone) && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
        >
          <div className="editorial-rule mb-10" />
          <p className="editorial-eyebrow">
            <span>Today on your desk</span>
          </p>
          <h2 className="font-heading mt-4 text-[26px] font-normal leading-[1.1] tracking-[-0.02em] text-foreground">
            What&apos;s <em className="not-italic bg-gradient-to-r from-[color:var(--purple)] to-[color:var(--purple-deep)] bg-clip-text text-transparent">moving</em>.
          </h2>

          <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
            <DeskCell
              n="01"
              label="New in inbox"
              value={newPreCases}
              hint={
                newPreCases === 0
                  ? "Nothing new yet — quiet desk"
                  : newPreCases === 1
                    ? "One submission to triage"
                    : `${newPreCases} submissions to triage`
              }
              href="/dashboard/inbox"
              loading={isLoading}
            />
            <DeskCell
              n="02"
              label="Pre-cases in flight"
              value={inFlight}
              hint={
                inFlight === 0
                  ? "Awaiting your first qualification"
                  : "In progress towards conversion"
              }
              href="/dashboard/precases"
              loading={isLoading}
            />
            <DeskCell
              n="03"
              label="Active cases"
              value={activeCases}
              hint={
                activeCases === 0
                  ? "Open one by promoting a pre-case"
                  : activeCases === 1
                    ? "One case in flight"
                    : `${activeCases} cases in flight`
              }
              href="/dashboard/cases"
              loading={isLoading}
            />
          </div>
        </motion.section>
      )}

      {/* ───── How it works — guide card ─────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease, delay: 0.18 }}
      >
        <div className="editorial-rule mb-10" />

        <Link
          href="/dashboard/how-it-works"
          className="group relative block overflow-hidden rounded-3xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-[color:var(--purple)]/30 hover:shadow-[0_28px_60px_-32px_color-mix(in_srgb,var(--purple)_55%,transparent)]"
        >
          {/* Atmospheric backdrop */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-24 h-[420px] w-[420px] rounded-full bg-[color:var(--purple)]/[0.10] blur-3xl" />
            <div className="absolute -bottom-32 -left-16 h-[340px] w-[340px] rounded-full bg-[color:var(--purple-deep)]/[0.07] blur-3xl" />
            <svg className="absolute inset-0 h-full w-full opacity-[0.025]" aria-hidden>
              <defs>
                <pattern id="dash-grid" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#7C5CFC" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dash-grid)" />
            </svg>
          </div>

          <div className="relative grid items-stretch gap-10 p-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-10">
            <div className="min-w-0">
              <p className="editorial-eyebrow">
                <span>The Atelier · Guide</span>
              </p>
              <h3
                className="font-heading mt-4 max-w-[18ch] font-normal leading-[1.05] tracking-[-0.025em] text-foreground"
                style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)" }}
              >
                How <em className="not-italic bg-gradient-to-r from-[color:var(--purple)] to-[color:var(--purple-deep)] bg-clip-text text-transparent">IMMI-PULSE</em> works.
              </h3>
              <p className="mt-4 max-w-[58ch] text-[14.5px] leading-[1.7] text-muted-foreground">
                A short illustrated walkthrough of the way intake, pre-cases,
                engagement letters and cases flow together. Read once, refer
                back from <span className="font-medium text-foreground">Settings</span> any time.
              </p>

              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
                <span>I · The Loop</span>
                <span>II · Intake</span>
                <span>III · Pre-cases</span>
                <span>IV · Engagement</span>
                <span>V · Cases</span>
                <span>VI · Manual overrides</span>
              </div>

              <div className="mt-8 inline-flex items-center gap-2 text-[14px] font-medium text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">
                Read the guide
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            <div className="relative hidden self-stretch border-l border-border/60 sm:block">
              <div className="flex h-full min-w-[180px] flex-col justify-between p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
                  Reading time
                </p>
                <p className="font-heading text-[44px] font-medium leading-none tabular-nums text-foreground">
                  6′
                </p>
                <div className="space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
                    Last revised
                  </p>
                  <p className="font-mono text-[10.5px] text-foreground/80">
                    {today.getFullYear()}-05
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </motion.section>

      {/* ───── Footer trust line ────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease, delay: 0.25 }}
        className="pt-2"
      >
        <div className="editorial-rule mb-6" />
        <p className="text-[12.5px] leading-[1.65] text-muted-foreground">
          <span className="font-medium text-foreground">Hosted in Sydney.</span>{" "}
          Australian data residency, encrypted end-to-end, Privacy Act 1988
          aligned. Anything you store here stays within Australia&apos;s
          jurisdiction.
        </p>
      </motion.footer>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Stage content + render helpers
// -----------------------------------------------------------------------------

const STAGE_CONTENT: Record<
  "share" | "received" | "engaged" | "converted",
  { title: string; caption: string }
> = {
  share: {
    title: "Share your intake link",
    caption:
      "Add it to your website, Instagram bio, or email signature. Prospects fill it in — no login required.",
  },
  received: {
    title: "Receive your first submission",
    caption:
      "Each lands in your Inbox with an AI-summary, an outcome read, and the prospect's answers in full.",
  },
  engaged: {
    title: "Send the engagement letter",
    caption:
      "Auto-drafted from your fee schedule. Client signs with a 6-digit PIN — every step has a manual fallback.",
  },
  converted: {
    title: "Convert to a case",
    caption:
      "Track stages, gather documents through a secure portal, and bill in checkpoints — all in one place.",
  },
};

function renderStageAction(
  key: keyof typeof STAGE_CONTENT,
  ctx: { onCopyLink: () => void; publicLink: string; hasQuestionnaire: boolean },
) {
  if (key === "share") {
    if (!ctx.hasQuestionnaire) {
      return {
        kind: "link" as const,
        label: "Build a questionnaire",
        href: "/dashboard/questionnaires/new",
      };
    }
    return {
      kind: "copy" as const,
      label: "Copy public link",
      onClick: ctx.onCopyLink,
      hint: ctx.publicLink,
    };
  }
  if (key === "received") {
    return {
      kind: "link" as const,
      label: "Open inbox",
      href: "/dashboard/inbox",
    };
  }
  if (key === "engaged") {
    return {
      kind: "link" as const,
      label: "Go to pre-cases",
      href: "/dashboard/precases",
    };
  }
  return {
    kind: "link" as const,
    label: "Go to cases",
    href: "/dashboard/cases",
  };
}

function renderStageStatus(
  key: keyof typeof STAGE_CONTENT,
  ctx: {
    totalSubmissions: number;
    inboxCount: number;
    casesCount: number;
    questionnairesCount: number;
  },
) {
  if (key === "share") {
    if (ctx.totalSubmissions > 0)
      return `${ctx.totalSubmissions} submission${ctx.totalSubmissions === 1 ? "" : "s"} received`;
    return ctx.questionnairesCount > 0
      ? `${ctx.questionnairesCount} form${ctx.questionnairesCount === 1 ? "" : "s"} ready to share`
      : "No public form yet";
  }
  if (key === "received") {
    return ctx.inboxCount === 0
      ? "Awaiting first submission"
      : `${ctx.inboxCount} in your inbox`;
  }
  if (key === "engaged") {
    return "Letters & signatures live here";
  }
  return ctx.casesCount === 0
    ? "Opens automatically once you promote a pre-case"
    : `${ctx.casesCount} case${ctx.casesCount === 1 ? "" : "s"} open`;
}

// -----------------------------------------------------------------------------
// Building blocks
// -----------------------------------------------------------------------------

type StageAction =
  | { kind: "link"; label: string; href: string }
  | { kind: "copy"; label: string; onClick: () => void; hint?: string }
  | null;

function PathStage({
  index,
  title,
  caption,
  done,
  next,
  loading,
  primary,
  secondary,
}: {
  index: number;
  title: string;
  caption: string;
  done: boolean;
  next: boolean;
  loading: boolean;
  primary: StageAction;
  secondary: string;
}) {
  return (
    <article
      className={cn(
        "group relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-6 gap-y-3 rounded-2xl border bg-card p-6 transition-all sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-7",
        done
          ? "border-[color:var(--teal)]/30 bg-[color:var(--teal)]/[0.025]"
          : next
            ? "border-[color:var(--purple)]/35 shadow-[0_18px_50px_-30px_color-mix(in_srgb,var(--purple)_60%,transparent)]"
            : "border-border",
      )}
    >
      {/* Roman numeral marker */}
      <div className="row-span-2 flex h-12 w-12 shrink-0 flex-col items-center justify-center self-start sm:row-span-1">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
            done
              ? "bg-[color:var(--teal)]/12 text-[color:var(--teal)]"
              : next
                ? "bg-[color:var(--purple)]/10 text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]"
                : "bg-muted/70 text-muted-foreground",
          )}
        >
          {done ? (
            <Check className="h-5 w-5" strokeWidth={2.4} />
          ) : (
            <span className="font-heading text-[18px] font-medium leading-none">
              {ROMAN[index]}
            </span>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="font-heading text-[18px] font-normal leading-tight tracking-[-0.01em] text-foreground">
            {title}
          </h3>
          {!loading &&
            (done ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--teal)]/30 bg-[color:var(--teal)]/8 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--teal)]">
                Done
              </span>
            ) : next ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--purple)]/35 bg-[color:var(--purple)]/8 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">
                Next
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                Waiting
              </span>
            ))}
        </div>

        <p className="mt-2 max-w-[62ch] text-[13.5px] leading-[1.7] text-muted-foreground">
          {caption}
        </p>

        <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/70">
          {loading ? "Reading desk…" : secondary}
        </p>
      </div>

      <div className="mt-1 sm:mt-0 sm:self-center">
        {primary ? renderPrimaryButton(primary) : null}
      </div>
    </article>
  );
}

function renderPrimaryButton(primary: NonNullable<StageAction>) {
  if (primary.kind === "link") {
    return (
      <Link
        href={primary.href}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-[color:var(--purple)] bg-[color:var(--purple)] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_-10px_rgba(124,92,252,0.55)] transition-all hover:border-[color:var(--purple-deep)] hover:bg-[color:var(--purple-deep)]"
      >
        {primary.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    );
  }
  return (
    <CopyLinkButton
      label={primary.label}
      onClick={primary.onClick}
      hint={primary.hint}
    />
  );
}

function CopyLinkButton({
  label,
  onClick,
  hint,
}: {
  label: string;
  onClick: () => void;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        onClick();
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      title={hint}
      className="group/btn inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-[color:var(--purple)] bg-[color:var(--purple)] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_-10px_rgba(124,92,252,0.55)] transition-all hover:border-[color:var(--purple-deep)] hover:bg-[color:var(--purple-deep)]"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
          Link copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </button>
  );
}

function ProgressDial({ done, total }: { done: number; total: number }) {
  const pct = Math.max(0, Math.min(1, total === 0 ? 0 : done / total));
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative hidden h-16 w-16 shrink-0 sm:block">
      <svg viewBox="0 0 56 56" className="h-16 w-16 -rotate-90">
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="3"
        />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="url(#dial-grad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)" }}
        />
        <defs>
          <linearGradient id="dial-grad" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--purple)" />
            <stop offset="100%" stopColor="var(--purple-deep)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-[16px] font-medium leading-none tabular-nums text-foreground">
          {done}
        </span>
        <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.25em] text-muted-foreground">
          of {total}
        </span>
      </div>
    </div>
  );
}

function DeskCell({
  n,
  label,
  value,
  hint,
  href,
  loading,
}: {
  n: string;
  label: string;
  value: number;
  hint: string;
  href: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between gap-6 bg-card p-6 transition-colors hover:bg-[color:var(--purple)]/[0.025]"
    >
      <div className="flex items-start justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
          {label}
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/45">
          {n}
        </span>
      </div>
      <div>
        <p
          className={cn(
            "font-heading text-[52px] font-medium leading-[0.95] tracking-[-2px] tabular-nums",
            value === 0 ? "text-muted-foreground/35" : "text-foreground",
          )}
        >
          {loading ? "—" : value}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[12.5px] leading-snug text-muted-foreground">
            {hint}
          </p>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[color:var(--purple-deep)] dark:group-hover:text-[color:var(--purple-light)]" />
        </div>
      </div>
    </Link>
  );
}

// (icon imports kept for symmetry — used by neighbouring pages and may be
// used as the page is extended with additional empty-state callouts.)
void [BookOpen, ClipboardCheck, ExternalLink, FileSignature, InboxIcon, Sparkles];
