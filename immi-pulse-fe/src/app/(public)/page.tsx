"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Cpu,
  Zap,
  ChevronDown,
  Search,
  Users,
  Newspaper,
} from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";
import { useState } from "react";
import { GradientMesh } from "@/components/public/gradient-mesh";

/* Reusable subtle grid SVG for section backgrounds */
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
        <rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
      </svg>
    </div>
  );
}

/* ── Data ── */
const valueProps = [
  "Automatically classify visa subclasses from client emails.",
  "Research immigration law with instant, authoritative sources.",
  "Answers backed by Australian immigration legislation.",
  "Analyze complex documents and automate entire workflows.",
  "Reduce errors through stronger, consistent case preparation.",
  "Save hours per case on review and document validation.",
];

const trustLogos = [
  "Migration Alliance",
  "OMARA",
  "MIA",
  "DIBP Partners",
  "LegalTech AU",
  "Visa Bureau",
];

const testimonials = [
  {
    quote:
      "IMMI-PULSE transforms how immigration consultants work. The AI classification alone saves us hours every week on intake processing.",
    name: "Senior Migration Agent",
    title: "OMARA-Registered Consultant, Sydney",
  },
  {
    quote:
      "The document validation catches issues we used to miss. It\u2019s like having a meticulous junior associate reviewing every submission.",
    name: "Practice Director",
    title: "Migration Firm, Melbourne",
  },
  {
    quote:
      "Finally, a platform built by people who understand immigration law. This isn\u2019t generic AI \u2014 it\u2019s purpose-built for our industry.",
    name: "Immigration Consultant",
    title: "Independent Practice, Brisbane",
  },
];

const ecosystemPillars = [
  {
    icon: Search,
    title: "Find Your Expert",
    desc: "Search verified OMARA-registered immigration consultants by visa type, language, and location across Australia.",
    cta: "Browse Directory",
    href: "/find-consultants",
  },
  {
    icon: Users,
    title: "Join the Conversation",
    desc: "Connect with fellow applicants, share experiences, and get answers from verified immigration professionals.",
    cta: "Visit Community",
    href: "/community",
  },
  {
    icon: Newspaper,
    title: "Stay Informed",
    desc: "Real-time immigration news, policy changes, processing time updates, and expert insights that matter to you.",
    cta: "Read Latest",
    href: "/news",
  },
];

const whyCards = [
  {
    icon: Shield,
    title: "Built by immigration professionals, for immigration professionals.",
    desc: "Built by and with the insight of practicing immigration consultants who understand the context, the pressure, and precision this field demands.",
  },
  {
    icon: CheckCircle2,
    title: "Trust matters.",
    desc: "\u201CIMMI-PULSE is practice-safe AI: SOC 2 compliant, no data retention, and built for confidentiality. You get the speed of AI with the reliability you and your clients expect.\u201D",
  },
  {
    icon: Globe,
    title: "Powered by Australian immigration knowledge.",
    desc: "Our platform draws from authoritative Australian immigration databases, legislation, and practitioner expertise \u2014 purpose-built for the Australian migration system.",
  },
];

export default function HomePage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const nextTestimonial = () =>
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  const prevTestimonial = () =>
    setActiveTestimonial(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );

  return (
    <div className="overflow-hidden bg-white">
      {/* ═══════════════ HERO — Full Viewport ═══════════════ */}
      <section className="relative flex min-h-[100dvh] items-center overflow-hidden bg-white">
        {/* Grid background + gradient fades */}
        <GridBg id="hero-grid" size={48} opacity={0.05} />
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Radial fade so grid is strongest in center-right */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_65%_45%,transparent_0%,white_100%)]" />
          <div className="absolute -right-32 -top-32 h-[600px] w-[600px] rounded-full bg-purple/[0.04] blur-3xl" />
          <div className="absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full bg-purple-muted/[0.05] blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left — Copy */}
            <div className="relative z-10 max-w-2xl">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className="inline-flex items-center gap-2 rounded-full border border-purple/20 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-sm"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
                <span className="text-[13px] font-medium text-navy">
                  Australia-First Immigration Intelligence
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={1}
                className="mt-8 font-heading text-[clamp(3rem,6vw,5.5rem)] font-normal leading-[1.02] tracking-[-2.5px] text-navy"
              >
                The Complete
                <br />
                Ecosystem for
                <br />
                <span className="bg-gradient-to-r from-purple to-purple-deep bg-clip-text text-transparent">
                  Immigration
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={2}
                className="mt-6 max-w-lg text-[18px] leading-relaxed text-gray-text"
              >
                AI-powered visa classification, document intelligence, and case
                management &mdash; purpose-built for Australian migration
                consultants and OMARA-registered agents.
              </motion.p>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={3}
                className="mt-10 flex flex-wrap items-center gap-4"
              >
                <Link
                  href="/get-started"
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-7 py-3.5 text-[16px] font-medium text-white shadow-lg shadow-purple/25 transition-all hover:border-purple-deep hover:bg-purple-deep hover:shadow-purple-deep/25 focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/features"
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-border bg-white/80 px-7 py-3.5 text-[16px] font-medium text-navy backdrop-blur-sm transition-colors hover:border-purple/30 hover:bg-white focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Explore Platform
                </Link>
              </motion.div>

              {/* Trust signal */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={4}
                className="mt-10 flex items-center gap-6"
              >
                <div className="flex -space-x-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-purple/10 text-[11px] font-semibold text-purple"
                    >
                      {["MA", "KR", "SJ", "PL"][i]}
                    </div>
                  ))}
                </div>
                <p className="text-[14px] text-gray-text">
                  Trusted by{" "}
                  <span className="font-semibold text-navy">200+</span>{" "}
                  migration professionals across Australia
                </p>
              </motion.div>
            </div>

            {/* Right — Interactive portrait with floating UI cards */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="relative hidden min-h-[560px] lg:flex lg:items-center lg:justify-center"
            >
              {/* Abstract 3D geometric backdrop */}
              <GradientMesh />

              {/* Card — Case Review (left-center, overlapping portrait) */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="absolute left-[-20px] top-[30%] z-20 w-[240px] rounded-xl border border-border bg-white p-4 shadow-lg shadow-black/5"
              >
                <p className="text-[14px] font-semibold text-navy">
                  IMMI-PULSE Case Review
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-[13px] font-medium text-navy">
                    Subclass 482
                  </p>
                  <p className="text-[12px] text-gray-text">
                    10/03/2025, 14:22:08
                  </p>
                </div>
                <div className="mt-3 rounded-md bg-purple/10 px-3 py-1.5">
                  <p className="text-[12px] font-medium text-purple">
                    Awaiting Support Documents
                  </p>
                </div>
              </motion.div>

              {/* Card — Client Profile (top-right, overlapping portrait) */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="absolute right-[-10px] top-[8%] z-20 w-[200px] rounded-xl border border-purple/20 bg-white p-4 shadow-lg shadow-black/5"
              >
                <p className="text-[15px] font-semibold text-navy">
                  Client Profile
                </p>
                <p className="mt-1 text-[13px] text-gray-text">20 documents</p>
                <p className="text-[12px] text-gray-text">
                  Created by Migration Agent
                </p>
              </motion.div>

              {/* Card — Files Panel (bottom-right) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="absolute bottom-[8%] right-[-10px] z-20 w-[220px] rounded-xl border border-border bg-white p-4 shadow-lg shadow-black/5"
              >
                <p className="text-[14px] font-semibold text-navy">Files</p>
                <div className="mt-2 flex gap-3 border-b border-border pb-2 text-[12px]">
                  <span className="border-b-2 border-purple pb-1 font-medium text-purple">
                    All
                  </span>
                  <span className="text-gray-text">Documents</span>
                  <span className="text-gray-text">Summaries</span>
                </div>
                <div className="mt-2 space-y-1.5 text-[12px] text-gray-text">
                  <p>Copy of Passport</p>
                  <p>Copy of Education Credentials</p>
                  <p>Original Birth Certificate with Transl{"\u2026"}</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-[12px] font-medium uppercase tracking-wider text-gray-text/60">
              Scroll
            </span>
            <ChevronDown
              className="h-4 w-4 text-gray-text/40"
              aria-hidden="true"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════ VALUE CHECKMARKS ═══════════════ */}
      <section className="border-y border-border bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {valueProps.map((prop, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="flex items-start gap-3 rounded-xl border border-border bg-white p-5"
              >
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-purple"
                  aria-hidden="true"
                />
                <p className="text-[16px] leading-snug text-navy">{prop}</p>
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            className="mt-10 text-center"
          >
            <Link
              href="/features"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-7 py-3.5 text-[16px] font-medium text-white transition-colors hover:border-purple-deep hover:bg-purple-deep focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Explore Product
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ ECOSYSTEM TRIPTYCH ═══════════════ */}
      <section className="relative overflow-hidden bg-white py-24">
        <GridBg id="eco-grid" size={50} opacity={0.03} />
        <div className="pointer-events-none absolute -left-32 top-0 h-[400px] w-[400px] rounded-full bg-purple-muted/[0.05] blur-3xl" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="text-[13px] font-semibold uppercase tracking-wider text-purple">
              More than a platform
            </span>
            <h2 className="mt-3 font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-navy">
              One Ecosystem. Every Part of Immigration.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-gray-text">
              Whether you&apos;re a consultant, an applicant, or just staying
              informed &mdash; IMMI-PULSE brings everything together.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-14 grid gap-8 md:grid-cols-3"
          >
            {ecosystemPillars.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                variants={fadeUp}
                custom={i}
                className="group rounded-2xl border border-border bg-white p-8 transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10">
                  <pillar.icon className="h-6 w-6 text-purple" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-heading text-[20px] font-semibold text-navy">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-text">
                  {pillar.desc}
                </p>
                <Link
                  href={pillar.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-purple transition-colors hover:text-purple-deep"
                >
                  {pillar.cta}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ TRUST LOGOS ═══════════════ */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-navy">
              World-class teams trust
              <br />
              IMMI-PULSE
            </h2>
          </motion.div>

          {/* Scrolling marquee */}
          <div className="relative mt-12 overflow-hidden">
            {/* Fade edges */}
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-white to-transparent" />

            <div className="animate-marquee flex w-max items-center gap-16">
              {[...trustLogos, ...trustLogos].map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  className="flex h-12 shrink-0 items-center"
                >
                  <span className="whitespace-nowrap text-[18px] font-semibold tracking-tight text-navy/30">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <section className="relative overflow-hidden bg-purple-deep py-24">
        <GridBg id="testimonial-grid" size={56} opacity={0.04} stroke="#BDB4FE" />
        {/* Radial glow accents */}
        <div className="pointer-events-none absolute -left-40 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-purple/[0.08] blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-40 top-1/3 h-[350px] w-[350px] rounded-full bg-purple-light/[0.05] blur-3xl" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-white">
              What our customers say
            </h2>
          </motion.div>

          <div className="relative mx-auto mt-16 max-w-3xl text-center">
            {/* Large quote mark */}
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center"
              aria-hidden="true"
            >
              <svg width="40" height="32" viewBox="0 0 40 32" fill="none">
                <path
                  d="M0 32V20C0 14.4 1.2 9.8 3.6 6.2C6 2.6 9.6 0.4 14.4 0L16 5.6C13.2 6.4 11.2 7.8 10 9.8C8.8 11.8 8.2 14.2 8.2 17H16V32H0ZM24 32V20C24 14.4 25.2 9.8 27.6 6.2C30 2.6 33.6 0.4 38.4 0L40 5.6C37.2 6.4 35.2 7.8 34 9.8C32.8 11.8 32.2 14.2 32.2 17H40V32H24Z"
                  fill="white"
                  fillOpacity="0.15"
                />
              </svg>
            </div>

            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="mt-8 font-heading text-[24px] font-normal leading-relaxed text-white sm:text-[30px]">
                {testimonials[activeTestimonial].quote}
              </h3>
              <div className="mt-8">
                <p className="text-[16px] font-semibold text-purple-light">
                  {testimonials[activeTestimonial].name}
                </p>
                <p className="mt-1 text-[15px] text-white/50">
                  {testimonials[activeTestimonial].title}
                </p>
              </div>
            </motion.div>

            {/* Navigation */}
            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                onClick={prevTestimonial}
                aria-label="Previous testimonial"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="flex gap-2" role="tablist">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTestimonial(i)}
                    role="tab"
                    aria-selected={i === activeTestimonial}
                    aria-label={`Testimonial ${i + 1}`}
                    className={`h-2 rounded-full transition-[width,background-color] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-purple-deep focus-visible:outline-none ${
                      i === activeTestimonial
                        ? "w-6 bg-purple-light"
                        : "w-2 bg-white/20"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={nextTestimonial}
                aria-label="Next testimonial"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* As seen on */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 border-t border-white/10 pt-10">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-white/30">
              As seen on
            </span>
            {[
              "Immigration Daily",
              "SBS News",
              "Migration Alliance",
              "Visa Bureau",
            ].map((pub) => (
              <span
                key={pub}
                className="text-[16px] font-semibold text-white/30"
              >
                {pub}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ WHY IMMI-PULSE ═══════════════ */}
      <section className="relative overflow-hidden bg-white py-28">
        <GridBg id="why-grid" size={52} opacity={0.035} />
        <div className="pointer-events-none absolute -right-24 top-0 h-[300px] w-[300px] rounded-full bg-purple-muted/[0.06] blur-3xl" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-navy">
              Why IMMI-PULSE?
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-16 grid gap-8 md:grid-cols-3"
          >
            {whyCards.map((card, i) => (
              <motion.div
                key={card.title}
                variants={fadeUp}
                custom={i}
                className="rounded-2xl border border-border bg-white p-8 text-center"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-purple/20 bg-purple/5">
                  <card.icon
                    className="h-6 w-6 text-purple"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-5 font-heading text-[19px] font-semibold leading-snug text-navy">
                  {card.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-text">
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-12 text-center">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-white px-7 py-3.5 text-[16px] font-medium text-purple transition-colors hover:bg-purple hover:text-white focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              About Us
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ STATS / SAVINGS CTA ═══════════════ */}
      <section className="relative overflow-hidden bg-gray-light py-28">
        <GridBg id="stats-grid" size={44} opacity={0.03} />
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left copy */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-heading text-[clamp(2rem,4vw,3.25rem)] font-normal leading-tight tracking-[-1px] text-navy">
                Save 10+ hours per case and $60k per year
                <sup className="text-[16px] text-gray-text">*</sup>
              </h2>
              <p className="mt-4 text-[18px] leading-relaxed text-gray-text">
                Helping immigration consultants to deliver faster, more accurate
                representation while reducing stress and errors in every case.
              </p>
              <Link
                href="/for-consultants"
                className="mt-8 inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-7 py-3.5 text-[16px] font-medium text-white transition-colors hover:border-purple-deep hover:bg-purple-deep focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Read Customer Stories
              </Link>
              <p className="mt-4 text-[12px] text-gray-text/60">
                *Savings based on the assumption of 10 cases per month
              </p>
            </motion.div>

            {/* Right — product screenshot mock */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              <div className="rounded-2xl border border-border bg-white p-6 shadow-xl shadow-black/5">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple/10">
                    <Cpu
                      className="h-4 w-4 text-purple"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-navy">
                      Case Overview
                    </p>
                    <p className="text-[12px] text-gray-text">
                      Jane Doe &mdash; Subclass 482
                    </p>
                  </div>
                </div>
                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-gray-light p-3 text-center">
                    <p className="font-heading text-2xl font-semibold text-purple">
                      20
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-text">
                      Active Cases
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-light p-3 text-center">
                    <p className="font-heading text-2xl font-semibold text-teal">
                      94%
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-text">
                      Accuracy
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-light p-3 text-center">
                    <p className="font-heading text-2xl font-semibold text-navy">
                      5min
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-text">
                      Avg Intake
                    </p>
                  </div>
                </div>
                {/* Checklist */}
                <div className="mt-4 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-medium text-navy">
                      Document Checklist
                    </p>
                    <span className="text-[12px] font-medium text-teal">
                      8/12 complete
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-gray-light">
                    <div className="h-2 w-2/3 rounded-full bg-purple" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
