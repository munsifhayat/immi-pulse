"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Mail,
  Brain,
  FileCheck,
  ClipboardList,
  Clock,
  FolderOpen,
  CheckCircle2,
  Zap,
  Shield,
  Users,
  Globe,
  Star,
  BadgeCheck,
} from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";

const painPoints = [
  {
    icon: Mail,
    title: "Drowning in Emails",
    desc: "Hours spent reading client emails, manually identifying visa types, and copying info into spreadsheets.",
  },
  {
    icon: FolderOpen,
    title: "Document Chaos",
    desc: "Wrong documents submitted, expired passports missed, name mismatches discovered at lodgement.",
  },
  {
    icon: Clock,
    title: "Manual Checklists",
    desc: "Rebuilding the same requirement lists for every case. Copy-pasting from old files. Missing items.",
  },
];

const platformFeatures = [
  {
    icon: Mail,
    tag: "Email Intake",
    title: "Intelligent Email Processing",
    desc: "Emails are automatically parsed, matched to existing cases, and classified. New inquiries are flagged for your attention. Attachments are extracted and categorised.",
    highlights: ["Auto case matching", "New inquiry detection", "Attachment extraction"],
  },
  {
    icon: Brain,
    tag: "AI Classification",
    title: "Instant Visa Classification",
    desc: "Our AI reads client communications and identifies potential visa subclasses, occupation codes, and eligibility signals. One email can trigger multiple classifications.",
    highlights: ["Multi-visa detection", "ANZSCO mapping", "Eligibility signals"],
  },
  {
    icon: ClipboardList,
    tag: "Checklists",
    title: "Auto-Generated Checklists",
    desc: "Select a visa subclass and stream, and IMMI-PULSE generates a complete requirement checklist. Track which documents have been received, validated, or are still missing.",
    highlights: ["Per-subclass requirements", "Stream-specific", "Real-time tracking"],
  },
  {
    icon: FileCheck,
    tag: "Document Intelligence",
    title: "AI-Powered Document Validation",
    desc: "Upload a document and our AI validates it instantly. Passport expiry checks, name matching across documents, correct assessing body verification, and more.",
    highlights: ["OCR extraction", "Cross-doc name matching", "Expiry alerts"],
  },
];

const workflowSteps = [
  { label: "Intake", desc: "Email received & parsed" },
  { label: "Assessment", desc: "AI classifies visa type" },
  { label: "Checklist Sent", desc: "Requirements shared with client" },
  { label: "Collecting", desc: "Documents being gathered" },
  { label: "Reviewing", desc: "AI validates documents" },
  { label: "Lodgement Ready", desc: "Case complete" },
];

const marketplaceBenefits = [
  {
    icon: Globe,
    title: "Reach More Clients",
    desc: "Visa applicants across Australia search our directory to find verified agents. Get discovered by people actively looking for help.",
  },
  {
    icon: BadgeCheck,
    title: "OMARA Verified Badge",
    desc: "Every listing goes through OMARA registration check, credential review, and practice validation. Applicants trust our directory because we've done the due diligence.",
  },
  {
    icon: Star,
    title: "Build Your Reputation",
    desc: "Showcase your specializations, languages, and experience. Let your expertise speak for itself.",
  },
  {
    icon: Users,
    title: "Free to List",
    desc: "There's no cost to register. Submit your details, get verified, and start appearing in our directory.",
  },
];

export default function ForConsultantsPage() {
  return (
    <div className="overflow-hidden">
      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-[80vh] items-center pt-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.span
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="inline-flex items-center gap-2 rounded-full border border-purple/15 bg-purple/5 px-4 py-1.5 text-[13px] font-medium text-purple"
            >
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              For OMARA-Registered Agents
            </motion.span>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="mt-8 font-heading text-[clamp(2.5rem,5vw,3.75rem)] font-normal leading-[1.1] tracking-[-1.5px] text-navy"
            >
              Grow Your Practice with{" "}
              <span className="bg-gradient-to-r from-purple to-purple-deep bg-clip-text text-transparent">
                IMMI-PULSE
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-gray-text"
            >
              Whether you want AI to manage your caseload or simply need more
              clients finding you — IMMI-PULSE has you covered.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ═══ TWO PATHS ═══ */}
      <section className="border-y border-border bg-gray-light/50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="text-[13px] font-semibold uppercase tracking-wider text-purple">
              Choose Your Path
            </span>
            <h2 className="mt-2 text-balance font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-navy">
              Two Ways to Benefit
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-12 grid gap-8 md:grid-cols-2"
          >
            {/* Path 1: Platform / Product */}
            <motion.div
              variants={fadeUp}
              custom={0}
              className="relative flex flex-col overflow-hidden rounded-3xl border-2 border-purple/20 bg-white p-8 transition-all duration-300 hover:border-purple/40 hover:shadow-xl hover:shadow-purple/10 md:p-10"
            >
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-purple/[0.04] blur-2xl" />
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple to-purple-deep text-white shadow-lg shadow-purple/20">
                  <Brain className="h-7 w-7" aria-hidden="true" />
                </div>
                <span className="mt-4 inline-block rounded-full bg-purple/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-purple">
                  AI Platform
                </span>
                <h3 className="mt-4 font-heading text-2xl font-semibold text-navy">
                  Manage Your Practice with AI
                </h3>
                <p className="mt-3 text-[16px] leading-relaxed text-gray-text">
                  Automate email intake, visa classification, document
                  validation, and checklist generation. Spend less time on admin
                  and more time advising clients.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "AI email triage & case matching",
                    "Auto-generated visa checklists",
                    "Document validation with OCR",
                    "Full case lifecycle tracking",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[15px] text-gray-text">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-purple" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto pt-8">
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-purple px-7 py-3.5 text-[16px] font-medium text-white transition-colors duration-200 hover:bg-purple-deep"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </motion.div>

            {/* Path 2: Marketplace Listing */}
            <motion.div
              variants={fadeUp}
              custom={1}
              className="relative flex flex-col overflow-hidden rounded-3xl border-2 border-teal/20 bg-white p-8 transition-all duration-300 hover:border-teal/40 hover:shadow-xl hover:shadow-teal/10 md:p-10"
            >
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-teal/[0.04] blur-2xl" />
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal to-teal-light text-white shadow-lg shadow-teal/20">
                  <Globe className="h-7 w-7" aria-hidden="true" />
                </div>
                <span className="mt-4 inline-block rounded-full bg-teal/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-teal">
                  Marketplace
                </span>
                <h3 className="mt-4 font-heading text-2xl font-semibold text-navy">
                  Get Listed in Our Directory
                </h3>
                <p className="mt-3 text-[16px] leading-relaxed text-gray-text">
                  Join our verified consultant directory and let visa applicants
                  find you. Submit your details, and our team will verify your
                  OMARA registration, review your credentials, and validate
                  your practice before your profile goes live.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Verified OMARA badge on your profile",
                    "Showcase specializations & languages",
                    "Appear in city & visa type searches",
                    "Completely free to list",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[15px] text-gray-text">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto pt-8">
                <Link
                  href="/find-consultants/apply"
                  className="flex w-full items-center justify-center gap-2.5 rounded-lg border-2 border-teal bg-teal px-7 py-3.5 text-[16px] font-medium text-white transition-colors duration-200 hover:bg-teal/90"
                >
                  Register Your Practice
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ MARKETPLACE BENEFITS ═══ */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-[13px] font-semibold uppercase tracking-wider text-teal"
            >
              Marketplace
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-3 font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-navy"
            >
              Why List on IMMI-PULSE?
            </motion.h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {marketplaceBenefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                variants={fadeUp}
                custom={i}
                className="rounded-2xl border border-border bg-white p-7 transition-all duration-300 hover:border-teal/20 hover:shadow-lg hover:shadow-teal/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal/10 text-teal">
                  <benefit.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-heading text-[17px] font-semibold text-navy">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-text">
                  {benefit.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ PAIN POINTS ═══ */}
      <section className="bg-gray-light/50 py-28 lg:py-36">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-[13px] font-semibold uppercase tracking-wider text-purple"
            >
              The Problem
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-3 font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-navy"
            >
              Sound Familiar?
            </motion.h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-16 grid gap-6 md:grid-cols-3"
          >
            {painPoints.map((point, i) => (
              <motion.div
                key={point.title}
                variants={fadeUp}
                custom={i}
                className="rounded-2xl border border-destructive/10 bg-white p-8"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <point.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold text-navy">{point.title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-gray-text">{point.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-lg text-gray-text">
              There&apos;s a better way. <span className="font-semibold text-purple">Let AI handle the busywork.</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ PLATFORM FEATURES ═══ */}
      <section className="py-28 lg:py-36">
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-[13px] font-semibold uppercase tracking-wider text-purple"
            >
              AI Platform
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-3 font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-navy"
            >
              Built for How You Actually Work
            </motion.h2>
          </motion.div>

          <div className="mt-16 space-y-6">
            {platformFeatures.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="rounded-2xl border border-border bg-white p-8 transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/5 md:p-10"
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
                  <div className="shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10 text-purple">
                      <feat.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <span className="mt-3 inline-block rounded-full border border-purple/15 bg-purple/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-purple">
                      {feat.tag}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-xl font-semibold text-navy">{feat.title}</h3>
                    <p className="mt-2 text-[16px] leading-relaxed text-gray-text">
                      {feat.desc}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {feat.highlights.map((h) => (
                        <span
                          key={h}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-gray-light/50 px-3 py-1.5 text-[12px] font-medium text-gray-text"
                        >
                          <CheckCircle2 className="h-3 w-3 text-purple" aria-hidden="true" />
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WORKFLOW ═══ */}
      <section className="bg-gray-light/50 py-28 lg:py-36">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-[13px] font-semibold uppercase tracking-wider text-purple"
            >
              Case Lifecycle
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-3 font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-navy"
            >
              From Inbox to Lodgement
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto mt-4 max-w-xl text-lg text-gray-text"
            >
              Every case follows a clear, trackable path through your practice.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6"
          >
            {workflowSteps.map((step, i) => (
              <motion.div
                key={step.label}
                variants={fadeUp}
                custom={i}
                className="relative text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple/10 text-[14px] font-bold text-purple">
                  {i + 1}
                </div>
                {i < workflowSteps.length - 1 && (
                  <div className="absolute left-[calc(50%+28px)] top-6 hidden h-px w-[calc(100%-56px)] bg-border md:block" aria-hidden="true" />
                )}
                <p className="mt-3 text-[14px] font-semibold text-navy">{step.label}</p>
                <p className="mt-1 text-[12px] text-gray-text">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-28 lg:py-36">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple to-purple-deep px-8 py-20 text-center sm:px-16"
          >
            <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-purple-light/10 blur-3xl" />

            <div className="relative">
              <Zap className="mx-auto h-8 w-8 text-white/50" aria-hidden="true" />
              <h2 className="mt-6 font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-white">
                Ready to Get Started?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-lg text-white/70">
                Try our AI platform free, or register to appear in our consultant
                directory — your choice.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2.5 rounded-lg bg-white px-8 py-3.5 text-[16px] font-semibold text-navy transition-all duration-200 hover:shadow-xl"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/find-consultants/apply"
                  className="inline-flex items-center gap-2.5 rounded-lg border-2 border-white/30 px-8 py-3.5 text-[16px] font-semibold text-white transition-all duration-200 hover:border-white/60 hover:bg-white/10"
                >
                  Get Listed Free
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
