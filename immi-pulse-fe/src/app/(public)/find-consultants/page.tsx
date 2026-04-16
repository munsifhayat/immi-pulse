"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  ShieldCheck,
  Heart,
  ArrowRight,
  Users,
  Star,
} from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";
import { CITIES } from "./_lib/constants";
import type { City } from "./_lib/constants";
import { CityCard } from "./_components/city-card";
import { ConsultantGrid } from "./_components/consultant-grid";

/* Reusable subtle grid SVG */
function GridBg({
  id,
  size = 48,
  opacity = 0.06,
  stroke = "#7C5CFC",
  className = "",
}: {
  id: string;
  size?: number;
  opacity?: number;
  stroke?: string;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden="true"
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id={id}
            x="0"
            y="0"
            width={size}
            height={size}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${size} 0 L 0 0 0 ${size}`}
              fill="none"
              stroke={stroke}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#${id})`}
          opacity={opacity}
        />
      </svg>
    </div>
  );
}

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "OMARA Verified",
    desc: "Every consultant goes through OMARA registration verification, credential review, and practice validation. Only fully vetted migration agents appear in our directory.",
  },
  {
    icon: Star,
    title: "Transparent Reviews",
    desc: "Real reviews from real clients. See ratings, response times, and specialization depth before you choose.",
  },
  {
    icon: Heart,
    title: "Free to Browse",
    desc: "Finding the right consultant should be free. Browse, compare, and connect at no cost to you.",
  },
];

export default function FindConsultantsPage() {
  const [activeCity, setActiveCity] = useState<City | "all">("all");

  return (
    <div className="overflow-hidden bg-white">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative flex min-h-[60vh] items-center overflow-hidden bg-white pt-16">
        <GridBg id="fc-hero-grid" size={48} opacity={0.04} />
        <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-48 h-[400px] w-[400px] rounded-full bg-purple-muted/[0.04] blur-3xl" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24 lg:px-8">
          <div className="max-w-3xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="inline-flex items-center gap-2 rounded-full border border-purple/20 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-sm"
            >
              <Search className="h-3.5 w-3.5 text-purple" />
              <span className="text-[13px] font-medium text-navy">
                Find Your Consultant
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="mt-6 text-balance font-heading text-[clamp(2.5rem,5vw,4rem)] font-normal leading-[1.08] tracking-[-2px] text-navy"
            >
              Find Trusted Immigration
              <br />
              Consultants Across{" "}
              <span className="bg-gradient-to-r from-purple to-purple-deep bg-clip-text text-transparent">
                Australia
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mt-6 max-w-xl text-[18px] leading-relaxed text-gray-text"
            >
              Browse OMARA-registered migration agents, compare specializations,
              and book a consultation. Every consultant on IMMI-PULSE is
              verified.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <a
                href="#directory"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-7 py-3.5 text-[16px] font-medium text-white shadow-lg shadow-purple/25 transition-all hover:border-purple-deep hover:bg-purple-deep hover:shadow-purple-deep/25"
              >
                Browse Consultants
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/for-consultants"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-border bg-white/80 px-7 py-3.5 text-[16px] font-medium text-navy backdrop-blur-sm transition-colors hover:border-purple/30 hover:bg-white"
              >
                I&apos;m a Consultant
              </Link>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              className="mt-10 flex flex-wrap items-center gap-8 text-[14px]"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple" />
                <span className="text-gray-text">
                  <span className="font-semibold text-navy">OMARA</span>{" "}
                  Verified Only
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-teal" />
                <span className="text-gray-text">
                  <span className="font-semibold text-navy">8</span> Major
                  Cities
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-purple" />
                <span className="text-gray-text">
                  <span className="font-semibold text-navy">Free</span> to
                  Browse
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════ CITY SHOWCASE ═══════════════ */}
      <section className="border-y border-border bg-gray-light/50 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="text-[13px] font-semibold uppercase tracking-wider text-purple">
              Browse by City
            </span>
            <h2 className="mt-2 text-balance font-heading text-[clamp(1.5rem,3vw,2.25rem)] font-normal tracking-[-1px] text-navy">
              Consultants in Every Major City
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8"
          >
            {CITIES.map((city, i) => (
              <motion.div key={city.name} variants={fadeUp} custom={Math.min(i, 4)} className="h-full">
                <CityCard
                  name={city.name}
                  state={city.state}
                  tagline={city.tagline}
                  isActive={activeCity === city.name}
                  onClick={() =>
                    setActiveCity((prev) =>
                      prev === city.name ? "all" : city.name
                    )
                  }
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ DIRECTORY ═══════════════ */}
      <section id="directory" className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <ConsultantGrid activeCity={activeCity} />
        </div>
      </section>

      {/* ═══════════════ TRUST SECTION ═══════════════ */}
      <section className="relative overflow-hidden bg-gray-light/50 py-24">
        <GridBg id="fc-trust-grid" size={52} opacity={0.03} />
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="text-balance font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-navy">
              Why Choose an IMMI-PULSE Verified Consultant
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-14 grid gap-8 md:grid-cols-3"
          >
            {trustPoints.map((tp, i) => (
              <motion.div
                key={tp.title}
                variants={fadeUp}
                custom={i}
                className="rounded-2xl border border-border bg-white p-8 text-center transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/5"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-purple/20 bg-purple/5">
                  <tp.icon
                    className="h-6 w-6 text-purple"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-5 font-heading text-[19px] font-semibold text-navy">
                  {tp.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-text">
                  {tp.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ CTA BANNER ═══════════════ */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-purple to-purple-deep px-8 py-20 text-center sm:px-16">
            <h2 className="text-balance font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-white">
              Are You a Migration Agent?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-white/70">
              Join IMMI-PULSE and reach thousands of visa applicants. List your
              practice, manage your caseload with AI, and grow your client base.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/find-consultants/apply"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-white bg-white px-7 py-3.5 text-[16px] font-medium text-purple transition-colors hover:bg-white/90"
              >
                Register Your Practice
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/for-consultants"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 px-7 py-3.5 text-[16px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/10"
              >
                Explore AI Platform
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
