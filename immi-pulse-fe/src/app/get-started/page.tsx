"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { useAuth } from "@/lib/auth";
import { ArrowUpRight } from "lucide-react";

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

const valueLines = [
  ["I.", "AI visa classification — every email, in seconds."],
  ["II.", "Document intelligence trained on Australian migration law."],
  ["III.", "A case manifest that stays tidier than your inbox."],
];

export default function SignupPage() {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ||
        (err as Error)?.message ||
        "Signup failed";
      setError(typeof detail === "string" ? detail : "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`${serif.variable} ${mono.variable} min-h-screen w-full bg-[#0F1117] text-white antialiased lg:grid lg:grid-cols-[1.05fr_1fr]`}
    >
      {/* ─────────────── LEFT PANEL — EDITORIAL BROADSIDE ─────────────── */}
      <aside className="relative isolate hidden overflow-hidden bg-[#0F1117] lg:flex lg:flex-col">
        {/* Atmospheric layers */}
        <BackgroundLayers />

        {/* Top hairline meta */}
        <div className="relative z-10 flex items-center justify-between px-12 pt-10 font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.22em] text-white/55">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <span className="block h-1.5 w-1.5 rotate-45 bg-[#BDB4FE] transition-transform duration-500 group-hover:rotate-[225deg]" />
            <span>IMMI-PULSE</span>
            <span className="text-white/25">/</span>
            <span className="text-white/35">SYDNEY · EST. 2026</span>
          </Link>
          <span className="hidden tabular-nums text-white/35 xl:inline">
            FOLIO Nº 001 — INTAKE
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
            <span className="ml-3">An invitation to migration agents</span>
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.15 }}
            className="mt-7 max-w-[14ch] font-[family-name:var(--font-serif-d)] text-[clamp(3.4rem,5.4vw,5.6rem)] font-normal leading-[0.95] tracking-[-0.025em] text-white"
          >
            Where serious{" "}
            <span className="italic text-[#BDB4FE]">immigration</span> practice
            begins.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.28 }}
            className="mt-7 max-w-[44ch] text-[15.5px] leading-[1.65] text-white/70"
          >
            A modern operating system for OMARA-registered agents and migration
            firms — built around how you actually work, not how legacy software
            wishes you did.
          </motion.p>

          {/* Numbered editorial value props */}
          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.09, delayChildren: 0.4 } },
            }}
            className="mt-12 space-y-4 border-l border-white/10 pl-6"
          >
            {valueLines.map(([numeral, text]) => (
              <motion.li
                key={numeral}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease } },
                }}
                className="flex items-baseline gap-4 text-[15px] text-white/80"
              >
                <span className="font-[family-name:var(--font-serif-d)] text-[18px] italic text-[#BDB4FE]/80">
                  {numeral}
                </span>
                <span className="leading-snug">{text}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        {/* Bottom — passport seal + footer line */}
        <div className="relative z-10 flex items-end justify-between px-12 pb-10 xl:px-16">
          <PassportSeal />

          <motion.blockquote
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.7 }}
            className="hidden max-w-[28ch] text-right xl:block"
          >
            <p className="font-[family-name:var(--font-serif-d)] text-[16px] italic leading-snug text-white/65">
              &ldquo;Finally, a platform built by people who understand
              immigration law.&rdquo;
            </p>
            <footer className="mt-3 font-[family-name:var(--font-mono-d)] text-[9.5px] uppercase tracking-[0.24em] text-white/40">
              — Practice Director, Melbourne
            </footer>
          </motion.blockquote>
        </div>
      </aside>

      {/* ─────────────── RIGHT PANEL — THE MANIFEST FORM ─────────────── */}
      <section className="relative flex min-h-screen flex-col bg-white text-[#0F1117]">
        {/* Subtle right-side background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 50% at 80% 0%, rgba(124,92,252,0.05), transparent 70%)",
          }}
        />

        {/* Top bar — mobile brand + sign-in link */}
        <div className="relative z-10 flex items-center justify-between border-b border-[#0F1117]/8 px-6 py-5 sm:px-10 lg:border-b-0 lg:px-12 lg:py-7">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.22em] text-[#0F1117]/60 lg:hidden"
          >
            <span className="block h-1.5 w-1.5 rotate-45 bg-[#7C5CFC]" />
            IMMI-PULSE
          </Link>
          <p className="ml-auto inline-flex items-center gap-2 font-[family-name:var(--font-mono-d)] text-[11px] uppercase tracking-[0.18em] text-[#0F1117]/55">
            Already a member?{" "}
            <Link
              href="/login"
              className="group inline-flex items-center gap-1 text-[#0F1117] underline-offset-4 hover:underline"
            >
              Sign in
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </p>
        </div>

        {/* Form container */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-14 pt-8 sm:px-10 lg:px-14 xl:px-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.2 }}
            className="w-full max-w-[480px]"
          >
            {/* Section eyebrow */}
            <div className="flex items-center gap-3 font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.32em] text-[#7C5CFC]">
              <span className="block h-px w-6 bg-[#7C5CFC]/40" />
              <span>New account · Manifest</span>
            </div>

            <h2 className="mt-5 max-w-[18ch] font-[family-name:var(--font-serif-d)] text-[44px] font-normal leading-[0.98] tracking-[-0.02em] text-[#0F1117] sm:text-[52px] lg:hidden">
              Begin your <span className="italic text-[#5B3ADB]">practice</span>.
            </h2>
            <h2 className="mt-5 hidden font-[family-name:var(--font-serif-d)] text-[40px] font-normal leading-[1.0] tracking-[-0.02em] text-[#0F1117] lg:block">
              Create your <span className="italic text-[#5B3ADB]">account</span>.
            </h2>

            <p className="mt-4 max-w-[42ch] text-[15px] leading-[1.55] text-[#4B5563]">
              Three minutes. No card. You start on a 14-day Professional trial —
              full feature set, switch plans anytime.
            </p>

            <form onSubmit={onSubmit} className="mt-10 space-y-7">
              <div className="grid grid-cols-2 gap-x-6">
                <Field
                  num="01"
                  label="First name"
                  id="firstName"
                  value={firstName}
                  onChange={setFirstName}
                  required
                />
                <Field
                  num="02"
                  label="Last name"
                  id="lastName"
                  value={lastName}
                  onChange={setLastName}
                />
              </div>
              <Field
                num="03"
                label="Practice / firm name"
                id="firmName"
                value={firmName}
                onChange={setFirmName}
                required
              />
              <Field
                num="04"
                label="Email"
                id="email"
                type="email"
                value={email}
                onChange={setEmail}
                required
              />
              <Field
                num="05"
                label="Password"
                id="password"
                type="password"
                value={password}
                onChange={setPassword}
                required
                minLength={6}
                hint="Six characters or more"
              />
              <Field
                num="06"
                label="Promo or pilot code"
                id="promoCode"
                value={promoCode}
                onChange={setPromoCode}
                hint="Optional"
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-l-2 border-red-500 bg-red-50 px-4 py-3 font-[family-name:var(--font-mono-d)] text-[12px] tracking-[0.04em] text-red-700"
                >
                  ⚠ {error}
                </motion.div>
              )}

              <SubmitButton busy={busy} />

              <p className="font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.18em] text-[#4B5563]/70">
                By continuing you agree to our{" "}
                <Link
                  href="/terms"
                  className="text-[#0F1117]/80 underline-offset-4 hover:underline"
                >
                  Terms
                </Link>{" "}
                &{" "}
                <Link
                  href="/privacy"
                  className="text-[#0F1117]/80 underline-offset-4 hover:underline"
                >
                  Privacy
                </Link>
                .
              </p>
            </form>

            <div className="mt-12 flex items-center justify-between border-t border-[#0F1117]/8 pt-6">
              <p className="font-[family-name:var(--font-mono-d)] text-[10.5px] uppercase tracking-[0.22em] text-[#4B5563]/70">
                Need a guided demo?
              </p>
              <Link
                href="/contact"
                className="group inline-flex items-center gap-1.5 font-[family-name:var(--font-mono-d)] text-[11px] uppercase tracking-[0.2em] text-[#0F1117]"
              >
                Book a call
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────── COMPONENTS ─────────────────────────── */

function Field({
  num,
  label,
  id,
  value,
  onChange,
  type = "text",
  required,
  minLength,
  hint,
}: {
  num: string;
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
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
          {required && <span className="ml-1 text-[#7C5CFC]">*</span>}
        </span>
        {hint && (
          <span className="text-[#4B5563]/55 normal-case tracking-normal">
            {hint}
          </span>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
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

function SubmitButton({ busy }: { busy: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group relative block w-full overflow-hidden bg-[#0F1117] py-5 text-left transition-all duration-500 hover:bg-[#5B3ADB] disabled:opacity-60"
    >
      <span className="relative flex items-center justify-between px-6">
        <span className="font-[family-name:var(--font-mono-d)] text-[12.5px] font-medium uppercase tracking-[0.24em] text-white">
          {busy ? "Creating your manifest…" : "Create account"}
        </span>
        <span className="relative inline-flex items-center gap-3 text-white">
          <span className="h-px w-10 bg-white/40 transition-all duration-500 group-hover:w-16 group-hover:bg-white" />
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
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/20"
      />
    </button>
  );
}

/* ─────────────────────── LEFT PANEL DECORATION ─────────────────────── */

function BackgroundLayers() {
  return (
    <>
      {/* Radial brand glow */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 18% 100%, rgba(124,92,252,0.22), transparent 70%), radial-gradient(ellipse 60% 50% at 90% 0%, rgba(45,212,191,0.10), transparent 65%)",
        }}
      />
      {/* Topographic contour lines */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full opacity-[0.18]"
        viewBox="0 0 800 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="contour" x1="0" y1="0" x2="1" y2="1">
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
              stroke="url(#contour)"
              strokeWidth="0.7"
            />
          );
        })}
      </svg>
      {/* Faint dot grid */}
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
      {/* Grain */}
      <div
        aria-hidden
        className="absolute inset-0 mix-blend-overlay opacity-[0.18]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* Vertical hairline gutter */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent"
      />
    </>
  );
}

function PassportSeal() {
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
            id="seal-curve"
            d="M 100,100 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0"
          />
        </defs>
        <text
          fontFamily="var(--font-mono-d), ui-monospace"
          fontSize="9.6"
          letterSpacing="3.6"
          fill="currentColor"
        >
          <textPath href="#seal-curve" startOffset="0">
            AGENT REGISTRATION · OMARA · COMMONWEALTH OF AUSTRALIA · ✦ ·
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
          Nº 001
        </span>
        <span className="mt-1.5 font-[family-name:var(--font-mono-d)] text-[8.5px] uppercase tracking-[0.28em] text-[#BDB4FE]/80">
          Intake
        </span>
      </div>
    </motion.div>
  );
}
