"use client";

import {
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Handshake,
  Info,
  Loader2,
  Lock,
  Mail,
  PenLine,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ClientAccess,
  LetterOut,
  PreCaseDetail,
  lettersApi,
  paymentsApi,
  portalAccountsApi,
  preCasesApi,
} from "@/lib/api/services";
import { useAppRefresh } from "@/lib/use-app-refresh";

// Brand palette — matches consultant-inquiry-to-case-flow.html
const C = {
  navy: "#101928",
  purple: "#7A5AF8",
  purpleDeep: "#3E1C96",
  purpleLight: "#BDB4FE",
  purpleMuted: "#EBE9FE",
  purpleTint: "#F4F3FF",
  teal: "#1B7B6F",
  tealLight: "#2DD4BF",
  tealTint: "#F0FBF8",
  amber: "#B54708",
  amberBg: "#FEF6EE",
  rose: "#B42318",
  ink: "#101928",
  body: "#475367",
  muted: "#667085",
  faint: "#98A2B3",
  soft: "#F7F8FB",
  soft2: "#F0F2F5",
  line: "#E4E7EC",
  line2: "#EEF0F3",
};

type StepState = "done" | "skipped" | "active" | "todo";

const heading = { fontFamily: "var(--font-outfit), sans-serif" } as const;

export function PreCaseWorkspace({ precaseId }: { precaseId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<PreCaseDetail | null>(null);
  const [letter, setLetter] = useState<LetterOut | null>(null);
  const [access, setAccess] = useState<ClientAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<
    null | "letter" | "payment" | "skipPayment" | "markSigned" | "forceConvert"
  >(null);

  const notify = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const load = useCallback(async () => {
    const d = await preCasesApi.get(precaseId);
    setDetail(d);
    setAccess(d.client_access ?? null);
    const lt = await lettersApi.getForPreCase(precaseId).catch(() => null);
    setLetter(lt);
    setLoading(false);
  }, [precaseId]);

  useEffect(() => {
    load();
  }, [load]);
  useAppRefresh(load);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      const ax = e as { response?: { data?: { detail?: string } } };
      notify(
        typeof ax.response?.data?.detail === "string"
          ? ax.response.data.detail
          : "Something went wrong."
      );
    } finally {
      setBusy(null);
    }
  };

  const steps = useMemo(() => computeSteps(detail), [detail]);
  const activeIndex = steps.findIndex((s) => s.state === "active");

  if (loading || !detail) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: C.purple }} />
      </div>
    );
  }

  const chip = milestoneChip(detail);
  const clientName = detail.client_name || detail.client_email || "New enquiry";

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-24 pt-2">
      {/* Breadcrumb + status chip */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <Link
          href="/dashboard/precases"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium"
          style={{ color: C.muted }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Pre-cases
        </Link>
        <span
          className="rounded-full px-3 py-1 text-[12.5px] font-semibold"
          style={{ background: chip.bg, color: chip.fg }}
        >
          {chip.label}
        </span>
      </div>

      {/* Record header */}
      <div className="flex flex-wrap items-start gap-4 border-b pb-6" style={{ borderColor: C.line }}>
        <div
          className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl text-lg font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, ...heading }}
        >
          {clientName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold leading-tight" style={heading}>
            {clientName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]" style={{ color: C.muted }}>
            {detail.client_email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {detail.client_email}
              </span>
            )}
            {detail.questionnaire_name && <span>{detail.questionnaire_name}</span>}
          </div>
        </div>
      </div>

      {/* Horizontal tracker */}
      <Tracker steps={steps} />

      {/* Two columns */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_332px]">
        {/* Steps */}
        <div className="space-y-4">
          {steps.map((s, i) => (
            <StepCard
              key={s.key}
              step={s}
              active={i === activeIndex}
              busy={busy}
              detail={detail}
              caseId={detail.promoted_case_id}
              onQualify={() =>
                run("qualify", async () => {
                  const d = await preCasesApi.qualify(precaseId);
                  setDetail(d);
                  setAccess(d.client_access ?? null);
                  await load();
                  notify("Qualified — portal account created & emailed.");
                })
              }
              onArchive={() =>
                run("archive", async () => {
                  await preCasesApi.archive(precaseId);
                  notify("Archived.");
                  router.push("/dashboard/precases");
                })
              }
              onCompose={() => setModal("letter")}
              onMarkSigned={() => setModal("markSigned")}
              onRecordPayment={() => setModal("payment")}
              onSkipPayment={() => setModal("skipPayment")}
              onForceConvert={() => setModal("forceConvert")}
              onReminder={() =>
                run("reminder", async () => {
                  if (letter?.id) await lettersApi.resendReminder(letter.id);
                  notify("Reminder sent to the client's portal.");
                })
              }
              onPromote={() =>
                run("promote", async () => {
                  const { case_id } = await preCasesApi.promote(precaseId);
                  notify("Case opened — checklist ready.");
                  router.push(`/dashboard/cases/${case_id}`);
                })
              }
            />
          ))}
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <EnquirySummaryCard detail={detail} />
          <ClientAccessCard
            access={access}
            qualified={!!detail.qualified_at}
            busy={busy}
            notify={notify}
            onResend={() =>
              run("resend", async () => {
                if (!access) return;
                const a = await portalAccountsApi.resend(access.account_id);
                setAccess(a);
                notify("Welcome email re-sent.");
              })
            }
            onRegenerate={() =>
              run("regen", async () => {
                if (!access) return;
                const a = await portalAccountsApi.regeneratePassword(access.account_id);
                setAccess(a);
                notify("New temporary password issued & emailed.");
              })
            }
          />
        </div>
      </div>

      {/* Modals */}
      {modal === "letter" && (
        <LetterComposeModal
          precaseId={precaseId}
          detail={detail}
          onClose={() => setModal(null)}
          onSent={async (r) => {
            setModal(null);
            notify(
              r.email_status === "sent"
                ? "Engagement letter sent to the client's portal."
                : "Letter ready — share the link if needed."
            );
            await load();
          }}
        />
      )}
      {modal === "payment" && (
        <RecordPaymentModal
          precaseId={precaseId}
          onClose={() => setModal(null)}
          onDone={async () => {
            setModal(null);
            notify("Payment recorded. Receipt generated.");
            await load();
          }}
        />
      )}
      {modal === "skipPayment" && (
        <ReasonModal
          title="Waive / skip payment"
          label="Reason (family, pro-bono, paid offline…)"
          cta="Waive payment"
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            await paymentsApi.skip({ pre_case_id: precaseId, reason });
            setModal(null);
            notify("Payment waived — logged for the file.");
            await load();
          }}
        />
      )}
      {modal === "markSigned" && (
        <MarkSignedModal
          precaseId={precaseId}
          clientName={detail.client_name || ""}
          onClose={() => setModal(null)}
          onDone={async () => {
            setModal(null);
            notify("Marked as signed (consultant attestation).");
            await load();
          }}
        />
      )}
      {modal === "forceConvert" && (
        <ForceConvertModal
          precaseId={precaseId}
          onClose={() => setModal(null)}
          onDone={(caseId) => {
            setModal(null);
            router.push(`/dashboard/cases/${caseId}`);
          }}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl"
          style={{ background: C.navy }}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: C.teal }}>
            <Check className="h-3 w-3" />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Step computation ─────────────────────────────────────────────────────────
interface Step {
  key: string;
  title: string;
  summary: string;
  state: StepState;
  doneLabel: string;
}

function computeSteps(d: PreCaseDetail | null): Step[] {
  if (!d) return [];
  const qualified = !!d.qualified_at;
  const letterSent = !!d.letter_sent_at;
  const letterSkipped = !!d.skipped_letter && !d.letter_signed_at;
  const signed = !!d.letter_signed_at;
  const paid = !!d.paid_at && !d.skipped_payment;
  const paymentWaived = !!d.skipped_payment;
  const opened = !!d.promoted_case_id || !!d.converted_at;

  const raw: Array<Omit<Step, "state">> = [
    {
      key: "qualify",
      title: "Review & qualify",
      summary:
        "A new enquiry — qualifying turns this into a pre-case and creates the client's portal account. No PINs to pass around.",
      doneLabel: "Qualified",
    },
    {
      key: "letter",
      title: "Send the engagement letter",
      summary:
        "Compose the costs agreement — scope, fees, disbursements, retainer. It appears in the client's portal to sign, with a copy emailed.",
      doneLabel: "Letter sent",
    },
    {
      key: "sign",
      title: "Client signs the agreement",
      summary:
        "The letter waits in the client's portal. They sign there — typed or drawn — and we keep a tamper-proof record. It flips to Signed here automatically.",
      doneLabel: "Signed",
    },
    {
      key: "deposit",
      title: "Record the deposit",
      summary:
        "Log the retainer received — method, amount, reference, date — and we generate a receipt. The client sees it confirmed in their portal.",
      doneLabel: "Deposit recorded",
    },
    {
      key: "open",
      title: "Open the case",
      summary:
        "Turn the pre-case into a live case. We generate the document checklist and unlock the client's full portal — timeline, documents and uploads.",
      doneLabel: "Case opened",
    },
  ];

  const passed = [
    qualified,
    letterSent || letterSkipped || signed,
    signed || letterSkipped,
    paid || paymentWaived,
    opened,
  ];
  const doneFlags: StepState[] = [
    qualified ? "done" : "todo",
    letterSent ? "done" : letterSkipped ? "skipped" : "todo",
    signed ? "done" : letterSkipped ? "skipped" : "todo",
    paid ? "done" : paymentWaived ? "skipped" : "todo",
    opened ? "done" : "todo",
  ];

  // First not-passed step (with predecessor passed) becomes active.
  let activeAssigned = false;
  return raw.map((r, i) => {
    let state = doneFlags[i];
    const predecessorPassed = i === 0 || passed[i - 1];
    if (state === "todo" && !activeAssigned && predecessorPassed) {
      state = "active";
      activeAssigned = true;
    }
    return { ...r, state };
  });
}

function milestoneChip(d: PreCaseDetail) {
  if (d.promoted_case_id || d.converted_at)
    return { label: "Case open", bg: C.tealTint, fg: C.teal };
  if (d.paid_at && !d.skipped_payment)
    return { label: "Pre-case · Paid", bg: C.tealTint, fg: C.teal };
  if (d.letter_signed_at) return { label: "Pre-case · Signed", bg: C.purpleMuted, fg: C.purpleDeep };
  if (d.letter_sent_at) return { label: "Pre-case · Letter sent", bg: C.purpleMuted, fg: C.purpleDeep };
  if (d.qualified_at) return { label: "Pre-case · Qualified", bg: C.purpleMuted, fg: C.purpleDeep };
  return { label: "New query", bg: C.soft2, fg: C.muted };
}

// ── Tracker ──────────────────────────────────────────────────────────────────
function Tracker({ steps }: { steps: Step[] }) {
  return (
    <div className="mt-6 flex items-center">
      {steps.map((s, i) => {
        const done = s.state === "done";
        const active = s.state === "active";
        const skip = s.state === "skipped";
        const node = done || skip ? C.teal : active ? C.purple : "#fff";
        return (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 text-[12px] font-bold"
                style={{
                  background: done ? C.teal : active ? C.purple : skip ? C.soft2 : "#fff",
                  color: done || active ? "#fff" : C.faint,
                  borderColor: done ? C.teal : active ? C.purple : skip ? C.line : C.line,
                  borderStyle: skip ? "dashed" : "solid",
                  boxShadow: active ? `0 0 0 5px ${C.purpleMuted}` : "none",
                }}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className="mt-1.5 hidden text-[11px] font-medium md:block"
                style={{ color: active ? C.purpleDeep : C.faint }}
              >
                {["Qualify", "Letter", "Sign", "Deposit", "Open case"][i]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className="mx-2 h-0.5 flex-1"
                style={{ background: i < (steps.findIndex((x) => x.state === "active")) || done ? C.teal : C.line }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step card ────────────────────────────────────────────────────────────────
function StepCard({
  step,
  active,
  busy,
  detail,
  caseId,
  onQualify,
  onArchive,
  onCompose,
  onMarkSigned,
  onRecordPayment,
  onSkipPayment,
  onForceConvert,
  onReminder,
  onPromote,
}: {
  step: Step;
  active: boolean;
  busy: string | null;
  detail: PreCaseDetail;
  caseId?: string | null;
  onQualify: () => void;
  onArchive: () => void;
  onCompose: () => void;
  onMarkSigned: () => void;
  onRecordPayment: () => void;
  onSkipPayment: () => void;
  onForceConvert: () => void;
  onReminder: () => void;
  onPromote: () => void;
}) {
  const done = step.state === "done";
  const skipped = step.state === "skipped";

  const badge =
    step.state === "done"
      ? { t: step.doneLabel, bg: C.tealTint, fg: C.teal }
      : step.state === "skipped"
      ? { t: "Skipped", bg: C.soft2, fg: C.muted }
      : active
      ? { t: step.key === "sign" ? "Waiting on client" : "Needs you", bg: C.purpleMuted, fg: C.purpleDeep }
      : { t: "Up next", bg: C.soft2, fg: C.muted };

  return (
    <div
      className="rounded-2xl border bg-white p-5 transition"
      style={{
        borderColor: active ? C.purpleLight : C.line,
        boxShadow: active ? "0 24px 60px -28px rgba(62,28,150,.32)" : "0 1px 2px rgba(16,25,40,.04)",
      }}
    >
      <div className="flex items-start gap-3.5">
        <span
          className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-[13px] font-bold"
          style={{
            background: done || skipped ? (done ? C.teal : C.soft2) : active ? C.purple : C.soft2,
            color: done ? "#fff" : active ? "#fff" : C.muted,
          }}
        >
          {done ? <Check className="h-4 w-4" /> : Number(["qualify", "letter", "sign", "deposit", "open"].indexOf(step.key)) + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[16px] font-semibold" style={heading}>
              {step.title}
            </h3>
            <span
              className="flex-none rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
              style={{ background: badge.bg, color: badge.fg }}
            >
              {badge.t}
            </span>
          </div>
          {(active || (!done && !skipped)) && (
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: C.body }}>
              {step.summary}
            </p>
          )}
          {skipped && (
            <p className="mt-2 text-[13px]" style={{ color: C.muted }}>
              {step.key === "deposit" ? detail.skipped_payment : detail.skipped_letter}
            </p>
          )}

          {active && (
            <div className="mt-4">
              <StepActions
                stepKey={step.key}
                busy={busy}
                hasLetter={!!detail.letter_sent_at}
                onQualify={onQualify}
                onArchive={onArchive}
                onCompose={onCompose}
                onMarkSigned={onMarkSigned}
                onRecordPayment={onRecordPayment}
                onSkipPayment={onSkipPayment}
                onForceConvert={onForceConvert}
                onReminder={onReminder}
                onPromote={onPromote}
              />
            </div>
          )}

          {done && step.key === "open" && caseId && (
            <Link
              href={`/dashboard/cases/${caseId}`}
              className="mt-3 inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: C.teal }}
            >
              Go to case
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Btn({
  onClick,
  busy,
  variant = "primary",
  icon,
  children,
}: {
  onClick: () => void;
  busy?: boolean;
  variant?: "primary" | "ghost" | "teal" | "danger" | "link";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: C.purple, color: "#fff" },
    teal: { background: C.teal, color: "#fff" },
    ghost: { background: "#fff", color: C.ink, border: `1px solid ${C.line}` },
    danger: { background: "#fff", color: C.rose, border: `1px solid ${C.line}` },
    link: { background: "transparent", color: C.muted },
  };
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] text-sm font-semibold transition disabled:opacity-50 ${
        variant === "link" ? "px-1 py-1 underline" : "px-4 py-2.5"
      }`}
      style={styles[variant]}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

function StepActions({
  stepKey,
  busy,
  hasLetter,
  onQualify,
  onArchive,
  onCompose,
  onMarkSigned,
  onRecordPayment,
  onSkipPayment,
  onForceConvert,
  onReminder,
  onPromote,
}: {
  stepKey: string;
  busy: string | null;
  hasLetter: boolean;
  onQualify: () => void;
  onArchive: () => void;
  onCompose: () => void;
  onMarkSigned: () => void;
  onRecordPayment: () => void;
  onSkipPayment: () => void;
  onForceConvert: () => void;
  onReminder: () => void;
  onPromote: () => void;
}) {
  if (stepKey === "qualify")
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        <Btn onClick={onQualify} busy={busy === "qualify"} icon={<CheckCircle2 className="h-4 w-4" />}>
          Qualify & create portal account
        </Btn>
        <Btn onClick={onArchive} busy={busy === "archive"} variant="danger" icon={<Trash2 className="h-4 w-4" />}>
          Not a fit — archive
        </Btn>
      </div>
    );
  if (stepKey === "letter")
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        <Btn onClick={onCompose} icon={<PenLine className="h-4 w-4" />}>
          Compose &amp; send letter
        </Btn>
        <Btn onClick={onMarkSigned} variant="ghost" icon={<Handshake className="h-4 w-4" />}>
          Already signed — mark manually
        </Btn>
      </div>
    );
  if (stepKey === "sign")
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        {hasLetter && (
          <Btn onClick={onReminder} busy={busy === "reminder"} variant="ghost" icon={<Bell className="h-4 w-4" />}>
            Send a reminder
          </Btn>
        )}
        <Btn onClick={onMarkSigned} variant="primary" icon={<Handshake className="h-4 w-4" />}>
          Mark signed manually
        </Btn>
      </div>
    );
  if (stepKey === "deposit")
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        <Btn onClick={onRecordPayment} icon={<Wallet className="h-4 w-4" />}>
          Record payment
        </Btn>
        <Btn onClick={onSkipPayment} variant="ghost" icon={<ArrowLeft className="h-4 w-4 rotate-180" />}>
          Waive / skip
        </Btn>
      </div>
    );
  // open
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Btn onClick={onPromote} busy={busy === "promote"} variant="teal" icon={<CheckCircle2 className="h-4 w-4" />}>
        Open case & generate checklist
      </Btn>
      <Btn onClick={onForceConvert} variant="ghost" icon={<FileText className="h-4 w-4" />}>
        Force convert (skip gates)
      </Btn>
    </div>
  );
}

// ── Right rail: AI summary ───────────────────────────────────────────────────
function EnquirySummaryCard({ detail }: { detail: PreCaseDetail }) {
  const facts = Object.entries(detail.ai_extracted || {})
    .filter(([, v]) => v != null && v !== "")
    .slice(0, 6);
  return (
    <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: C.line }}>
      <div className="flex items-center gap-2 border-b px-4 py-3.5" style={{ borderColor: C.line2 }}>
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg" style={{ background: C.purpleTint }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: C.purple }} />
        </span>
        <h3 className="text-sm font-bold" style={heading}>
          Enquiry summary
        </h3>
      </div>
      <div className="px-4 py-4">
        {detail.ai_suggested_outcome && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
            style={{ background: C.tealTint, color: C.teal }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {outcomeLabel(detail.ai_suggested_outcome)}
          </span>
        )}
        {detail.ai_summary && (
          <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: C.body }}>
            {detail.ai_summary}
          </p>
        )}
        {facts.length > 0 && (
          <div className="mt-3">
            {facts.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-3 border-b py-2 text-[13px] last:border-0"
                style={{ borderColor: C.line2 }}
              >
                <span style={{ color: C.muted }}>{prettyKey(k)}</span>
                <span className="text-right font-semibold" style={{ color: C.ink }}>
                  {String(v)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Right rail: Client access card ───────────────────────────────────────────
function ClientAccessCard({
  access,
  qualified,
  busy,
  notify,
  onResend,
  onRegenerate,
}: {
  access: ClientAccess | null;
  qualified: boolean;
  busy: string | null;
  notify: (m: string) => void;
  onResend: () => void;
  onRegenerate: () => void;
}) {
  const [reveal, setReveal] = useState(false);
  const live = !!access;

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    notify(`${label} copied.`);
  };

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ borderColor: C.line, background: live ? "#fff" : C.soft }}
    >
      <div className="flex items-center gap-2 border-b px-4 py-3.5" style={{ borderColor: C.line2 }}>
        <span
          className="flex h-[26px] w-[26px] items-center justify-center rounded-lg"
          style={{ background: live ? C.tealTint : C.soft2 }}
        >
          <Users className="h-3.5 w-3.5" style={{ color: live ? C.teal : C.muted }} />
        </span>
        <h3 className="text-sm font-bold" style={heading}>
          Client portal
        </h3>
      </div>

      <div className="px-4 py-4">
        {!live ? (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: C.soft2 }}>
              <Lock className="h-4 w-4" style={{ color: C.faint }} />
            </span>
            <div>
              <div className="text-[13.5px] font-semibold" style={{ color: C.ink }}>
                {qualified ? "Provisioning…" : "Not created yet"}
              </div>
              <div className="text-[12px]" style={{ color: C.muted }}>
                Created automatically when you qualify.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium"
              style={{ background: C.tealTint, color: C.teal }}
            >
              <CheckCircle2 className="h-4 w-4" />
              {access!.status === "active" ? "Account active · client signed in" : "Invited · waiting on first login"}
            </div>

            <Field label="Email" value={access!.email} onCopy={() => copy(access!.email, "Email")} />

            {access!.temp_password ? (
              <Field
                label="Temporary password"
                value={reveal ? access!.temp_password : "••••••••••"}
                mono
                onCopy={() => copy(access!.temp_password!, "Password")}
                extra={
                  <button
                    onClick={() => setReveal((r) => !r)}
                    className="text-[12px] font-medium underline"
                    style={{ color: C.purpleDeep }}
                  >
                    {reveal ? "Hide" : "Reveal"}
                  </button>
                }
              />
            ) : (
              <div className="mt-2 text-[12px]" style={{ color: C.muted }}>
                Client has set their own password.
              </div>
            )}

            <Field
              label="Portal link"
              value={access!.portal_url}
              onCopy={() => copy(access!.portal_url, "Portal link")}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => copy(access!.share_message, "Share message")}
                className="inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12.5px] font-semibold"
                style={{ background: C.purpleTint, color: C.purpleDeep }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy share message
              </button>
              <button
                onClick={onResend}
                disabled={busy === "resend"}
                className="inline-flex items-center gap-1.5 rounded-[9px] border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50"
                style={{ borderColor: C.line, color: C.ink }}
              >
                {busy === "resend" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                Resend email
              </button>
              <button
                onClick={onRegenerate}
                disabled={busy === "regen"}
                className="inline-flex items-center gap-1.5 rounded-[9px] border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50"
                style={{ borderColor: C.line, color: C.ink }}
              >
                {busy === "regen" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                New password
              </button>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[12px]" style={{ background: C.purpleTint, color: C.purpleDeep }}>
              <Info className="mt-0.5 h-3.5 w-3.5 flex-none" />
              The client signs the letter, pays and uploads here — one login, no PINs.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  onCopy,
  extra,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.faint }}>
          {label}
        </span>
        {extra}
      </div>
      <div className="flex items-center gap-2">
        <div
          className={`min-w-0 flex-1 truncate rounded-lg border px-2.5 py-2 text-[13px] ${mono ? "font-mono" : ""}`}
          style={{ borderColor: C.line, color: C.ink, background: C.soft }}
        >
          {value}
        </div>
        <button onClick={onCopy} className="flex-none rounded-lg border p-2" style={{ borderColor: C.line }} aria-label={`Copy ${label}`}>
          <Copy className="h-3.5 w-3.5" style={{ color: C.muted }} />
        </button>
      </div>
    </div>
  );
}

// ── Modals ───────────────────────────────────────────────────────────────────
function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "rgba(16,25,40,.45)" }} onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: C.line2 }}>
          <h3 className="text-base font-bold" style={heading}>
            {title}
          </h3>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: C.muted }} aria-label="Close">
            ×
          </button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex justify-end gap-2 border-t px-6 py-4" style={{ borderColor: C.line2 }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: C.ink }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border px-3 py-2.5 text-sm outline-none"
        style={{ borderColor: C.line }}
      />
    </div>
  );
}

function LetterComposeModal({
  precaseId,
  detail,
  onClose,
  onSent,
}: {
  precaseId: string;
  detail: PreCaseDetail;
  onClose: () => void;
  onSent: (r: { email_status: string }) => void;
}) {
  const initialSub =
    (detail.ai_extracted?.visa_interest as string) ||
    (detail.ai_extracted?.visa_subclass as string) ||
    "";
  const [visaSubclass, setVisaSubclass] = useState(initialSub);
  const [visaName, setVisaName] = useState("");
  const [scope, setScope] = useState("");
  const [professional, setProfessional] = useState("3500");
  const [disbursements, setDisbursements] = useState("540");
  const [retainer, setRetainer] = useState("1500");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const r = await lettersApi.send(precaseId, {
        compose: {
          visa_subclass: visaSubclass || undefined,
          visa_name: visaName || undefined,
          scope: scope || undefined,
          fee_lines: [
            { label: "Professional fee", amount_aud: professional, kind: "professional_fee" },
            { label: "Disbursements", amount_aud: disbursements, kind: "disbursement" },
            { label: "Retainer payable now", amount_aud: retainer, kind: "retainer" },
          ],
        },
        expires_in_days: 14,
      });
      onSent({ email_status: r.email_status });
    } catch (e) {
      const ax = e as { response?: { data?: { detail?: string } } };
      setErr(typeof ax.response?.data?.detail === "string" ? ax.response.data.detail : "Could not send letter.");
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Compose engagement letter"
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose} variant="ghost">
            Cancel
          </Btn>
          <Btn onClick={submit} busy={busy}>
            Send to portal
          </Btn>
        </>
      }
    >
      <Input label="Visa subclass" value={visaSubclass} onChange={setVisaSubclass} placeholder="e.g. 186" />
      <Input label="Visa name (plain English)" value={visaName} onChange={setVisaName} placeholder="Employer Nomination (ENS)" />
      <div className="mb-3">
        <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: C.ink }}>
          Scope of service
        </label>
        <textarea
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          rows={3}
          className="w-full rounded-[10px] border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: C.line }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Input label="Professional A$" value={professional} onChange={setProfessional} type="number" />
        <Input label="Disbursements A$" value={disbursements} onChange={setDisbursements} type="number" />
        <Input label="Retainer A$" value={retainer} onChange={setRetainer} type="number" />
      </div>
      <p className="text-[12.5px]" style={{ color: C.muted }}>
        This lands in the client&apos;s portal to review and sign — they&apos;re already logged in.
      </p>
      {err && (
        <p className="mt-2 text-[13px]" style={{ color: C.rose }}>
          {err}
        </p>
      )}
    </ModalShell>
  );
}

function RecordPaymentModal({
  precaseId,
  onClose,
  onDone,
}: {
  precaseId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod] = useState("bank_transfer");
  const [amount, setAmount] = useState("1500");
  const [received, setReceived] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await paymentsApi.record({
        pre_case_id: precaseId,
        method: method as never,
        amount_aud: amount,
        received_at: received,
        reference: reference || undefined,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Record payment"
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose} variant="ghost">
            Cancel
          </Btn>
          <Btn onClick={submit} busy={busy}>
            Record payment
          </Btn>
        </>
      }
    >
      <div className="mb-3">
        <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: C.ink }}>
          Method
        </label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full rounded-[10px] border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: C.line }}
        >
          <option value="bank_transfer">Bank transfer</option>
          <option value="payid">PayID</option>
          <option value="bpay">BPAY</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
          <option value="other">Other</option>
        </select>
      </div>
      <Input label="Amount (A$)" value={amount} onChange={setAmount} type="number" />
      <Input label="Received on" value={received} onChange={setReceived} type="date" />
      <Input label="Reference (optional)" value={reference} onChange={setReference} />
      <p className="text-[12.5px]" style={{ color: C.muted }}>
        A receipt number is generated and shown in the client&apos;s portal.
      </p>
    </ModalShell>
  );
}

function MarkSignedModal({
  precaseId,
  clientName,
  onClose,
  onDone,
}: {
  precaseId: string;
  clientName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [signer, setSigner] = useState(clientName);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!signer.trim() || !reason.trim()) return setErr("Signer name and reason are required.");
    setBusy(true);
    setErr(null);
    try {
      await lettersApi.markSignedManually(precaseId, {
        signer_name: signer.trim(),
        method: "consultant_attest",
        reason: reason.trim(),
      });
      onDone();
    } catch (e) {
      const ax = e as { response?: { data?: { detail?: string } } };
      setErr(typeof ax.response?.data?.detail === "string" ? ax.response.data.detail : "Could not mark signed.");
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Mark signed manually"
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose} variant="ghost">
            Cancel
          </Btn>
          <Btn onClick={submit} busy={busy}>
            Mark signed
          </Btn>
        </>
      }
    >
      <Input label="Signer's full name" value={signer} onChange={setSigner} />
      <div className="mb-1">
        <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: C.ink }}>
          How was it signed? (audit note)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Signed in person at the office on 19 Jun 2026"
          className="w-full rounded-[10px] border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: C.line }}
        />
      </div>
      {err && (
        <p className="mt-1 text-[13px]" style={{ color: C.rose }}>
          {err}
        </p>
      )}
    </ModalShell>
  );
}

function ForceConvertModal({
  precaseId,
  onClose,
  onDone,
}: {
  precaseId: string;
  onClose: () => void;
  onDone: (caseId: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) return setErr("A reason is required for the audit trail.");
    setBusy(true);
    setErr(null);
    try {
      const { case_id } = await preCasesApi.forceConvert(precaseId, { reason: reason.trim() });
      onDone(case_id);
    } catch (e) {
      const ax = e as { response?: { data?: { detail?: string } } };
      setErr(typeof ax.response?.data?.detail === "string" ? ax.response.data.detail : "Could not convert.");
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Force convert to case"
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose} variant="ghost">
            Cancel
          </Btn>
          <Btn onClick={submit} busy={busy} variant="teal">
            Open case anyway
          </Btn>
        </>
      }
    >
      <p className="mb-3 text-[13px]" style={{ color: C.body }}>
        Skip any remaining gates and open the case now. The skipped steps are
        logged with your reason.
      </p>
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: C.ink }}>
          Reason
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Signed offline, retainer received via wire — proceeding."
          className="w-full rounded-[10px] border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: C.line }}
        />
      </div>
      {err && (
        <p className="mt-1 text-[13px]" style={{ color: C.rose }}>
          {err}
        </p>
      )}
    </ModalShell>
  );
}

function ReasonModal({
  title,
  label,
  cta,
  onClose,
  onSubmit,
}: {
  title: string;
  label: string;
  cta: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (!reason.trim()) return setErr("A reason is required.");
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(reason.trim());
    } catch (e) {
      const ax = e as { response?: { data?: { detail?: string } } };
      setErr(typeof ax.response?.data?.detail === "string" ? ax.response.data.detail : "Could not save.");
      setBusy(false);
    }
  };
  return (
    <ModalShell
      title={title}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose} variant="ghost">
            Cancel
          </Btn>
          <Btn onClick={submit} busy={busy}>
            {cta}
          </Btn>
        </>
      }
    >
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold" style={{ color: C.ink }}>
          {label}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full rounded-[10px] border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: C.line }}
        />
      </div>
      {err && (
        <p className="mt-1 text-[13px]" style={{ color: C.rose }}>
          {err}
        </p>
      )}
    </ModalShell>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
function outcomeLabel(o: string) {
  return (
    {
      likely_fit: "Likely a strong fit",
      needs_info: "Needs more info",
      paid_consult: "Suggest paid consult",
      unlikely_fit: "Unlikely fit",
    }[o] || o
  );
}
function prettyKey(k: string) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
