"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Inbox,
  FileSearch,
  Users,
  CheckCircle2,
  X,
  Mail,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  Building2,
  Globe,
  User,
  Tag,
  Ticket,
  ArrowUpRight,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { orgApi, type BillingSummary, type Plan } from "@/lib/api/services";
import { fadeUp, stagger } from "@/lib/motion";
import { PulseMark } from "@/components/brand/pulse-mark";
import { ConfettiBurst } from "@/components/brand/confetti-burst";
import {
  CLIENT_FOCUS,
  EXPERIENCE_BANDS,
  EXPERTISE_GROUPS,
  emptyProfile,
  parseProfile,
  profileSummary,
  serialiseProfile,
  type ClientFocusOption,
  type PracticeProfile,
} from "@/lib/practice-catalog";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_META: Array<{ label: string; sub: string }> = [
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
          <pattern id={id} x="0" y="0" width="56" height="56" patternUnits="userSpaceOnUse">
            <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#7C5CFC" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} opacity="0.045" />
      </svg>
    </div>
  );
}

const FOCUS_ICONS: Record<ClientFocusOption["icon"], typeof User> = {
  user: User,
  users: Users,
  briefcase: Briefcase,
  graduation: GraduationCap,
  building: Building2,
  globe: Globe,
};

export default function OnboardingPage() {
  const router = useRouter();
  const { org, refresh } = useAuth();
  const [step, setStep] = useState<Step>(1);

  // Step 1 — practice profile (structured) + OMARA
  const [profile, setProfile] = useState<PracticeProfile>(emptyProfile());
  const [omara, setOmara] = useState(org?.omara_number || "");
  const [profileHydrated, setProfileHydrated] = useState(false);

  useEffect(() => {
    if (!org || profileHydrated) return;
    setProfile(parseProfile(org.niche));
    if (org.omara_number) setOmara(org.omara_number);
    setProfileHydrated(true);
  }, [org, profileHydrated]);

  // Step 2 — billing
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Step 3 — team
  type InviteRole = "consultant" | "staff" | "admin";
  type InviteRow = { email: string; role: InviteRole };
  const [invites, setInvites] = useState<InviteRow[]>([
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
  const seatPrice = currentPlan?.price_per_seat_aud_monthly ?? 450;
  const seatLabel = currentPlan?.is_custom ? "Custom" : `A$${seatPrice}/seat/mo`;

  /* ─── handlers ─── */

  const goNext = () => setStep((s) => (Math.min(5, s + 1) as Step));
  const goBack = () => setStep((s) => (Math.max(1, s - 1) as Step));
  const goStep = (s: Step) => setStep(s);

  const persistProfile = async (next: PracticeProfile, nextOmara: string) => {
    const niche = serialiseProfile(next);
    await orgApi.update({
      niche,
      omara_number: nextOmara || undefined,
    });
    await refresh();
  };

  const saveStep1 = async () => {
    setError(null);
    setBusy(true);
    try {
      // Empty profile is allowed. We still persist OMARA when set.
      await persistProfile(profile, omara);
      goNext();
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

  const skipStep1 = async () => {
    // Skipping must never error — we don't write anything, just advance.
    setError(null);
    goNext();
  };

  const onSelectTier = async (tier: Plan["tier"]) => {
    if (!billing) return;
    if (billing.tier === tier) return;
    if (tier === "enterprise") {
      setError("Enterprise is sales-led. Reach out from Settings → Billing once you're inside.");
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

  const fireConfetti = () => {
    setConfettiKey((k) => k + 1);
    setShowConfetti(true);
    window.setTimeout(() => setShowConfetti(false), 1600);
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
        const credits = r.credits_added
          ? ` · ${r.credits_added.toLocaleString()} credits added`
          : "";
        setPromoMsg({
          kind: "ok",
          text: `${r.pilot_name || "Promo"} applied${credits}`,
        });
        fireConfetti();
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

  const onResetPromo = async () => {
    setBusy(true);
    setPromoMsg(null);
    try {
      const r = await orgApi.resetPromo();
      setBilling(r.billing);
      setPromoCode("");
      setPromoMsg({
        kind: "ok",
        text: r.reset
          ? "Promo cleared. You can redeem another code now."
          : "No promo was applied.",
      });
    } catch (e) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not reset promo";
      setPromoMsg({
        kind: "err",
        text: typeof detail === "string" ? detail : "Could not reset promo",
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
    setInvites((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx)));

  const sendAllInvites = async () => {
    const pending = invites
      .map((r) => ({ ...r, email: r.email.trim() }))
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

  /* Step 5 (welcome) is a full-screen takeover */
  if (step === 5) {
    return <WelcomeScreen orgName={org?.name || "your practice"} onContinue={finish} />;
  }

  const stepIdx = step - 1;
  const profileLine = profileSummary(profile);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
      {/* ─── Atmospheric backdrop ─── */}
      <GridBg id="onb-grid" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_-5%,rgba(124,92,252,0.10),transparent_70%)]"
        aria-hidden
      />
      <div
        className="animate-orb-drift pointer-events-none absolute -right-40 top-32 h-[520px] w-[520px] rounded-full bg-purple/[0.06] blur-3xl"
        aria-hidden
      />
      <div
        className="animate-orb-drift pointer-events-none absolute -bottom-56 -left-40 h-[480px] w-[480px] rounded-full bg-purple-muted/[0.10] blur-3xl"
        style={{ animationDelay: "-7s" }}
        aria-hidden
      />

      {/* ─── Top folio strip ─── */}
      <div className="relative z-20 border-b border-white/10 bg-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-2.5 lg:px-8">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">
            Onboarding · 04 stages
          </span>
          <span className="hidden items-center gap-2.5 text-[12.5px] text-white/85 md:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-light opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-light" />
            </span>
            {STEP_META[stepIdx]?.label} stage
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">
            {String(step).padStart(2, "0")} / 04
          </span>
        </div>
      </div>

      {/* ─── Header ─── */}
      <header className="relative z-10 border-b border-border bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <PulseMark size={36} />
            <span className="flex flex-col leading-none">
              <span className="font-heading text-[18px] font-semibold tracking-tight text-navy">
                IMMI-PULSE
              </span>
              <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.3em] text-gray-text/70">
                Migration Operating System
              </span>
            </span>
          </Link>
          <div className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-gray-text/70 md:flex">
            <span className="text-purple">{STEP_META[stepIdx]?.label}</span>
            <span aria-hidden>·</span>
            <span>{STEP_META[stepIdx]?.sub}</span>
          </div>
        </div>
      </header>

      {/* ─── Stepper ─── */}
      <div className="relative z-10 border-b border-border bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-5 lg:px-8">
          <Stepper current={step} onJump={(s) => s < step && goStep(s)} />
        </div>
      </div>

      {/* ─── Content ─── */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-14 lg:px-8 lg:pb-28 lg:pt-20">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepShell key="s1">
              <StepHeader
                eyebrow={`Step 01 / 04 · Practice`}
                title="Tell us about your practice."
                description="Tap to teach the AI what you actually work on. Your case mix sharpens triage, document checks and lead routing. Skip anything you'd rather fill in later."
              />

              {/* Visa expertise — chip groups */}
              <SectionCard
                title="Visa case expertise"
                eyebrow="Section 01"
                hint={
                  profile.expertise.length
                    ? `${profile.expertise.length} selected`
                    : "Multi-select. Tap to add."
                }
                custom={0}
              >
                <div className="space-y-7">
                  {EXPERTISE_GROUPS.map((g) => (
                    <ExpertiseGroupBlock
                      key={g.id}
                      group={g}
                      selected={profile.expertise}
                      onToggle={(id) =>
                        setProfile((p) => ({
                          ...p,
                          expertise: p.expertise.includes(id)
                            ? p.expertise.filter((x) => x !== id)
                            : [...p.expertise, id],
                        }))
                      }
                    />
                  ))}
                </div>
              </SectionCard>

              {/* Client focus */}
              <SectionCard
                title="Client focus"
                eyebrow="Section 02"
                hint={
                  profile.audience.length
                    ? `${profile.audience.length} selected`
                    : "Who you serve. Multi-select."
                }
                custom={1}
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {CLIENT_FOCUS.map((opt) => {
                    const Icon = FOCUS_ICONS[opt.icon];
                    const active = profile.audience.includes(opt.id);
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() =>
                          setProfile((p) => ({
                            ...p,
                            audience: active
                              ? p.audience.filter((x) => x !== opt.id)
                              : [...p.audience, opt.id],
                          }))
                        }
                        className={`group flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                          active
                            ? "border-purple bg-purple/[0.04] shadow-[0_8px_24px_-12px_rgba(124,92,252,0.45)]"
                            : "border-border bg-white hover:-translate-y-0.5 hover:border-purple/30 hover:shadow-[0_10px_28px_-18px_rgba(15,17,23,0.18)]"
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            active
                              ? "bg-purple text-white"
                              : "bg-purple/10 text-purple-deep group-hover:bg-purple/15"
                          }`}
                        >
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14.5px] font-semibold text-navy">
                            {opt.label}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] text-gray-text">
                            {opt.desc}
                          </span>
                        </span>
                        {active && (
                          <Check className="ml-auto h-4 w-4 shrink-0 text-purple" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              {/* Years of practice */}
              <SectionCard
                title="Years of practice"
                eyebrow="Section 03"
                hint="Pick one"
                custom={2}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {EXPERIENCE_BANDS.map((band) => {
                    const active = profile.experience === band.id;
                    return (
                      <button
                        type="button"
                        key={band.id}
                        onClick={() =>
                          setProfile((p) => ({
                            ...p,
                            experience: active ? null : band.id,
                          }))
                        }
                        className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${
                          active
                            ? "border-purple bg-purple text-white shadow-[0_10px_24px_-12px_rgba(124,92,252,0.55)]"
                            : "border-border bg-white text-navy hover:border-purple/30"
                        }`}
                      >
                        <span className="block font-heading text-[18px] font-semibold leading-none tracking-tight">
                          {band.label}
                        </span>
                        <span
                          className={`mt-2 block text-[12px] ${
                            active ? "text-white/80" : "text-gray-text"
                          }`}
                        >
                          {band.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              {/* OMARA */}
              <SectionCard
                title="OMARA registration"
                eyebrow="Section 04"
                hint="Optional. Letters and numbers."
                custom={3}
              >
                <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-white transition-shadow focus-within:border-purple focus-within:ring-2 focus-within:ring-purple/20">
                  <span className="flex select-none items-center gap-2 border-r border-border bg-gray-light/70 px-4 font-mono text-[11px] uppercase tracking-[0.22em] text-gray-text">
                    MARN
                  </span>
                  <input
                    id="omara"
                    value={omara}
                    onChange={(e) => setOmara(e.target.value)}
                    placeholder="e.g. 1234567 or 23-XXXXX"
                    className="block w-full bg-white px-4 py-3 text-[15px] text-navy placeholder:text-gray-text/40 focus:outline-none"
                  />
                </div>
                <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-gray-text/70">
                  You can add or change this anytime in Settings · Practice.
                </p>
              </SectionCard>

              {error && <ErrorBanner message={error} />}

              <FooterNav
                primary={{
                  label: busy ? "Saving…" : "Save & continue",
                  busy,
                  onClick: saveStep1,
                }}
                back={null}
                skip={{ label: "Skip this step", onClick: skipStep1 }}
                meta={profileLine}
              />
            </StepShell>
          )}

          {step === 2 && (
            <StepShell key="s2">
              <StepHeader
                eyebrow="Step 02 / 04 · Plan"
                title="Pick the tier that fits the way you work."
                description="Every plan starts on a 14-day Professional trial — full feature set, no card on file. Switch tiers any time."
              />

              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="mt-10 grid gap-5 lg:grid-cols-3"
              >
                {plans.length === 0
                  ? [0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-[320px] animate-pulse rounded-2xl border border-border bg-white"
                      />
                    ))
                  : plans.map((p, idx) => (
                      <PlanCard
                        key={p.tier}
                        plan={p}
                        current={billing?.tier === p.tier}
                        recommended={p.is_default_signup}
                        disabled={busy}
                        onSelect={() => onSelectTier(p.tier)}
                        idx={idx}
                      />
                    ))}
              </motion.div>

              {/* Promo code */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={3}
                className="relative mt-8 overflow-hidden rounded-2xl border border-border bg-white"
              >
                <div className="flex items-center justify-between border-b border-border/70 bg-gradient-to-b from-gray-light to-white px-6 py-3.5">
                  <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-gray-text/75">
                    <Ticket className="h-3 w-3" />
                    Pilot or promo code
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-text/55">
                    {billing?.pilot_code ? "Applied" : "Optional"}
                  </span>
                </div>
                <div className="relative p-6">
                  {/* Confetti origin — sits behind the redeem button */}
                  {showConfetti && (
                    <span className="pointer-events-none absolute right-12 top-12">
                      <ConfettiBurst key={confettiKey} />
                    </span>
                  )}

                  {billing?.pilot_code ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-3 rounded-xl border border-teal/25 bg-teal/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal/15 text-teal">
                          <CheckCircle2 className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-teal">
                            Pilot active · {billing.pilot_code}
                          </p>
                          <p className="mt-1 truncate text-[14px] font-semibold text-navy">
                            {billing.pilot_name || "Pilot benefits applied"}
                          </p>
                          <p className="mt-0.5 text-[12.5px] text-gray-text">
                            {billing.plan_name} unlocked · trial waived · credits granted.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onResetPromo}
                        disabled={busy}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-border bg-white px-4 py-2.5 text-[13px] font-medium text-navy transition-colors hover:border-purple/30 hover:text-purple-deep disabled:opacity-40"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {busy ? "Resetting…" : "Reset & re-test"}
                      </button>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id="promo"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="ENTER PILOT CODE"
                        className="flex-1 rounded-xl border border-border bg-white px-4 py-3 text-[15px] tracking-[0.05em] text-navy placeholder:text-gray-text/40 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
                      />
                      <button
                        type="button"
                        onClick={onRedeemPromo}
                        disabled={busy || !promoCode.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-navy bg-navy px-6 py-3 text-[14px] font-medium text-white transition-all hover:bg-navy-light disabled:opacity-40"
                      >
                        {busy ? "Redeeming…" : "Redeem code"}
                      </button>
                    </div>
                  )}

                  {promoMsg && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-3 inline-flex items-center gap-1.5 text-[13px] ${
                        promoMsg.kind === "ok" ? "text-teal" : "text-red-600"
                      }`}
                    >
                      {promoMsg.kind === "ok" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      {promoMsg.text}
                    </motion.p>
                  )}
                </div>
              </motion.div>

              {error && (
                <div className="mt-6">
                  <ErrorBanner message={error} />
                </div>
              )}

              <FooterNav
                primary={{ label: "Continue", onClick: goNext }}
                back={{ label: "Back", onClick: goBack }}
                skip={{ label: "Skip this step", onClick: goNext }}
              />
            </StepShell>
          )}

          {step === 3 && (
            <StepShell key="s3">
              <StepHeader
                eyebrow="Step 03 / 04 · Team"
                title="Bring your team along — or fly solo."
                description="Add associates, paralegals or admins now, or invite them later from Settings → Team. Seats are prorated, so you only pay for what you use."
              />

              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className="mt-10 overflow-hidden rounded-2xl border border-purple/15 bg-gradient-to-br from-purple-muted/25 via-white to-white"
              >
                <div className="flex items-start gap-4 p-6">
                  <PulseMark size={44} rings={false} />
                  <div className="flex-1">
                    <h3 className="font-heading text-[16px] font-semibold text-navy">
                      How seats work
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-gray-text">
                      Each teammate is a separate seat on the{" "}
                      <span className="font-semibold text-navy">
                        {currentPlan?.name || "Professional"}
                      </span>{" "}
                      plan, billed at{" "}
                      <span className="font-semibold text-purple">{seatLabel}</span>{" "}
                      after your trial ends. Add or remove seats anytime.
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
                className="mt-6 overflow-hidden rounded-2xl border border-border bg-white"
              >
                <div className="flex items-center justify-between border-b border-border/70 bg-gradient-to-b from-gray-light to-white px-6 py-3.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-text/75">
                    Roster · pending invites
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-text/55">
                    {invites.length} {invites.length === 1 ? "seat" : "seats"}
                  </span>
                </div>
                <div className="space-y-3 p-6">
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
                            className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-3.5 text-[15px] text-navy placeholder:text-gray-text/40 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
                          />
                        </div>
                        <RoleSelect
                          value={row.role}
                          onChange={(role) => updateInvite(idx, { role })}
                        />
                        <button
                          type="button"
                          onClick={() => removeInviteRow(idx)}
                          disabled={!removable}
                          aria-label="Remove row"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-gray-text transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border disabled:hover:bg-transparent disabled:hover:text-gray-text"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-gray-light/40 px-6 py-3.5">
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

                {inviteSent.length > 0 && (
                  <motion.ul
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2 border-t border-border bg-teal/[0.03] p-6"
                  >
                    {inviteSent.map((e) => (
                      <motion.li
                        key={e}
                        variants={fadeUp}
                        custom={0}
                        className="flex items-center gap-3 rounded-lg border border-teal/20 bg-white px-4 py-2.5 text-[14px]"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
                        <span className="flex-1 truncate text-navy">{e}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal">
                          Invited
                        </span>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}

                {error && (
                  <div className="border-t border-border p-6">
                    <ErrorBanner message={error} />
                  </div>
                )}
              </motion.div>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={2}
                className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-gray-light/60 p-4"
              >
                <SettingsIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-text" />
                <p className="text-[13px] leading-relaxed text-gray-text">
                  You can add, remove and resend invites anytime from{" "}
                  <span className="font-semibold text-navy">Settings → Team</span>.
                  Each invite link expires in 14 days.
                </p>
              </motion.div>

              <FooterNav
                primary={{
                  label: inviteSent.length > 0 ? "Continue" : "Continue solo",
                  onClick: goNext,
                }}
                back={{ label: "Back", onClick: goBack }}
                skip={{ label: "Skip this step", onClick: goNext }}
              />
            </StepShell>
          )}

          {step === 4 && (
            <StepShell key="s4">
              <StepHeader
                eyebrow="Step 04 / 04 · Confirm"
                title="One last look before launch."
                description="Here's how your workspace is configured. Confirm to wrap up onboarding. Everything below stays editable in Settings, so refine as you go."
              />

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-10 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_30px_80px_-50px_rgba(15,17,23,0.18)]"
              >
                <div className="flex items-center justify-between border-b border-border/70 bg-gradient-to-b from-gray-light to-white px-7 py-3.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-text/75">
                    Trial summary · {STEP_META[stepIdx]?.label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/20 bg-teal/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-teal">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    Secured
                  </span>
                </div>

                <div className="grid gap-6 p-7 sm:grid-cols-3">
                  <SummaryStat
                    label="Plan"
                    value={billing?.plan_name || currentPlan?.name || "Professional"}
                    sub={billing?.price_label || currentPlan?.price_label}
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
                    sub={
                      billing?.status === "active"
                        ? billing?.pilot_code
                          ? `Pilot · ${billing.pilot_code}`
                          : "Trial waived"
                        : "Full feature set"
                    }
                  />
                  <SummaryStat label="Card on file" value="Not required" sub="Add later in Billing" />
                </div>

                <div className="grid gap-px bg-border sm:grid-cols-2">
                  <SummaryRow
                    label="Practice profile"
                    value={profileLine || "Free-form"}
                    icon={Tag}
                  />
                  <SummaryRow
                    label="Team seats"
                    value={
                      inviteSent.length
                        ? `${inviteSent.length} invited · 1 owner`
                        : "Solo · 1 owner"
                    }
                    icon={Users}
                  />
                </div>

                {billing?.trial_ends_at && billing.status === "trial" && (
                  <p className="border-t border-border px-7 py-4 font-mono text-[10.5px] uppercase tracking-[0.22em] text-gray-text/75">
                    Trial ends{" "}
                    <span className="text-navy">
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
                      ? "Confirm & continue"
                      : "Start my 14-day trial",
                  onClick: goNext,
                }}
                back={{ label: "Back", onClick: goBack }}
                skip={null}
              />
            </StepShell>
          )}
        </AnimatePresence>
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

function Stepper({
  current,
  onJump,
}: {
  current: Step;
  onJump: (s: Step) => void;
}) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {STEP_META.map((s, i) => {
        const idx = (i + 1) as Step;
        const isCurrent = idx === current;
        const isDone = idx < current;
        const clickable = isDone;
        const Tag = clickable ? "button" : "div";
        return (
          <li key={s.label} className="flex flex-1 items-center gap-2 sm:gap-3">
            <Tag
              {...(clickable ? { type: "button", onClick: () => onJump(idx) } : {})}
              className={`group flex flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors sm:gap-3 ${
                clickable ? "hover:bg-purple/5" : "cursor-default"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors ${
                  isDone
                    ? "bg-purple text-white"
                    : isCurrent
                    ? "border-2 border-purple bg-white text-purple shadow-[0_0_0_4px_rgba(124,92,252,0.12)]"
                    : "border border-border bg-white text-gray-text/60"
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <div className="hidden min-w-0 flex-1 sm:block">
                <p
                  className={`truncate font-mono text-[10.5px] uppercase tracking-[0.22em] ${
                    isCurrent || isDone ? "text-navy" : "text-gray-text/55"
                  }`}
                >
                  Step 0{i + 1}
                </p>
                <p
                  className={`mt-0.5 truncate text-[13px] font-medium ${
                    isCurrent || isDone ? "text-navy" : "text-gray-text/70"
                  }`}
                >
                  {s.label}
                </p>
              </div>
            </Tag>
            {i < STEP_META.length - 1 && (
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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
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
    <div className="mx-auto max-w-2xl text-center">
      <span className="editorial-eyebrow justify-center">
        <span>{eyebrow}</span>
      </span>
      <h1
        className="mt-5 font-heading font-normal leading-[1.05] tracking-[-1.3px] text-navy"
        style={{ fontSize: "clamp(2.1rem, 4.2vw, 3.2rem)" }}
      >
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-[16px] leading-[1.6] text-gray-text">
        {description}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  eyebrow,
  hint,
  children,
  custom,
}: {
  title: string;
  eyebrow: string;
  hint?: string;
  children: React.ReactNode;
  custom: number;
}) {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={custom}
      className="mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_0_rgba(15,17,23,0.02)]"
    >
      <header className="flex items-center justify-between border-b border-border/70 bg-gradient-to-b from-gray-light to-white px-6 py-3.5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-text/75">
            {eyebrow}
          </span>
          <span className="font-heading text-[15px] font-semibold text-navy">
            {title}
          </span>
        </div>
        {hint && (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-text/65">
            {hint}
          </span>
        )}
      </header>
      <div className="p-6">{children}</div>
    </motion.section>
  );
}

function ExpertiseGroupBlock({
  group,
  selected,
  onToggle,
}: {
  group: (typeof EXPERTISE_GROUPS)[number];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <p className="font-heading text-[14px] font-semibold text-navy">
            {group.title}
          </p>
          <p className="mt-0.5 text-[12.5px] text-gray-text">
            {group.description}
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-text/55">
          {group.options.filter((o) => selected.includes(o.id)).length || ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {group.options.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              type="button"
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              className={`group inline-flex items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                active
                  ? "border-purple bg-purple text-white shadow-[0_6px_18px_-10px_rgba(124,92,252,0.55)]"
                  : "border-border bg-white text-navy hover:-translate-y-px hover:border-purple/40"
              }`}
            >
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                  active ? "bg-white" : "bg-purple/40"
                }`}
              />
              <span>{opt.label}</span>
              {opt.hint && (
                <span
                  className={`text-[11px] font-normal ${
                    active ? "text-white/80" : "text-gray-text"
                  }`}
                >
                  {opt.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RoleSelect({
  value,
  onChange,
}: {
  value: "consultant" | "staff" | "admin";
  onChange: (v: "consultant" | "staff" | "admin") => void;
}) {
  const options: Array<{ id: "consultant" | "staff" | "admin"; label: string }> = [
    { id: "consultant", label: "Consultant" },
    { id: "staff", label: "Staff" },
    { id: "admin", label: "Admin" },
  ];
  return (
    <div className="inline-flex h-11 shrink-0 items-stretch overflow-hidden rounded-xl border border-border bg-white text-[12.5px] sm:w-auto">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            type="button"
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`px-3 font-medium transition-colors ${
              active
                ? "bg-navy text-white"
                : "text-gray-text hover:bg-gray-light/70 hover:text-navy"
            }`}
          >
            {o.label}
          </button>
        );
      })}
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
  const accent = recommended || current;
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      disabled={disabled || current || plan.is_custom}
      variants={fadeUp}
      custom={idx}
      className={`group relative block w-full overflow-hidden rounded-2xl border-2 bg-white p-6 text-left transition-all ${
        current
          ? "border-purple shadow-[0_24px_60px_-30px_rgba(124,92,252,0.55)]"
          : recommended
          ? "border-purple/60 shadow-[0_18px_50px_-30px_rgba(124,92,252,0.4)] hover:border-purple"
          : "border-border hover:-translate-y-1 hover:border-purple/40 hover:shadow-[0_18px_40px_-22px_rgba(15,17,23,0.18)]"
      } ${plan.is_custom ? "cursor-not-allowed opacity-95" : ""}`}
    >
      {accent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple via-purple to-purple-deep"
        />
      )}

      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-text/70">
          Tier · {plan.tier === "pro" ? "professional" : plan.tier}
        </span>
        {current ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white">
            <Check className="h-3 w-3" /> Current
          </span>
        ) : recommended ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-purple-deep">
            <Sparkles className="h-3 w-3" /> Recommended
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 font-heading text-[24px] font-semibold tracking-tight text-navy">
        {plan.name}
      </h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-text">
        {plan.description}
      </p>

      <div className="mt-5 flex items-baseline gap-2">
        {plan.is_custom ? (
          <span className="font-heading text-[28px] font-semibold leading-none text-navy">
            Custom
          </span>
        ) : (
          <>
            <span className="font-heading text-[36px] font-semibold leading-none tracking-tight text-navy">
              A${plan.price_per_seat_aud_monthly}
            </span>
            <span className="text-[12.5px] text-gray-text">/ seat / month</span>
          </>
        )}
      </div>
      <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-gray-text/65">
        {plan.is_custom ? "Talk to sales" : "Billed monthly · prorated"}
      </p>

      <div className="mt-5 h-px bg-border" />

      <ul className="mt-5 space-y-2">
        {plan.features.slice(0, 6).map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px] leading-snug text-gray-text">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {!current && !plan.is_custom && (
        <div className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-purple group-hover:text-purple-deep">
          Select {plan.name}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      )}
      {plan.is_custom && (
        <div className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-text">
          Sales-led from inside Settings
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      )}
    </motion.button>
  );
}

function SeatPerk({ label, desc }: { label: string; desc: string }) {
  return (
    <li className="rounded-lg border border-border bg-white px-3 py-2.5">
      <p className="text-[13px] font-semibold text-navy">{label}</p>
      <p className="mt-0.5 text-[11.5px] text-gray-text">{desc}</p>
    </li>
  );
}

function SummaryStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-text/70">
        {label}
      </p>
      <p className="mt-2 font-heading text-[22px] font-semibold leading-tight tracking-tight text-navy">
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-[12.5px] text-gray-text">{sub}</p>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Tag;
}) {
  return (
    <div className="flex items-center gap-3 bg-white px-7 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple/10 text-purple-deep">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-text/70">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[14px] text-navy">{value}</p>
      </div>
    </div>
  );
}

function FooterNav({
  primary,
  back,
  skip,
  meta,
}: {
  primary: { label: string; onClick: () => void; busy?: boolean };
  back: { label: string; onClick: () => void } | null;
  skip: { label: string; onClick: () => void } | null;
  meta?: string;
}) {
  return (
    <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {back ? (
          <button
            type="button"
            onClick={back.onClick}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-border bg-white px-5 py-3 text-[14px] font-medium text-navy transition-colors hover:border-purple/30 hover:text-purple-deep"
          >
            <ArrowLeft className="h-4 w-4" />
            {back.label}
          </button>
        ) : (
          <span aria-hidden className="hidden h-11 w-px bg-transparent" />
        )}
        {skip && (
          <button
            type="button"
            onClick={skip.onClick}
            className="text-[13px] font-medium text-gray-text underline-offset-4 transition-colors hover:text-navy hover:underline"
          >
            {skip.label}
          </button>
        )}
        {meta && (
          <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.22em] text-gray-text/65 sm:inline">
            {meta}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={primary.onClick}
        disabled={primary.busy}
        className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-purple bg-purple px-7 py-3.5 text-[15px] font-medium text-white shadow-[0_14px_28px_-12px_rgba(124,92,252,0.55)] transition-all hover:border-purple-deep hover:bg-purple-deep hover:shadow-[0_18px_36px_-12px_rgba(91,58,219,0.6)] disabled:opacity-60"
      >
        <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
        <span className="relative">{primary.label}</span>
        <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
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
    desc: "AI reads, classifies and queues every client message by visa subclass and urgency.",
  },
  {
    icon: FileSearch,
    title: "Validate documents",
    desc: "Upload a passport, skills assessment or payslip. Get instant validation against AU migration rules.",
  },
  {
    icon: Users,
    title: "Manage every case",
    desc: "From pre-case enquiry to lodgement. One workspace, one timeline, zero spreadsheets.",
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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white px-6 py-14">
      {/* Backdrop */}
      <GridBg id="welcome-grid" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_50%_0%,rgba(124,92,252,0.13),transparent_70%)]"
        aria-hidden
      />
      <div
        className="animate-orb-drift pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-purple/[0.08] blur-3xl"
        aria-hidden
      />
      <div
        className="animate-orb-drift pointer-events-none absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-purple-muted/[0.12] blur-3xl"
        style={{ animationDelay: "-7s" }}
        aria-hidden
      />

      {/* Top folio strip */}
      <div className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-2.5 lg:px-8">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">
            Onboarding · Complete
          </span>
          <span className="hidden items-center gap-2.5 text-[12.5px] text-white/85 md:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-light opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-light" />
            </span>
            Your trial is now live
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">
            04 / 04
          </span>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl text-center">
        {/* Mascot */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="mx-auto"
        >
          <PulseMark size={84} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="editorial-eyebrow mt-7 justify-center"
        >
          <span>Welcome aboard</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-5 font-heading font-normal leading-[1.02] tracking-[-1.6px] text-navy"
          style={{ fontSize: "clamp(2.5rem, 5.4vw, 4.25rem)" }}
        >
          You&apos;re in,{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-purple via-purple to-purple-deep bg-clip-text text-transparent">
              {orgName}
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
                  <stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#7C5CFC" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#5B3ADB" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          .
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.55] text-gray-text"
        >
          Your workspace is ready. Set up your first intake form to start
          receiving enquiries, or import a live case to watch the AI work end
          to end.
        </motion.p>

        {/* Capability cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mt-12 grid gap-5 sm:grid-cols-3"
        >
          {capabilities.map((c, i) => (
            <motion.div
              key={c.title}
              variants={fadeUp}
              custom={i + 5}
              className="group relative overflow-hidden rounded-2xl border border-border bg-white p-6 text-left transition-all hover:-translate-y-1 hover:border-purple/30 hover:shadow-[0_24px_50px_-24px_rgba(124,92,252,0.25)]"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-gray-text/70">
                Capability · 0{i + 1}
              </span>
              <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10 ring-1 ring-purple/15">
                <c.icon className="h-5 w-5 text-purple-deep" aria-hidden />
              </div>
              <h3 className="mt-5 font-heading text-[17px] font-semibold text-navy">
                {c.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-gray-text">
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
          className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.22em] text-gray-text/75"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-purple" /> Encrypted
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-purple" /> Full feature set
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-purple" /> No card required
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
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-purple bg-purple px-9 py-4 text-[16px] font-medium text-white shadow-[0_18px_36px_-10px_rgba(124,92,252,0.55)] transition-all hover:border-purple-deep hover:bg-purple-deep hover:shadow-[0_24px_44px_-12px_rgba(91,58,219,0.6)]"
          >
            <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
            <span className="relative">Enter your dashboard</span>
            <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.22em] text-gray-text/65">
            Tip · start with your first intake form to receive enquiries
          </p>
        </motion.div>
      </div>
    </div>
  );
}
