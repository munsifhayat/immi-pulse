"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  FileSearch,
  Inbox,
  Lock,
  Globe,
  Phone as PhoneIcon,
  User as UserIcon,
  Clock,
} from "lucide-react";

/* lucide-react v1+ no longer ships brand marks. Inline minimal glyphs so the
   social-link inputs render with the right monochrome icon. */
const Instagram = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
  </svg>
);
const Linkedin = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
  </svg>
);
const Facebook = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07c0 4.96 3.66 9.07 8.44 9.84v-6.96H7.9v-2.88h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.19 2.24.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.77l-.44 2.88h-2.33V22c4.78-.77 8.44-4.88 8.44-9.93z" />
  </svg>
);
import { useAuth } from "@/lib/auth";
import { fadeUp, stagger } from "@/lib/motion";
import { PulseMark } from "@/components/brand/pulse-mark";

const valueProps = [
  {
    icon: Inbox,
    title: "AI visa classification",
    desc: "Every inbound email classified in seconds. Subclass, urgency, next action.",
  },
  {
    icon: FileSearch,
    title: "Document intelligence",
    desc: "Trained on Australian migration law and OMARA practice, not generic templates.",
  },
  {
    icon: Sparkles,
    title: "Case manifest",
    desc: "Every client, every case, organised in one defensible workspace.",
  },
];

const PASSWORD_MIN = 8;

type Step = 1 | 2;

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

function normalizeUrl(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function passwordScore(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= PASSWORD_MIN) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^\w\s]/.test(pw)) score += 1;
  const labels = ["Too short", "Weak", "Fair", "Strong", "Excellent"];
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] };
}

export default function SignupPage() {
  const { signup } = useAuth();

  // Flow control
  const [step, setStep] = useState<Step>(1);

  // Step 1 — personal
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 — practice
  const [firmName, setFirmName] = useState("");
  const [website, setWebsite] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [facebook, setFacebook] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pwStrength = useMemo(() => passwordScore(password), [password]);
  const passwordValid = password.length >= PASSWORD_MIN;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const step1Complete =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phone.trim().length > 0 &&
    passwordValid &&
    passwordsMatch;

  const onNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!passwordValid) {
      setError(`Password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setStep(2);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!firmName.trim()) {
      setError("Please add your practice or firm name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const socials: Record<string, string> = {};
      if (instagram.trim()) socials.instagram = instagram.trim();
      if (linkedin.trim()) socials.linkedin = linkedin.trim();
      if (facebook.trim()) socials.facebook = facebook.trim();

      await signup({
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        firm_name: firmName.trim(),
        phone: phone.trim() || undefined,
        website: normalizeUrl(website),
        business_phone: businessPhone.trim() || undefined,
        contact_person: contactPerson.trim() || undefined,
        business_hours: businessHours.trim() || undefined,
        social_links: Object.keys(socials).length > 0 ? socials : undefined,
      });
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        "Signup failed";
      setError(typeof detail === "string" ? detail : "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
      {/* ─── Atmospheric backdrop ─── */}
      <GridBg id="signup-grid" />
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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-2.5 lg:px-8">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">
            Issue 01 · MMXXVI
          </span>
          <span className="hidden items-center gap-2.5 text-[12.5px] text-white/85 md:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-light opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-light" />
            </span>
            Now onboarding OMARA-registered agents across Australia
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">
            Sydney · Melbourne · Perth
          </span>
        </div>
      </div>

      {/* ─── Header ─── */}
      <header className="relative z-10 border-b border-border bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
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

          <div className="flex items-center gap-5">
            <Link
              href="/contact"
              className="hidden text-[13.5px] text-gray-text transition-colors hover:text-navy md:inline-flex"
            >
              Talk to us
            </Link>
            <span aria-hidden className="hidden h-4 w-px bg-border md:block" />
            <p className="text-[13.5px] text-gray-text">
              Already a member?{" "}
              <Link
                href="/login"
                className="font-medium text-purple hover:text-purple-deep"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="relative z-10 mx-auto grid w-full max-w-7xl gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:px-8 lg:pb-28 lg:pt-28">
        {/* Left — pitch */}
        <section className="relative">
          {/* Decorative seal — sits in the negative space */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-2 top-6 hidden h-32 w-32 lg:block"
          >
            <svg viewBox="0 0 128 128" className="animate-seal-sweep h-full w-full opacity-[0.18]">
              <defs>
                <path
                  id="circle-path"
                  d="M 64,64 m -52,0 a 52,52 0 1,1 104,0 a 52,52 0 1,1 -104,0"
                />
              </defs>
              <text className="fill-purple-deep font-mono" style={{ fontSize: 9, letterSpacing: "0.25em" }}>
                <textPath href="#circle-path">
                  IMMI-PULSE · OMARA-FIRST · BUILT IN AUSTRALIA · EST. MMXXVI ·
                </textPath>
              </text>
            </svg>
          </div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="editorial-eyebrow"
          >
            <span>Professional Edition for OMARA Agents</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="mt-6 font-heading font-normal leading-[1.02] tracking-[-1.6px] text-navy"
            style={{ fontSize: "clamp(2.6rem, 5.2vw, 4.25rem)" }}
          >
            Where modern{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-purple via-purple to-purple-deep bg-clip-text text-transparent">
                migration
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
                  stroke="url(#under)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="under" x1="0" x2="1">
                    <stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#7C5CFC" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#5B3ADB" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
              </svg>
            </span>{" "}
            practice takes shape.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="mt-7 max-w-xl text-[18px] leading-[1.55] text-gray-text"
          >
            Engineered for OMARA-registered agents who treat migration as a profession.
            Every email triaged, every document checked, every case audit-ready, on the
            workspace your standard of practice deserves.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-gray-text"
          >
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-purple" />
              <span className="font-medium text-navy">14-day Pro trial</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-purple" />
              No credit card
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-purple" />
              Switch plans anytime
            </span>
          </motion.div>

          <motion.ul
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="mt-12 space-y-4"
          >
            {valueProps.map((v, i) => (
              <motion.li
                key={v.title}
                variants={fadeUp}
                custom={i + 4}
                className="group relative flex items-start gap-4 rounded-2xl border border-border bg-white/85 p-5 shadow-[0_1px_0_rgba(15,17,23,0.02)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-purple/30 hover:shadow-[0_18px_40px_-24px_rgba(124,92,252,0.35)]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple/10 ring-1 ring-purple/15 transition-colors group-hover:bg-purple/15">
                  <v.icon className="h-5 w-5 text-purple-deep" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-[16px] font-semibold text-navy">
                    {v.title}
                  </h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-gray-text">
                    {v.desc}
                  </p>
                </div>
                <span
                  aria-hidden
                  className="ml-auto self-center font-mono text-[10px] uppercase tracking-[0.25em] text-gray-text/40"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </motion.li>
            ))}
          </motion.ul>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={8}
            className="mt-10 flex items-start gap-4 rounded-2xl border border-purple/15 bg-gradient-to-br from-purple-muted/30 via-white to-white p-5"
          >
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-purple-deep" aria-hidden />
            <div>
              <p className="text-[14px] leading-relaxed text-gray-text">
                <span className="font-semibold text-navy">14-day Professional trial.</span>{" "}
                Full feature set, no credit card. Hosted in Sydney with Australian data
                residency.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Right — form */}
        <section className="relative">
          {/* Quiet ambient glow behind the card */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-br from-purple/15 via-transparent to-purple-muted/30 opacity-70 blur-2xl"
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-3xl border border-border bg-white shadow-[0_30px_80px_-40px_rgba(15,17,23,0.18),0_4px_12px_-6px_rgba(15,17,23,0.06)]"
          >
            {/* Card header — folio strip */}
            <div className="relative flex items-center justify-between border-b border-border/70 bg-gradient-to-b from-gray-light to-white px-8 py-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-text/70">
                {step === 1 ? "Form 01 / About you" : "Form 02 / Your practice"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/20 bg-teal/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-teal">
                <Lock className="h-2.5 w-2.5" />
                Secure
              </span>
            </div>

            {/* Step indicator */}
            <div className="border-b border-border/70 bg-white px-8 pt-4">
              <StepDots step={step} onJump={(s) => s < step && setStep(s)} />
            </div>

            <div className="px-8 py-9 sm:px-10">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <h2 className="font-heading text-[30px] font-semibold leading-[1.1] tracking-[-0.5px] text-navy sm:text-[34px]">
                      Create your account
                    </h2>
                    <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-gray-text">
                      Start with your details. Three minutes to onboard. 14-day
                      Professional trial, no card required.
                    </p>

                    <form onSubmit={onNext} className="mt-8 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          label="First name"
                          id="firstName"
                          value={firstName}
                          onChange={setFirstName}
                          required
                          placeholder="Jane"
                        />
                        <FormField
                          label="Last name"
                          id="lastName"
                          value={lastName}
                          onChange={setLastName}
                          required
                          placeholder="Doe"
                        />
                      </div>
                      <FormField
                        label="Work email"
                        id="email"
                        type="email"
                        value={email}
                        onChange={setEmail}
                        required
                        placeholder="you@firm.com.au"
                      />

                      <PhoneField value={phone} onChange={setPhone} />

                      <FormField
                        label="Password"
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={setPassword}
                        required
                        minLength={PASSWORD_MIN}
                        hint={`Minimum ${PASSWORD_MIN} characters`}
                        trailing={
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="text-gray-text transition-colors hover:text-navy"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                      />

                      {password.length > 0 && (
                        <PasswordStrength score={pwStrength.score} label={pwStrength.label} />
                      )}

                      <FormField
                        label="Confirm password"
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        required
                        minLength={PASSWORD_MIN}
                        hint={
                          passwordsMismatch
                            ? "Passwords do not match"
                            : passwordsMatch
                            ? "Match confirmed"
                            : undefined
                        }
                        hintTone={passwordsMismatch ? "error" : passwordsMatch ? "success" : "muted"}
                        trailing={passwordsMatch ? <Check className="h-4 w-4 text-teal" /> : null}
                      />

                      {error && <ErrorBanner message={error} />}

                      <button
                        type="submit"
                        disabled={!step1Complete}
                        className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-purple bg-purple px-7 py-4 text-[15.5px] font-medium text-white shadow-[0_14px_30px_-10px_rgba(124,92,252,0.55)] transition-all hover:border-purple-deep hover:bg-purple-deep hover:shadow-[0_18px_36px_-10px_rgba(91,58,219,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                        <span className="relative">Continue</span>
                        <ArrowRight
                          className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </button>

                      <p className="pt-1 text-center text-[12.5px] leading-relaxed text-gray-text">
                        By continuing you agree to our{" "}
                        <Link href="/terms" className="font-medium text-navy underline underline-offset-2 hover:text-purple">
                          Terms
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="font-medium text-navy underline underline-offset-2 hover:text-purple">
                          Privacy Policy
                        </Link>
                        .
                      </p>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <h2 className="font-heading text-[30px] font-semibold leading-[1.1] tracking-[-0.5px] text-navy sm:text-[34px]">
                      Tell us about your practice
                    </h2>
                    <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-gray-text">
                      A richer profile means a sharper public page and faster client
                      pickup. Only the firm name is required — skip anything you&apos;d
                      rather add later.
                    </p>

                    <form onSubmit={submit} className="mt-8 space-y-5">
                      <FormField
                        label="Practice / firm name"
                        id="firmName"
                        value={firmName}
                        onChange={setFirmName}
                        required
                        placeholder="Acme Migration Co."
                      />

                      <FormField
                        label="Website"
                        id="website"
                        type="text"
                        inputMode="url"
                        value={website}
                        onChange={setWebsite}
                        placeholder="acmemigration.com.au"
                        leadingIcon={<Globe className="h-4 w-4" />}
                      />

                      <PhoneField
                        value={businessPhone}
                        onChange={setBusinessPhone}
                        label="Business phone"
                        id="businessPhone"
                        hint="For your public profile"
                        required={false}
                        icon={<PhoneIcon className="h-4 w-4" />}
                      />

                      <FormField
                        label="Contact person"
                        id="contactPerson"
                        value={contactPerson}
                        onChange={setContactPerson}
                        placeholder="Who should clients ask for?"
                        leadingIcon={<UserIcon className="h-4 w-4" />}
                      />

                      <HoursPicker value={businessHours} onChange={setBusinessHours} />

                      <SocialFields
                        instagram={instagram}
                        linkedin={linkedin}
                        facebook={facebook}
                        onChange={(k, v) => {
                          if (k === "instagram") setInstagram(v);
                          if (k === "linkedin") setLinkedin(v);
                          if (k === "facebook") setFacebook(v);
                        }}
                      />

                      {error && <ErrorBanner message={error} />}

                      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setStep(1);
                          }}
                          disabled={busy}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-white px-5 py-3.5 text-[14.5px] font-medium text-navy transition-colors hover:border-purple/30 hover:text-purple-deep disabled:opacity-40 sm:w-auto"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={busy || !firmName.trim()}
                          className="group relative inline-flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-purple bg-purple px-7 py-4 text-[15.5px] font-medium text-white shadow-[0_14px_30px_-10px_rgba(124,92,252,0.55)] transition-all hover:border-purple-deep hover:bg-purple-deep hover:shadow-[0_18px_36px_-10px_rgba(91,58,219,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                          <span className="relative">
                            {busy ? "Creating your account…" : "Create account"}
                          </span>
                          {!busy && (
                            <ArrowRight
                              className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5"
                              aria-hidden
                            />
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => submit()}
                        disabled={busy || !firmName.trim()}
                        className="block w-full pt-1 text-center text-[12.5px] font-medium text-gray-text underline-offset-4 transition-colors hover:text-navy hover:underline disabled:opacity-40"
                      >
                        Skip the rest — create account with just the firm name
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Card footer — assurance strip */}
            <div className="border-t border-border/70 bg-gray-light/60 px-8 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-text/75">
                <span>Australian data residency</span>
                <span className="hidden sm:inline">Encrypted end-to-end</span>
                <span>Privacy Act 1988 aligned</span>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function StepDots({ step, onJump }: { step: Step; onJump: (s: Step) => void }) {
  const items: Array<{ idx: Step; label: string }> = [
    { idx: 1, label: "About you" },
    { idx: 2, label: "Your practice" },
  ];
  return (
    <ol className="flex items-center gap-3 pb-3">
      {items.map((it, i) => {
        const isCurrent = it.idx === step;
        const isDone = it.idx < step;
        const clickable = isDone;
        return (
          <li key={it.idx} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => clickable && onJump(it.idx)}
              disabled={!clickable}
              className={`group inline-flex items-center gap-2 rounded-lg px-2 py-1 transition-colors ${
                clickable ? "hover:bg-purple/5" : "cursor-default"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                  isDone
                    ? "bg-purple text-white"
                    : isCurrent
                    ? "border-2 border-purple bg-white text-purple"
                    : "border border-border bg-white text-gray-text/60"
                }`}
              >
                {isDone ? <Check className="h-3 w-3" /> : it.idx}
              </span>
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
                  isCurrent || isDone ? "text-navy" : "text-gray-text/55"
                }`}
              >
                {it.label}
              </span>
            </button>
            {i < items.length - 1 && (
              <span
                aria-hidden
                className={`h-px w-8 ${isDone ? "bg-purple/40" : "bg-border"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function FormField({
  label,
  id,
  value,
  onChange,
  type = "text",
  inputMode,
  required,
  minLength,
  placeholder,
  hint,
  hintTone = "muted",
  trailing,
  leadingIcon,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  hint?: string;
  hintTone?: "muted" | "success" | "error";
  trailing?: React.ReactNode;
  leadingIcon?: React.ReactNode;
}) {
  const hintColor =
    hintTone === "error"
      ? "text-red-600"
      : hintTone === "success"
      ? "text-teal"
      : "text-gray-text/70";
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between text-[12.5px] font-medium text-navy"
      >
        <span>
          {label}
          {required ? (
            <span className="ml-0.5 text-purple">*</span>
          ) : (
            <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-text/55">
              Optional
            </span>
          )}
        </span>
        {hint && <span className={`text-[11.5px] ${hintColor}`}>{hint}</span>}
      </label>
      <div className="relative mt-1.5">
        {leadingIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-text/60">
            {leadingIcon}
          </div>
        )}
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          autoComplete="off"
          className={`block w-full rounded-xl border border-border bg-white py-3 text-[15px] text-navy placeholder:text-gray-text/40 transition-shadow focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20 ${
            leadingIcon ? "pl-10" : "pl-3.5"
          } ${trailing ? "pr-10" : "pr-3.5"}`}
        />
        {trailing && (
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
            {trailing}
          </div>
        )}
      </div>
    </div>
  );
}

function PhoneField({
  value,
  onChange,
  label = "Phone number",
  id = "phone",
  hint = "For account recovery",
  required = true,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  id?: string;
  hint?: string;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between text-[12.5px] font-medium text-navy"
      >
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {label}
          {required ? (
            <span className="ml-0.5 text-purple">*</span>
          ) : (
            <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-text/55">
              Optional
            </span>
          )}
        </span>
        <span className="text-[11.5px] text-gray-text/70">{hint}</span>
      </label>
      <div className="mt-1.5 flex items-stretch overflow-hidden rounded-xl border border-border bg-white transition-shadow focus-within:border-purple focus-within:ring-2 focus-within:ring-purple/20">
        <span className="flex select-none items-center gap-2 border-r border-border bg-gray-light/70 px-3.5 text-[14px] font-medium text-navy">
          <span aria-hidden className="inline-flex h-3.5 w-5 overflow-hidden rounded-[2px] ring-1 ring-black/5">
            <svg viewBox="0 0 20 14" className="h-full w-full">
              <rect width="20" height="14" fill="#012169" />
              <path d="M0 0 L20 14 M20 0 L0 14" stroke="#fff" strokeWidth="1.6" />
              <path d="M10 0 V14 M0 7 H20" stroke="#fff" strokeWidth="2.4" />
              <path d="M10 0 V14 M0 7 H20" stroke="#E4002B" strokeWidth="1.2" />
            </svg>
          </span>
          +61
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder="4xx xxx xxx"
          autoComplete="tel"
          className="block w-full bg-white px-3.5 py-3 text-[15px] text-navy placeholder:text-gray-text/40 focus:outline-none"
        />
      </div>
    </div>
  );
}

function PasswordStrength({ score, label }: { score: 0 | 1 | 2 | 3 | 4; label: string }) {
  const tones = [
    "bg-red-400",
    "bg-orange-400",
    "bg-amber-400",
    "bg-teal",
    "bg-teal",
  ];
  return (
    <div className="-mt-2 flex items-center gap-3">
      <div className="flex flex-1 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score ? tones[score] : "bg-gray-light"
            }`}
          />
        ))}
      </div>
      <span
        className={`min-w-[64px] text-right font-mono text-[10.5px] uppercase tracking-[0.18em] ${
          score >= 3 ? "text-teal" : score === 0 ? "text-red-500" : "text-gray-text"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
    >
      {message}
    </motion.div>
  );
}

/* ─────────────────────── HOURS PICKER ─────────────────────── */

const HOURS_PRESETS: Array<{ id: string; label: string; value: string }> = [
  { id: "mon_fri_9_5", label: "Mon–Fri · 9 AM – 5 PM", value: "Mon–Fri · 9:00 AM – 5:00 PM" },
  { id: "mon_sat_9_6", label: "Mon–Sat · 9 AM – 6 PM", value: "Mon–Sat · 9:00 AM – 6:00 PM" },
  { id: "by_appointment", label: "By appointment", value: "By appointment" },
  { id: "twenty_four_seven", label: "24 / 7", value: "24 / 7" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_OPTIONS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM",
  "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "5:30 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM",
];

function HoursPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [openTime, setOpenTime] = useState<string>("9:00 AM");
  const [closeTime, setCloseTime] = useState<string>("5:00 PM");

  const composeCustom = (nextDays: string[], open: string, close: string) => {
    if (nextDays.length === 0) return "";
    // Compress consecutive day runs (e.g. Mon,Tue,Wed,Thu,Fri → Mon–Fri)
    const ordered = DAY_LABELS.filter((d) => nextDays.includes(d));
    const runs: string[] = [];
    let runStart = ordered[0];
    let prevIdx = DAY_LABELS.indexOf(ordered[0]);
    let runEnd = ordered[0];
    for (let i = 1; i < ordered.length; i++) {
      const idx = DAY_LABELS.indexOf(ordered[i]);
      if (idx === prevIdx + 1) {
        runEnd = ordered[i];
      } else {
        runs.push(runStart === runEnd ? runStart : `${runStart}–${runEnd}`);
        runStart = ordered[i];
        runEnd = ordered[i];
      }
      prevIdx = idx;
    }
    runs.push(runStart === runEnd ? runStart : `${runStart}–${runEnd}`);
    return `${runs.join(", ")} · ${open} – ${close}`;
  };

  const onPickPreset = (id: string, presetValue: string) => {
    setMode("preset");
    setActivePreset(id);
    onChange(presetValue);
  };

  const toggleDay = (d: string) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    setDays(next);
    onChange(composeCustom(next, openTime, closeTime));
  };

  const onChangeOpen = (t: string) => {
    setOpenTime(t);
    onChange(composeCustom(days, t, closeTime));
  };
  const onChangeClose = (t: string) => {
    setCloseTime(t);
    onChange(composeCustom(days, openTime, t));
  };

  const switchToCustom = () => {
    setMode("custom");
    setActivePreset(null);
    onChange(composeCustom(days, openTime, closeTime));
  };

  return (
    <div>
      <label className="flex items-baseline justify-between text-[12.5px] font-medium text-navy">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          Business hours
          <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-text/55">
            Optional
          </span>
        </span>
        {value && (
          <span className="text-[11.5px] text-gray-text/70">{value}</span>
        )}
      </label>

      <div className="mt-1.5 rounded-xl border border-border bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {HOURS_PRESETS.map((p) => {
            const active = mode === "preset" && activePreset === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => onPickPreset(p.id, p.value)}
                className={`rounded-full border-2 px-3.5 py-1.5 text-[12.5px] font-medium transition-all ${
                  active
                    ? "border-purple bg-purple text-white shadow-[0_6px_18px_-10px_rgba(124,92,252,0.55)]"
                    : "border-border bg-white text-navy hover:border-purple/40"
                }`}
              >
                {p.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={switchToCustom}
            className={`rounded-full border-2 px-3.5 py-1.5 text-[12.5px] font-medium transition-all ${
              mode === "custom"
                ? "border-purple bg-purple text-white shadow-[0_6px_18px_-10px_rgba(124,92,252,0.55)]"
                : "border-border bg-white text-navy hover:border-purple/40"
            }`}
          >
            Custom
          </button>
        </div>

        <AnimatePresence initial={false}>
          {mode === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-text/65">
                    Days
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {DAY_LABELS.map((d) => {
                      const active = days.includes(d);
                      return (
                        <button
                          type="button"
                          key={d}
                          onClick={() => toggleDay(d)}
                          className={`h-9 w-12 rounded-lg border-2 text-[12.5px] font-medium transition-all ${
                            active
                              ? "border-purple bg-purple text-white"
                              : "border-border bg-white text-navy hover:border-purple/40"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TimeSelect label="Opens" value={openTime} onChange={onChangeOpen} />
                  <TimeSelect label="Closes" value={closeTime} onChange={onChangeClose} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TimeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-text/65">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 block w-full appearance-none rounded-lg border border-border bg-white bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path fill=%22%23475367%22 d=%22M6 8L2 4h8z%22/></svg>')] bg-[length:10px] bg-[right_0.75rem_center] bg-no-repeat px-3 py-2.5 pr-9 text-[14px] text-navy focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
      >
        {TIME_OPTIONS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ─────────────────────── SOCIAL FIELDS ─────────────────────── */

function SocialFields({
  instagram,
  linkedin,
  facebook,
  onChange,
}: {
  instagram: string;
  linkedin: string;
  facebook: string;
  onChange: (key: "instagram" | "linkedin" | "facebook", value: string) => void;
}) {
  return (
    <div>
      <label className="flex items-baseline justify-between text-[12.5px] font-medium text-navy">
        <span>
          Social links
          <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-text/55">
            Optional · pick any
          </span>
        </span>
      </label>
      <div className="mt-1.5 space-y-2">
        <SocialRow
          icon={<Instagram className="h-4 w-4" />}
          tag="instagram.com/"
          value={instagram}
          onChange={(v) => onChange("instagram", v)}
          placeholder="acmemigration"
        />
        <SocialRow
          icon={<Linkedin className="h-4 w-4" />}
          tag="linkedin.com/company/"
          value={linkedin}
          onChange={(v) => onChange("linkedin", v)}
          placeholder="acme-migration"
        />
        <SocialRow
          icon={<Facebook className="h-4 w-4" />}
          tag="facebook.com/"
          value={facebook}
          onChange={(v) => onChange("facebook", v)}
          placeholder="acmemigration"
        />
      </div>
    </div>
  );
}

function SocialRow({
  icon,
  tag,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  tag: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-white transition-shadow focus-within:border-purple focus-within:ring-2 focus-within:ring-purple/20">
      <span className="flex select-none items-center gap-2 border-r border-border bg-gray-light/70 px-3 text-[12px] font-medium text-gray-text">
        <span className="text-purple-deep">{icon}</span>
        <span className="hidden sm:inline">{tag}</span>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="block w-full bg-white px-3 py-2.5 text-[14px] text-navy placeholder:text-gray-text/40 focus:outline-none"
      />
    </div>
  );
}
