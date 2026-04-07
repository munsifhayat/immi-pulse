"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Flame,
  Clock,
  HelpCircle,
} from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";
import { spaces, threads, communityStats } from "./_lib/mock-data";
import { SpaceCard } from "./_components/space-card";
import { ThreadPreview } from "./_components/thread-preview";
import { TrendingSidebar } from "./_components/trending-sidebar";

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

const tabs = [
  { id: "trending", label: "Trending", icon: Flame },
  { id: "latest", label: "Latest", icon: Clock },
  { id: "unanswered", label: "Unanswered", icon: HelpCircle },
] as const;

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<string>("trending");

  return (
    <div className="overflow-hidden bg-white">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative flex min-h-[60vh] items-center overflow-hidden bg-white pt-16">
        <GridBg id="comm-hero-grid" size={48} opacity={0.04} />
        <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-48 h-[400px] w-[400px] rounded-full bg-purple-muted/[0.04] blur-3xl" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="inline-flex items-center gap-2 rounded-full border border-purple/20 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-sm"
            >
              <Users className="h-3.5 w-3.5 text-purple" />
              <span className="text-[13px] font-medium text-navy">
                Community
              </span>
              <span className="rounded-full bg-purple/10 px-2 py-0.5 text-[11px] font-semibold text-purple">
                Launching Q3 2026
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="mt-6 font-heading text-[clamp(2.5rem,5vw,4rem)] font-normal leading-[1.08] tracking-[-2px] text-navy"
            >
              Where Immigration
              <br />
              Journeys{" "}
              <span className="bg-gradient-to-r from-purple to-purple-deep bg-clip-text text-transparent">
                Connect
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-gray-text"
            >
              A verified community where applicants share experiences, ask
              questions, and get answers from OMARA-registered professionals.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="mt-8 flex flex-wrap items-center justify-center gap-4"
            >
              <a
                href="#discussions"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-7 py-3.5 text-[16px] font-medium text-white shadow-lg shadow-purple/25 transition-all hover:border-purple-deep hover:bg-purple-deep"
              >
                Explore Spaces
                <ArrowRight className="h-4 w-4" />
              </a>
              <button className="inline-flex items-center gap-2 rounded-lg border-2 border-border bg-white/80 px-7 py-3.5 text-[16px] font-medium text-navy backdrop-blur-sm transition-colors hover:border-purple/30 hover:bg-white">
                Join the Waitlist
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════ STATS BAR ═══════════════ */}
      <section className="border-y border-border bg-gray-light/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 divide-x divide-border sm:grid-cols-3 lg:grid-cols-5"
          >
            {[
              {
                value: `${(communityStats.totalMembers / 1000).toFixed(1)}k`,
                label: "Members",
              },
              {
                value: communityStats.activeToday.toLocaleString(),
                label: "Active Today",
              },
              {
                value: `${(communityStats.totalThreads / 1000).toFixed(1)}k`,
                label: "Discussions",
              },
              {
                value: `${communityStats.answeredPercentage}%`,
                label: "Answered",
              },
              {
                value: communityStats.verifiedAgents.toString(),
                label: "Verified Agents",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                custom={Math.min(i, 3)}
                className="px-6 py-8 text-center"
              >
                <p className="font-heading text-2xl font-semibold text-navy">
                  {stat.value}
                </p>
                <p className="mt-1 text-[13px] text-gray-text">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ SPACES GRID ═══════════════ */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="text-[13px] font-semibold uppercase tracking-wider text-purple">
              Community Spaces
            </span>
            <h2 className="mt-3 font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-navy">
              Find Your Visa Community
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[16px] text-gray-text">
              Join visa-specific spaces to connect with people on the same
              journey as you.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {spaces.map((space, i) => (
              <motion.div key={space.id} variants={fadeUp} custom={i}>
                <SpaceCard space={space} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ FEATURED DISCUSSIONS + SIDEBAR ═══════════════ */}
      <section
        id="discussions"
        className="relative overflow-hidden bg-gray-light/50 py-24"
      >
        <GridBg id="comm-disc-grid" size={52} opacity={0.025} />
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[13px] font-semibold uppercase tracking-wider text-purple">
              Featured Discussions
            </span>
            <h2 className="mt-3 font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-navy">
              What People Are Talking About
            </h2>
          </motion.div>

          {/* Tabs */}
          <div className="mt-8 flex gap-1 rounded-lg border border-border bg-white p-1 w-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-purple/10 text-purple"
                      : "text-gray-text hover:text-navy"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* Thread list */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="space-y-4"
            >
              {threads.map((thread, i) => (
                <motion.div
                  key={thread.id}
                  variants={fadeUp}
                  custom={Math.min(i, 5)}
                >
                  <ThreadPreview thread={thread} />
                </motion.div>
              ))}
            </motion.div>

            {/* Sidebar */}
            <div className="hidden lg:block">
              <TrendingSidebar />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ BADGES EXPLAINER ═══════════════ */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-navy">
              Verified Voices You Can Trust
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[16px] text-gray-text">
              Every contributor earns a badge so you always know who you&apos;re
              hearing from.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="mt-14 grid gap-8 md:grid-cols-3"
          >
            {[
              {
                icon: ShieldCheck,
                title: "OMARA Agent",
                desc: "Licensed migration agents verified against the official OMARA register. Professional advice you can rely on.",
                badge: "bg-purple/10 text-purple",
              },
              {
                icon: CheckCircle2,
                title: "Visa Holder",
                desc: "Community members who have successfully obtained their visa. Real experience from people who've been through it.",
                badge: "bg-teal/10 text-teal",
              },
              {
                icon: MessageCircle,
                title: "Applicant",
                desc: "Current visa applicants sharing their journey, questions, and insights. Connect with people on the same path.",
                badge: "bg-gray-light text-gray-text",
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                variants={fadeUp}
                custom={i}
                className="rounded-2xl border border-border bg-white p-8 text-center transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/5"
              >
                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-xl ${card.badge}`}
                >
                  <card.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-heading text-[19px] font-semibold text-navy">
                  {card.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-text">
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ WAITLIST CTA ═══════════════ */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-purple to-purple-deep px-8 py-20 text-center sm:px-16">
            <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-white">
              Be Part of Australia&apos;s Premier
              <br />
              Immigration Community
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-white/70">
              Verified badges, visa-specific spaces, expert answers, and
              anti-spam protection. A community built for immigration, not
              adapted from something else.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mx-auto mt-8 flex max-w-md gap-3"
            >
              <input
                type="email"
                placeholder="you@email.com"
                className="h-12 flex-1 rounded-lg border border-white/20 bg-white/10 px-4 text-[14px] text-white placeholder:text-white/40 backdrop-blur-sm focus-visible:border-white/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
              />
              <button
                type="submit"
                className="h-12 rounded-lg bg-white px-6 text-[14px] font-semibold text-purple transition-colors hover:bg-white/90"
              >
                Join Waitlist
              </button>
            </form>
            <p className="mt-3 text-[13px] text-white/40">
              We&apos;ll notify you when the community launches. No spam, ever.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
