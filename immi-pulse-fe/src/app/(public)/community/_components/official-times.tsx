"use client";

import { useState } from "react";
import { ChevronDown, Loader2, ShieldCheck } from "lucide-react";
import { useProcessingStats } from "@/lib/api/hooks/community";
import { deltaVsOfficial, formatDays } from "../_lib/format";

export function OfficialTimes() {
  const [open, setOpen] = useState(false);
  const { data: stats = [], isLoading } = useProcessingStats();

  return (
    <div className="overflow-hidden rounded-2xl border border-hair bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-black/[0.015]"
        aria-expanded={open}
      >
        <ShieldCheck className="h-4 w-4 shrink-0 text-teal" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-ink">
            Official Home Affairs processing times
          </div>
          <div className="c-mono mt-0.5 text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
            The published baseline behind every wait-check
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={1.75}
        />
      </button>

      {open && (
        <div className="border-t border-hair">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-ink-soft">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />{" "}
              Loading…
            </div>
          ) : (
            <>
              {stats.map((v) => {
                const delta = deltaVsOfficial(v.community.p50, v.official_p50_days);
                const faster = delta?.includes("faster");
                return (
                  <div
                    key={v.slug}
                    className="grid grid-cols-[52px_1fr_auto] items-center gap-4 border-b border-hair px-5 py-3.5 last:border-b-0"
                  >
                    <span className="c-mono text-[17px] font-semibold text-ink">
                      {v.code}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-ink">
                        {v.name}
                      </div>
                      <div className="c-mono mt-0.5 text-[10.5px] text-ink-soft">
                        50% · <span className="text-ink">{formatDays(v.official_p50_days)}</span>
                        {"   "}90% · <span className="text-ink">{formatDays(v.official_p90_days)}</span>
                        {v.official_updated ? `   ${v.official_updated}` : ""}
                      </div>
                    </div>
                    {v.community.sample_size > 0 && delta ? (
                      <span
                        className={`c-mono whitespace-nowrap text-[11px] font-semibold ${
                          faster ? "text-teal" : "text-[#B4700F]"
                        }`}
                      >
                        community {delta}
                      </span>
                    ) : (
                      <span className="c-mono whitespace-nowrap text-[10.5px] text-ink-soft/60">
                        no community data
                      </span>
                    )}
                  </div>
                );
              })}
              <p className="px-5 py-3.5 text-[11px] leading-relaxed text-ink-soft">
                Official figures show the range for 50% and 90% of applications
                finalised recently. Community figures are crowdsourced — a sanity
                check, not a guarantee. Always corroborate with an OMARA-registered
                agent.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
