"use client";

import { motion } from "framer-motion";
import { Clock, ShieldCheck, Users } from "lucide-react";
import { fadeUp } from "@/lib/motion";
import { useFeedSummary } from "@/lib/api/hooks/community";
import { WaitCheck } from "./_components/wait-check";
import { OfficialTimes } from "./_components/official-times";
import { CommunityFeed } from "./_components/community-feed";

export default function CommunityPage() {
  const { data: summary } = useFeedSummary();

  return (
    <div className="overflow-hidden bg-white">
      {/* ═══════════ HERO + INLINE WAIT-CHECK ═══════════ */}
      <section className="relative overflow-hidden pt-16">
        <div className="pointer-events-none absolute -right-32 -top-24 h-[480px] w-[480px] rounded-full bg-purple/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[360px] w-[360px] rounded-full bg-teal/[0.05] blur-3xl" />

        <div className="relative z-10 mx-auto grid max-w-[1240px] items-center gap-10 px-6 py-10 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-purple">
              <Users className="h-3.5 w-3.5" /> Australian Immigration Community
            </span>
            <h1 className="mt-3.5 font-heading text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-1.5px] text-navy">
              Is your visa wait{" "}
              <span className="bg-gradient-to-r from-purple to-purple-deep bg-clip-text text-transparent">
                normal?
              </span>
            </h1>
            <p className="mt-3.5 max-w-lg text-[16.5px] leading-relaxed text-gray-text">
              Compare your wait against real timelines applicants are sharing right
              now — see where you sit, browse by visa, and ask the people ahead of
              you. No sign-in to look or post your first timeline.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-[13px] font-medium text-gray-text shadow-sm">
                <Clock className="h-3.5 w-3.5 text-purple" />
                {summary
                  ? `${summary.timelines.toLocaleString()} timelines shared`
                  : "Real applicant timelines"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-[13px] font-medium text-gray-text shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-purple" />
                Anonymous &amp; free
              </span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
            <WaitCheck />
          </motion.div>
        </div>
      </section>

      {/* ═══════════ OFFICIAL FIGURES (secondary, collapsible) ═══════════ */}
      <section className="relative z-10 mx-auto max-w-[1240px] px-6 pb-2 lg:px-8">
        <OfficialTimes />
      </section>

      {/* ═══════════ THE COMMUNITY FEED ═══════════ */}
      <CommunityFeed />
    </div>
  );
}
