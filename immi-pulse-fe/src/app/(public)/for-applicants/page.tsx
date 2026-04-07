"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Globe,
  BarChart3,
  Users,
  Bell,
  Clock,
  MessageSquare,
  TrendingUp,
  Heart,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";

const comingFeatures = [
  {
    icon: BarChart3,
    title: "Visa Tracker",
    desc: "Track your application in real-time. See where you are in the process, estimated timelines, and next steps.",
    status: "Coming Soon",
  },
  {
    icon: TrendingUp,
    title: "Processing Times",
    desc: "Community-driven processing time data. See real timelines from thousands of applicants, not just official estimates.",
    status: "Coming Soon",
  },
  {
    icon: Users,
    title: "Community",
    desc: "Connect with others on the same visa journey. Ask questions, share experiences, and get answers from verified consultants.",
    status: "Coming Soon",
  },
  {
    icon: Bell,
    title: "Policy Alerts",
    desc: "Instant notifications when visa policies change, processing times shift, or new pathways open up.",
    status: "Coming Soon",
  },
  {
    icon: MessageSquare,
    title: "Consultant Marketplace",
    desc: "Find verified, OMARA-registered consultants. Compare specialisations, read reviews, and book consultations.",
    status: "Future",
  },
  {
    icon: Clock,
    title: "Self-Service Lodgement",
    desc: "For straightforward visa applications, guided lodgement with AI validation and optional consultant review.",
    status: "Future",
  },
];

const journeySteps = [
  "Research visa options",
  "Find the right consultant",
  "Track your application",
  "Get real-time updates",
  "Join the community",
  "Celebrate your grant",
];

export default function ForApplicantsPage() {
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
              <Heart className="h-3.5 w-3.5" />
              For Visa Applicants
            </motion.span>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="mt-8 font-heading text-[clamp(2.5rem,5vw,3.75rem)] font-normal leading-[1.1] tracking-[-1.5px] text-navy"
            >
              Your Visa Journey, Simplified
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-gray-text"
            >
              We&apos;re building the platform we wish existed when we went through the
              immigration process ourselves. Track your application, connect with your
              community, and stay informed &mdash; all in one place.
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
                className="flex items-center gap-2.5 rounded-lg bg-purple px-7 py-3.5 text-[16px] font-medium text-white transition-all hover:bg-purple-deep"
              >
                Join the Waitlist
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/for-consultants"
                className="flex items-center gap-2 rounded-lg border border-border px-7 py-3.5 text-[16px] font-medium text-navy transition-all hover:bg-gray-light"
              >
                I&apos;m a consultant
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ VISION ═══ */}
      <section className="border-y border-border bg-gray-light/50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <Globe className="mx-auto h-8 w-8 text-purple/40" />
            <p className="mt-6 font-heading text-2xl leading-relaxed text-navy sm:text-3xl">
              &ldquo;Immigration shouldn&apos;t feel like navigating a maze in the dark.
              We&apos;re building the torch.&rdquo;
            </p>
            <p className="mt-4 text-[14px] text-gray-text">
              &mdash; The IMMI-PULSE Team
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ COMING FEATURES ═══ */}
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
              What we&apos;re building
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-3 font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-navy"
            >
              Everything you need for your journey
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto mt-4 max-w-xl text-lg text-gray-text"
            >
              We&apos;re building these features now. Join the waitlist to get early
              access as they launch.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {comingFeatures.map((feat, i) => (
              <motion.div
                key={feat.title}
                variants={fadeUp}
                custom={i}
                className="group rounded-2xl border border-border bg-white p-8 transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple/8 text-purple transition-colors group-hover:bg-purple/12">
                    <feat.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-border bg-gray-light/50 px-2.5 py-1 text-[11px] font-medium text-gray-text">
                    {feat.status}
                  </span>
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold text-navy">{feat.title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-gray-text">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ JOURNEY ═══ */}
      <section className="bg-gray-light/50 py-28 lg:py-36">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-center text-[13px] font-semibold uppercase tracking-wider text-purple"
            >
              Your Journey
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-3 text-center font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-navy"
            >
              We&apos;re with You Every Step
            </motion.h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mx-auto mt-16 max-w-lg space-y-4"
          >
            {journeySteps.map((step, i) => (
              <motion.div
                key={step}
                variants={fadeUp}
                custom={i}
                className="flex items-center gap-4 rounded-xl border border-border bg-white px-6 py-4 transition-all duration-300 hover:border-purple/20 hover:shadow-md hover:shadow-purple/5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple/10 text-[13px] font-bold text-purple">
                  {i + 1}
                </div>
                <span className="text-[16px] font-medium text-navy">{step}</span>
                {i === journeySteps.length - 1 && (
                  <Sparkles className="ml-auto h-4 w-4 text-purple" aria-hidden="true" />
                )}
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
            className="mx-auto max-w-2xl text-center"
          >
            <Heart className="mx-auto h-8 w-8 text-purple/40" />
            <h2 className="mt-6 font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-navy">
              Be the first to know
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-gray-text">
              Join the waitlist and we&apos;ll notify you as soon as the applicant
              experience is ready. Early access members get priority.
            </p>
            <Link
              href="/get-started"
              className="mt-10 inline-flex items-center gap-2.5 rounded-lg bg-purple px-8 py-3.5 text-[16px] font-medium text-white transition-all hover:bg-purple-deep"
            >
              Join the Waitlist
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
