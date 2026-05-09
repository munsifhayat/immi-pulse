"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ||
        (err as Error)?.message ||
        "Login failed";
      setError(typeof detail === "string" ? detail : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--gray-light)]">
      {/* ── Atmospheric backdrop (matches console + signing pages) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-[color:var(--purple)]/[0.06] blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[420px] w-[420px] rounded-full bg-[color:var(--purple-deep)]/[0.05] blur-3xl" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.018]" aria-hidden>
          <defs>
            <pattern
              id="login-grid"
              x="0"
              y="0"
              width="56"
              height="56"
              patternUnits="userSpaceOnUse"
            >
              <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#7C5CFC" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-grid)" />
        </svg>
      </div>

      {/* ── Page chrome ── */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 sm:py-12">
        {/* Top folio strip */}
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground/70">
          <Link
            href="/"
            className="transition-colors hover:text-foreground"
          >
            ← IMMI&#8209;PULSE
          </Link>
          <span>Folio · Sign in</span>
        </div>

        {/* ── Sign-in card ── */}
        <div className="mx-auto mt-12 w-full max-w-md flex-1 sm:mt-20">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-[0_30px_60px_-30px_rgba(15,17,23,0.18)]">
            {/* Top brand stripe */}
            <div className="h-1 bg-gradient-to-r from-[color:var(--purple-deep)] via-[color:var(--purple)] to-[color:var(--purple-light)]" />

            {/* Atmospheric corner glow */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-[color:var(--purple)]/[0.08] blur-3xl" />

            <div className="relative px-9 py-10">
              {/* ── Header ── */}
              <p className="editorial-eyebrow">
                <span>Console · Workspace</span>
              </p>
              <h1 className="mt-4 font-heading text-[30px] font-normal leading-[1.05] tracking-[-0.025em] text-foreground">
                Welcome back.
              </h1>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                Sign in to your IMMI&#8209;PULSE workspace to access your
                pre-cases, engagement letters, and active matters.
              </p>

              {/* hairline */}
              <div className="editorial-rule my-7" />

              {/* ── Form ── */}
              <form onSubmit={onSubmit} className="space-y-6">
                <FieldShell label="Email address" hint="Required">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@firm.com.au"
                    required
                    className="h-11 w-full bg-transparent pb-2 font-heading text-[16px] font-normal tracking-[-0.005em] text-foreground outline-none placeholder:text-muted-foreground/35"
                  />
                </FieldShell>

                <FieldShell label="Password" hint="Required">
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-11 w-full bg-transparent pb-2 font-mono text-[18px] font-medium tracking-[0.18em] text-foreground outline-none placeholder:text-muted-foreground/30"
                  />
                </FieldShell>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-300/60 bg-rose-50 px-3.5 py-2.5 text-[12.5px] leading-snug text-rose-700">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={busy || !email || !password}
                  className={cn(
                    "group relative h-12 w-full gap-2 overflow-hidden rounded-2xl text-[14px] font-medium tracking-tight transition-all",
                    busy || !email || !password
                      ? "border border-border bg-muted text-muted-foreground/70 shadow-none hover:bg-muted"
                      : "border border-[color:var(--purple-deep)]/40 bg-[color:var(--purple)] text-white shadow-[0_14px_30px_-12px_rgba(124,92,252,0.6)] hover:bg-[color:var(--purple-deep)] hover:shadow-[0_18px_36px_-12px_rgba(124,92,252,0.7)]",
                  )}
                >
                  {!(busy || !email || !password) && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                  )}
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="relative">Signing in…</span>
                    </>
                  ) : (
                    <>
                      <span className="relative">Sign in</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>

              {/* hairline */}
              <div className="editorial-rule my-7" />

              {/* ── Footer ── */}
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
                  No account yet?
                </p>
                <Link
                  href="/get-started"
                  className="group inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--purple-deep)] transition-colors hover:text-[color:var(--purple)] dark:text-[color:var(--purple-light)]"
                >
                  Create workspace
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Trust strip ── */}
          <div className="mt-6 flex items-start gap-2 px-2 text-muted-foreground/70">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
            <p className="text-[11.5px] leading-relaxed">
              Built with OMARA-registered consultants. Your workspace is
              encrypted and isolated per-firm — we never share data across
              tenants.
            </p>
          </div>
        </div>

        {/* ── Bottom mark ── */}
        <div className="mt-10 text-center">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.32em] text-muted-foreground/60">
            Australian immigration intelligence · Sydney
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Field shell — borderless input + slide-up purple hairline ─────────── */
function FieldShell({
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
