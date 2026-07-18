"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { useFeedSummary } from "@/lib/api/hooks/community";
import { WaitCheck } from "./_components/wait-check";
import { OfficialTimes } from "./_components/official-times";
import { CommunityFeed } from "./_components/community-feed";

export default function CommunityPage() {
  const { data: summary } = useFeedSummary();

  return (
    <div className="c-paper min-h-screen text-ink">
      {/* ═══════════ HERO + INLINE WAIT-CHECK ═══════════ */}
      <section className="relative overflow-hidden">
        {/* ambient horizon curves — the distribution motif, whisper-quiet */}
        <svg
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-6 h-[360px] w-[720px] text-purple/[0.09]"
          viewBox="0 0 720 360"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          {[0, 34, 68, 102, 136].map((dy) => (
            <path
              key={dy}
              d={`M-20 ${300 - dy} C 150 ${300 - dy}, 220 ${120 - dy}, 380 ${120 - dy} S 600 ${300 - dy}, 760 ${240 - dy}`}
              stroke="currentColor"
              strokeWidth="1.25"
            />
          ))}
        </svg>

        <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-12 px-6 pb-12 pt-16 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:pt-20">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="c-eyebrow">Australian visa community</span>
            <h1 className="mt-5 font-heading text-[clamp(2.3rem,4.6vw,3.4rem)] font-semibold leading-[1.04] tracking-[-1.6px] text-ink">
              Is your visa wait{" "}
              <span className="relative whitespace-nowrap">
                <span className="c-serif text-[1.12em] text-purple-deep">
                  normal
                </span>
                <span className="text-purple-deep">?</span>
                <svg
                  aria-hidden
                  className="absolute -bottom-1 left-0 w-[calc(100%-0.3em)] text-purple/40"
                  height="8"
                  viewBox="0 0 200 8"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M1 5 C 40 2, 160 2, 199 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-ink-soft">
              See where your wait sits against real timelines applicants are
              sharing right now — then ask the people just ahead of you.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
              <span className="c-mono flex items-center gap-2 text-[12px] text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                {summary
                  ? `${summary.timelines.toLocaleString()} timelines shared`
                  : "Real applicant timelines"}
              </span>
              <span className="c-mono flex items-center gap-2 text-[12px] text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-purple" />
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
      <section className="relative z-10 mx-auto max-w-[1200px] px-6 lg:px-8">
        <OfficialTimes />
      </section>

      {/* ═══════════ THE COMMUNITY FEED ═══════════ */}
      <CommunityFeed />
    </div>
  );
}
