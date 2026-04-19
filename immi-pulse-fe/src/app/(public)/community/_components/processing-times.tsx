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
} from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";
import {
  processingTimes,
  processingSources,
  type VisaProcessingTime,
  type VisaTrend,
} from "../_lib/processing-times-data";

type Tab = "official" | "community";

function TrendBadge({ trend }: { trend: VisaTrend }) {
  const cfg = {
    faster: {
      Icon: TrendingDown,
      label: "Trending faster",
      cls: "bg-teal/10 text-teal",
    },
    slower: {
      Icon: TrendingUp,
      label: "Trending slower",
      cls: "bg-rose-100 text-rose-600",
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

function VisaRow({ visa, tab }: { visa: VisaProcessingTime; tab: Tab }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-4 rounded-xl border border-border bg-white p-5 transition-all hover:border-purple/30 hover:shadow-sm sm:grid-cols-[110px_1fr_auto] sm:items-center">
      {/* Visa code */}
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

      {/* Name + metrics */}
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-navy">{visa.name}</p>
        {tab === "official" ? (
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            <div className="text-[12px] text-gray-text">
              <span className="text-gray-text/70">50% processed in </span>
              <span className="font-semibold text-navy">
                {visa.official.p50}
              </span>
            </div>
            <div className="text-[12px] text-gray-text">
              <span className="text-gray-text/70">90% in </span>
              <span className="font-semibold text-navy">
                {visa.official.p90}
              </span>
            </div>
            <div className="text-[11px] text-gray-text/70">
              Updated {visa.official.updated}
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            <div className="text-[12px] text-gray-text">
              <span className="text-gray-text/70">Community median </span>
              <span className="font-semibold text-navy">
                {visa.community.median}
              </span>
            </div>
            <div className="text-[12px] text-gray-text">
              <span className="text-gray-text/70">Fastest </span>
              <span className="font-semibold text-teal">
                {visa.community.fastest}
              </span>
            </div>
            <div className="text-[12px] text-gray-text">
              <span className="text-gray-text/70">Slowest </span>
              <span className="font-semibold text-navy">
                {visa.community.slowest}
              </span>
            </div>
            <div className="text-[11px] text-gray-text/70">
              {visa.community.sampleSize.toLocaleString()} reports
            </div>
          </div>
        )}
      </div>

      {/* Right badge */}
      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
        {tab === "community" ? (
          <>
            <span className="text-[11px] text-gray-text">
              {visa.community.deltaVsOfficial}
            </span>
            <TrendBadge trend={visa.community.trend} />
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

  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-purple">
              <Clock className="h-3.5 w-3.5" />
              Processing Times
            </span>
            <h2 className="mt-3 font-heading text-[clamp(1.75rem,3.5vw,2.75rem)] font-normal tracking-[-1px] text-navy">
              How Long Each Visa Is Really Taking
            </h2>
            <p className="mt-3 text-[16px] text-gray-text">
              Compare the{" "}
              <span className="font-medium text-navy">official</span>{" "}
              Department of Home Affairs figures with{" "}
              <span className="font-medium text-navy">crowdsourced</span> data
              from trackers, forums, and applicants reporting grants.
            </p>
          </div>

          {/* Tabs */}
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
        </motion.div>

        {/* Grid */}
        <motion.div
          key={tab}
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mt-10 grid gap-3 md:grid-cols-2"
        >
          {processingTimes.map((visa, i) => (
            <motion.div
              key={visa.code}
              variants={fadeUp}
              custom={Math.min(i, 6)}
            >
              <VisaRow visa={visa} tab={tab} />
            </motion.div>
          ))}
        </motion.div>

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
                ? "Official times show the range for 50% and 90% of applications finalised in the last quarter. Individual outcomes vary."
                : "Community data is crowdsourced and unofficial — useful as a sanity check, not a guarantee. Always corroborate with an OMARA-registered agent."}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {processingSources
              .filter((s) =>
                tab === "official" ? s.type === "Official" : s.type === "Community"
              )
              .map((s) => (
                <span
                  key={s.label}
                  className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] text-gray-text"
                >
                  {s.label}
                </span>
              ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
