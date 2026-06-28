"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
  ShieldCheck,
  Info,
  Loader2,
} from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";
import {
  useProcessingStats,
  type ProcessingStatOut,
  type Trend,
} from "@/lib/api/hooks/community";
import { formatDays, deltaVsOfficial } from "../_lib/format";
import { WaitCheck } from "./wait-check";
import { ShareTimeline } from "./share-timeline";

type Tab = "official" | "community";

const SOURCES = [
  { label: "home.affairs.gov.au", type: "Official" as const },
  { label: "Community timelines", type: "Community" as const },
  { label: "r/AusVisa", type: "Community" as const },
  { label: "Tracker apps", type: "Community" as const },
];

function TrendBadge({ trend }: { trend: Trend }) {
  const cfg = {
    faster: {
      Icon: TrendingDown,
      label: "Trending faster",
      cls: "bg-teal/10 text-teal",
    },
    slower: {
      Icon: TrendingUp,
      label: "Trending slower",
      cls: "bg-rose-50 text-rose-600",
    },
    steady: {
      Icon: Minus,
      label: "Steady",
      cls: "bg-gray-light text-gray-text",
    },
  }[trend];
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.cls}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function VisaRow({ visa, tab }: { visa: ProcessingStatOut; tab: Tab }) {
  const c = visa.community;
  const delta = deltaVsOfficial(c.p50, visa.official_p50_days);
  return (
    <div className="grid grid-cols-[72px_1fr] gap-4 rounded-xl border border-border bg-white p-5 transition-all hover:border-purple/30 hover:shadow-sm sm:grid-cols-[92px_1fr_auto] sm:items-center">
      <div className="flex flex-col">
        <span className="font-heading text-2xl font-semibold text-navy">
          {visa.code}
        </span>
        {visa.stream && (
          <span className="mt-0.5 text-[11px] text-gray-text">
            {visa.stream}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[14px] font-medium text-navy">{visa.name}</p>
        {tab === "official" ? (
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            <div className="text-[12px] text-gray-text">
              <span className="text-gray-text/70">50% processed in </span>
              <span className="font-semibold text-navy">
                {formatDays(visa.official_p50_days)}
              </span>
            </div>
            <div className="text-[12px] text-gray-text">
              <span className="text-gray-text/70">90% in </span>
              <span className="font-semibold text-navy">
                {formatDays(visa.official_p90_days)}
              </span>
            </div>
            {visa.official_updated && (
              <div className="text-[11px] text-gray-text/70">
                Updated {visa.official_updated}
              </div>
            )}
          </div>
        ) : c.sample_size > 0 ? (
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            <div className="text-[12px] text-gray-text">
              <span className="text-gray-text/70">Community median </span>
              <span className="font-semibold text-navy">{formatDays(c.p50)}</span>
            </div>
            <div className="text-[12px] text-gray-text">
              <span className="text-gray-text/70">Range </span>
              <span className="font-semibold text-navy">
                {formatDays(c.fastest)} – {formatDays(c.slowest)}
              </span>
            </div>
            <div className="text-[11px] text-gray-text/70">
              {c.sample_size.toLocaleString()} grants · {c.pending.toLocaleString()}{" "}
              waiting
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-gray-text/70">
            No community timelines yet — be the first to add one.
          </p>
        )}
      </div>

      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
        {tab === "community" ? (
          <>
            {delta && (
              <span className="text-[11px] text-gray-text">{delta}</span>
            )}
            <TrendBadge trend={visa.trend} />
          </>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple/10 px-2 py-0.5 text-[11px] font-medium text-purple">
            <ShieldCheck className="h-3 w-3" />
            Dept. of Home Affairs
          </span>
        )}
      </div>
    </div>
  );
}

export function ProcessingTimes() {
  const [tab, setTab] = useState<Tab>("official");
  const { data: stats = [], isLoading } = useProcessingStats();

  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-purple">
            <Clock className="h-3.5 w-3.5" />
            Processing Times
          </span>
          <h2 className="mt-3 font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-navy">
            How long each visa is really taking
          </h2>
          <p className="mt-3 text-[16px] text-gray-text">
            Check your own wait against real community timelines, then compare the{" "}
            <span className="font-medium text-navy">official</span> Home Affairs
            figures with what applicants are actually reporting.
          </p>
        </motion.div>

        {/* Wait-check centrepiece */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mx-auto mt-10 max-w-2xl"
        >
          <WaitCheck />
        </motion.div>

        {/* Board header + tabs */}
        <div className="mt-16 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-heading text-xl text-navy">
            Every visa, side by side
          </h3>
          <div className="inline-flex rounded-full border border-border bg-gray-light/60 p-1">
            <button
              onClick={() => setTab("official")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                tab === "official"
                  ? "bg-white text-navy shadow-sm"
                  : "text-gray-text hover:text-navy"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Official
            </button>
            <button
              onClick={() => setTab("community")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                tab === "community"
                  ? "bg-white text-navy shadow-sm"
                  : "text-gray-text hover:text-navy"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Community
            </button>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="mt-8 flex items-center justify-center rounded-2xl border border-border bg-white py-12 text-gray-text">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading processing times…
          </div>
        ) : (
          <motion.div
            key={tab}
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="mt-6 grid gap-3 md:grid-cols-2"
          >
            {stats.map((visa, i) => (
              <motion.div key={visa.slug} variants={fadeUp} custom={Math.min(i, 6)}>
                <VisaRow visa={visa} tab={tab} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-gray-light/40 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple" />
            <p className="text-[13px] text-gray-text">
              {tab === "official"
                ? "Official times show the range for 50% and 90% of applications finalised recently. Individual outcomes vary."
                : "Community data is crowdsourced and unofficial — a sanity check, not a guarantee. Always corroborate with an OMARA-registered agent."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden flex-wrap gap-1.5 sm:flex">
              {SOURCES.filter((s) =>
                tab === "official" ? s.type === "Official" : s.type === "Community"
              ).map((s) => (
                <span
                  key={s.label}
                  className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] text-gray-text"
                >
                  {s.label}
                </span>
              ))}
            </div>
            <ShareTimeline />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
