"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { useProcessingStats } from "@/lib/api/hooks/community";
import { formatDays } from "@/lib/community/format";
import { useCommunity } from "./community-context";

/** Search the community. `/` focuses it, the way every platform this borrows from does. */
function CommunitySearch() {
  const { search, setSearch } = useCommunity();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <label className="flex items-center gap-2.5 rounded-full border border-hair bg-white px-4 py-2.5 transition-all focus-within:border-ink focus-within:shadow-[3px_3px_0_0_color-mix(in_srgb,var(--purple)_16%,transparent)]">
      <Search className="h-3.5 w-3.5 shrink-0 text-ink-soft" strokeWidth={1.75} />
      <input
        ref={ref}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search the community"
        aria-label="Search the community"
        className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
      />
      <kbd className="c-mono shrink-0 rounded border border-hair px-1.5 py-0.5 text-[9.5px] text-ink-soft">
        /
      </kbd>
    </label>
  );
}

/**
 * Processing times, both sources side by side.
 *
 * The official figure alone is an unchecked claim; the community's alone has nothing
 * corroborating it. Neither column is ever rendered without the other, and the
 * community's number carries its composition — timelines collected from public
 * forums count toward it, and the condition of that decision was that the split
 * stays visible.
 */
function DualSourceTimes() {
  const { data: stats = [] } = useProcessingStats();
  const rows = stats.slice(0, 6);
  if (rows.length === 0) return null;

  // One provenance sentence for the panel: they are generated server-side from
  // the same cohort logic, so the widest one describes the table honestly
  // without repeating a line per row in a 340px rail.
  const note = rows
    .map((r) => r.community.provenance_note)
    .filter(Boolean)
    .sort((a, b) => (b as string).length - (a as string).length)[0];

  return (
    <div className="rounded-2xl border border-hair bg-white p-4">
      <span className="c-eyebrow mb-3 block">Processing times · two sources</span>
      <table className="c-mono w-full table-fixed border-collapse text-[10.5px]">
        <colgroup>
          <col className="w-[52%]" />
          <col className="w-[24%]" />
          <col className="w-[24%]" />
        </colgroup>
        <thead>
          <tr>
            <th className="border-b border-hair pb-1.5" />
            <th className="border-b border-hair pb-1.5 text-right text-[8.5px] font-medium tracking-[0.12em] text-ink-soft">
              OFFICIAL
            </th>
            <th className="border-b border-hair pb-1.5 text-right text-[8.5px] font-medium tracking-[0.12em] text-ink-soft">
              COMMUNITY
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => {
            const community = v.community;
            return (
              <tr key={v.slug}>
                <td className="border-b border-dashed border-hair py-2 text-ink-soft">
                  <span className="text-ink">{v.code}</span> {v.name}
                </td>
                <td className="border-b border-dashed border-hair py-2 text-right text-ink-soft">
                  {formatDays(v.official.p50_days)}
                </td>
                <td className="border-b border-dashed border-hair py-2 text-right font-semibold text-purple-deep">
                  {/* Below the floor we say so rather than publish a median
                      that would swing on the next single grant. */}
                  {community.sufficient ? formatDays(community.p50) : "—"}
                  <span className="block text-[8px] font-normal tracking-[0.06em] text-ink-soft">
                    n={community.provenance.total}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="c-mono mt-2.5 text-[9px] leading-[1.7] tracking-[0.05em] text-ink-soft/80">
        OFFICIAL · HOME AFFAIRS PUBLISHED BANDS · RECORDED BY HAND, SEE EACH
        AS-AT DATE
        <br />
        COMMUNITY · MEDIAN OF SHARED TIMELINES LODGED IN THE LAST 12 MONTHS
      </p>
      {note && (
        <p className="mt-2 text-[10.5px] leading-relaxed text-ink-soft">
          {note}
        </p>
      )}
    </div>
  );
}

function WaitCheckTeaser() {
  return (
    <Link
      href="/wait-check"
      className="block rounded-2xl border-[1.5px] border-ink bg-white p-4 shadow-[4px_4px_0_0_color-mix(in_srgb,var(--purple)_14%,transparent)] transition-transform hover:-translate-y-0.5"
    >
      <span className="c-eyebrow mb-2 block text-purple-deep">Wait check</span>
      <h4 className="font-heading text-[20px] font-semibold leading-tight tracking-[-0.3px] text-ink">
        Is my wait{" "}
        <span className="c-serif text-[1.12em] text-purple-deep">normal?</span>
      </h4>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
        Your lodgement date against real timelines on the same subclass. No
        account, no sign-in — just the answer.
      </p>
      <span className="c-mono mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
        Check my wait <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    </Link>
  );
}

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/news", label: "News" },
  { href: "/for-consultants", label: "For consultants" },
];

export function RightRail() {
  return (
    <div className="flex flex-col gap-4">
      <CommunitySearch />
      <WaitCheckTeaser />
      <DualSourceTimes />

      {/* The footer lives here — critical links, zero website chrome. */}
      <div className="px-1.5 pb-8 pt-1">
        <div className="mb-2.5 flex flex-wrap gap-x-3.5 gap-y-1">
          {FOOTER_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="c-mono text-[9.5px] tracking-[0.05em] text-ink-soft transition-colors hover:text-ink hover:underline hover:underline-offset-[3px]"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <p className="c-mono text-[8.5px] leading-[1.8] tracking-[0.04em] text-ink-soft/75">
          © {new Date().getFullYear()} IMMI360 · GENERAL INFORMATION SHARED
          BETWEEN COMMUNITY MEMBERS — NOT MIGRATION ADVICE (MIGRATION ACT 1958,
          S276)
        </p>
      </div>
    </div>
  );
}
