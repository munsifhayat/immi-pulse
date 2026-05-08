"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Platform", href: "/features" },
  { label: "For Consultants", href: "/for-consultants" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* ── Announcement Banner ── */}
      <div className="bg-purple py-2.5 text-center">
        <Link
          href="/features"
          className="inline-flex flex-wrap items-center justify-center gap-1.5 px-4 text-[14px] text-white sm:text-[15px]"
        >
          <span className="font-medium">
            Introducing IMMI-PULSE: AI-powered immigration intelligence for Australian consultants.
          </span>
          <span className="font-semibold underline underline-offset-2">
            See the Platform
          </span>
        </Link>
      </div>

      {/* ── Header ── */}
      <header
        className={cn(
          "sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
          scrolled
            ? "border-b border-border bg-white/90 backdrop-blur-xl"
            : "border-b border-transparent bg-white"
        )}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              className="shrink-0"
              aria-hidden="true"
            >
              <rect width="32" height="32" rx="7" fill="url(#nav-logo-grad)" />
              <path
                d="M9 22V10h2.5v12H9zm5 0V10h2.5v12H14zm5 0V10h2.5v5L24 10h3l-3.5 5.5L27 22h-3l-2.5-5-2 3v2h-0.5z"
                fill="white"
              />
              <defs>
                <linearGradient
                  id="nav-logo-grad"
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
            <span className="font-heading text-[19px] font-semibold tracking-tight text-navy">
              IMMI-PULSE
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative rounded-lg px-3.5 py-2 text-[14px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none",
                    isActive ? "text-navy" : "text-gray-text hover:text-navy"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-[14px] font-medium text-gray-text transition-colors hover:text-navy focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Login
            </Link>
            <Link
              href="/get-started"
              className="rounded-[8px] border-2 border-navy bg-navy px-5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-transparent hover:text-navy focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-navy md:hidden focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </nav>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[calc(2.5rem+4rem)] z-40 border-b border-border bg-white/95 backdrop-blur-xl md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4 max-h-[calc(100vh-6.5rem)] overflow-y-auto">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-lg px-4 py-3 text-[15px] font-medium transition-colors",
                      isActive
                        ? "bg-purple/5 text-purple"
                        : "text-gray-text hover:bg-gray-light hover:text-navy"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-3 text-center text-[15px] font-medium text-gray-text"
                >
                  Login
                </Link>
                <Link
                  href="/get-started"
                  className="rounded-lg border-2 border-navy bg-navy px-5 py-3 text-center text-[15px] font-medium text-white"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
