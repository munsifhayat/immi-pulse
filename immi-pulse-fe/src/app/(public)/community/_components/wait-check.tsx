"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Loader2 } from "lucide-react";
import {
  useVisaSubclasses,
  useWaitCheck,
  type WaitTier,
} from "@/lib/api/hooks/community";
import { formatDays } from "../_lib/format";
import { ShareTimeline } from "./share-timeline";

const TIER_STYLES: Record<
  WaitTier,
  { dot: string; text: string; ring: string; chip: string }
> = {
  on_track: {
    dot: "bg-teal",
    text: "text-teal",
    ring: "ring-teal/30",
    chip: "bg-teal/10 text-teal",
  },
  normal: {
    dot: "bg-teal",
    text: "text-teal",
    ring: "ring-teal/30",
    chip: "bg-teal/10 text-teal",
  },
  longer: {
    dot: "bg-amber-500",
    text: "text-amber-600",
    ring: "ring-amber-300",
    chip: "bg-amber-50 text-amber-600",
  },
  outlier: {
    dot: "bg-rose-500",
    text: "text-rose-600",
    ring: "ring-rose-300",
    chip: "bg-rose-50 text-rose-600",
  },
  unknown: {
    dot: "bg-gray-400",
    text: "text-gray-text",
    ring: "ring-gray-200",
    chip: "bg-gray-light text-gray-text",
  },
};

const fieldCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-navy outline-none transition-colors focus:border-purple/60 focus:ring-2 focus:ring-purple/15";

/** Horizontal percentile band with the applicant's position marked. */
function PositionBar({
  elapsed,
  p25,
  p50,
  p75,
  p90,
  slowest,
  tier,
}: {
  elapsed: number;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  slowest: number | null;
  tier: WaitTier;
}) {
  const scaleMax = useMemo(() => {
    const candidates = [elapsed, p90 ?? 0, slowest ?? 0].filter((n) => n > 0);
    return Math.max(...candidates, 1) * 1.12;
  }, [elapsed, p90, slowest]);

  const pct = (v: number | null) =>
    v == null ? null : Math.max(0, Math.min(100, (v / scaleMax) * 100));

  const styles = TIER_STYLES[tier];
  const youPct = pct(elapsed) ?? 0;
  const p25Pct = pct(p25);
  const p75Pct = pct(p75);
  const p50Pct = pct(p50);
  const p90Pct = pct(p90);

  return (
    <div className="pt-7 pb-9">
      <div className="relative h-3 rounded-full bg-gray-light">
        {/* Typical middle band (p25–p75) */}
        {p25Pct != null && p75Pct != null && (
          <div
            className="absolute top-0 h-3 rounded-full bg-purple/15"
            style={{ left: `${p25Pct}%`, width: `${Math.max(0, p75Pct - p25Pct)}%` }}
          />
        )}
        {/* Median marker */}
        {p50Pct != null && (
          <div
            className="absolute -top-1.5 h-6 w-px bg-navy/40"
            style={{ left: `${p50Pct}%` }}
          >
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-gray-text">
              median {formatDays(p50)}
            </span>
          </div>
        )}
        {/* 90th percentile marker */}
        {p90Pct != null && (
          <div
            className="absolute -top-1.5 h-6 w-px bg-navy/25"
            style={{ left: `${p90Pct}%` }}
          >
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-gray-text/80">
              90% by {formatDays(p90)}
            </span>
          </div>
        )}
        {/* You */}
        <motion.div
          initial={{ left: "0%" }}
          animate={{ left: `${youPct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="absolute -top-2 -translate-x-1/2"
        >
          <span
            className={`absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles.chip}`}
          >
            you · {formatDays(elapsed)}
          </span>
          <span
            className={`block h-7 w-7 rounded-full ${styles.dot} ring-4 ${styles.ring} border-2 border-white shadow`}
          />
        </motion.div>
      </div>
    </div>
  );
}

export function WaitCheck() {
  const { data: subclasses = [] } = useVisaSubclasses();
  const [subclass, setSubclass] = useState("");
  const [lodgedOn, setLodgedOn] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const { data: result, isFetching } = useWaitCheck(
    subclass || undefined,
    lodgedOn || undefined
  );

  const ready = !!subclass && !!lodgedOn;
  const styles = result ? TIER_STYLES[result.tier] : TIER_STYLES.unknown;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      {/* Controls */}
      <div className="border-b border-border bg-gray-light/40 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-purple/10">
            <Activity className="h-4 w-4 text-purple" />
          </span>
          <h3 className="font-heading text-lg text-navy">Is my wait normal?</h3>
        </div>
        <p className="mt-1.5 text-[13px] text-gray-text">
          Tell us your visa and lodgement date — we’ll show where you sit against
          real community timelines.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
          <select
            value={subclass}
            onChange={(e) => setSubclass(e.target.value)}
            className={fieldCls}
            aria-label="Visa subclass"
          >
            <option value="">Select your visa…</option>
            {subclasses.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.code} · {s.name}
                {s.stream ? ` (${s.stream})` : ""}
              </option>
            ))}
          </select>
          <input
            type="date"
            max={today}
            value={lodgedOn}
            onChange={(e) => setLodgedOn(e.target.value)}
            className={fieldCls}
            aria-label="Lodgement date"
          />
        </div>
      </div>

      {/* Result */}
      <div className="p-5 sm:p-6">
        {!ready ? (
          <div className="py-8 text-center text-[13px] text-gray-text">
            Pick a visa and date to see your position.
          </div>
        ) : isFetching && !result ? (
          <div className="flex items-center justify-center py-8 text-gray-text">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking…
          </div>
        ) : !result ? (
          <div className="py-8 text-center text-[13px] text-gray-text">
            We couldn’t check that one. Try another visa.
          </div>
        ) : result.tier === "unknown" ? (
          <div className="py-6 text-center">
            <p className="text-[15px] font-medium text-navy">{result.headline}</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] text-gray-text">
              {result.detail}
            </p>
            <div className="mt-5">
              <ShareTimeline defaultSubclass={subclass} />
            </div>
          </div>
        ) : (
          <>
            <PositionBar
              elapsed={result.elapsed_days}
              p25={result.p25}
              p50={result.p50}
              p75={result.p75}
              p90={result.p90}
              slowest={result.slowest}
              tier={result.tier}
            />

            <p className={`text-[15px] font-semibold ${styles.text}`}>
              {result.headline}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-text">
              {result.detail}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-border pt-4 text-[12px] text-gray-text">
              <span>
                Based on{" "}
                <span className="font-semibold text-navy">
                  {result.sample_size.toLocaleString()}
                </span>{" "}
                grants
              </span>
              <span>
                <span className="font-semibold text-navy">
                  {result.pending.toLocaleString()}
                </span>{" "}
                still waiting
              </span>
              {result.official_p50_days != null && (
                <span>
                  Official median{" "}
                  <span className="font-semibold text-navy">
                    {formatDays(result.official_p50_days)}
                  </span>
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
