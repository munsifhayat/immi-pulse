"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  useFeedSummary,
  useJourneys,
  type JourneyOut,
  type PostType,
  type ThreadSort,
} from "@/lib/api/hooks/community";
import { Composer } from "./composer";
import { FeedPost } from "./feed-post";
import { PostDetailDrawer } from "./post-detail-drawer";
import { CommunityHeader } from "./community-shell";
import { useCommunity } from "./community-context";
import { CommunityTimelinesGlyph, TimelineGlyph } from "./timeline-glyph";

const TABS: { id: PostType | "all"; label: string; href: string }[] = [
  { id: "all", label: "All", href: "/" },
  { id: "question", label: "Questions", href: "/questions" },
  { id: "timeline", label: "Timelines", href: "/timelines" },
];

const SORTS: { id: ThreadSort; label: string }[] = [
  { id: "new", label: "New" },
  { id: "top", label: "Top" },
  { id: "trending", label: "Trending" },
];

/** Client-side text match across the fields a person would actually search. */
function matches(j: JourneyOut, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [
    j.title,
    j.note,
    j.handle,
    j.subclass_code,
    j.subclass_name,
    j.category_name,
  ]
    .filter(Boolean)
    .some((v) => (v as string).toLowerCase().includes(needle));
}

export function CommunityFeed({ type }: { type?: PostType }) {
  const { queue, search, openShare } = useCommunity();
  const { data: summary } = useFeedSummary();
  const [sort, setSort] = useState<ThreadSort>("new");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      ...(type ? { type } : {}),
      ...(queue !== "all" ? { category: queue } : {}),
      sort,
    }),
    [type, queue, sort]
  );
  const { data: journeys = [], isLoading, refetch } = useJourneys(params);

  const visible = useMemo(
    () => journeys.filter((j) => matches(j, search)),
    [journeys, search]
  );

  const activeTab: PostType | "all" = type ?? "all";
  const liveCount =
    type === "question"
      ? summary?.questions
      : type === "timeline"
        ? summary?.timelines
        : summary?.all;

  return (
    <>
      <CommunityHeader
        title="The community,"
        accent="right now"
        right={
          <span className="c-mono hidden items-center gap-2 text-[10px] tracking-[0.1em] text-teal sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-light" />
            LIVE · {liveCount ?? "—"} POSTS
          </span>
        }
      >
        <div className="flex">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className={`relative flex-1 py-3 text-center text-[13.5px] font-semibold transition-colors ${
                activeTab === t.id
                  ? "text-ink"
                  : "text-ink-soft hover:bg-black/[0.03] hover:text-ink"
              }`}
            >
              {t.label}
              {activeTab === t.id && (
                <span className="absolute bottom-0 left-1/2 h-[3px] w-14 -translate-x-1/2 rounded-full bg-ink" />
              )}
            </Link>
          ))}
        </div>
      </CommunityHeader>

      <Composer onPosted={() => refetch()} />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          Loading the community…
        </div>
      ) : visible.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <CommunityTimelinesGlyph
            className="mx-auto h-9 w-9 text-ink-soft/40"
            strokeWidth={1.5}
          />
          <p className="mt-3.5 text-[14px] font-medium text-ink">
            {search.trim()
              ? "Nothing matches that yet."
              : "Nothing here yet — be the first to post."}
          </p>
          <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-soft">
            {search.trim()
              ? "Try a subclass number, or clear the search to see everything."
              : "Ask the community a question, or share where your own application has got to."}
          </p>
          {!search.trim() && (
            <button
              onClick={() => openShare()}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper transition-opacity hover:opacity-90"
            >
              <TimelineGlyph className="h-4 w-4" strokeWidth={2} />
              Share your timeline
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-hair px-5 py-2">
            <span className="c-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
              {visible.length} {visible.length === 1 ? "post" : "posts"}
              {queue !== "all" && " · filtered"}
            </span>
            <div className="flex items-center gap-3.5">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={`relative pb-0.5 text-[12px] font-semibold transition-colors ${
                    sort === s.id ? "text-ink" : "text-ink-soft/70 hover:text-ink"
                  }`}
                >
                  {s.label}
                  {sort === s.id && (
                    <span className="absolute -bottom-px left-0 h-[2px] w-full rounded-full bg-purple" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {visible.map((j) => (
            <FeedPost key={j.id} journey={j} onOpen={setSelectedId} />
          ))}
        </>
      )}

      <PostDetailDrawer
        journeyId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
