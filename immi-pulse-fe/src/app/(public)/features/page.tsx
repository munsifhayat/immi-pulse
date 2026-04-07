"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Mail,
  Brain,
  FileCheck,
  ClipboardList,
  Shield,
  BarChart3,
  Search,
  Zap,
  Bell,
  Globe,
  Lock,
  Database,
  Activity,
  BookOpen,
  Layers,
} from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";

const featureCategories = [
  {
    tag: "AI Intelligence",
    title: "Powered by Advanced AI",
    desc: "Our AI understands immigration. Not just keywords \u2014 context, requirements, and nuance.",
    features: [
      {
        icon: Brain,
        title: "Visa Classification",
        desc: "Automatically identifies visa subclass from client emails. Detects occupation codes, eligibility signals, and potential pathways across 8 subclasses.",
      },
      {
        icon: FileCheck,
        title: "Document Validation",
        desc: "OCR-powered document analysis. Verifies passport expiry, checks name consistency across documents, validates assessing bodies, and flags issues.",
      },
      {
        icon: Search,
        title: "Unified Classification",
        desc: "One AI call analyses an email across all dimensions simultaneously \u2014 case matching, visa signals, document detection, and urgency assessment.",
      },
      {
        icon: Bell,
        title: "Smart Alerts",
        desc: "AI-flagged issues surface automatically: expiring documents, missing requirements, deadline proximity, and government correspondence detection.",
      },
    ],
  },
  {
    tag: "Case Management",
    title: "End-to-End Case Lifecycle",
    desc: "From first email to visa grant \u2014 every case has a clear, trackable path.",
    features: [
      {
        icon: Layers,
        title: "Case Stages",
        desc: "Eight defined stages from intake to granted/refused. Kanban view, list view, and filterable by visa type, stage, or consultant.",
      },
      {
        icon: ClipboardList,
        title: "Auto Checklists",
        desc: "Select a visa subclass and stream, IMMI-PULSE generates requirements. Track collection progress per document, per case.",
      },
      {
        icon: Activity,
        title: "Activity Timeline",
        desc: "Every action logged: emails received, documents uploaded, AI classifications, stage changes, consultant notes. Complete audit trail.",
      },
      {
        icon: BarChart3,
        title: "Dashboard Analytics",
        desc: "Active cases by stage, documents pending review, AI-flagged issues, and monthly case volume \u2014 all at a glance.",
      },
    ],
  },
  {
    tag: "Communication",
    title: "Seamless Email Integration",
    desc: "Your inbox becomes your intake system. No copy-pasting, no missed emails.",
    features: [
      {
        icon: Mail,
        title: "Email Ingestion",
        desc: "Microsoft 365 integration via Graph API. Emails are automatically fetched, parsed, and processed \u2014 including attachments.",
      },
      {
        icon: Shield,
        title: "Case Matching",
        desc: "AI automatically matches incoming emails to existing cases. New inquiries are flagged and ready for case creation in one click.",
      },
      {
        icon: Globe,
        title: "Client Notifications",
        desc: "Send checklists, request documents, and update clients directly from the platform. Email templates built for immigration workflows.",
      },
    ],
  },
  {
    tag: "Knowledge",
    title: "Immigration Intelligence Built In",
    desc: "The visa knowledge base your practice needs \u2014 always up to date, always accessible.",
    features: [
      {
        icon: BookOpen,
        title: "Visa Knowledge Base",
        desc: "Browse 8 visa subclasses with their streams, requirements, document types, and processing pathways. Built from official OMARA guidance.",
      },
      {
        icon: Database,
        title: "Document Types",
        desc: "Comprehensive library of document types with validation rules. Know exactly what AI checks for each document category.",
      },
      {
        icon: Lock,
        title: "Compliance Ready",
        desc: "Human-in-the-loop on every decision. AI suggests, you confirm. Full audit trail for regulatory compliance.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="overflow-hidden">
      {/* ═══ HERO ═══ */}
      <section className="relative flex min-h-[60vh] items-center pt-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.span
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="inline-flex items-center gap-2 rounded-full border border-purple/15 bg-purple/5 px-4 py-1.5 text-[13px] font-medium text-purple"
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Platform Features
            </motion.span>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="mt-8 font-heading text-[clamp(2.5rem,5vw,3.75rem)] font-normal leading-[1.1] tracking-[-1.5px] text-navy"
            >
              Purpose-Built for Immigration
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-gray-text"
            >
              Every feature designed for Australian immigration workflows.
              Not retrofitted from another industry &mdash; built from the ground up.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ═══ FEATURE SECTIONS ═══ */}
      {featureCategories.map((cat, catIndex) => (
        <section
          key={cat.tag}
          className={catIndex % 2 === 1 ? "bg-gray-light/50 py-28 lg:py-36" : "py-28 lg:py-36"}
        >
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
                {cat.tag}
              </motion.p>
              <motion.h2
                variants={fadeUp}
                custom={1}
                className="mt-3 font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-navy"
              >
                {cat.title}
              </motion.h2>
              <motion.p
                variants={fadeUp}
                custom={2}
                className="mx-auto mt-4 max-w-xl text-lg text-gray-text"
              >
                {cat.desc}
              </motion.p>
            </motion.div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className={`mt-16 grid gap-6 ${
                cat.features.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
              }`}
            >
              {cat.features.map((feat, i) => (
                <motion.div
                  key={feat.title}
                  variants={fadeUp}
                  custom={i}
                  className="group rounded-2xl border border-border bg-white p-8 transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple/10 text-purple transition-colors duration-300 group-hover:bg-purple/15">
                    <feat.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 font-heading text-lg font-semibold text-navy">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-gray-text">
                    {feat.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      ))}

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
              <h2 className="font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-white">
                See It in Action
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-lg text-white/70">
                The best way to understand IMMI-PULSE is to try it.
                Start your free trial today.
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
