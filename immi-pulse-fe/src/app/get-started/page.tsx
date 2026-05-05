"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  FileSearch,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fadeUp, stagger } from "@/lib/motion";

const valueProps = [
  {
    icon: Inbox,
    title: "AI visa classification",
    desc: "Every email triaged in seconds — subclass, urgency, next action.",
  },
  {
    icon: FileSearch,
    title: "Document intelligence",
    desc: "Trained on Australian migration law, not generic templates.",
  },
  {
    icon: Sparkles,
    title: "Case manifest",
    desc: "A workspace tidier than your inbox, organised by client.",
  },
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
        <rect width="100%" height="100%" fill={`url(#${id})`} opacity="0.05" />
      </svg>
    </div>
  );
}

export default function SignupPage() {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signup({
        email,
        password,
        first_name: firstName,
        last_name: lastName || undefined,
        firm_name: firmName,
        promo_code: promoCode || undefined,
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
      <GridBg id="signup-grid" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_0%,transparent_0%,white_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple/[0.05] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-48 -left-48 h-[450px] w-[450px] rounded-full bg-purple-muted/[0.06] blur-3xl"
        aria-hidden
      />

      {/* Top bar */}
      <header className="relative z-10 border-b border-border bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple">
              <span className="font-heading text-[15px] font-semibold leading-none text-white">II</span>
            </span>
            <span className="font-heading text-[18px] font-semibold tracking-tight text-navy">
              IMMI-PULSE
            </span>
          </Link>
          <p className="text-[14px] text-gray-text">
            Already a member?{" "}
            <Link
              href="/login"
              className="font-medium text-purple hover:text-purple-deep"
            >
              Sign in
            </Link>
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 px-6 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:py-20">
        {/* Left — pitch */}
        <section className="relative">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 rounded-full border border-purple/20 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-sm"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
            <span className="text-[13px] font-medium text-navy">
              Built for OMARA-registered agents
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="mt-6 font-heading text-[clamp(2.5rem,5vw,4rem)] font-normal leading-[1.05] tracking-[-1.5px] text-navy"
          >
            Where serious{" "}
            <span className="bg-gradient-to-r from-purple to-purple-deep bg-clip-text text-transparent">
              immigration
            </span>{" "}
            practice begins.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="mt-5 max-w-xl text-[17px] leading-relaxed text-gray-text"
          >
            A modern operating system for OMARA-registered agents and migration firms —
            built around how you actually work, not how legacy software wishes you did.
          </motion.p>

          <motion.ul
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="mt-10 space-y-5"
          >
            {valueProps.map((v, i) => (
              <motion.li
                key={v.title}
                variants={fadeUp}
                custom={i + 3}
                className="flex items-start gap-4 rounded-xl border border-border bg-white p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple/10">
                  <v.icon className="h-5 w-5 text-purple" aria-hidden />
                </div>
                <div>
                  <h3 className="font-heading text-[16px] font-semibold text-navy">
                    {v.title}
                  </h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-gray-text">
                    {v.desc}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ul>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={6}
            className="mt-10 flex items-center gap-4 rounded-xl border border-purple/10 bg-purple/[0.03] p-5"
          >
            <ShieldCheck className="h-6 w-6 shrink-0 text-purple" aria-hidden />
            <p className="text-[14px] leading-relaxed text-gray-text">
              <span className="font-semibold text-navy">14-day Professional trial.</span>{" "}
              Full feature set. No credit card. Switch plans anytime.
            </p>
          </motion.div>
        </section>

        {/* Right — form */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-2xl border border-border bg-white p-8 shadow-xl shadow-black/[0.03] sm:p-10"
          >
            <h2 className="font-heading text-[28px] font-semibold leading-tight text-navy sm:text-[32px]">
              Create your account
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-text">
              Three minutes. No card required. You start on a 14-day Professional trial.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
                  placeholder="Doe"
                />
              </div>
              <FormField
                label="Practice / firm name"
                id="firmName"
                value={firmName}
                onChange={setFirmName}
                required
                placeholder="Acme Migration Co."
              />
              <FormField
                label="Work email"
                id="email"
                type="email"
                value={email}
                onChange={setEmail}
                required
                placeholder="you@firm.com.au"
              />
              <FormField
                label="Password"
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                required
                minLength={6}
                hint="Minimum 6 characters"
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
              <FormField
                label="Confirm password"
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
                minLength={6}
                hint={
                  passwordsMismatch
                    ? "Passwords do not match"
                    : passwordsMatch
                    ? "Match confirmed"
                    : undefined
                }
                hintTone={passwordsMismatch ? "error" : passwordsMatch ? "success" : "muted"}
                trailing={
                  passwordsMatch ? <Check className="h-4 w-4 text-teal" /> : null
                }
              />
              <FormField
                label="Promo or pilot code"
                id="promoCode"
                value={promoCode}
                onChange={setPromoCode}
                placeholder="Optional"
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-purple bg-purple px-7 py-3.5 text-[16px] font-medium text-white shadow-lg shadow-purple/25 transition-all hover:border-purple-deep hover:bg-purple-deep hover:shadow-purple-deep/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {busy ? "Creating your account…" : "Create account"}
                {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
              </button>

              <p className="text-center text-[13px] leading-relaxed text-gray-text">
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

          <p className="mt-6 text-center text-[14px] text-gray-text">
            Need a guided demo?{" "}
            <Link
              href="/contact"
              className="font-semibold text-purple hover:text-purple-deep"
            >
              Book a call →
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function FormField({
  label,
  id,
  value,
  onChange,
  type = "text",
  required,
  minLength,
  placeholder,
  hint,
  hintTone = "muted",
  trailing,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  hint?: string;
  hintTone?: "muted" | "success" | "error";
  trailing?: React.ReactNode;
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
        className="flex items-baseline justify-between text-[13px] font-medium text-navy"
      >
        <span>
          {label}
          {required && <span className="ml-0.5 text-purple">*</span>}
        </span>
        {hint && <span className={`text-[12px] ${hintColor}`}>{hint}</span>}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          autoComplete="off"
          className={`block w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-[15px] text-navy placeholder:text-gray-text/40 focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20 ${
            trailing ? "pr-10" : ""
          }`}
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
