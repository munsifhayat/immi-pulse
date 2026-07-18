"use client";

import { useMemo, useState } from "react";
import type { JourneyOut, MilestoneOut } from "@/lib/api/hooks/community";
import { shortDate } from "../_lib/format";
import { dayGap, gapLabel, milestoneMeta } from "./milestone-meta";

/* Short display name for a milestone (drop trailing ellipsis, trim "Received"). */
function shortName(type: string): string {
  return type.replace("…", "");
}

function endState(journey: JourneyOut): {
  label: string;
  color: string;
  pulse: boolean;
} {
  if (journey.outcome === "granted")
    return { label: "Granted", color: "#1B7B6F", pulse: false };
  if (journey.outcome === "refused")
    return { label: "Decided", color: "#D6465B", pulse: false };
  const d =
    journey.elapsed_days != null && journey.elapsed_days > 0
      ? `${journey.elapsed_days}d & counting`
      : "In progress";
  return { label: d, color: "#C77D18", pulse: true };
}

/* ── Feed-card rail: a proportional "journey sparkline" ──────────────────────
   Nodes are positioned by their real dates, so long gaps read as wide spacing —
   an honest glance at the cadence. The last node is the live status. */
export function MilestoneStrip({ journey }: { journey: JourneyOut }) {
  const ms = useMemo(
    () =>
      [...journey.milestones].sort(
        (a, b) => +new Date(a.occurred_on) - +new Date(b.occurred_on)
      ),
    [journey.milestones]
  );

  // Stable "now" captured once at mount — keeps render pure (no Date.now() call
  // during render) while still letting a live timeline stretch to today.
  const [now] = useState(() => Date.now());

  if (ms.length === 0) return null;

  const awaiting = journey.outcome === "waiting";
  const start = new Date(ms[0].occurred_on).getTime();
  const lastReal = new Date(ms[ms.length - 1].occurred_on).getTime();
  const end = awaiting ? Math.max(now, lastReal) : lastReal;
  const span = Math.max(end - start, 1);
  const pct = (t: number) => ((t - start) / span) * 100;

  const es = endState(journey);
  const lastRealPct = pct(lastReal);

  return (
    <div className="mt-4">
      <div className="relative mx-1.5 h-6">
        {/* baseline */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-hair" />
        {/* travelled portion */}
        <div
          className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-purple/50 to-purple/25"
          style={{ width: `${lastRealPct}%` }}
        />

        {/* milestone nodes */}
        {ms.map((m) => {
          const { color } = milestoneMeta(m.milestone_type);
          return (
            <span
              key={m.id}
              title={`${shortName(m.milestone_type)} · ${shortDate(m.occurred_on)}`}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition-transform duration-150 hover:scale-[1.6]"
              style={{
                left: `${pct(new Date(m.occurred_on).getTime())}%`,
                backgroundColor: color,
              }}
            />
          );
        })}

        {/* live end node */}
        <span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: awaiting ? "100%" : `${lastRealPct}%` }}
        >
          <span
            className={`relative block h-3 w-3 rounded-full border-2 border-white ${
              es.pulse ? "c-node-pulse" : ""
            }`}
            style={{ backgroundColor: es.color }}
          />
        </span>
      </div>

      {/* endpoint captions */}
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="c-mono truncate text-[10.5px] text-ink-soft">
          {shortName(ms[0].milestone_type)} · {shortDate(ms[0].occurred_on)}
        </span>
        <span
          className="c-mono shrink-0 text-[10.5px] font-semibold"
          style={{ color: es.color }}
        >
          {es.label}
        </span>
      </div>
    </div>
  );
}

/* ── Drawer / detail: a full vertical timeline, refined ──────────────────── */

function VerticalItem({
  m,
  gap,
  isLast,
}: {
  m: MilestoneOut;
  gap: number | null;
  isLast: boolean;
}) {
  const { Icon, color } = milestoneMeta(m.milestone_type);
  return (
    <div className="flex gap-3.5">
      <div className="flex shrink-0 flex-col items-center">
        <span
          className="grid h-7 w-7 place-items-center rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        {!isLast && <span className="my-1 w-px flex-1 bg-hair" />}
      </div>
      <div className={isLast ? "pb-0.5" : "pb-5"}>
        <div className="text-[13.5px] font-semibold text-ink">
          {m.milestone_type}
          {m.label ? ` · ${m.label}` : ""}
        </div>
        <div className="c-mono mt-0.5 text-[11px] text-ink-soft">
          {shortDate(m.occurred_on)}
          {gap != null && gap > 0 && (
            <span className="text-ink-soft/70"> · {gapLabel(gap)} later</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function JourneyBox({ journey }: { journey: JourneyOut }) {
  const ms = useMemo(
    () =>
      [...journey.milestones].sort(
        (a, b) => +new Date(a.occurred_on) - +new Date(b.occurred_on)
      ),
    [journey.milestones]
  );
  if (ms.length === 0) return null;

  const awaiting = journey.outcome === "waiting";
  const es = endState(journey);

  return (
    <div className="mt-5">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="c-eyebrow">The journey</span>
        <span className="c-mono text-[11px] text-ink-soft">
          {ms.length} milestone{ms.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="pl-0.5">
        {ms.map((m, i) => {
          const prev = i > 0 ? ms[i - 1] : null;
          const gap = prev ? dayGap(prev.occurred_on, m.occurred_on) : null;
          const isLastReal = i === ms.length - 1 && !awaiting;
          return (
            <VerticalItem key={m.id} m={m} gap={gap} isLast={isLastReal} />
          );
        })}
        {awaiting && (
          <div className="flex gap-3.5">
            <span
              className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full"
              style={{ backgroundColor: es.color }}
            >
              <span className="c-node-pulse absolute inset-0 rounded-full" />
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <div>
              <div className="text-[13.5px] font-semibold text-[#B4700F]">
                Awaiting decision
              </div>
              <div className="c-mono mt-0.5 text-[11px] text-ink-soft">
                {es.label}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
