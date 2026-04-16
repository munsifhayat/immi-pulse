"use client";

import { motion } from "framer-motion";
import {
  Users,
  ArrowRight,
  Loader2,
  MessageCircle as MessageCircleIcon,
} from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";
import {
  useCommunitySpaces,
  useCommunityStats,
  useRecentThreads,
} from "@/lib/api/hooks/community";
import { SpaceCard } from "./_components/space-card";
import { ThreadPreview } from "./_components/thread-preview";
import { CommunitySidebar } from "./_components/community-sidebar";

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

export default function CommunityPage() {
  const spacesQuery = useCommunitySpaces();
  const statsQuery = useCommunityStats();
  const recentQuery = useRecentThreads(8);

  const spaces = spacesQuery.data ?? [];
  const stats = statsQuery.data;
  const recentThreads = recentQuery.data ?? [];

  return (
    <div className="overflow-hidden bg-white">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative flex min-h-[50vh] items-center overflow-hidden bg-white pt-16">
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
              Ask questions, share experiences, and connect with others on the
              same Australian immigration journey. No sign-in required.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="mt-8 flex flex-wrap items-center justify-center gap-4"
            >
              <a
                href="#spaces"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-7 py-3.5 text-[16px] font-medium text-white shadow-lg shadow-purple/25 transition-all hover:border-purple-deep hover:bg-purple-deep"
              >
                Explore Spaces
                <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════ STATS BAR ═══════════════ */}
      {stats && (
        <section className="border-y border-border bg-gray-light/50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-3 divide-x divide-border"
            >
              {[
                { value: stats.total_spaces, label: "Spaces" },
                { value: stats.total_threads, label: "Threads" },
                { value: stats.total_comments, label: "Comments" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  custom={i}
                  className="px-6 py-8 text-center"
                >
                  <p className="font-heading text-2xl font-semibold text-navy">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[13px] text-gray-text">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ═══════════════ SPACES GRID ═══════════════ */}
      <section id="spaces" className="py-24">
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

          {spacesQuery.isLoading ? (
            <div className="mt-12 flex items-center justify-center py-12 text-gray-text">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading spaces...
            </div>
          ) : spaces.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-dashed border-border bg-white p-12 text-center">
              <MessageCircleIcon className="mx-auto h-8 w-8 text-gray-text/40" />
              <p className="mt-3 text-sm text-gray-text">
                No spaces available yet. Check back soon.
              </p>
            </div>
          ) : (
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
          )}
        </div>
      </section>

      {/* ═══════════════ RECENT DISCUSSIONS + SIDEBAR ═══════════════ */}
      <section className="relative overflow-hidden bg-gray-light/50 py-24">
        <GridBg id="comm-disc-grid" size={52} opacity={0.025} />
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[13px] font-semibold uppercase tracking-wider text-purple">
              Recent Discussions
            </span>
            <h2 className="mt-3 font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-navy">
              What People Are Talking About
            </h2>
          </motion.div>

          {/* Content */}
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* Thread list */}
            {recentQuery.isLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-border bg-white p-10 text-gray-text">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading discussions...
              </div>
            ) : recentThreads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center">
                <MessageCircleIcon className="mx-auto h-8 w-8 text-gray-text/40" />
                <p className="mt-3 text-sm font-medium text-navy">
                  No discussions yet — be the first to start one!
                </p>
                <p className="mt-1 text-[13px] text-gray-text">
                  Pick a space above and create a thread.
                </p>
              </div>
            ) : (
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                className="space-y-4"
              >
                {recentThreads.map((thread, i) => (
                  <motion.div
                    key={thread.id}
                    variants={fadeUp}
                    custom={Math.min(i, 5)}
                  >
                    <ThreadPreview thread={thread} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Sidebar */}
            <div className="hidden lg:block">
              <CommunitySidebar />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
