"use client";

import type { JourneyOut, MilestoneOut } from "@/lib/api/hooks/community";
import { shortDate } from "../_lib/format";
import {
  AWAITING_META,
  dayGap,
  gapLabel,
  milestoneMeta,
} from "./milestone-meta";

/** A synthetic trailing "awaiting" node for still-waiting timelines. */
function awaitingLabel(journey: JourneyOut): string | null {
  if (journey.outcome !== "waiting") return null;
  if (journey.elapsed_days != null && journey.elapsed_days > 0) {
    return `${journey.elapsed_days}d & counting`;
  }
  return "in progress";
}

/* ── Horizontal strip for feed cards (compact, up to 4 steps) ───────────── */

export function MilestoneStrip({ journey }: { journey: JourneyOut }) {
  const all = journey.milestones;
  const awaiting = awaitingLabel(journey);
  const MAX = 4;
  const shown = all.slice(0, MAX);
  const hidden = all.length - shown.length;

  return (
    <div className="mt-4 flex items-start overflow-hidden">
      {shown.map((m, i) => {
        const { Icon, color } = milestoneMeta(m.milestone_type);
        const next = shown[i + 1];
        const gap = next ? dayGap(m.occurred_on, next.occurred_on) : null;
        const isLast = i === shown.length - 1;
        return (
          <div key={m.id} className="flex flex-1 items-start">
            <div className="flex w-[78px] shrink-0 flex-col items-center text-center">
              <span
                className="grid h-10 w-10 place-items-center rounded-full text-white shadow-md"
                style={{ backgroundColor: color }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="mt-2 text-[11px] font-semibold leading-tight text-navy">
                {m.milestone_type.replace("…", "")}
              </span>
              <span className="mt-0.5 text-[10px] text-gray-text">
                {shortDate(m.occurred_on)}
              </span>
            </div>
            {!isLast && (
              <div className="flex flex-1 flex-col items-center pt-3.5">
                {gap != null && gap > 0 && (
                  <span className="mb-1 whitespace-nowrap rounded bg-purple/10 px-1.5 py-px text-[9.5px] font-bold text-purple">
                    {gapLabel(gap)}
                  </span>
                )}
                <span className="h-[3px] w-full rounded bg-gradient-to-r from-purple-light to-purple-muted" />
              </div>
            )}
          </div>
        );
      })}

      {hidden > 0 && (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-dashed border-border bg-gray-light text-[12px] font-bold text-gray-text">
          +{hidden}
        </span>
      )}

      {hidden === 0 && awaiting && (
        <div className="flex flex-1 items-start">
          <div className="flex flex-1 flex-col items-center pt-3.5">
            <span className="h-[3px] w-full rounded bg-gradient-to-r from-purple-light to-amber-200" />
          </div>
          <div className="flex w-[78px] shrink-0 flex-col items-center text-center">
            <span
              className="grid h-10 w-10 place-items-center rounded-full text-white shadow-md"
              style={{ backgroundColor: AWAITING_META.color }}
            >
              <AWAITING_META.Icon className="h-5 w-5" />
            </span>
            <span className="mt-2 text-[11px] font-semibold leading-tight text-amber-600">
              Awaiting
            </span>
            <span className="mt-0.5 text-[10px] text-gray-text">{awaiting}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Vertical list for the detail drawer (full journey) ─────────────────── */

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
    <>
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-col items-center">
          <span
            className="grid h-6 w-6 place-items-center rounded-full text-white"
            style={{ backgroundColor: color }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          {!isLast && <span className="my-0.5 min-h-3.5 w-0.5 flex-1 bg-border" />}
        </div>
        <div className="pb-1">
          <div className="text-[13px] font-semibold text-navy">
            {m.milestone_type}
            {m.label ? ` · ${m.label}` : ""}
          </div>
          <div className="text-[11.5px] text-gray-text">
            {shortDate(m.occurred_on)}
          </div>
        </div>
      </div>
      {!isLast && gap != null && gap > 0 && (
        <div className="ml-[35px] py-0.5 text-[10px] font-semibold text-purple">
          ↓ {gap} {gap === 1 ? "day" : "days"} later
        </div>
      )}
    </>
  );
}

export function JourneyBox({ journey }: { journey: JourneyOut }) {
  const ms = journey.milestones;
  const awaiting = awaitingLabel(journey);
  if (ms.length === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-gray-light/40">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-text">
          Application journey
        </span>
        <span className="text-[11.5px] font-semibold text-purple">
          {ms.length} milestone{ms.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="max-h-[280px] overflow-y-auto px-4 py-3.5">
        {ms.map((m, i) => {
          const next = ms[i + 1];
          const gap = next ? dayGap(m.occurred_on, next.occurred_on) : null;
          const isLastReal = i === ms.length - 1 && !awaiting;
          return (
            <VerticalItem key={m.id} m={m} gap={gap} isLast={isLastReal} />
          );
        })}
        {awaiting && (
          <div className="flex items-start gap-3">
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white"
              style={{ backgroundColor: AWAITING_META.color }}
            >
              <AWAITING_META.Icon className="h-3.5 w-3.5" />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-amber-600">
                Awaiting decision…
              </div>
              <div className="text-[11.5px] text-gray-text">{awaiting}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
