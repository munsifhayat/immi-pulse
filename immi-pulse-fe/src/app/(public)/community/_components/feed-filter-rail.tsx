"use client";

import {
  Briefcase,
  Building2,
  GraduationCap,
  Heart,
  HelpCircle,
  LayoutGrid,
  Loader,
  PartyPopper,
  Plus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type {
  CommunityIdentity,
  FeedSummaryOut,
  JourneyFeedParams,
} from "@/lib/api/hooks/community";
import { IdentityBadge } from "./identity-badge";

export interface FeedFilter {
  id: string;
  label: string;
  Icon: LucideIcon;
  sub?: string;
  group?: string;
  params: JourneyFeedParams;
  count: (s?: FeedSummaryOut) => number | undefined;
}

export const FEED_FILTERS: FeedFilter[] = [
  {
    id: "all",
    label: "All posts",
    Icon: LayoutGrid,
    params: {},
    count: (s) => s?.all,
  },
  {
    id: "questions",
    label: "Questions",
    Icon: HelpCircle,
    params: { type: "question" },
    count: (s) => s?.questions,
  },
  {
    id: "timelines",
    label: "Timelines",
    Icon: Loader,
    params: { type: "timeline" },
    count: (s) => s?.timelines,
  },
  {
    id: "employer-sponsored",
    label: "Employer Sponsored",
    sub: "186 · 482 · 494",
    Icon: Building2,
    group: "Visa families",
    params: { category: "employer-sponsored" },
    count: (s) => s?.by_category["employer-sponsored"] ?? 0,
  },
  {
    id: "skilled-migration",
    label: "Skilled Migration",
    sub: "189 · 190 · 491",
    Icon: Briefcase,
    params: { category: "skilled-migration" },
    count: (s) => s?.by_category["skilled-migration"] ?? 0,
  },
  {
    id: "partner-visas",
    label: "Partner & Spouse",
    sub: "820 · 309 · 143",
    Icon: Heart,
    params: { category: "partner-visas" },
    count: (s) => s?.by_category["partner-visas"] ?? 0,
  },
  {
    id: "student-visas",
    label: "Student Visas",
    sub: "500",
    Icon: GraduationCap,
    params: { category: "student-visas" },
    count: (s) => s?.by_category["student-visas"] ?? 0,
  },
  {
    id: "graduate-post-study",
    label: "Graduate & Post-Study",
    sub: "485",
    Icon: Users,
    params: { category: "graduate-post-study" },
    count: (s) => s?.by_category["graduate-post-study"] ?? 0,
  },
  {
    id: "waiting",
    label: "Still waiting",
    Icon: Loader,
    group: "Status",
    params: { status: "waiting" },
    count: (s) => s?.waiting,
  },
  {
    id: "granted",
    label: "Recently granted",
    Icon: PartyPopper,
    params: { status: "granted" },
    count: (s) => s?.granted,
  },
];

/* ── Vertical rail (lg+) ─────────────────────────────────────────────────── */

export function FeedFilterRail({
  activeId,
  onSelect,
  summary,
  identity,
  onShare,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  summary?: FeedSummaryOut;
  identity?: CommunityIdentity;
  onShare: () => void;
}) {
  const sharedAlready = identity ? !identity.can_post_timeline : false;

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-col gap-0.5">
        {FEED_FILTERS.map((f, i) => {
          const showGroup = !!f.group && f.group !== FEED_FILTERS[i - 1]?.group;
          const active = activeId === f.id;
          const count = f.count(summary);
          return (
            <div key={f.id}>
              {showGroup && (
                <div className="c-eyebrow px-2.5 pb-2 pt-4">{f.group}</div>
              )}
              <button
                onClick={() => onSelect(f.id)}
                className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  active
                    ? "bg-purple/[0.06] text-ink"
                    : "text-ink-soft hover:bg-black/[0.03] hover:text-ink"
                }`}
              >
                {active && (
                  <span className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-full bg-purple" />
                )}
                <f.Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-purple" : "text-ink-soft"}`}
                  strokeWidth={1.75}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {f.label}
                  </span>
                  {f.sub && (
                    <span className="c-mono block truncate text-[10px] text-ink-soft">
                      {f.sub}
                    </span>
                  )}
                </span>
                {count != null && (
                  <span
                    className={`c-mono shrink-0 text-[11px] ${
                      active ? "text-purple" : "text-ink-soft/70"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      <div className="h-px bg-hair" />

      <button
        onClick={onShare}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
          sharedAlready
            ? "bg-teal/10 text-teal hover:bg-teal/15"
            : "bg-ink text-white hover:bg-ink/90"
        }`}
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        {sharedAlready ? "Shared ✓ · add more" : "Share your timeline"}
      </button>
      {identity && (
        <div className="c-mono px-1 text-center text-[10.5px] text-ink-soft">
          posting as <IdentityBadge identity={identity} />
        </div>
      )}
    </div>
  );
}

/* ── Horizontal chips (mobile) ───────────────────────────────────────────── */

export function FeedFilterChips({
  activeId,
  onSelect,
  summary,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  summary?: FeedSummaryOut;
}) {
  return (
    <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FEED_FILTERS.map((f) => {
        const active = activeId === f.id;
        const count = f.count(summary);
        return (
          <button
            key={f.id}
            onClick={() => onSelect(f.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              active
                ? "border-ink bg-ink text-white"
                : "border-hair bg-white text-ink-soft hover:border-purple-light"
            }`}
          >
            <f.Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {f.label}
            {count != null && (
              <span
                className={`c-mono text-[10.5px] ${active ? "text-white/70" : "text-ink-soft/60"}`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
