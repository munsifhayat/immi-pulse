"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Inbox,
  FileSearch,
  Users,
  CheckCircle2,
  X,
  Mail,
  Info,
  Plus,
  Settings as SettingsIcon,
  Rocket,
  Zap,
  Shield,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { orgApi, type BillingSummary, type Plan } from "@/lib/api/services";
import { fadeUp, stagger } from "@/lib/motion";

type Step = 1 | 2 | 3 | 4 | 5;

const steps: Array<{ label: string; sub: string }> = [
  { label: "Practice", sub: "Tell us about your firm" },
  { label: "Plan", sub: "Pick the right tier" },
  { label: "Team", sub: "Invite teammates" },
  { label: "Confirm", sub: "Start your trial" },
];

function GridBg({ id }: { id: string }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={id} x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#7C5CFC" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} opacity="0.04" />
      </svg>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { org, refresh } = useAuth();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [niche, setNiche] = useState(org?.niche || "");
  const [omara, setOmara] = useState(org?.omara_number || "");

  // Step 2
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Step 3
  type InviteRole = "consultant" | "staff" | "admin";
  type InviteRow = { email: string; role: InviteRole };
  const [invites, setInvites] = useState<InviteRow[]>([
    { email: "", role: "consultant" },
    { email: "", role: "consultant" },
  ]);
  const [inviteSent, setInviteSent] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([orgApi.getBilling(), orgApi.listPlans()])
      .then(([b, p]) => {
        if (!mounted) return;
        setBilling(b);
        setPlans(p);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const currentPlan = useMemo(
    () => plans.find((p) => p.tier === billing?.tier),
    [plans, billing?.tier]
  );
  const seatPrice = currentPlan?.price_per_seat_aud_monthly ?? 99;
  const seatLabel = currentPlan?.is_custom ? "Custom" : `$${seatPrice}/seat/mo`;

  /* ── handlers ── */
  const saveStep1 = async () => {
    setError(null);
    if (!niche.trim() && !omara.trim()) {
      setStep(2);
      return;
    }
    setBusy(true);
    try {
      await orgApi.update({ niche, omara_number: omara || undefined });
      await refresh();
      setStep(2);
    } catch (e) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (e as Error)?.message ||
        "Could not save";
      setError(typeof detail === "string" ? detail : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const onSelectTier = async (tier: Plan["tier"]) => {
    if (!billing) return;
    if (billing.tier === tier) return;
    if (tier === "enterprise") {
      setError("Enterprise is sales-led — book a call from the footer.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await orgApi.selectPlan(tier);
      setBilling(updated);
    } catch (e) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not change plan";
      setError(typeof detail === "string" ? detail : "Could not change plan");
    } finally {
      setBusy(false);
    }
  };

  const onRedeemPromo = async () => {
    if (!promoCode.trim()) return;
    setBusy(true);
    setPromoMsg(null);
    try {
      const r = await orgApi.redeemPromo(promoCode.trim());
      setBilling(r.billing);
      if (r.already_applied) {
        setPromoMsg({ kind: "ok", text: "Already applied to this account." });
      } else {
        const credits = r.credits_added ? ` · ${r.credits_added.toLocaleString()} credits added` : "";
        setPromoMsg({
          kind: "ok",
          text: `${r.pilot_name || "Promo"} applied${credits}`,
        });
      }
      setPromoCode("");
    } catch (e) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Promo code not recognised";
      setPromoMsg({
        kind: "err",
        text: typeof detail === "string" ? detail : "Promo code not recognised",
      });
    } finally {
      setBusy(false);
    }
  };

  const updateInvite = (idx: number, patch: Partial<InviteRow>) =>
    setInvites((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addInviteRow = () =>
    setInvites((rows) => [...rows, { email: "", role: "consultant" }]);
  const removeInviteRow = (idx: number) =>
    setInvites((rows) =>
      rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx)
    );

  const sendAllInvites = async () => {
    const pending = invites
      .map((r, idx) => ({ ...r, idx, email: r.email.trim() }))
      .filter(
        (r) =>
          r.email.length > 0 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email) &&
          !inviteSent.includes(r.email)
      );
    if (pending.length === 0) return;
    setBusy(true);
    setError(null);
    const successes: string[] = [];
    let firstError: string | null = null;
    for (const row of pending) {
      try {
        await orgApi.invite(row.email, row.role);
        successes.push(row.email);
      } catch (e) {
        const detail =
          (e as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ||
          (e as Error)?.message ||
          "Could not invite";
        if (!firstError)
          firstError = typeof detail === "string" ? detail : "Could not invite";
      }
    }
    if (successes.length > 0) {
      setInviteSent((s) => [...s, ...successes]);
      setInvites((rows) => {
        const remaining = rows.filter((r) => !successes.includes(r.email.trim()));
        return remaining.length === 0
          ? [{ email: "", role: "consultant" }]
          : remaining;
      });
    }
    if (firstError) setError(firstError);
    setBusy(false);
  };

  const finish = () => router.push("/dashboard");

  /* ── Step 5 (welcome) is a full-screen takeover ── */
  if (step === 5) {
    return <WelcomeScreen orgName={org?.name || "your practice"} onContinue={finish} />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
      <GridBg id="onb-grid" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_0%,transparent_0%,white_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple/[0.05] blur-3xl"
        aria-hidden
      />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple">
              <span className="font-heading text-[15px] font-semibold leading-none text-white">II</span>
            </span>
            <span className="font-heading text-[18px] font-semibold tracking-tight text-navy">
              IMMI-PULSE
            </span>
          </Link>
          <button
            onClick={finish}
            className="text-[14px] text-gray-text transition-colors hover:text-navy"
            type="button"
          >
            Skip & enter dashboard
          </button>
        </div>
      </header>

      {/* Stepper */}
      <div className="relative z-10 border-b border-border bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 py-5 lg:px-8">
          <Stepper current={step} />
        </div>
      </div>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-3xl px-6 py-12 lg:px-8 lg:py-16">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepShell key="s1">
              <StepHeader
                eyebrow="Step 1 of 4"
                title="Tell us about your practice."
                description="Two quick lines for the AI's context. The more it knows about your niche, the sharper its triage and document suggestions get."
              />

              <div className="mt-10 space-y-6 rounded-2xl border border-border bg-white p-8 shadow-sm">
                <TextareaField
                  label="Niche / area of focus"
                  id="niche"
                  value={niche}
                  onChange={setNiche}
                  placeholder="e.g. Employer-sponsored skilled (Australia), 482 / 186, 5+ yrs experience."
                  rows={4}
                  hint="Free-form — write how you'd describe your practice to a colleague."
                />
                <TextField
                  label="OMARA number"
                  id="omara"
                  value={omara}
                  onChange={setOmara}
                  placeholder="MARN 1234567"
                  hint="Optional — you can add this later in Settings."
                />
                {error && <ErrorBanner message={error} />}
              </div>

              <FooterNav
                primary={{
                  label: busy ? "Saving…" : "Continue",
                  busy,
                  onClick: saveStep1,
                }}
                secondary={{ label: "Skip for now", onClick: () => setStep(2) }}
              />
            </StepShell>
          )}

          {step === 2 && (
            <StepShell key="s2">
              <StepHeader
                eyebrow="Step 2 of 4"
                title="Choose the plan that fits."
                description="Every plan starts with a 14-day Professional trial — full feature set, no card on file. Switch tiers any time."
              />

              <div className="mt-10 space-y-4">
                {plans.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-white p-8 text-center text-[14px] text-gray-text">
                    Loading plans…
                  </div>
                ) : (
                  plans.map((p, idx) => (
                    <PlanCard
                      key={p.tier}
                      plan={p}
                      current={billing?.tier === p.tier}
                      recommended={p.is_default_signup}
                      disabled={busy}
                      onSelect={() => onSelectTier(p.tier)}
                      idx={idx}
                    />
                  ))
                )}
              </div>

              {/* Promo code */}
              <div className="mt-8 rounded-2xl border border-border bg-white p-6">
                <label htmlFor="promo" className="text-[13px] font-medium text-navy">
                  Pilot or promo code{" "}
                  <span className="font-normal text-gray-text">(optional)</span>
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="promo"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="PILOT-AU-2026"
                    className="flex-1 rounded-lg border border-border bg-white px-3.5 py-2.5 text-[15px] text-navy placeholder:text-gray-text/40 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
                  />
                  <button
                    type="button"
                    onClick={onRedeemPromo}
                    disabled={busy || !promoCode.trim()}
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-border bg-white px-5 py-2.5 text-[14px] font-medium text-navy transition-colors hover:border-purple/30 disabled:opacity-40"
                  >
                    {busy ? "Redeeming…" : "Redeem"}
                  </button>
                </div>
                {promoMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-3 text-[13px] ${
                      promoMsg.kind === "ok" ? "text-teal" : "text-red-600"
                    }`}
                  >
                    {promoMsg.kind === "ok" ? "✓ " : "⚠ "}
                    {promoMsg.text}
                  </motion.p>
                )}
              </div>

              {error && (
                <div className="mt-6">
                  <ErrorBanner message={error} />
                </div>
              )}

              <FooterNav
                primary={{ label: "Continue", onClick: () => setStep(3) }}
                secondary={{ label: "Back", onClick: () => setStep(1) }}
              />
            </StepShell>
          )}

          {step === 3 && (
            <StepShell key="s3">
              <StepHeader
                eyebrow="Step 3 of 4"
                title="Bring your team along — or fly solo."
                description="Add associates, paralegals, or admins now, or invite them later from Settings → Team."
              />

              {/* Educational seat-pricing card */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className="mt-10 rounded-2xl border border-purple/20 bg-purple/[0.03] p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple/10">
                    <Info className="h-5 w-5 text-purple" aria-hidden />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-[16px] font-semibold text-navy">
                      How seats work
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-gray-text">
                      Each teammate you invite is a separate seat on the{" "}
                      <span className="font-semibold text-navy">
                        {currentPlan?.name || "Professional"}
                      </span>{" "}
                      plan, billed at{" "}
                      <span className="font-semibold text-purple">{seatLabel}</span>{" "}
                      after your trial ends. Add or remove seats anytime — we prorate.
                    </p>
                    <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                      <SeatPerk label="Consultants" desc="Lodge cases" />
                      <SeatPerk label="Staff" desc="Assist & draft" />
                      <SeatPerk label="Admins" desc="Manage team" />
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* Invite rows */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={1}
                className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[14px] font-semibold text-navy">
                    Invite teammates
                  </h3>
                  <span className="text-[12px] text-gray-text">
                    {invites.length} {invites.length === 1 ? "seat" : "seats"} pending
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {invites.map((row, idx) => {
                    const removable = invites.length > 1;
                    return (
                      <div
                        key={idx}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center"
                      >
                        <div className="relative flex-1">
                          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text/60" />
                          <input
                            type="email"
                            value={row.email}
                            onChange={(e) =>
                              updateInvite(idx, { email: e.target.value })
                            }
                            placeholder="teammate@yourfirm.com"
                            className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-3.5 text-[15px] text-navy placeholder:text-gray-text/40 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
                          />
                        </div>
                        <select
                          value={row.role}
                          onChange={(e) =>
                            updateInvite(idx, { role: e.target.value as InviteRole })
                          }
                          className="rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-navy focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20 sm:w-40"
                        >
                          <option value="consultant">Consultant</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeInviteRow(idx)}
                          disabled={!removable}
                          aria-label="Remove row"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-gray-text transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border disabled:hover:bg-transparent disabled:hover:text-gray-text"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={addInviteRow}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-purple transition-colors hover:text-purple-deep"
                  >
                    <Plus className="h-4 w-4" />
                    Add another seat
                  </button>
                  <button
                    type="button"
                    onClick={sendAllInvites}
                    disabled={
                      busy ||
                      invites.every(
                        (r) =>
                          !r.email.trim() ||
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-5 py-2.5 text-[14px] font-medium text-white shadow-sm shadow-purple/20 transition-all hover:border-purple-deep hover:bg-purple-deep disabled:opacity-40"
                  >
                    {busy ? (
                      "Sending…"
                    ) : (
                      <>
                        Send invites
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-3 text-[12px] text-gray-text">
                  Each invite link expires in 14 days. We&apos;ll send a friendly email
                  with setup instructions.
                </p>

                {inviteSent.length > 0 && (
                  <motion.ul
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                    className="mt-5 space-y-2 border-t border-border pt-5"
                  >
                    {inviteSent.map((e) => (
                      <motion.li
                        key={e}
                        variants={fadeUp}
                        custom={0}
                        className="flex items-center gap-3 rounded-lg border border-teal/20 bg-teal/[0.04] px-4 py-2.5 text-[14px]"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
                        <span className="flex-1 truncate text-navy">{e}</span>
                        <span className="text-[12px] font-medium text-teal">Invited</span>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}

                {error && (
                  <div className="mt-4">
                    <ErrorBanner message={error} />
                  </div>
                )}
              </motion.div>

              {/* Where to manage seats later */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={2}
                className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-gray-light/60 p-4"
              >
                <SettingsIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-text" />
                <p className="text-[13px] leading-relaxed text-gray-text">
                  You can add, remove, and resend invites anytime from{" "}
                  <span className="font-semibold text-navy">Settings → Team</span>.
                  Seats are prorated, so you&apos;re only billed for what you use.
                </p>
              </motion.div>

              <FooterNav
                primary={{
                  label: inviteSent.length > 0 ? "Continue" : "Continue solo",
                  onClick: () => setStep(4),
                }}
                secondary={{ label: "Back", onClick: () => setStep(2) }}
              />
            </StepShell>
          )}

          {step === 4 && (
            <StepShell key="s4">
              <StepHeader
                eyebrow="Step 4 of 4"
                title="Ready to begin."
                description={
                  billing?.status === "active"
                    ? "Your pilot benefits are live — full access from minute one."
                    : "Fourteen days, full feature set, no card on file. We'll remind you before it ends."
                }
              />

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-10 rounded-2xl border border-border bg-white p-8 shadow-sm"
              >
                <div className="grid gap-6 sm:grid-cols-3">
                  <SummaryStat
                    label="Plan"
                    value={billing?.plan_name || "Professional"}
                  />
                  <SummaryStat
                    label={billing?.status === "active" ? "Status" : "Trial length"}
                    value={
                      billing?.status === "active"
                        ? "Active"
                        : billing?.trial_ends_at
                        ? `${daysLeft(billing.trial_ends_at)} days`
                        : "14 days"
                    }
                  />
                  <SummaryStat label="Card on file" value="Not required" />
                </div>

                {billing?.trial_ends_at && billing.status === "trial" && (
                  <p className="mt-6 border-t border-border pt-4 text-[13px] text-gray-text">
                    Trial ends{" "}
                    <span className="font-semibold text-navy">
                      {fmtDate(billing.trial_ends_at)}
                    </span>{" "}
                    · then {billing.price_label}
                  </p>
                )}
              </motion.div>

              <FooterNav
                primary={{
                  label:
                    billing?.status === "active"
                      ? "Enter your dashboard"
                      : "Start my 14-day trial",
                  onClick: () => setStep(5),
                }}
                secondary={{ label: "Back", onClick: () => setStep(3) }}
              />
            </StepShell>
          )}
        </AnimatePresence>

        <div className="mt-12 border-t border-border pt-6 text-center">
          <p className="text-[14px] text-gray-text">
            Need a guided tour?{" "}
            <Link
              href="/contact"
              className="font-semibold text-purple hover:text-purple-deep"
            >
              Book a call →
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────── HELPERS ─────────────────────── */

function daysLeft(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ─────────────────────── COMPONENTS ─────────────────────── */

function Stepper({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {steps.map((s, i) => {
        const idx = (i + 1) as Step;
        const isCurrent = idx === current;
        const isDone = idx < current;
        return (
          <li key={s.label} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors ${
                isDone
                  ? "bg-purple text-white"
                  : isCurrent
                  ? "border-2 border-purple bg-white text-purple"
                  : "border border-border bg-white text-gray-text/60"
              }`}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <div className="hidden min-w-0 flex-1 sm:block">
              <p
                className={`truncate text-[13px] font-medium ${
                  isCurrent || isDone ? "text-navy" : "text-gray-text/70"
                }`}
              >
                {s.label}
              </p>
              <p className="truncate text-[11px] text-gray-text/60">{s.sub}</p>
            </div>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={`hidden h-px flex-1 sm:block ${
                  isDone ? "bg-purple/40" : "bg-border"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function StepHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <span className="text-[12px] font-semibold uppercase tracking-wider text-purple">
        {eyebrow}
      </span>
      <h1 className="mt-3 font-heading text-[clamp(1.875rem,3.5vw,2.5rem)] font-normal leading-tight tracking-[-1px] text-navy">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-[16px] leading-relaxed text-gray-text">
        {description}
      </p>
    </div>
  );
}

function TextField({
  label,
  id,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-medium text-navy">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 block w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-[15px] text-navy placeholder:text-gray-text/40 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
      />
      {hint && <p className="mt-1.5 text-[12px] text-gray-text">{hint}</p>}
    </div>
  );
}

function TextareaField({
  label,
  id,
  value,
  onChange,
  placeholder,
  hint,
  rows = 3,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-medium text-navy">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 block w-full resize-none rounded-lg border border-border bg-white px-3.5 py-2.5 text-[15px] leading-relaxed text-navy placeholder:text-gray-text/40 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
      />
      {hint && <p className="mt-1.5 text-[12px] text-gray-text">{hint}</p>}
    </div>
  );
}

function PlanCard({
  plan,
  current,
  recommended,
  disabled,
  onSelect,
  idx,
}: {
  plan: Plan;
  current: boolean;
  recommended: boolean;
  disabled: boolean;
  onSelect: () => void;
  idx: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      disabled={disabled || current || plan.is_custom}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={idx}
      className={`group relative block w-full rounded-2xl border-2 bg-white p-6 text-left transition-all ${
        current
          ? "border-purple shadow-lg shadow-purple/15"
          : "border-border hover:border-purple/40 hover:shadow-md"
      } ${plan.is_custom ? "cursor-not-allowed opacity-90" : ""}`}
    >
      {recommended && !current && (
        <span className="absolute -top-3 left-6 rounded-full bg-purple px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          Recommended
        </span>
      )}
      {current && (
        <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-purple px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          <Check className="h-3 w-3" /> Current
        </span>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-[20px] font-semibold text-navy">
            {plan.name}
          </h3>
          <p className="mt-1 text-[14px] leading-relaxed text-gray-text">
            {plan.description}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-heading text-[28px] font-semibold leading-none text-navy">
            {plan.is_custom ? "Custom" : `$${plan.price_per_seat_aud_monthly}`}
          </p>
          {!plan.is_custom && (
            <p className="mt-1 text-[12px] text-gray-text">/seat/month</p>
          )}
        </div>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {plan.features.slice(0, 4).map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px] text-gray-text">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple" />
            <span className="leading-snug">{f}</span>
          </li>
        ))}
      </ul>
    </motion.button>
  );
}

function SeatPerk({ label, desc }: { label: string; desc: string }) {
  return (
    <li className="rounded-lg border border-border bg-white px-3 py-2.5">
      <p className="text-[13px] font-semibold text-navy">{label}</p>
      <p className="mt-0.5 text-[11px] text-gray-text">{desc}</p>
    </li>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-text/70">
        {label}
      </p>
      <p className="mt-2 font-heading text-[20px] font-semibold text-navy">
        {value}
      </p>
    </div>
  );
}

function FooterNav({
  primary,
  secondary,
}: {
  primary: { label: string; onClick: () => void; busy?: boolean };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-4">
      {secondary ? (
        <button
          type="button"
          onClick={secondary.onClick}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-border bg-white px-5 py-3 text-[14px] font-medium text-navy transition-colors hover:border-purple/30"
        >
          <ArrowLeft className="h-4 w-4" />
          {secondary.label}
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={primary.onClick}
        disabled={primary.busy}
        className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-7 py-3 text-[15px] font-medium text-white shadow-lg shadow-purple/25 transition-all hover:border-purple-deep hover:bg-purple-deep hover:shadow-purple-deep/25 disabled:opacity-60"
      >
        {primary.label}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
    >
      <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
}

/* ─────────────────────── WELCOME SCREEN ─────────────────────── */

const capabilities = [
  {
    icon: Inbox,
    title: "Triage every email",
    desc: "AI reads, classifies, and queues every client message by visa subclass and urgency.",
    color: "purple",
  },
  {
    icon: FileSearch,
    title: "Validate documents",
    desc: "Upload a passport, skills assessment, or payslip — get instant validation against AU migration rules.",
    color: "teal",
  },
  {
    icon: Users,
    title: "Manage every case",
    desc: "From pre-case enquiry to lodgement — one workspace, one timeline, zero spreadsheets.",
    color: "purple-deep",
  },
];

function WelcomeScreen({
  orgName,
  onContinue,
}: {
  orgName: string;
  onContinue: () => void;
}) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-white via-purple/[0.03] to-purple-muted/[0.08] px-6 py-12">
      {/* Backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="welcome-grid" x="0" y="0" width="56" height="56" patternUnits="userSpaceOnUse">
              <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#7C5CFC" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#welcome-grid)" opacity="0.04" />
        </svg>
      </div>
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-purple/[0.08] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-purple-muted/[0.1] blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl text-center">
        {/* Confetti spark */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple to-purple-deep shadow-xl shadow-purple/30"
        >
          <Rocket className="h-9 w-9 text-white" aria-hidden />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-8 text-[13px] font-semibold uppercase tracking-wider text-purple"
        >
          Welcome to IMMI-PULSE
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-4 font-heading text-[clamp(2.25rem,5vw,3.75rem)] font-normal leading-[1.05] tracking-[-1.5px] text-navy"
        >
          You&apos;re in,{" "}
          <span className="bg-gradient-to-r from-purple to-purple-deep bg-clip-text text-transparent">
            {orgName}
          </span>
          .
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-gray-text"
        >
          Your 14-day Professional trial is live. Here&apos;s what you can do from
          minute one.
        </motion.p>

        {/* Capability cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mt-14 grid gap-5 sm:grid-cols-3"
        >
          {capabilities.map((c, i) => (
            <motion.div
              key={c.title}
              variants={fadeUp}
              custom={i + 5}
              className="group relative overflow-hidden rounded-2xl border border-border bg-white p-6 text-left transition-all hover:-translate-y-1 hover:border-purple/30 hover:shadow-xl hover:shadow-purple/10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                <c.icon className="h-5 w-5 text-purple" aria-hidden />
              </div>
              <h3 className="mt-5 font-heading text-[17px] font-semibold text-navy">
                {c.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-gray-text">
                {c.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Reassurances */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.95 }}
          className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[13px] text-gray-text"
        >
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-purple" /> SOC 2 compliant
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-purple" /> Full feature set
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-purple" /> No credit card needed
          </span>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="mt-12"
        >
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-9 py-4 text-[16px] font-medium text-white shadow-xl shadow-purple/30 transition-all hover:border-purple-deep hover:bg-purple-deep hover:shadow-purple-deep/30"
          >
            Enter your dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-4 text-[13px] text-gray-text">
            Tip: start by setting up your first intake form to receive client enquiries.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
