"use client";

import { useState } from "react";
import { ChevronDown, Info, Loader2, ShieldCheck } from "lucide-react";
import { useProcessingStats } from "@/lib/api/hooks/community";
import { deltaVsOfficial, formatDays } from "../_lib/format";

export function OfficialTimes() {
  const [open, setOpen] = useState(false);
  const { data: stats = [], isLoading } = useProcessingStats();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-light/40"
        aria-expanded={open}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple/10">
          <ShieldCheck className="h-4 w-4 text-purple" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-navy">
            Official Home Affairs processing times
          </div>
          <div className="text-[12px] text-gray-text">
            The department&apos;s published figures — the baseline behind every
            wait-check above
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gray-text transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-text">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              {stats.map((v) => {
                const delta = deltaVsOfficial(v.community.p50, v.official_p50_days);
                return (
                  <div
                    key={v.slug}
                    className="grid grid-cols-[56px_1fr_auto] items-center gap-3.5 border-b border-gray-light px-4 py-3 last:border-b-0"
                  >
                    <span className="font-heading text-[19px] font-semibold text-navy">
                      {v.code}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-navy">
                        {v.name}
                      </div>
                      <div className="text-[11.5px] text-gray-text">
                        50% in{" "}
                        <b className="text-navy">{formatDays(v.official_p50_days)}</b>{" "}
                        · 90% in{" "}
                        <b className="text-navy">{formatDays(v.official_p90_days)}</b>
                        {v.official_updated ? ` · updated ${v.official_updated}` : ""}
                      </div>
                    </div>
                    {v.community.sample_size > 0 && delta ? (
                      <span className="whitespace-nowrap rounded-full bg-gray-light px-2.5 py-1 text-[11px] font-semibold text-gray-text">
                        Community {delta}
                      </span>
                    ) : (
                      <span className="whitespace-nowrap rounded-full bg-gray-light px-2.5 py-1 text-[11px] font-medium text-gray-text/70">
                        No community data yet
                      </span>
                    )}
                  </div>
                );
              })}
              <div className="flex items-start gap-2 bg-gray-light/40 px-4 py-3 text-[11.5px] text-gray-text">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple" />
                Official times show the range for 50% and 90% of applications
                finalised recently. Community figures are crowdsourced — a sanity
                check, not a guarantee. Always corroborate with an OMARA-registered
                agent.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
