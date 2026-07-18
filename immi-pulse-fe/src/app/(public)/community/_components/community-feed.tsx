"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  GitCommitHorizontal,
  Loader2,
  MessageCircle,
  Plus,
  UserCheck,
} from "lucide-react";
import {
  useFeedSummary,
  useIdentity,
  useJourneys,
  type ThreadSort,
} from "@/lib/api/hooks/community";
import {
  FEED_FILTERS,
  FeedFilterChips,
  FeedFilterRail,
} from "./feed-filter-rail";
import { FeedPost } from "./feed-post";
import { PostDetailDrawer } from "./post-detail-drawer";
import { ShareJourney } from "./share-journey";
import { LoginGate } from "./login-gate";

const SORTS: { id: ThreadSort; label: string }[] = [
  { id: "new", label: "New" },
  { id: "top", label: "Top" },
  { id: "trending", label: "Trending" },
];

const GUARDRAILS = [
  {
    Icon: UserCheck,
    text: "One auto-generated anonymous name per device — no impersonation.",
  },
  {
    Icon: CheckCircle2,
    text: "One vote per person on each post — counts can't be inflated.",
  },
  {
    Icon: GitCommitHorizontal,
    text: "One shared timeline while anonymous — sign in to add more.",
  },
];

export function CommunityFeed() {
  const { data: identity } = useIdentity();
  const { data: summary } = useFeedSummary();

  const [activeFilter, setActiveFilter] = useState("all");
  const [sort, setSort] = useState<ThreadSort>("new");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const current = useMemo(
    () => FEED_FILTERS.find((f) => f.id === activeFilter) ?? FEED_FILTERS[0],
    [activeFilter]
  );
  const params = useMemo(() => ({ ...current.params, sort }), [current, sort]);
  const { data: journeys = [], isLoading } = useJourneys(params);

  return (
    <section className="mt-8 border-t border-hair py-14">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
        {/* section header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="c-eyebrow">Community feed</span>
            <h2 className="mt-2.5 font-heading text-[clamp(1.6rem,2.8vw,2.1rem)] font-semibold tracking-[-0.6px] text-ink">
              Ask the people ahead of you
            </h2>
            <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-soft">
              One live feed of real timelines and questions. Open any post to see
              the full journey.
            </p>
          </div>
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink/90"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Share your timeline
          </button>
        </div>

        {/* mobile filter chips */}
        <div className="mt-6 lg:hidden">
          <FeedFilterChips
            activeId={activeFilter}
            onSelect={setActiveFilter}
            summary={summary}
          />
        </div>

        {/* 3-column app shell */}
        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_280px]">
          {/* left */}
          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <FeedFilterRail
              activeId={activeFilter}
              onSelect={setActiveFilter}
              summary={summary}
              identity={identity}
              onShare={() => setShareOpen(true)}
            />
          </aside>

          {/* center */}
          <main className="min-w-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="c-mono text-[11.5px] uppercase tracking-[0.14em] text-ink-soft">
                {current.label}
                <span className="ml-2 text-ink-soft/70">
                  {journeys.length} {journeys.length === 1 ? "post" : "posts"}
                </span>
              </span>
              <div className="flex items-center gap-4">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSort(s.id)}
                    className={`relative pb-1 text-[12.5px] font-semibold transition-colors ${
                      sort === s.id
                        ? "text-ink"
                        : "text-ink-soft/70 hover:text-ink"
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

            {isLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-hair bg-white py-16 text-ink-soft">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.75} />{" "}
                Loading feed…
              </div>
            ) : journeys.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-hair bg-white p-12 text-center">
                <MessageCircle
                  className="mx-auto h-8 w-8 text-ink-soft/40"
                  strokeWidth={1.5}
                />
                <p className="mt-3 text-[14px] font-medium text-ink">
                  Nothing here yet — be the first to post.
                </p>
                <button
                  onClick={() => setShareOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-hair bg-white px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:border-purple-light"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} /> Share yours
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {journeys.map((j) => (
                  <FeedPost key={j.id} journey={j} onOpen={setSelectedId} />
                ))}
              </div>
            )}
          </main>

          {/* right context rail */}
          <aside className="hidden flex-col gap-8 xl:sticky xl:top-24 xl:flex">
            <div>
              <span className="c-eyebrow">Built to stay honest</span>
              <div className="mt-3.5 flex flex-col gap-3">
                {GUARDRAILS.map(({ Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-soft"
                  >
                    <Icon
                      className="mt-0.5 h-4 w-4 shrink-0 text-teal"
                      strokeWidth={1.75}
                    />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-hair" />

            <div>
              <span className="c-eyebrow">Popular spaces</span>
              <div className="mt-2 flex flex-col">
                {FEED_FILTERS.filter(
                  (f) => f.group === "Visa families" || f.params.category
                )
                  .slice(0, 5)
                  .map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilter(f.id)}
                      className="group flex items-center gap-3 rounded-lg py-2 text-left transition-colors"
                    >
                      <f.Icon
                        className="h-4 w-4 shrink-0 text-ink-soft transition-colors group-hover:text-purple"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {f.label}
                        </span>
                        {f.sub && (
                          <span className="c-mono block truncate text-[10px] text-ink-soft">
                            {f.sub}
                          </span>
                        )}
                      </span>
                      <span className="c-mono text-[11px] text-ink-soft/70">
                        {f.count(summary) ?? 0}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* modals & drawer */}
      <ShareJourney
        open={shareOpen}
        onOpenChange={setShareOpen}
        identity={identity}
        onCapReached={() => setLoginOpen(true)}
      />
      <PostDetailDrawer
        journeyId={selectedId}
        identity={identity}
        onClose={() => setSelectedId(null)}
      />
      <LoginGate open={loginOpen} onClose={() => setLoginOpen(false)} />
    </section>
  );
}
