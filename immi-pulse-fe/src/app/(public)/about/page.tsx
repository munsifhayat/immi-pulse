"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Heart,
  Globe,
  Shield,
  Users,
  Mail,
  MapPin,
  ArrowRight,
  Zap,
  Target,
  Sparkles,
} from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";

const values = [
  {
    icon: Heart,
    title: "Empathy First",
    desc: "Immigration is deeply personal. Every feature we build starts with understanding the human experience behind the process.",
  },
  {
    icon: Shield,
    title: "Human in the Loop",
    desc: "AI suggests, humans decide. We believe technology should augment professional judgement, never replace it.",
  },
  {
    icon: Globe,
    title: "Access for All",
    desc: "Everyone deserves clear information about their immigration journey. That\u2019s why the applicant experience will always be free.",
  },
  {
    icon: Users,
    title: "Built with Practitioners",
    desc: "Every feature is designed alongside OMARA-registered agents. We build what immigration professionals actually need.",
  },
];

const stats = [
  { value: "7,000+", label: "OMARA-Registered Agents", icon: Users },
  { value: "100+", label: "Visa Subclasses Covered", icon: Globe },
  { value: "10\u00d7", label: "Faster Document Review", icon: Zap },
  { value: "99.2%", label: "Classification Accuracy", icon: Target },
];

const team = [
  {
    name: "Coming Soon",
    role: "Founder & CEO",
    bio: "We\u2019re building in public. Team profiles will appear here as we grow.",
  },
  {
    name: "Coming Soon",
    role: "Head of Product",
    bio: "Interested in joining? We\u2019re looking for people who care about immigration.",
  },
  {
    name: "Coming Soon",
    role: "Lead Engineer",
    bio: "If you\u2019re passionate about AI and immigration, we want to hear from you.",
  },
];

export default function AboutPage() {
  return (
    <div className="overflow-hidden">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-purple focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <main id="main-content">
        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28">
          {/* Decorative background */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-gradient-to-b from-purple/[0.06] to-transparent blur-3xl" />
            <div className="absolute right-0 top-1/3 h-[300px] w-[300px] rounded-full bg-gradient-to-l from-purple-muted/30 to-transparent blur-3xl" />
          </div>

          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple/20 bg-purple/5 px-4 py-1.5 text-[13px] font-medium text-purple"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Our Story
              </motion.div>
              <motion.h1
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={1}
                className="font-heading text-[clamp(2.5rem,5vw,4rem)] font-normal leading-[1.08] tracking-[-1.5px] text-navy"
              >
                Making Immigration{" "}
                <span className="bg-gradient-to-r from-purple to-purple-deep bg-clip-text text-transparent">
                  Human
                </span>{" "}
                Again
              </motion.h1>
              <motion.p
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={2}
                className="mx-auto mt-6 max-w-2xl text-[18px] leading-relaxed text-gray-text"
              >
                We started IMMI-PULSE because we believe the immigration industry
                deserves better technology. Not technology that replaces the human
                connection&mdash;technology that frees consultants to focus on it.
              </motion.p>
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
              className="grid grid-cols-2 gap-8 lg:grid-cols-4"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  custom={i}
                  className="text-center"
                >
                  <stat.icon className="mx-auto mb-3 h-5 w-5 text-purple" aria-hidden="true" />
                  <p className="font-heading text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tabular-nums tracking-tight text-navy">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-gray-text">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══ MISSION ═══ */}
        <section className="py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-3xl text-center"
            >
              <p className="text-[13px] font-semibold uppercase tracking-wider text-purple">
                Our Mission
              </p>
              <p className="mt-6 font-heading text-[clamp(1.5rem,3vw,2.5rem)] leading-[1.3] text-navy">
                To give every immigration professional the AI tools they need to deliver
                faster, more accurate outcomes&mdash;while keeping the human touch at
                the centre of every decision.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ═══ THE STORY ═══ */}
        <section className="border-y border-border bg-gray-light/50 py-24 lg:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid items-start gap-16 lg:grid-cols-5">
              {/* Left heading */}
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                className="lg:col-span-2"
              >
                <motion.p
                  variants={fadeUp}
                  custom={0}
                  className="text-[13px] font-semibold uppercase tracking-wider text-purple"
                >
                  Our Story
                </motion.p>
                <motion.h2
                  variants={fadeUp}
                  custom={1}
                  className="mt-3 font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-navy"
                >
                  Why We&apos;re Building This
                </motion.h2>
                <motion.p
                  variants={fadeUp}
                  custom={2}
                  className="mt-4 text-[16px] leading-relaxed text-gray-text"
                >
                  A platform purpose-built for Australian immigration, powered by AI that
                  understands visa subclasses, ANZSCO codes, and assessing bodies.
                </motion.p>
              </motion.div>

              {/* Right content */}
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                className="lg:col-span-3"
              >
                <div className="space-y-6 text-[17px] leading-relaxed text-gray-text">
                  <motion.p variants={fadeUp} custom={0}>
                    Australia&apos;s immigration industry is one of the most complex in the world.
                    Over 7,000 OMARA-registered agents manage hundreds of thousands of visa
                    applications annually&mdash;and most are still using tools from the early 2000s.
                  </motion.p>
                  <motion.p variants={fadeUp} custom={1}>
                    Meanwhile, every AI immigration startup is focused on the US market. Australian
                    practitioners are left behind, drowning in emails, manually building checklists,
                    and catching document errors at the eleventh hour.
                  </motion.p>
                  <motion.p variants={fadeUp} custom={2}>
                    We saw this gap and decided to fill it. Not with another generic SaaS tool&mdash;with
                    a platform purpose-built for Australian immigration, powered by AI that
                    understands visa subclasses, ANZSCO codes, and assessing bodies.
                  </motion.p>
                  <motion.p variants={fadeUp} custom={3} className="font-medium text-navy">
                    IMMI-PULSE is the tool we wish existed. Now we&apos;re building it.
                  </motion.p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══ VALUES ═══ */}
        <section className="py-24 lg:py-32">
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
                Our Values
              </motion.p>
              <motion.h2
                variants={fadeUp}
                custom={1}
                className="mt-3 font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-navy"
              >
                What We Believe
              </motion.h2>
            </motion.div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="mt-16 grid gap-5 sm:grid-cols-2"
            >
              {values.map((val, i) => (
                <motion.div
                  key={val.title}
                  variants={fadeUp}
                  custom={i}
                  className="group rounded-2xl border border-border bg-white p-8 transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/[0.06]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple/10 text-purple">
                    <val.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 font-heading text-lg font-semibold text-navy">{val.title}</h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-gray-text">{val.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══ TEAM ═══ */}
        <section className="border-t border-border bg-gray-light/50 py-24 lg:py-32">
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
                The Team
              </motion.p>
              <motion.h2
                variants={fadeUp}
                custom={1}
                className="mt-3 font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-navy"
              >
                People Behind the Platform
              </motion.h2>
            </motion.div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="mt-16 grid gap-6 sm:grid-cols-3"
            >
              {team.map((member, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  custom={i}
                  className="group rounded-2xl border border-border bg-white p-8 text-center transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/[0.06]"
                >
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple/[0.06]">
                    <Users className="h-8 w-8 text-purple/30" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 font-heading text-lg font-semibold text-navy">{member.name}</h3>
                  <p className="text-[15px] font-medium text-purple">{member.role}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-gray-text">{member.bio}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          {/* Purple gradient background */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-purple/[0.04] via-transparent to-purple-muted/20" />

          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] font-normal tracking-[-0.5px] text-navy">
                Ready to Transform Your Practice?
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-gray-text">
                Join the growing community of Australian immigration professionals
                using AI to deliver better outcomes, faster.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/get-started"
                  className="inline-flex items-center gap-2 rounded-lg bg-purple px-6 py-3 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-purple-deep focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Book a Demo
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/features"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-[15px] font-medium text-navy transition-colors duration-200 hover:border-purple/30 hover:bg-purple/[0.03] focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Explore the Platform
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══ CONTACT ═══ */}
        <section
          id="contact"
          className="scroll-mt-20 border-t border-border bg-gray-light/50 py-20"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="font-heading text-[clamp(1.75rem,3vw,2.25rem)] font-normal tracking-[-0.5px] text-navy">
                Get in Touch
              </h2>
              <p className="mt-4 text-[16px] text-gray-text">
                Questions, partnerships, or just want to chat about immigration tech? We&apos;d love to hear from you.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <a
                  href="mailto:hello@immipulse.com"
                  className="flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-[14px] font-medium text-navy transition-colors duration-200 hover:border-purple/30 hover:bg-purple/[0.03] focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  hello@immipulse.com
                </a>
                <span className="flex items-center gap-2 text-[14px] text-gray-text">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Sydney, Australia
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
