"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  AtSign,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  ExternalLink,
  FileSignature,
  Info,
  Loader2,
  Mail,
  MailCheck,
  MailWarning,
  MoreVertical,
  RefreshCw,
  Send,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fadeUp, stagger } from "@/lib/motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  preCasesApi,
  lettersApi,
  paymentsApi,
  type PreCaseDetail,
  type LetterOut,
  type PaymentRecord,
  type FeeLine,
  type PaymentMethod,
  type SendLetterResponse,
} from "@/lib/api/services";
import { cn } from "@/lib/utils";
import { useAppRefresh } from "@/lib/use-app-refresh";

const OUTCOME_LABEL: Record<string, { label: string; tone: string; dot: string }> = {
  likely_fit: {
    label: "Likely fit",
    tone: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  needs_info: {
    label: "Needs info",
    tone: "border-amber-500/30 bg-amber-500/[0.08] text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  paid_consult: {
    label: "Paid consult",
    tone: "border-[color:var(--purple)]/30 bg-[color:var(--purple)]/[0.08] text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]",
    dot: "bg-[color:var(--purple)]",
  },
  unlikely_fit: {
    label: "Unlikely fit",
    tone: "border-rose-500/30 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

type Stage = "inbox" | "qualified" | "letter_sent" | "letter_signed" | "paid" | "converted" | "archived";

function stageOf(status: string): Stage {
  if (status === "pending" || status === "in_review") return "inbox";
  if (status === "qualified") return "qualified";
  if (status === "letter_sent") return "letter_sent";
  if (status === "letter_signed") return "letter_signed";
  if (status === "paid") return "paid";
  if (status === "converted") return "converted";
  return "archived";
}

const STAGE_ORDER: Stage[] = ["inbox", "qualified", "letter_sent", "letter_signed", "paid", "converted"];
const STAGE_LABELS: Record<Stage, string> = {
  inbox: "Inbox",
  qualified: "Qualified",
  letter_sent: "Letter sent",
  letter_signed: "Signed",
  paid: "Paid",
  converted: "Case open",
  archived: "Archived",
};

export function PreCaseDetail({ precaseId }: { precaseId: string }) {
  const router = useRouter();
  const [pc, setPc] = useState<PreCaseDetail | null>(null);
  const [letter, setLetter] = useState<LetterOut | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Modals
  const [showLetterCompose, setShowLetterCompose] = useState(false);
  const [showLetterSent, setShowLetterSent] = useState<SendLetterResponse | null>(null);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showSkipPayment, setShowSkipPayment] = useState(false);
  const [showMarkSignedManual, setShowMarkSignedManual] = useState(false);
  const [showForceConvert, setShowForceConvert] = useState(false);

  const load = useCallback(async () => {
    const detail = await preCasesApi.get(precaseId);
    setPc(detail);
    const [lt, pays] = await Promise.all([
      lettersApi.getForPreCase(precaseId).catch(() => null),
      paymentsApi.list({ pre_case_id: precaseId }).catch(() => []),
    ]);
    setLetter(lt);
    setPayments(pays);
    setLoading(false);
  }, [precaseId]);

  useEffect(() => {
    load();
  }, [load]);

  useAppRefresh(load);

  if (loading || !pc) {
    return (
      <div className="relative min-h-[60vh]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_-5%,rgba(124,92,252,0.08),transparent_70%)]" />
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-3 h-4 w-4 animate-spin text-[color:var(--purple)]" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em]">
            Loading folio…
          </span>
        </div>
      </div>
    );
  }

  const stage = stageOf(pc.status);
  const outcome = pc.ai_suggested_outcome ? OUTCOME_LABEL[pc.ai_suggested_outcome] : null;
  const fieldByKey = new Map((pc.questionnaire_fields || []).map((f) => [f.key, f.label]));

  // Distinguish real AI vs heuristic fallback so the consultant knows what
  // they're looking at. The fallback summary always starts with this exact
  // sentence (see precases/triage.py::_heuristic_fallback).
  const aiSummary = pc.ai_summary || "";
  const isHeuristic =
    aiSummary.startsWith("Prospect submitted answers") ||
    (typeof pc.ai_confidence === "number" && pc.ai_confidence <= 0.3);
  const aiPending = pc.ai_status === "pending" || pc.ai_status === "running";
  const aiDone = pc.ai_status === "succeeded";

  const displayName =
    pc.client_name || pc.client_email?.split("@")[0] || "Anonymous prospect";

  const qualify = async () => {
    setBusy(true);
    try {
      const updated = await preCasesApi.qualify(pc.id);
      setPc(updated);
      router.push(`/dashboard/precases/${pc.id}`);
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!confirm("Archive this pre-case? You can find it in archived later.")) return;
    setBusy(true);
    try {
      await preCasesApi.archive(pc.id);
      router.push(stage === "inbox" ? "/dashboard/inbox" : "/dashboard/precases");
    } finally {
      setBusy(false);
    }
  };

  const promote = async () => {
    setBusy(true);
    try {
      const result = await preCasesApi.promote(pc.id);
      router.push(`/dashboard/cases/${result.case_id}`);
    } finally {
      setBusy(false);
    }
  };

  const retriggerAi = async () => {
    setBusy(true);
    try {
      await preCasesApi.retriggerAi(pc.id);
      setTimeout(load, 1500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      {/* Atmospheric backdrop — purple radial + faint grid, scoped to the hero */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-[460px] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(124,92,252,0.10),transparent_70%)]" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.04]" aria-hidden>
          <defs>
            <pattern
              id="ip-detail-grid"
              x="0"
              y="0"
              width="56"
              height="56"
              patternUnits="userSpaceOnUse"
            >
              <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#7C5CFC" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ip-detail-grid)" />
        </svg>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative space-y-10"
      >
        {/* ── Editorial breadcrumb ── */}
        <motion.nav
          variants={fadeUp}
          className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/70"
        >
          <Link
            href={stage === "inbox" ? "/dashboard/inbox" : "/dashboard/precases"}
            className="transition-colors hover:text-foreground"
          >
            {stage === "inbox" ? "Inbox" : "Pre-cases"}
          </Link>
          <span className="opacity-40">/</span>
          <span className="text-foreground/80">Detail</span>
        </motion.nav>

        {/* ── Hero header ── */}
        <motion.section
          variants={fadeUp}
          className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"
        >
          <div className="min-w-0">
            <p className="editorial-eyebrow">
              <span>Folio Nº 002 · Intake</span>
            </p>

            <h1
              className="font-heading title-accent mt-5 max-w-[18ch] font-normal leading-[1.02] tracking-[-0.025em] text-foreground"
              style={{ fontSize: "clamp(2.4rem, 4vw, 3.4rem)" }}
            >
              {displayName}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted-foreground">
              {pc.client_email && (
                <span className="inline-flex items-center gap-1.5">
                  <AtSign className="h-3.5 w-3.5 opacity-60" />
                  {pc.client_email}
                </span>
              )}
              {pc.questionnaire_name && (
                <>
                  <span className="opacity-30">·</span>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em]">
                    {pc.questionnaire_name}
                  </span>
                </>
              )}
              {pc.submitted_at && (
                <>
                  <span className="opacity-30">·</span>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em]">
                    Submitted{" "}
                    {new Date(pc.submitted_at).toLocaleDateString("en-AU", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </>
              )}
            </div>

            {outcome && (
              <div className="mt-5">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium",
                    outcome.tone,
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", outcome.dot)} />
                  {outcome.label}
                  {typeof pc.ai_confidence === "number" && (
                    <span className="font-mono text-[10px] tracking-[0.15em] opacity-70">
                      · {Math.round(pc.ai_confidence * 100)}%
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Action cluster — primary CTA gets prominence, overrides tucked behind kebab */}
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {stage === "converted" && pc.promoted_case_id && (
              <Button asChild className="h-10 gap-2 rounded-xl px-5">
                <Link href={`/dashboard/cases/${pc.promoted_case_id}`}>
                  Open case <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {stage === "inbox" && (
              <Button
                onClick={qualify}
                disabled={busy}
                className="h-10 gap-2 rounded-xl border-2 border-[color:var(--purple)] bg-[color:var(--purple)] px-5 text-white shadow-[0_10px_24px_-10px_rgba(124,92,252,0.5)] hover:border-[color:var(--purple-deep)] hover:bg-[color:var(--purple-deep)]"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Mark qualified
              </Button>
            )}

            {stage === "qualified" && (
              <Button
                onClick={() => setShowLetterCompose(true)}
                className="h-10 gap-2 rounded-xl px-5"
              >
                <FileSignature className="h-4 w-4" />
                Send engagement letter
              </Button>
            )}

            {stage === "letter_sent" && (
              <Button
                variant="outline"
                onClick={() => setShowMarkSignedManual(true)}
                className="h-10 gap-2 rounded-xl px-5"
              >
                <CheckCheck className="h-4 w-4" />
                Mark signed manually
              </Button>
            )}

            {stage === "letter_signed" && (
              <Button
                onClick={() => setShowRecordPayment(true)}
                className="h-10 gap-2 rounded-xl px-5"
              >
                <Wallet className="h-4 w-4" />
                Record payment
              </Button>
            )}

            {stage === "paid" && (
              <Button
                onClick={promote}
                disabled={busy}
                className="h-10 gap-2 rounded-xl px-5"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Convert to case
              </Button>
            )}

            {stage !== "converted" && stage !== "archived" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={busy}
                    className="h-10 w-10 rounded-xl"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="text-xs">
                    Manual overrides
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {stage !== "letter_signed" && stage !== "paid" && (
                    <DropdownMenuItem onClick={() => setShowMarkSignedManual(true)}>
                      Mark letter signed manually
                    </DropdownMenuItem>
                  )}
                  {stage !== "paid" && (
                    <DropdownMenuItem onClick={() => setShowSkipPayment(true)}>
                      Skip payment (relative / pro-bono)
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setShowForceConvert(true)}>
                    Force convert to case
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={retriggerAi}>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Re-run AI triage
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={archive} className="text-destructive">
                    <Archive className="mr-2 h-3.5 w-3.5" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </motion.section>

        {/* Hairline rule */}
        <motion.div variants={fadeUp} className="editorial-rule" />

        {/* ── Stage stepper ── */}
        <motion.div variants={fadeUp}>
          <StageStepper stage={stage} />
        </motion.div>

        {/* ── Two-column layout ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left column — AI intelligence + answers */}
          <motion.div variants={fadeUp} className="space-y-6">
            {/* AI Intelligence panel */}
            <div className="relative overflow-hidden rounded-2xl border border-[color:var(--purple)]/20 bg-gradient-to-br from-[color:var(--purple)]/[0.05] via-card to-card">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[color:var(--purple)]/12 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-[color:var(--teal-light)]/10 blur-3xl" />

              <div className="relative p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <p className="editorial-eyebrow">
                    <Sparkles className="h-3 w-3" />
                    <span>AI Triage</span>
                  </p>

                  {aiPending && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/[0.08] px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      Running
                    </span>
                  )}
                  {!aiPending && aiDone && isHeuristic && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/[0.08] px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-amber-800 dark:text-amber-300">
                      Heuristic fallback
                    </span>
                  )}
                  {!aiPending && aiDone && !isHeuristic && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Claude · Bedrock
                    </span>
                  )}
                </div>

                <p className="mt-6 max-w-[62ch] text-[15.5px] leading-[1.7] text-foreground/90">
                  {pc.ai_summary || "Awaiting AI analysis…"}
                </p>

                {/* Confidence meter */}
                {typeof pc.ai_confidence === "number" && (
                  <div className="mt-6 max-w-md">
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
                      <span>Confidence</span>
                      <span className="text-foreground/80">
                        {Math.round(pc.ai_confidence * 100)}%
                      </span>
                    </div>
                    <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-foreground/8">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pc.ai_confidence * 100}%` }}
                        transition={{
                          duration: 0.95,
                          delay: 0.4,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={cn(
                          "h-full rounded-full",
                          isHeuristic
                            ? "bg-gradient-to-r from-amber-400 to-amber-500"
                            : "bg-gradient-to-r from-[color:var(--purple)] to-[color:var(--purple-deep)]",
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Extracted facts */}
                {pc.ai_extracted && Object.keys(pc.ai_extracted).length > 0 && (
                  <>
                    <div className="editorial-rule mt-8" />
                    <div className="mt-7">
                      <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                        Extracted facts
                      </p>
                      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(pc.ai_extracted).map(([k, v]) => (
                          <div key={k} className="min-w-0">
                            <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground/70">
                              {k.replace(/_/g, " ")}
                            </dt>
                            <dd className="mt-1.5 truncate font-heading text-[16px] font-medium leading-tight text-foreground">
                              {String(v ?? "—")}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </>
                )}

                {/* Heuristic notice — explain what the consultant is seeing */}
                {!aiPending && aiDone && isHeuristic && (
                  <div className="mt-7 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3.5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-amber-900 dark:text-amber-200">
                        AI gateway not configured — showing heuristic match
                      </p>
                      <p className="mt-1 max-w-[60ch] text-[12.5px] leading-relaxed text-amber-800/85 dark:text-amber-300/80">
                        Add AWS Bedrock credentials to enable Claude analysis with
                        plain-English summaries, structured extraction, and
                        proper confidence scoring on every submission.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-7 flex items-center gap-5">
                  <button
                    onClick={retriggerAi}
                    disabled={busy}
                    className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--purple-deep)] transition-colors hover:text-[color:var(--purple)] disabled:opacity-50 dark:text-[color:var(--purple-light)]"
                  >
                    <RefreshCw className={cn("h-3 w-3", busy && "animate-spin")} />
                    Re-run triage
                  </button>
                </div>
              </div>
            </div>

            {/* Questionnaire answers */}
            {Object.keys(pc.answers).length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
                  <p className="editorial-eyebrow">
                    <ClipboardCheck className="h-3 w-3" />
                    <span>Submitted answers</span>
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                    {Object.keys(pc.answers).length}{" "}
                    {Object.keys(pc.answers).length === 1 ? "field" : "fields"}
                  </span>
                </div>
                <dl className="divide-y divide-border/60">
                  {Object.entries(pc.answers).map(([key, value]) => (
                    <div
                      key={key}
                      className="grid gap-1.5 px-6 py-5 transition-colors hover:bg-muted/30 sm:grid-cols-[220px_1fr] sm:gap-8"
                    >
                      <dt className="pt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85">
                        {fieldByKey.get(key) || key}
                      </dt>
                      <dd className="text-[14.5px] leading-[1.6] text-foreground">
                        {Array.isArray(value)
                          ? value.join(", ")
                          : typeof value === "boolean"
                            ? value
                              ? "Yes"
                              : "No"
                            : String(value ?? "—")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </motion.div>

          {/* Right column — lifecycle status */}
          <motion.div variants={fadeUp} className="space-y-4">
            {/* Engagement letter */}
            {(stage === "qualified" ||
              stage === "letter_sent" ||
              stage === "letter_signed" ||
              stage === "paid" ||
              stage === "converted") && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="editorial-eyebrow">
                    <FileSignature className="h-3 w-3" />
                    <span>Engagement letter</span>
                  </p>
                  {letter?.status === "signed" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                      Signed
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {!letter && stage === "qualified" && (
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      No letter sent yet. Compose and send to unlock the next
                      stage.
                    </p>
                  )}
                  {letter && (
                    <>
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        {letter.status === "sent" && "Awaiting client signature."}
                        {letter.status === "signed" &&
                          `Signed ${letter.signed_at ? new Date(letter.signed_at).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : ""}.`}
                        {letter.status === "voided" && "Voided."}
                        {letter.status === "superseded" &&
                          "Replaced by newer letter."}
                      </p>
                      {letter.sign_url && letter.status === "sent" && (
                        <SignLinkBlock
                          letterId={letter.id}
                          signUrl={letter.sign_url}
                          signPin={letter.sign_pin}
                          expiresAt={letter.sign_link_expires_at}
                        />
                      )}
                      {pc.skipped_letter && (
                        <p className="text-[11.5px] leading-relaxed text-amber-700 dark:text-amber-400">
                          ⚠ {pc.skipped_letter}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Payments */}
            {(stage === "letter_signed" ||
              stage === "paid" ||
              stage === "converted") && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="editorial-eyebrow">
                    <Wallet className="h-3 w-3" />
                    <span>Payments</span>
                  </p>
                  {payments.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                      Received
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  {payments.length === 0 ? (
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      No payment recorded yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {payments.map((p) => (
                        <li
                          key={p.id}
                          className="rounded-xl border border-border/60 bg-muted/20 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-heading text-[15px] font-semibold text-foreground">
                              A${p.amount_aud}
                            </span>
                            <span className="rounded-full border border-border/70 bg-card px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
                              {p.method.replace("_", " ")}
                            </span>
                          </div>
                          {p.reference && (
                            <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                              Ref: {p.reference}
                            </p>
                          )}
                          {p.notes && (
                            <p className="mt-1 text-[11.5px] italic text-muted-foreground/90">
                              {p.notes}
                            </p>
                          )}
                          <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground/70">
                            {p.receipt_number} ·{" "}
                            {new Date(p.received_at).toLocaleDateString("en-AU", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pc.skipped_payment && (
                    <p className="text-[11.5px] leading-relaxed text-amber-700 dark:text-amber-400">
                      ⚠ {pc.skipped_payment}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Client */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="editorial-eyebrow">
                <User className="h-3 w-3" />
                <span>Client</span>
              </p>

              <div className="mt-5 flex items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[color:var(--purple)] to-[color:var(--purple-deep)] font-heading text-[16px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(124,92,252,0.6)]">
                  {(pc.client_name || pc.client_email || "?")
                    .slice(0, 1)
                    .toUpperCase()}
                  <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-foreground">
                    {pc.client_name || "—"}
                  </p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {pc.client_email || "—"}
                  </p>
                </div>
              </div>

              {pc.client_id && (
                <Link
                  href={`/dashboard/clients/${pc.client_id}`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-[12.5px] font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-foreground/[0.03]"
                >
                  View client profile
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Modals */}
      <LetterComposeDialog
        open={showLetterCompose}
        onClose={() => setShowLetterCompose(false)}
        precaseId={pc.id}
        clientName={pc.client_name || ""}
        clientEmail={pc.client_email || ""}
        defaultVisaSubclass={String(pc.ai_extracted?.visa_interest || pc.ai_extracted?.visa_subclass || "")}
        onSent={(result) => {
          setShowLetterCompose(false);
          setShowLetterSent(result);
          load();
        }}
      />
      <LetterSentDialog
        open={!!showLetterSent}
        info={showLetterSent}
        onClose={() => setShowLetterSent(null)}
      />
      <RecordPaymentDialog
        open={showRecordPayment}
        onClose={() => setShowRecordPayment(false)}
        precaseId={pc.id}
        onRecorded={() => {
          setShowRecordPayment(false);
          load();
        }}
      />
      <SkipPaymentDialog
        open={showSkipPayment}
        onClose={() => setShowSkipPayment(false)}
        precaseId={pc.id}
        onSkipped={() => {
          setShowSkipPayment(false);
          load();
        }}
      />
      <MarkSignedManualDialog
        open={showMarkSignedManual}
        onClose={() => setShowMarkSignedManual(false)}
        precaseId={pc.id}
        clientName={pc.client_name || ""}
        onMarked={() => {
          setShowMarkSignedManual(false);
          load();
        }}
      />
      <ForceConvertDialog
        open={showForceConvert}
        onClose={() => setShowForceConvert(false)}
        precaseId={pc.id}
        onConverted={(caseId) => {
          setShowForceConvert(false);
          router.push(`/dashboard/cases/${caseId}`);
        }}
      />
    </div>
  );
}

function StageStepper({ stage }: { stage: Stage }) {
  if (stage === "archived") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-5 text-center">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
          Pre-case archived
        </p>
      </div>
    );
  }

  const currentIndex = STAGE_ORDER.indexOf(stage);
  // Progress goes from the centre of the first node to the centre of the
  // current node — calculated as a percentage of the full track.
  const segments = STAGE_ORDER.length - 1;
  const progressPct = segments === 0 ? 0 : (currentIndex / segments) * 100;

  return (
    <div className="relative rounded-2xl border border-border bg-card px-4 pb-5 pt-7 sm:px-8">
      <div className="relative">
        {/* Track + filled progress — positioned at the node centre row */}
        <div className="pointer-events-none absolute left-3.5 right-3.5 top-[14px] h-[1.5px] bg-foreground/10 sm:left-4 sm:right-4" />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.85, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute left-3.5 top-[14px] h-[1.5px] bg-gradient-to-r from-[color:var(--purple)] via-[color:var(--purple-deep)] to-[color:var(--purple)] sm:left-4"
          style={{ maxWidth: "calc(100% - 28px)" }}
        />

        <ol className="relative grid grid-cols-6 gap-2">
          {STAGE_ORDER.map((s, i) => {
            const isDone = i < currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <li
                key={s}
                className="flex flex-col items-center gap-3 text-center"
              >
                <div
                  className={cn(
                    "relative flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] bg-background transition-all duration-300",
                    isDone &&
                      "border-[color:var(--purple)] bg-[color:var(--purple)] text-white shadow-[0_4px_14px_-4px_rgba(124,92,252,0.55)]",
                    isCurrent &&
                      "border-[color:var(--purple)] text-[color:var(--purple-deep)] shadow-[0_0_0_4px_rgba(124,92,252,0.12)]",
                    !isDone &&
                      !isCurrent &&
                      "border-foreground/15 text-muted-foreground",
                  )}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  ) : (
                    <span className="font-mono text-[10.5px] font-semibold leading-none">
                      {i + 1}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="pointer-events-none absolute inset-[-3px] animate-pulse rounded-full border border-[color:var(--purple)]/30" />
                  )}
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.18em]",
                    isCurrent
                      ? "text-foreground"
                      : isDone
                        ? "text-foreground/70"
                        : "text-muted-foreground/70",
                  )}
                >
                  {STAGE_LABELS[s]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

// ── Modals ──────────────────────────────────────────────────────────────────

/**
 * Editorial section header — Roman numeral + hairline tick + Outfit title.
 * Mirrors the folio language used on the precase detail page.
 */
function ComposeSection({
  index,
  title,
  trailing,
  children,
}: {
  index: string;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.32em] text-[color:var(--purple)]">
            {index}
          </span>
          <span className="block h-px w-5 translate-y-[-3px] bg-[color:var(--purple)]/35" />
          <span className="font-heading text-[13.5px] font-medium tracking-[-0.01em] text-foreground">
            {title}
          </span>
        </div>
        {trailing}
      </div>
      {children}
    </div>
  );
}

/**
 * Borderless input shell — mono uppercase label above, hairline below,
 * purple slide-up bar on focus. The detail that makes the dialog feel typeset.
 */
function ComposeField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground/85">
          {label}
        </p>
        {hint && (
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/45">
            {hint}
          </p>
        )}
      </div>
      <div className="relative">
        {children}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-[color:var(--purple)] transition-transform duration-300 group-focus-within:scale-x-100" />
      </div>
    </div>
  );
}

/**
 * Composition cell — one of the three fee inputs. Big Outfit numerals,
 * mono label above, optional purple ledger rail when accent (the retainer).
 */
function FeeCell({
  label,
  sublabel,
  value,
  onChange,
  accent,
}: {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (v: string) => void;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1.5 px-4 py-3.5 transition-colors",
        accent && "bg-[color:var(--purple)]/[0.025]",
        "focus-within:bg-[color:var(--purple)]/[0.04]",
      )}
    >
      {accent && (
        <div className="pointer-events-none absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-[color:var(--purple)]" />
      )}
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.24em] text-muted-foreground/90">
          {label}
        </p>
        {sublabel && (
          <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted-foreground/55">
            {sublabel}
          </p>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-heading text-[13px] font-medium text-muted-foreground/55">A$</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="w-full bg-transparent font-heading text-[22px] font-medium tracking-[-0.01em] tabular-nums text-foreground outline-none transition-colors placeholder:text-muted-foreground/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}

function LetterComposeDialog({
  open,
  onClose,
  precaseId,
  clientName,
  clientEmail,
  defaultVisaSubclass,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  precaseId: string;
  clientName: string;
  clientEmail: string;
  defaultVisaSubclass: string;
  onSent: (r: SendLetterResponse) => void;
}) {
  const [visaSubclass, setVisaSubclass] = useState(defaultVisaSubclass);
  const [visaName, setVisaName] = useState("");
  const [scope, setScope] = useState("Lodgement of visa application and supporting submissions.");
  const [profFee, setProfFee] = useState("4500");
  const [disbursements, setDisbursements] = useState("1455");
  const [retainer, setRetainer] = useState("1500");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setVisaSubclass(defaultVisaSubclass);
      setError(null);
    }
  }, [open, defaultVisaSubclass]);

  const hasEmail = !!clientEmail;
  const totalQuoted =
    (Number(profFee) || 0) +
    (Number(disbursements) || 0) +
    (Number(retainer) || 0);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const fee_lines: FeeLine[] = [];
      if (Number(profFee) > 0)
        fee_lines.push({ label: "Professional fees", amount_aud: profFee, kind: "professional_fee" });
      if (Number(disbursements) > 0)
        fee_lines.push({ label: "Disbursements (VAC + medicals etc.)", amount_aud: disbursements, kind: "disbursement" });
      if (Number(retainer) > 0)
        fee_lines.push({ label: "Retainer (due now)", amount_aud: retainer, kind: "retainer" });

      const result = await lettersApi.send(precaseId, {
        compose: {
          visa_subclass: visaSubclass || undefined,
          visa_name: visaName || undefined,
          scope,
          fee_lines,
        },
        expires_in_days: 14,
      });
      onSent(result);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { detail?: string } }; message?: string })
          ?.response?.data?.detail ||
        (e as { message?: string })?.message ||
        "Could not send letter. Please try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden border-border/70 p-0 sm:max-w-2xl">
        {/* Required for a11y — the visual header below replaces this */}
        <DialogTitle className="sr-only">Send engagement letter</DialogTitle>
        <DialogDescription className="sr-only">
          Compose the engagement agreement for {clientName || "this client"}.
        </DialogDescription>

        {/* ── Atmospheric backdrop (matches precase detail hero) ── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full bg-[color:var(--purple)]/[0.10] blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-[320px] w-[320px] rounded-full bg-[color:var(--purple-deep)]/[0.07] blur-3xl" />
          <svg className="absolute inset-0 h-full w-full opacity-[0.025]" aria-hidden>
            <defs>
              <pattern
                id="lc-grid"
                x="0"
                y="0"
                width="48"
                height="48"
                patternUnits="userSpaceOnUse"
              >
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#7C5CFC" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lc-grid)" />
          </svg>
        </div>

        <div className="relative z-10 max-h-[88vh] overflow-y-auto">
          {/* ── Folio header ── */}
          <div className="px-8 pt-8 pb-6">
            <p className="editorial-eyebrow">
              <span>Engagement · Composition</span>
            </p>
            <h2 className="mt-4 font-heading text-[28px] font-normal leading-[1.05] tracking-[-0.025em] text-foreground">
              Compose engagement letter
            </h2>
            <p className="mt-3 max-w-prose text-[13.5px] leading-relaxed text-muted-foreground">
              Mint the agreement, dispatch a secure email with a one-time PIN,
              and keep a copyable link as the manual fallback.
            </p>
          </div>

          {/* hairline */}
          <div className="editorial-rule mx-8" />

          {/* ── Destination plate ── */}
          <div className="px-8 pt-6">
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-sm",
                hasEmail ? "border-[color:var(--purple)]/20" : "border-amber-500/30",
              )}
            >
              {hasEmail && (
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[color:var(--purple)]/[0.10] blur-2xl" />
              )}
              <div className="relative flex items-center gap-4 p-4">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    hasEmail
                      ? "bg-[color:var(--purple)] text-white shadow-[0_8px_22px_-8px_rgba(124,92,252,0.55)]"
                      : "bg-amber-500/15 text-amber-600",
                  )}
                >
                  {hasEmail ? <Mail className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground/85">
                    {hasEmail ? "Destination" : "No destination"}
                  </p>
                  <p className="mt-1 truncate font-heading text-[16px] font-medium tracking-[-0.01em] text-foreground">
                    {hasEmail ? clientEmail : "Manual share only"}
                  </p>
                </div>
                {hasEmail && (
                  <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--purple)]/20 bg-background px-2.5 py-1 sm:flex">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--purple)] opacity-60" />
                      <span className="relative h-1.5 w-1.5 rounded-full bg-[color:var(--purple)]" />
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                      via Resend
                    </span>
                  </div>
                )}
              </div>
              <div
                className={cn(
                  "border-t px-4 py-2.5",
                  hasEmail
                    ? "border-[color:var(--purple)]/10 bg-[color:var(--purple)]/[0.025]"
                    : "border-amber-500/15 bg-amber-500/[0.04]",
                )}
              >
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  {hasEmail
                    ? "If delivery fails, the secure link and one-time PIN remain visible so you can share manually."
                    : "We can’t email this client. After sending, you’ll receive a copyable link and PIN to relay via WhatsApp or SMS."}
                </p>
              </div>
            </div>
          </div>

          {/* ── Composition body ── */}
          <div className="space-y-7 px-8 pb-2 pt-7">
            {/* Section I — Matter */}
            <ComposeSection index="I" title="Matter">
              <div className="grid grid-cols-[140px_1fr] gap-5">
                <ComposeField label="Subclass" hint="MR 1994">
                  <input
                    value={visaSubclass}
                    onChange={(e) => setVisaSubclass(e.target.value)}
                    placeholder="482"
                    aria-label="Visa subclass"
                    className="h-11 w-full bg-transparent pb-2 font-heading text-[24px] font-medium tracking-[-0.015em] tabular-nums text-foreground outline-none placeholder:text-muted-foreground/35"
                  />
                </ComposeField>
                <ComposeField label="Visa" hint="Plain English name">
                  <input
                    value={visaName}
                    onChange={(e) => setVisaName(e.target.value)}
                    placeholder="TSS work visa"
                    aria-label="Visa name"
                    className="h-11 w-full bg-transparent pb-2 font-heading text-[20px] font-normal tracking-[-0.01em] text-foreground outline-none placeholder:text-muted-foreground/35"
                  />
                </ComposeField>
              </div>
            </ComposeSection>

            {/* Section II — Scope */}
            <ComposeSection
              index="II"
              title="Scope of work"
              trailing={
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/65">
                  {scope.length}/2000
                </span>
              }
            >
              <Textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                rows={3}
                maxLength={2000}
                aria-label="Scope of work"
                className="resize-none rounded-xl border-border/60 bg-card/60 text-[13.5px] leading-relaxed text-foreground transition-colors placeholder:text-muted-foreground/40 focus-visible:border-[color:var(--purple)]/40 focus-visible:bg-card focus-visible:ring-[3px] focus-visible:ring-[color:var(--purple)]/15"
              />
            </ComposeSection>

            {/* Section III — Composition */}
            <ComposeSection
              index="III"
              title="Composition"
              trailing={
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/65">
                  AUD · GST inc.
                </span>
              }
            >
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-[0_1px_0_rgba(15,17,23,0.02)]">
                <div className="grid grid-cols-3 divide-x divide-border/60">
                  <FeeCell
                    label="Professional"
                    value={profFee}
                    onChange={setProfFee}
                  />
                  <FeeCell
                    label="Disbursements"
                    sublabel="VAC + medicals"
                    value={disbursements}
                    onChange={setDisbursements}
                  />
                  <FeeCell
                    label="Retainer"
                    sublabel="Due now"
                    value={retainer}
                    onChange={setRetainer}
                    accent
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border/60 bg-muted/40 px-4 py-3">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-muted-foreground">
                    Total quoted
                  </p>
                  <p className="font-heading text-[20px] font-medium tracking-[-0.015em] tabular-nums text-foreground">
                    A${totalQuoted.toLocaleString("en-AU")}
                  </p>
                </div>
              </div>
            </ComposeSection>
          </div>

          {/* Error band */}
          {error && (
            <div className="mx-8 mt-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/[0.05] p-3 text-[12.5px] leading-snug text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="mt-7 border-t border-border/70 bg-muted/30 px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
                <span>Expires in 14 days</span>
                <span className="opacity-30">·</span>
                <span className="hidden sm:inline">ETA 1999 (Cth)</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={busy}
                  className="h-10 px-4 text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={send}
                  disabled={busy}
                  className="group relative h-10 gap-2 overflow-hidden rounded-xl border border-[color:var(--purple-deep)]/40 bg-[color:var(--purple)] px-5 text-white shadow-[0_10px_24px_-10px_rgba(124,92,252,0.55)] transition-all hover:bg-[color:var(--purple-deep)] hover:shadow-[0_12px_28px_-10px_rgba(124,92,252,0.7)]"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  />
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="relative">{hasEmail ? "Send letter" : "Generate link"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SignLinkBlock({
  letterId,
  signUrl,
  signPin,
  expiresAt,
}: {
  letterId: string;
  signUrl: string;
  signPin?: string | null;
  expiresAt?: string | null;
}) {
  const [resending, setResending] = useState(false);
  const [resendResult, setResendResult] = useState<{
    status: "sent" | "failed" | "skipped";
    email: string | null;
    error: string | null;
  } | null>(null);

  const resend = async () => {
    setResending(true);
    setResendResult(null);
    try {
      const r = await lettersApi.resendReminder(letterId);
      setResendResult({
        status: r.email_status,
        email: r.client_email,
        error: r.email_error,
      });
    } catch (e) {
      const msg =
        (e as { response?: { data?: { detail?: string } }; message?: string })
          ?.response?.data?.detail ||
        (e as { message?: string })?.message ||
        "Could not resend.";
      setResendResult({ status: "failed", email: null, error: msg });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-2.5 rounded-xl border border-border/70 bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
          Signing link
        </p>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="h-6 gap-1 px-1.5 text-[10.5px]"
        >
          <a href={signUrl} target="_blank" rel="noopener noreferrer">
            <Eye className="h-3 w-3" />
            Preview
          </a>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={signUrl}
          readOnly
          className="h-8 text-[11px]"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          onClick={() => navigator.clipboard.writeText(signUrl)}
        >
          Copy
        </Button>
      </div>

      {signPin && (
        <div className="space-y-1.5">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
            PIN — read this out if email didn&apos;t arrive
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={signPin}
              readOnly
              className="h-8 font-mono text-[13px] tracking-[0.4em]"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0"
              onClick={() => navigator.clipboard.writeText(signPin)}
            >
              Copy
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {expiresAt ? (
          <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground/70">
            Expires{" "}
            {new Date(expiresAt).toLocaleDateString("en-AU", {
              day: "2-digit",
              month: "short",
            })}
          </p>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={resend}
          disabled={resending}
          className="h-7 gap-1.5 px-2 text-[11px]"
        >
          {resending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Mail className="h-3 w-3" />
          )}
          Resend email
        </Button>
      </div>

      {resendResult && (
        <div
          className={cn(
            "flex items-start gap-1.5 rounded-md px-2 py-1.5 text-[11px]",
            resendResult.status === "sent" &&
              "bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300",
            resendResult.status === "failed" &&
              "bg-rose-500/[0.08] text-rose-700 dark:text-rose-300",
            resendResult.status === "skipped" &&
              "bg-amber-500/[0.08] text-amber-700 dark:text-amber-300",
          )}
        >
          {resendResult.status === "sent" && <MailCheck className="mt-0.5 h-3 w-3 shrink-0" />}
          {resendResult.status === "failed" && <MailWarning className="mt-0.5 h-3 w-3 shrink-0" />}
          {resendResult.status === "skipped" && <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />}
          <span className="leading-snug">
            {resendResult.status === "sent" && (
              <>Reminder sent to {resendResult.email}. The PIN was not re-shared — they need the original.</>
            )}
            {resendResult.status === "failed" &&
              `Email failed: ${resendResult.error || "unknown error"}.`}
            {resendResult.status === "skipped" &&
              (resendResult.error === "no_recipient"
                ? "No client email on file — share the link manually."
                : resendResult.error === "resend_not_configured"
                  ? "Email service not configured — share the link manually."
                  : "Email skipped — share the link manually.")}
          </span>
        </div>
      )}
    </div>
  );
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="h-9 shrink-0 gap-1.5"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          Copied
        </>
      ) : (
        <>
          <ClipboardCheck className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}

function LetterSentDialog({
  open,
  info,
  onClose,
}: {
  open: boolean;
  info: SendLetterResponse | null;
  onClose: () => void;
}) {
  if (!info) return null;

  const status = info.email_status;
  const isSent = status === "sent";
  const isFailed = status === "failed";
  const isSkipped = status === "skipped";

  const statusReasonLabel =
    info.email_error === "no_recipient"
      ? "No client email on file."
      : info.email_error === "resend_not_configured"
        ? "Email service not configured."
        : info.email_error || "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Engagement letter ready
          </DialogTitle>
          <DialogDescription>
            The pre-case has moved to <strong>Letter sent</strong>. Here&apos;s
            what happened with delivery, and what you can share manually.
          </DialogDescription>
        </DialogHeader>

        {/* ── Email delivery status ─────────────────────────────── */}
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3",
            isSent && "border-emerald-500/30 bg-emerald-500/[0.06]",
            isFailed && "border-rose-500/30 bg-rose-500/[0.06]",
            isSkipped && "border-amber-500/30 bg-amber-500/[0.06]",
          )}
        >
          {isSent && <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
          {isFailed && <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
          {isSkipped && <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">
              {isSent && "Email delivered"}
              {isFailed && "Email failed — share manually"}
              {isSkipped && "Email not sent"}
            </p>
            <p className="mt-0.5 truncate text-[13px] font-medium text-foreground">
              {info.client_email || "No recipient"}
            </p>
            {(isFailed || isSkipped) && statusReasonLabel && (
              <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
                {statusReasonLabel}
              </p>
            )}
            {isSent && (
              <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
                Includes the secure link and one-time PIN. They&apos;ll be
                prompted to enter the PIN before signing.
              </p>
            )}
          </div>
        </div>

        {/* ── Manual fallback (always visible) ─────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
              {isSent ? "Manual fallback" : "Share these directly"}
            </p>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 px-2 text-[11px]"
            >
              <a href={info.sign_url} target="_blank" rel="noopener noreferrer">
                <Eye className="h-3 w-3" />
                Preview
              </a>
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Signing link</Label>
            <div className="flex items-center gap-2">
              <Input
                value={info.sign_url}
                readOnly
                className="h-9 text-[11px]"
                onFocus={(e) => e.currentTarget.select()}
              />
              <CopyButton value={info.sign_url} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">
              One-time PIN
              <span className="ml-1 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-700">
                · shown once
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={info.sign_pin}
                readOnly
                className="h-11 bg-[color:var(--purple)]/[0.04] text-center font-mono text-[20px] font-semibold tracking-[0.5em] text-foreground"
                onFocus={(e) => e.currentTarget.select()}
              />
              <CopyButton value={info.sign_pin} label="Copy PIN" />
            </div>
            <p className="text-[11px] leading-snug text-amber-700 dark:text-amber-400">
              ⚠ The PIN is encrypted in our database — once this dialog closes
              we can&apos;t show it again. If lost, void this letter and reissue.
            </p>
          </div>

          <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground/80">
            Expires{" "}
            {new Date(info.expires_at).toLocaleDateString("en-AU", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="gap-2">
            <Check className="h-4 w-4" />
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({
  open,
  onClose,
  precaseId,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  precaseId: string;
  onRecorded: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [amount, setAmount] = useState("1500");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await paymentsApi.record({
        pre_case_id: precaseId,
        method,
        amount_aud: amount,
        reference: reference || undefined,
        received_at: new Date(receivedAt).toISOString(),
        notes: notes || undefined,
      });
      onRecorded();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment received</DialogTitle>
          <DialogDescription>
            Stripe webhook will land here automatically once it&apos;s wired. For
            now, record bank transfers, PayID, BPAY, cash or cheque manually.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="method" className="text-xs">Method</Label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="bank_transfer">Bank transfer (EFT)</option>
              <option value="payid">PayID</option>
              <option value="bpay">BPAY</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="amt" className="text-xs">Amount A$</Label>
              <Input id="amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rcv" className="text-xs">Received on</Label>
              <Input id="rcv" type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="ref" className="text-xs">Reference (optional)</Label>
            <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank ref / cheque #" />
          </div>
          <div>
            <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SkipPaymentDialog({
  open,
  onClose,
  precaseId,
  onSkipped,
}: {
  open: boolean;
  onClose: () => void;
  precaseId: string;
  onSkipped: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await paymentsApi.skip({ pre_case_id: precaseId, reason });
      onSkipped();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Skip payment</DialogTitle>
          <DialogDescription>
            Record this pre-case as paid without a payment (e.g. relative
            case, pro-bono work). A $0 waiver record is added for audit.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="reason" className="text-xs">Reason</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Family member — no fee charged"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !reason.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Skip payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkSignedManualDialog({
  open,
  onClose,
  precaseId,
  clientName,
  onMarked,
}: {
  open: boolean;
  onClose: () => void;
  precaseId: string;
  clientName: string;
  onMarked: () => void;
}) {
  const [signerName, setSignerName] = useState(clientName);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setSignerName(clientName);
  }, [open, clientName]);

  const submit = async () => {
    if (!reason.trim() || !signerName.trim()) return;
    setBusy(true);
    try {
      await lettersApi.markSignedManually(precaseId, {
        signer_name: signerName,
        method: "consultant_attest",
        reason,
      });
      onMarked();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark engagement letter signed manually</DialogTitle>
          <DialogDescription>
            Use this when the client signed offline (paper, in person, video
            call) instead of via the e-sign portal. Your attestation is logged.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="sname" className="text-xs">Signer&apos;s full name</Label>
            <Input id="sname" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mr" className="text-xs">Reason / how it was signed</Label>
            <Textarea
              id="mr"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Signed in person at office on 2 May 2026"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !reason.trim() || !signerName.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark signed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ForceConvertDialog({
  open,
  onClose,
  precaseId,
  onConverted,
}: {
  open: boolean;
  onClose: () => void;
  precaseId: string;
  onConverted: (caseId: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [visaSubclass, setVisaSubclass] = useState("");
  const [visaName, setVisaName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      const r = await preCasesApi.forceConvert(precaseId, {
        reason,
        visa_subclass: visaSubclass || undefined,
        visa_name: visaName || undefined,
      });
      onConverted(r.case_id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Force-convert to case</DialogTitle>
          <DialogDescription>
            Skip any remaining gates and open the case immediately. Use sparingly
            — both the skipped letter and skipped payment are logged in the audit
            trail.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="fcvsub" className="text-xs">Visa subclass</Label>
              <Input id="fcvsub" value={visaSubclass} onChange={(e) => setVisaSubclass(e.target.value)} placeholder="482" />
            </div>
            <div>
              <Label htmlFor="fcvname" className="text-xs">Visa name</Label>
              <Input id="fcvname" value={visaName} onChange={(e) => setVisaName(e.target.value)} placeholder="TSS" />
            </div>
          </div>
          <div>
            <Label htmlFor="fcr" className="text-xs">Reason</Label>
            <Textarea
              id="fcr"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Engagement signed offline, retainer received via international wire — proceeding."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !reason.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Force convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
