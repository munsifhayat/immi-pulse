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
    <div className="flex flex-col gap-3">
      <nav className="rounded-2xl border border-border bg-white p-2 shadow-sm">
        {FEED_FILTERS.map((f, i) => {
          const showGroup = !!f.group && f.group !== FEED_FILTERS[i - 1]?.group;
          const active = activeId === f.id;
          const count = f.count(summary);
          return (
            <div key={f.id}>
              {showGroup && (
                <div className="px-2.5 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-wide text-gray-text">
                  {f.group}
                </div>
              )}
              <button
                onClick={() => onSelect(f.id)}
                className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                  active ? "bg-purple/10" : "hover:bg-gray-light"
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
                    active
                      ? "border-purple bg-purple text-white"
                      : "border-border bg-white text-purple"
                  }`}
                >
                  <f.Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-navy">
                    {f.label}
                  </span>
                  {f.sub && (
                    <span className="block truncate text-[11px] text-gray-text">
                      {f.sub}
                    </span>
                  )}
                </span>
                {count != null && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      active
                        ? "bg-purple text-white"
                        : "border border-border bg-white text-gray-text"
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

      <button
        onClick={onShare}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold shadow-lg transition-colors ${
          sharedAlready
            ? "bg-teal/10 text-teal shadow-none hover:bg-teal/15"
            : "bg-purple text-white shadow-purple/25 hover:bg-purple-deep"
        }`}
      >
        <Plus className="h-4 w-4" />
        {sharedAlready ? "Shared ✓ · add more" : "Share your timeline"}
      </button>
      {identity && (
        <div className="px-1 text-center text-[11px] text-gray-text">
          posting as <IdentityBadge identity={identity} />
        </div>
      )}
    </div>
  );
}
