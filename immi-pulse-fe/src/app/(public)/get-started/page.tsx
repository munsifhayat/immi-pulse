"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Globe,
  Shield,
  Heart,
  CheckCircle2,
} from "lucide-react";
import { fadeUp } from "@/lib/motion";

export default function GetStartedPage() {
  return (
    <div className="overflow-hidden">
      <section className="relative flex min-h-[85vh] items-center pt-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="font-heading text-[clamp(2.5rem,5vw,3.75rem)] font-normal leading-[1.1] tracking-[-1.5px] text-navy"
            >
              How Would You Like to Get Started?
            </motion.h1>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="mx-auto mt-6 max-w-xl text-[18px] text-gray-text"
            >
              Choose your path. Whether you&apos;re a migration professional or
              someone navigating the visa process, we&apos;ve got you covered.
            </motion.p>
          </div>

          {/* Role picker cards */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-2"
          >
            {/* Consultant */}
            <Link
              href="/login"
              className="group relative overflow-hidden rounded-2xl border border-border bg-white p-10 transition-all duration-300 hover:border-purple/30 hover:shadow-xl hover:shadow-purple/5"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple text-white">
                  <Shield className="h-7 w-7" />
                </div>

                <h2 className="mt-6 font-heading text-2xl font-semibold text-navy">
                  I&apos;m a Consultant
                </h2>
                <p className="mt-2 text-[16px] text-gray-text">
                  OMARA-registered migration agent, immigration lawyer, or firm administrator.
                </p>

                <ul className="mt-6 space-y-2">
                  {[
                    "AI-powered case management",
                    "Document validation & OCR",
                    "Smart visa checklists",
                    "Free during early access",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[15px] text-gray-text">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-purple" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex items-center gap-2 text-[16px] font-semibold text-purple transition-colors group-hover:text-navy">
                  Sign up as Consultant
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>

            {/* Applicant */}
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-white p-10 transition-all duration-300 hover:border-purple/30 hover:shadow-xl hover:shadow-purple/5">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-white">
                  <Globe className="h-7 w-7" />
                </div>

                <h2 className="mt-6 font-heading text-2xl font-semibold text-navy">
                  I&apos;m an Applicant
                </h2>
                <p className="mt-2 text-[16px] text-gray-text">
                  Visa applicant, prospective migrant, or someone exploring their options.
                </p>

                <ul className="mt-6 space-y-2">
                  {[
                    "Visa application tracker",
                    "Processing time insights",
                    "Community & verified Q&A",
                    "Always free",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[15px] text-gray-text">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-purple" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <span className="inline-flex items-center gap-2 rounded-full border border-purple/20 bg-purple/5 px-4 py-2 text-[13px] font-medium text-purple">
                    <Heart className="h-3.5 w-3.5" />
                    Coming Soon &mdash; Join Waitlist
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom note */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="mt-12 text-center text-[15px] text-gray-text/60"
          >
            Both experiences are free during early access. No credit card required.
          </motion.p>
        </div>
      </section>
    </div>
  );
}
