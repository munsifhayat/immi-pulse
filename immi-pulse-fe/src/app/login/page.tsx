"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

const CityBackground = dynamic(
  () =>
    import("@/components/landing/MeshBackground").then((m) => m.MeshBackground),
  { ssr: false }
);

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Invalid credentials. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#030f0e]">
      <AnimatePresence mode="wait">
        {!showSignIn ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="relative min-h-dvh"
          >
            {/* Mesh background */}
            <div className="absolute inset-0 z-0">
              <CityBackground variant="hero" />
            </div>

            {/* Content */}
            <div className="relative z-20 flex min-h-dvh flex-col items-center px-6 pt-[26vh] text-center sm:pt-[28vh]">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04, duration: 0.5 }}
                className="mb-4"
              >
                <span className="inline-block rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-white/40">
                  AI First Property Platform
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.5 }}
                className="mb-4 text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl"
              >
                Property Pulse
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.5 }}
                className="mb-10 max-w-lg text-lg leading-relaxed text-white/40 sm:mb-12 sm:text-xl"
              >
                Intelligent email processing for property managers.
                <br className="hidden sm:block" />
                Classify, prioritise, and act automatically.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.5 }}
                className="flex items-center gap-4"
              >
                <Button
                  size="lg"
                  onClick={() => setShowSignIn(true)}
                  className="group relative h-12 cursor-pointer gap-2 rounded-xl bg-white px-8 text-base font-semibold text-[#030f0e] shadow-[0_0_48px_rgba(45,212,191,0.1)] transition-all duration-300 hover:bg-white hover:shadow-[0_0_64px_rgba(45,212,191,0.16)]"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </motion.div>
            </div>

            {/* Version */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="absolute bottom-4 right-5 z-30 text-[11px] text-white/15"
            >
              v{process.env.NEXT_PUBLIC_APP_VERSION}
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex min-h-dvh flex-col"
          >
            <div className="absolute inset-0">
              <CityBackground variant="fullscreen" />
            </div>
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                backgroundSize: "80px 80px",
              }}
            />
            <div className="relative z-10 flex min-h-dvh items-center justify-center px-6 py-10">
              <div className="mx-auto box-border size-[min(92vw,min(88dvh,760px))] shrink-0">
                <div className="flex h-full min-h-0 flex-col justify-center overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 shadow-[0_8px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-10">
                <div className="mb-8 text-center sm:mb-10">
                  <h2 className="text-2xl font-bold text-white">Welcome back</h2>
                  <p className="mt-2 text-sm text-white/30">Sign in to your Property Pulse account</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="flex flex-col gap-2.5">
                    <Label htmlFor="email" className="text-[13px] font-medium text-white/45">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="h-12 rounded-xl border-white/[0.06] bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/20 focus-visible:border-teal-400/20 focus-visible:ring-teal-400/10"
                    />
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <Label htmlFor="password" className="text-[13px] font-medium text-white/45">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-12 rounded-xl border-white/[0.06] bg-white/[0.04] px-4 pr-11 text-[15px] text-white placeholder:text-white/20 focus-visible:border-teal-400/20 focus-visible:ring-teal-400/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-white/20 transition-colors hover:text-white/50"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-2 h-12 w-full cursor-pointer rounded-xl bg-white text-[15px] font-semibold text-[#030f0e] transition-all duration-200 hover:bg-white/90 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>

                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={() => setShowSignIn(false)}
                    className="cursor-pointer text-sm text-white/20 transition-colors hover:text-white/40"
                  >
                    Back to home
                  </button>
                </div>
              </div>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
