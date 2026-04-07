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

const stats = [
  { value: "80%", label: "less time on admin" },
  { value: "8", label: "visa subclasses" },
  { value: "5min", label: "avg intake time" },
  { value: "24/7", label: "AI processing" },
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
              Your AI Immigration Associate
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-gray-text"
            >
              Stop spending hours on email triage, manual checklists, and document
              chasing. IMMI-PULSE handles the heavy lifting so you can focus on
              advising your clients.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link
                href="/get-started"
                className="flex items-center gap-2.5 rounded-lg bg-purple px-7 py-3.5 text-[16px] font-medium text-white transition-colors duration-200 hover:bg-purple-deep focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 text-[16px] font-medium text-navy transition-colors duration-200 hover:bg-gray-light focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                View Pricing
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="border-y border-border bg-gray-light/50 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-8 md:grid-cols-4"
          >
            {stats.map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp} custom={i} className="text-center">
                <p className="font-heading text-4xl font-light tabular-nums tracking-[-1px] text-navy">{stat.value}</p>
                <p className="mt-1 text-[15px] text-gray-text">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ PAIN POINTS ═══ */}
      <section className="py-28 lg:py-36">
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
                className="rounded-2xl border border-destructive/10 bg-destructive/[0.02] p-8"
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
      <section className="bg-gray-light/50 py-28 lg:py-36">
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
              The Solution
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
      <section className="py-28 lg:py-36">
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
      <section className="pb-28 lg:pb-36">
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
                Start Your Free Trial Today
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-lg text-white/70">
                No credit card required. Set up in under 5 minutes.
                See the difference AI makes in your first case.
              </p>
              <Link
                href="/get-started"
                className="mt-10 inline-flex items-center gap-2.5 rounded-lg bg-white px-8 py-3.5 text-[16px] font-semibold text-navy transition-all duration-200 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-purple-deep focus-visible:outline-none"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
