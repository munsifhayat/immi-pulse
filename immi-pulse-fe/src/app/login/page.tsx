"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

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
    <div className="relative min-h-dvh overflow-hidden bg-white">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40" />
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

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
            {/* Content */}
            <div className="relative z-10 flex min-h-dvh flex-col items-center px-6 pt-[26vh] text-center sm:pt-[28vh]">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04, duration: 0.5 }}
                className="mb-6"
              >
                {/* Logo */}
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 32 32"
                  fill="none"
                  className="mx-auto mb-6"
                  aria-hidden="true"
                >
                  <rect width="32" height="32" rx="7" fill="url(#login-logo-grad)" />
                  <path
                    d="M9 22V10h2.5v12H9zm5 0V10h2.5v12H14zm5 0V10h2.5v5L24 10h3l-3.5 5.5L27 22h-3l-2.5-5-2 3v2h-0.5z"
                    fill="white"
                  />
                  <defs>
                    <linearGradient
                      id="login-logo-grad"
                      x1="0"
                      y1="0"
                      x2="32"
                      y2="32"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#7C5CFC" />
                      <stop offset="1" stopColor="#5B3ADB" />
                    </linearGradient>
                  </defs>
                </svg>

                <span className="inline-block rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-primary">
                  AI-Powered Immigration Platform
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.5 }}
                className="mb-4 font-heading text-5xl font-extrabold tracking-tight text-navy sm:text-6xl lg:text-7xl"
              >
                IMMI PULSE
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.5 }}
                className="mb-10 max-w-lg text-lg leading-relaxed text-gray-text sm:mb-12 sm:text-xl"
              >
                AI-powered immigration intelligence for
                <br className="hidden sm:block" />
                Australian consultants. Manage, classify &amp; validate.
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
                  className="group relative h-12 cursor-pointer gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:bg-purple-deep hover:shadow-xl hover:shadow-primary/30"
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
              className="absolute bottom-4 right-5 z-30 text-[11px] text-gray-text/30"
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
            <div className="relative z-10 flex min-h-dvh items-center justify-center px-6 py-10">
              <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border/60 bg-white p-8 shadow-xl shadow-black/5 sm:p-10">
                  {/* Header */}
                  <div className="mb-8 text-center sm:mb-10">
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 32 32"
                      fill="none"
                      className="mx-auto mb-4"
                      aria-hidden="true"
                    >
                      <rect width="32" height="32" rx="7" fill="url(#login-form-grad)" />
                      <path
                        d="M9 22V10h2.5v12H9zm5 0V10h2.5v12H14zm5 0V10h2.5v5L24 10h3l-3.5 5.5L27 22h-3l-2.5-5-2 3v2h-0.5z"
                        fill="white"
                      />
                      <defs>
                        <linearGradient
                          id="login-form-grad"
                          x1="0"
                          y1="0"
                          x2="32"
                          y2="32"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#7C5CFC" />
                          <stop offset="1" stopColor="#5B3ADB" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <h2 className="text-2xl font-bold text-navy">Welcome back</h2>
                    <p className="mt-2 text-sm text-gray-text">
                      Sign in to your IMMI PULSE account
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                      >
                        {error}
                      </motion.div>
                    )}

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="email" className="text-[13px] font-medium text-navy">
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
                        className="h-12 rounded-xl border-border bg-gray-light/50 px-4 text-[15px] text-navy placeholder:text-gray-text/40 focus-visible:border-primary focus-visible:ring-primary/20"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="password" className="text-[13px] font-medium text-navy">
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
                          className="h-12 rounded-xl border-border bg-gray-light/50 px-4 pr-11 text-[15px] text-navy placeholder:text-gray-text/40 focus-visible:border-primary focus-visible:ring-primary/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-text/40 transition-colors hover:text-gray-text"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-2 h-12 w-full cursor-pointer rounded-xl bg-primary text-[15px] font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-purple-deep disabled:opacity-50"
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
                      className="cursor-pointer text-sm text-gray-text/60 transition-colors hover:text-gray-text"
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
