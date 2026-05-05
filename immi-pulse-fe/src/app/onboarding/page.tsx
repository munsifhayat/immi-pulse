"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { orgApi, type BillingSummary, type Plan } from "@/lib/api/services";

const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif-d",
  display: "swap",
});

const mono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono-d",
  display: "swap",
});

const ease = [0.22, 1, 0.36, 1] as const;

type Step = 1 | 2 | 3 | 4;

const acts: Array<{ numeral: string; label: string; sub: string }> = [
  { numeral: "I.", label: "Practice", sub: "Niche & registration" },
  { numeral: "II.", label: "Plan", sub: "Tier & pilot code" },
  { numeral: "III.", label: "Team", sub: "Invite or fly solo" },
  { numeral: "IV.", label: "Trial", sub: "Begin your fortnight" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { org, refresh } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [niche, setNiche] = useState(org?.niche || "");
  const [omara, setOmara] = useState(org?.omara_number || "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteSent, setInviteSent] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Plan / promo state
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  // Load billing + plans once
  useEffect(() => {
    let mounted = true;
    Promise.all([orgApi.getBilling(), orgApi.listPlans()])
      .then(([b, p]) => {
        if (!mounted) return;
        setBilling(b);
        setPlans(p);
      })
      .catch(() => {
        // non-blocking — onboarding still works without billing fetch
      });
    return () => {
      mounted = false;
    };
  }, []);

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
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ||
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
      // Enterprise = sales-led; for now show an error with a contact prompt
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
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Could not change plan";
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
        const credits = r.credits_added ? `· ${r.credits_added.toLocaleString()} credits added` : "";
        setPromoMsg({
          kind: "ok",
          text: `${r.pilot_name || "Promo"} applied ${credits}`.trim(),
        });
      }
      setPromoCode("");
    } catch (e) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Promo code not recognised";
      setPromoMsg({ kind: "err", text: typeof detail === "string" ? detail : "Promo code not recognised" });
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await orgApi.invite(inviteEmail.trim(), "consultant");
      setInviteSent((s) => [...s, inviteEmail.trim()]);
      setInviteEmail("");
    } catch (e) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Could not invite";
      setError(typeof detail === "string" ? detail : "Could not invite");
    } finally {
      setBusy(false);
    }
  };

  const finish = () => router.push("/dashboard");

  return (
    <div
      className={`${serif.variable} ${mono.variable} min-h-screen w-full bg-[#0F1117] text-white antialiased lg:grid lg:grid-cols-[1.05fr_1fr]`}
    >
      {/* ─────────────── LEFT — EDITORIAL ACTS ─────────────── */}
      <aside className="relative isolate hidden overflow-hidden bg-[#0F1117] lg:flex lg:flex-col">
        <BackgroundLayers />

        {/* Top hairline meta */}
        <div className="relative z-10 flex items-center justify-between px-12 pt-10 font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.22em] text-white/55">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <span className="block h-1.5 w-1.5 rotate-45 bg-[#BDB4FE] transition-transform duration-500 group-hover:rotate-[225deg]" />
            <span>IMMI-PULSE</span>
            <span className="text-white/25">/</span>
            <span className="text-white/35">{org?.name || "YOUR PRACTICE"}</span>
          </Link>
          <span className="hidden tabular-nums text-white/35 xl:inline">
            FOLIO Nº 002 — MANIFEST
          </span>
        </div>

        {/* Centered editorial content */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-16">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.05 }}
            className="font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.32em] text-[#BDB4FE]/85"
          >
            <span className="inline-block h-px w-8 translate-y-[-3px] bg-[#BDB4FE]/60 align-middle" />
            <span className="ml-3">Registering your practice</span>
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.15 }}
            className="mt-7 max-w-[16ch] font-[family-name:var(--font-serif-d)] text-[clamp(2.8rem,4.4vw,4.4rem)] font-normal leading-[0.98] tracking-[-0.025em] text-white"
          >
            Four short{" "}
            <span className="italic text-[#BDB4FE]">formalities</span>, then we
            begin.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.28 }}
            className="mt-7 max-w-[44ch] text-[15px] leading-[1.65] text-white/70"
          >
            Context for the AI, the plan that fits, your team across the
            threshold, and a quiet ceremony to begin your fortnight. Every
            choice is editable later.
          </motion.p>

          {/* Acts list with progress */}
          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } },
            }}
            className="mt-10 space-y-1 border-l border-white/10"
          >
            {acts.map((act, i) => {
              const idx = (i + 1) as Step;
              const isCurrent = idx === step;
              const isDone = idx < step;
              return (
                <motion.li
                  key={act.numeral}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease } },
                  }}
                  className="relative pl-6"
                >
                  {isCurrent && (
                    <motion.span
                      layoutId="act-marker"
                      className="absolute left-[-1px] top-2 h-[calc(100%-1rem)] w-px bg-[#BDB4FE]"
                      transition={{ duration: 0.6, ease }}
                    />
                  )}
                  <div
                    className={`flex items-baseline gap-4 py-2.5 transition-colors duration-500 ${
                      isCurrent
                        ? "text-white"
                        : isDone
                        ? "text-white/40"
                        : "text-white/55"
                    }`}
                  >
                    <span
                      className={`font-[family-name:var(--font-serif-d)] text-[18px] italic ${
                        isCurrent ? "text-[#BDB4FE]" : "text-[#BDB4FE]/45"
                      }`}
                    >
                      {act.numeral}
                    </span>
                    <span className="flex-1">
                      <span
                        className={`block text-[15.5px] leading-snug ${
                          isCurrent
                            ? "font-[family-name:var(--font-serif-d)] italic"
                            : ""
                        }`}
                      >
                        {act.label}
                      </span>
                      <span className="mt-0.5 block font-[family-name:var(--font-mono-d)] text-[10px] uppercase tracking-[0.2em] text-white/40">
                        {act.sub}
                      </span>
                    </span>
                    {isDone && (
                      <span
                        aria-hidden
                        className="font-[family-name:var(--font-mono-d)] text-[10px] uppercase tracking-[0.2em] text-[#BDB4FE]/65"
                      >
                        signed
                      </span>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        </div>

        {/* Bottom — folio seal */}
        <div className="relative z-10 flex items-end justify-between px-12 pb-10 xl:px-16">
          <PassportSeal step={step} />

          <motion.blockquote
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.7 }}
            className="hidden max-w-[28ch] text-right xl:block"
          >
            <p className="font-[family-name:var(--font-serif-d)] text-[15.5px] italic leading-snug text-white/65">
              &ldquo;The first quiet morning in months — pre-cases just appear,
              triaged.&rdquo;
            </p>
            <footer className="mt-3 font-[family-name:var(--font-mono-d)] text-[9.5px] uppercase tracking-[0.24em] text-white/40">
              — Senior Agent, Brisbane
            </footer>
          </motion.blockquote>
        </div>
      </aside>

      {/* ─────────────── RIGHT — THE FORM ─────────────── */}
      <section className="relative flex min-h-screen flex-col bg-white text-[#0F1117]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 50% at 80% 0%, rgba(124,92,252,0.05), transparent 70%)",
          }}
        />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between border-b border-[#0F1117]/8 px-6 py-5 sm:px-10 lg:border-b-0 lg:px-12 lg:py-7">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.22em] text-[#0F1117]/60 lg:hidden"
          >
            <span className="block h-1.5 w-1.5 rotate-45 bg-[#7C5CFC]" />
            IMMI-PULSE
          </Link>
          <button
            onClick={finish}
            className="ml-auto inline-flex items-center gap-1.5 font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.22em] text-[#0F1117]/55 transition-colors hover:text-[#0F1117]"
            type="button"
            title="Skip the rest of onboarding and go straight to the dashboard"
          >
            Skip & enter dashboard
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative z-10 flex flex-1 items-start justify-center px-6 pb-14 pt-6 sm:px-10 lg:px-14 xl:px-20">
          <div className="w-full max-w-[520px]">
            {/* Step indicator */}
            <div className="mb-7 flex items-center gap-3 font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.32em] text-[#7C5CFC]">
              <span className="block h-px w-6 bg-[#7C5CFC]/40" />
              <span>
                Act {romanFor(step)} of IV ·{" "}
                {acts[step - 1].label}
              </span>
            </div>

            {/* Progress hairline */}
            <div aria-hidden className="mb-9 grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={`h-px transition-colors duration-700 ${
                    n <= step ? "bg-[#0F1117]" : "bg-[#0F1117]/12"
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <StepWrap key="s1">
                  <Title>
                    Tell us about your{" "}
                    <span className="italic text-[#5B3ADB]">practice</span>.
                  </Title>
                  <Deck>
                    Two quick lines for the AI&apos;s context. The more it knows
                    about your niche, the sharper its triage and document
                    suggestions get.
                  </Deck>

                  <div className="mt-10 space-y-7">
                    <TextareaField
                      num="01"
                      label="Niche / area of focus"
                      id="niche"
                      value={niche}
                      onChange={setNiche}
                      placeholder="e.g. Employer-sponsored skilled (Australia), 482 / 186, 5+ yrs experience."
                      rows={3}
                      hint="Free-form"
                    />
                    <TextField
                      num="02"
                      label="OMARA number"
                      id="omara"
                      value={omara}
                      onChange={setOmara}
                      placeholder="MARN 1234567"
                      hint="Optional"
                    />
                    {error && <ErrorBanner message={error} />}
                  </div>

                  <Footer
                    primary={{
                      label: busy ? "Saving manifest…" : "Continue",
                      busy,
                      onClick: saveStep1,
                    }}
                    secondary={{ label: "Skip for now", onClick: () => setStep(2) }}
                  />
                </StepWrap>
              )}

              {step === 2 && (
                <StepWrap key="s2">
                  <Title>
                    Choose the{" "}
                    <span className="italic text-[#5B3ADB]">plan</span> that
                    fits.
                  </Title>
                  <Deck>
                    Every plan starts with a 14-day Professional trial — full
                    feature set, no card on file. Switch tiers any time. If
                    you&apos;ve been given a pilot code, redeem it below.
                  </Deck>

                  {/* Plan picker */}
                  <div className="mt-9 space-y-3">
                    {plans.length === 0 ? (
                      <p className="font-[family-name:var(--font-mono-d)] text-[11px] uppercase tracking-[0.18em] text-[#4B5563]/60">
                        Loading plans…
                      </p>
                    ) : (
                      plans.map((p, idx) => {
                        const current = billing?.tier === p.tier;
                        return (
                          <PlanRow
                            key={p.tier}
                            num={String(idx + 1).padStart(2, "0")}
                            plan={p}
                            current={current}
                            disabled={busy}
                            onSelect={() => onSelectTier(p.tier)}
                          />
                        );
                      })
                    )}
                  </div>

                  {/* Promo code */}
                  <div className="mt-10">
                    <div className="group relative">
                      <label
                        htmlFor="promo"
                        className="flex items-baseline justify-between font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.22em] text-[#4B5563]/85"
                      >
                        <span>
                          <span className="text-[#7C5CFC]/70">04</span>
                          <span className="mx-2 text-[#0F1117]/15">/</span>
                          <span>Pilot or promo code</span>
                        </span>
                        <span className="text-[#4B5563]/55 normal-case tracking-normal">
                          Optional
                        </span>
                      </label>
                      <div className="mt-2 flex items-stretch gap-3 border-b border-[#0F1117]/15 transition-colors focus-within:border-[#0F1117]">
                        <input
                          id="promo"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          placeholder="PILOT-AU-2026"
                          autoComplete="off"
                          className="peer block flex-1 border-0 bg-transparent px-0 pb-2.5 pt-1 font-[family-name:var(--font-mono-d)] text-[16px] tracking-[0.06em] text-[#0F1117] outline-none placeholder:text-[#4B5563]/30 focus:ring-0"
                        />
                        <button
                          type="button"
                          onClick={onRedeemPromo}
                          disabled={busy || !promoCode.trim()}
                          className="shrink-0 self-end pb-2.5 pt-1 font-[family-name:var(--font-mono-d)] text-[11.5px] font-medium uppercase tracking-[0.2em] text-[#0F1117] transition-opacity hover:text-[#5B3ADB] disabled:opacity-30"
                        >
                          {busy ? "redeeming…" : "redeem →"}
                        </button>
                      </div>
                    </div>

                    {promoMsg && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-3 font-[family-name:var(--font-mono-d)] text-[11px] uppercase tracking-[0.16em] ${
                          promoMsg.kind === "ok"
                            ? "text-[#5B3ADB]"
                            : "text-red-700"
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

                  <Footer
                    primary={{ label: "Continue", onClick: () => setStep(3) }}
                    secondary={{ label: "Back", onClick: () => setStep(1) }}
                  />
                </StepWrap>
              )}

              {step === 3 && (
                <StepWrap key="s3">
                  <Title>
                    Bring your{" "}
                    <span className="italic text-[#5B3ADB]">team</span> along —
                    or fly solo.
                  </Title>
                  <Deck>
                    Send invitations now, or do it later from Settings → Team.
                    Each invite link expires in 14 days.
                  </Deck>

                  <div className="mt-10 space-y-6">
                    <div className="group relative">
                      <label
                        htmlFor="invite"
                        className="flex items-baseline justify-between font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.22em] text-[#4B5563]/85"
                      >
                        <span>
                          <span className="text-[#7C5CFC]/70">01</span>
                          <span className="mx-2 text-[#0F1117]/15">/</span>
                          <span>Teammate email</span>
                        </span>
                      </label>
                      <div className="mt-2 flex items-stretch gap-3 border-b border-[#0F1117]/15 transition-colors focus-within:border-[#0F1117]">
                        <input
                          id="invite"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="associate@yourfirm.com"
                          autoComplete="off"
                          className="peer block flex-1 border-0 bg-transparent px-0 pb-2.5 pt-1 text-[18px] text-[#0F1117] outline-none placeholder:text-[#4B5563]/40 focus:ring-0"
                        />
                        <button
                          type="button"
                          onClick={sendInvite}
                          disabled={busy || !inviteEmail.trim()}
                          className="shrink-0 self-end pb-2.5 pt-1 font-[family-name:var(--font-mono-d)] text-[11.5px] font-medium uppercase tracking-[0.2em] text-[#0F1117] transition-opacity hover:text-[#5B3ADB] disabled:opacity-30"
                        >
                          {busy ? "sending…" : "send →"}
                        </button>
                      </div>
                    </div>

                    {inviteSent.length > 0 && (
                      <motion.ul
                        initial="hidden"
                        animate="visible"
                        variants={{
                          hidden: {},
                          visible: { transition: { staggerChildren: 0.06 } },
                        }}
                        className="space-y-1 border-l border-[#0F1117]/10 pl-4"
                      >
                        {inviteSent.map((e) => (
                          <motion.li
                            key={e}
                            variants={{
                              hidden: { opacity: 0, x: -8 },
                              visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease } },
                            }}
                            className="flex items-baseline gap-3 py-1.5 font-[family-name:var(--font-mono-d)] text-[12px] tracking-[0.04em] text-[#0F1117]/80"
                          >
                            <span className="text-[#5B3ADB]">✓</span>
                            <span className="lowercase">{e}</span>
                            <span className="ml-auto text-[10px] uppercase tracking-[0.2em] text-[#4B5563]/55">
                              Invited
                            </span>
                          </motion.li>
                        ))}
                      </motion.ul>
                    )}

                    {error && <ErrorBanner message={error} />}
                  </div>

                  <Footer
                    primary={{ label: "Continue", onClick: () => setStep(4) }}
                    secondary={{ label: "Back", onClick: () => setStep(2) }}
                  />
                </StepWrap>
              )}

              {step === 4 && (
                <StepWrap key="s4">
                  <Title>
                    Begin your{" "}
                    <span className="italic text-[#5B3ADB]">trial</span>.
                  </Title>
                  <Deck>
                    {billing?.status === "active"
                      ? "Your pilot benefits are live — full access from minute one. Switch plans whenever the work calls for it."
                      : "Fourteen days, full feature set, no card on file. We'll remind you before it ends — switch to a plan only when you're ready."}
                  </Deck>

                  {/* Editorial trial card */}
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease, delay: 0.15 }}
                    className="mt-10 grid grid-cols-3 gap-px overflow-hidden border border-[#0F1117]/10 bg-[#0F1117]/10"
                  >
                    <SummaryStat label="Plan" value={billing?.plan_name || "Professional"} />
                    <SummaryStat
                      label={billing?.status === "active" ? "Status" : "Trial"}
                      value={
                        billing?.status === "active"
                          ? "Active"
                          : billing?.trial_ends_at
                          ? `${daysLeft(billing.trial_ends_at)} days`
                          : "14 days"
                      }
                    />
                    <SummaryStat label="Card" value="Not required" />
                  </motion.div>

                  {billing?.trial_ends_at && billing.status === "trial" && (
                    <p className="mt-4 font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.18em] text-[#4B5563]/70">
                      Trial ends {fmtDate(billing.trial_ends_at)} · then{" "}
                      {billing.price_label}
                    </p>
                  )}

                  <motion.ul
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
                    }}
                    className="mt-10 space-y-3 border-l border-[#0F1117]/10 pl-5"
                  >
                    {[
                      "Build your first intake form, share the public link.",
                      "Watch submissions land in the inbox, AI-triaged.",
                      "Send the engagement letter — sign, pay, open the case.",
                    ].map((line, i) => (
                      <motion.li
                        key={i}
                        variants={{
                          hidden: { opacity: 0, x: -8 },
                          visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease } },
                        }}
                        className="flex items-baseline gap-3 text-[14.5px] text-[#0F1117]/80"
                      >
                        <span className="font-[family-name:var(--font-serif-d)] text-[16px] italic text-[#5B3ADB]/80">
                          {["I.", "II.", "III."][i]}
                        </span>
                        <span className="leading-snug">{line}</span>
                      </motion.li>
                    ))}
                  </motion.ul>

                  <div className="mt-12 flex items-center justify-between gap-6">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="group inline-flex items-center gap-2 font-[family-name:var(--font-mono-d)] text-[11px] uppercase tracking-[0.22em] text-[#4B5563] transition-colors hover:text-[#0F1117]"
                    >
                      <span className="block h-px w-6 bg-[#4B5563]/40 transition-all duration-500 group-hover:w-9 group-hover:bg-[#0F1117]" />
                      Back
                    </button>
                    <SubmitBar
                      label={
                        billing?.status === "active"
                          ? "Enter your dashboard"
                          : "Start my 14-day trial"
                      }
                      onClick={finish}
                    />
                  </div>
                </StepWrap>
              )}
            </AnimatePresence>

            {/* Hairline footer */}
            <div className="mt-12 flex items-center justify-between border-t border-[#0F1117]/8 pt-6">
              <p className="font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.22em] text-[#4B5563]/70">
                Need a guided tour?
              </p>
              <Link
                href="/contact"
                className="group inline-flex items-center gap-1.5 font-[family-name:var(--font-mono-d)] text-[11px] uppercase tracking-[0.2em] text-[#0F1117]"
              >
                Book a call
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ────────────────────────── HELPERS ────────────────────────── */

function romanFor(step: Step): string {
  return step === 1 ? "I" : step === 2 ? "II" : step === 3 ? "III" : "IV";
}

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

/* ────────────────────────── COMPONENTS ────────────────────────── */

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.3, ease } }}
      transition={{ duration: 0.7, ease }}
    >
      {children}
    </motion.div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-[family-name:var(--font-serif-d)] text-[40px] font-normal leading-[1.0] tracking-[-0.02em] text-[#0F1117] sm:text-[46px]">
      {children}
    </h2>
  );
}

function Deck({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 max-w-[44ch] text-[15px] leading-[1.55] text-[#4B5563]">
      {children}
    </p>
  );
}

function TextField({
  num,
  label,
  id,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  num: string;
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div className="group relative">
      <label
        htmlFor={id}
        className="flex items-baseline justify-between font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.22em] text-[#4B5563]/85"
      >
        <span>
          <span className="text-[#7C5CFC]/70">{num}</span>
          <span className="mx-2 text-[#0F1117]/15">/</span>
          <span>{label}</span>
        </span>
        {hint && (
          <span className="text-[#4B5563]/55 normal-case tracking-normal">{hint}</span>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="peer mt-2 block w-full border-0 border-b border-[#0F1117]/15 bg-transparent px-0 pb-2.5 pt-1 text-[18px] text-[#0F1117] outline-none transition-colors placeholder:text-[#4B5563]/40 focus:border-[#0F1117] focus:ring-0"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-[#7C5CFC] transition-transform duration-500 ease-out peer-focus:scale-x-100"
      />
    </div>
  );
}

function TextareaField({
  num,
  label,
  id,
  value,
  onChange,
  placeholder,
  hint,
  rows = 3,
}: {
  num: string;
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <div className="group relative">
      <label
        htmlFor={id}
        className="flex items-baseline justify-between font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.22em] text-[#4B5563]/85"
      >
        <span>
          <span className="text-[#7C5CFC]/70">{num}</span>
          <span className="mx-2 text-[#0F1117]/15">/</span>
          <span>{label}</span>
        </span>
        {hint && (
          <span className="text-[#4B5563]/55 normal-case tracking-normal">{hint}</span>
        )}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="peer mt-2 block w-full resize-none border-0 border-b border-[#0F1117]/15 bg-transparent px-0 pb-2.5 pt-1 text-[16px] leading-[1.55] text-[#0F1117] outline-none transition-colors placeholder:text-[#4B5563]/40 focus:border-[#0F1117] focus:ring-0"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-[#7C5CFC] transition-transform duration-500 ease-out peer-focus:scale-x-100"
      />
    </div>
  );
}

function PlanRow({
  num,
  plan,
  current,
  disabled,
  onSelect,
}: {
  num: string;
  plan: Plan;
  current: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled || current || plan.is_custom}
      className={`group relative block w-full border border-[#0F1117]/10 bg-white px-5 py-5 text-left transition-all duration-300 ${
        current
          ? "border-[#0F1117] shadow-[inset_4px_0_0_0_#5B3ADB]"
          : "hover:border-[#0F1117]/35 hover:-translate-y-0.5"
      } ${plan.is_custom ? "cursor-not-allowed opacity-90" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.22em] text-[#4B5563]/70">
          <span className="text-[#7C5CFC]/70">{num}</span>
          <span className="mx-2 text-[#0F1117]/15">/</span>
          <span>{plan.name}</span>
        </div>
        {current && (
          <span className="font-[family-name:var(--font-mono-d)] text-[10px] uppercase tracking-[0.22em] text-[#5B3ADB]">
            ✓ Current
          </span>
        )}
        {plan.is_custom && (
          <span className="font-[family-name:var(--font-mono-d)] text-[10px] uppercase tracking-[0.22em] text-[#4B5563]/60">
            Sales-led
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h4 className="font-[family-name:var(--font-serif-d)] text-[24px] leading-tight tracking-[-0.012em] text-[#0F1117]">
          {plan.description}
        </h4>
        <span className="shrink-0 font-[family-name:var(--font-serif-d)] text-[20px] italic text-[#0F1117]">
          {plan.is_custom ? "Custom" : `$${plan.price_per_seat_aud_monthly}`}
          {!plan.is_custom && (
            <span className="ml-1 font-[family-name:var(--font-mono-d)] text-[10px] not-italic uppercase tracking-[0.16em] text-[#4B5563]/70">
              /seat/mo
            </span>
          )}
        </span>
      </div>
      <ul className="mt-3 grid gap-x-5 gap-y-1 text-[12.5px] text-[#4B5563] sm:grid-cols-2">
        {plan.features.slice(0, 4).map((f) => (
          <li key={f} className="flex items-baseline gap-2">
            <span className="text-[#7C5CFC]/60">·</span>
            <span className="leading-snug">{f}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-5">
      <p className="font-[family-name:var(--font-mono-d)] text-[9.5px] uppercase tracking-[0.22em] text-[#4B5563]/70">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-serif-d)] text-[22px] leading-tight tracking-[-0.01em] text-[#0F1117]">
        {value}
      </p>
    </div>
  );
}

function Footer({
  primary,
  secondary,
}: {
  primary: { label: string; onClick: () => void; busy?: boolean };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mt-12 flex items-center justify-between gap-6">
      {secondary ? (
        <button
          type="button"
          onClick={secondary.onClick}
          className="group inline-flex items-center gap-2 font-[family-name:var(--font-mono-d)] text-[11px] uppercase tracking-[0.22em] text-[#4B5563] transition-colors hover:text-[#0F1117]"
        >
          <span className="block h-px w-6 bg-[#4B5563]/40 transition-all duration-500 group-hover:w-9 group-hover:bg-[#0F1117]" />
          {secondary.label}
        </button>
      ) : (
        <span />
      )}
      <SubmitBar label={primary.label} onClick={primary.onClick} busy={primary.busy} />
    </div>
  );
}

function SubmitBar({
  label,
  onClick,
  busy,
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="group relative inline-flex min-w-[260px] flex-1 items-center justify-between overflow-hidden bg-[#0F1117] py-4 pl-6 pr-5 text-left transition-all duration-500 hover:bg-[#5B3ADB] disabled:opacity-60 sm:flex-none"
    >
      <span className="font-[family-name:var(--font-mono-d)] text-[12.5px] font-medium uppercase tracking-[0.24em] text-white">
        {label}
      </span>
      <span className="relative ml-4 inline-flex items-center gap-3 text-white">
        <span className="h-px w-8 bg-white/40 transition-all duration-500 group-hover:w-12 group-hover:bg-white" />
        <svg
          width="22"
          height="10"
          viewBox="0 0 22 10"
          fill="none"
          className="transition-transform duration-500 group-hover:translate-x-1"
          aria-hidden
        >
          <path
            d="M0 5h20M16 1l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="square"
          />
        </svg>
      </span>
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-l-2 border-red-500 bg-red-50 px-4 py-3 font-[family-name:var(--font-mono-d)] text-[12px] tracking-[0.04em] text-red-700"
    >
      ⚠ {message}
    </motion.div>
  );
}

/* ─────────────────── LEFT PANEL DECORATION ─────────────────── */

function BackgroundLayers() {
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 18% 100%, rgba(124,92,252,0.22), transparent 70%), radial-gradient(ellipse 60% 50% at 90% 0%, rgba(45,212,191,0.10), transparent 65%)",
        }}
      />
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full opacity-[0.18]"
        viewBox="0 0 800 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="contour-onb" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#BDB4FE" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7C5CFC" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {Array.from({ length: 14 }).map((_, i) => {
          const r = 220 + i * 60;
          return (
            <ellipse
              key={i}
              cx="120"
              cy="980"
              rx={r}
              ry={r * 0.78}
              fill="none"
              stroke="url(#contour-onb)"
              strokeWidth="0.7"
            />
          );
        })}
      </svg>
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 60% 40%, #000 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 70% at 60% 40%, #000 30%, transparent 80%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 mix-blend-overlay opacity-[0.18]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent"
      />
    </>
  );
}

function PassportSeal({ step }: { step: Step }) {
  const labels: Record<Step, string> = {
    1: "Practice",
    2: "Plan",
    3: "Team",
    4: "Confirmed",
  };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: -8 }}
      transition={{ duration: 1.1, ease, delay: 0.55 }}
      className="relative h-[148px] w-[148px] shrink-0"
      aria-hidden
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full animate-[spin_60s_linear_infinite] text-[#BDB4FE]/85"
      >
        <defs>
          <path
            id="seal-curve-onb"
            d="M 100,100 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0"
          />
        </defs>
        <text
          fontFamily="var(--font-mono-d), ui-monospace"
          fontSize="9.6"
          letterSpacing="3.6"
          fill="currentColor"
        >
          <textPath href="#seal-curve-onb" startOffset="0">
            REGISTRATION · MANIFEST · COMMONWEALTH OF AUSTRALIA · ✦ ·
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-[20px] rounded-full border border-[#BDB4FE]/40" />
      <div className="absolute inset-[30px] rounded-full border border-dashed border-[#BDB4FE]/25" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-[family-name:var(--font-mono-d)] text-[9.5px] uppercase tracking-[0.28em] text-white/55">
          Folio
        </span>
        <span className="mt-1 font-[family-name:var(--font-serif-d)] text-[34px] italic leading-none text-white">
          Nº 002
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.5, ease }}
            className="mt-1.5 font-[family-name:var(--font-mono-d)] text-[8.5px] uppercase tracking-[0.28em] text-[#BDB4FE]/80"
          >
            {labels[step]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
