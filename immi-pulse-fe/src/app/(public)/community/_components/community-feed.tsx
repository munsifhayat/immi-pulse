"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  GitCommitHorizontal,
  Loader2,
  MessageCircle,
  MessagesSquare,
  PenLine,
  Plus,
  UserCheck,
} from "lucide-react";
import {
  useFeedSummary,
  useIdentity,
  useJourneys,
  type ThreadSort,
} from "@/lib/api/hooks/community";
import { FEED_FILTERS, FeedFilterRail } from "./feed-filter-rail";
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
    text: "You post as one auto-generated anonymous name per device — no impersonation.",
  },
  {
    Icon: CheckCircle2,
    text: "One vote per person on each post — counts can't be inflated.",
  },
  {
    Icon: GitCommitHorizontal,
    text: "One shared timeline while anonymous — sign in to add or edit more.",
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
    <section className="border-t border-border bg-gradient-to-b from-white to-gray-light/30 py-12">
      <div className="mx-auto max-w-[1240px] px-6 lg:px-8">
        {/* section header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-purple">
              <MessagesSquare className="h-3.5 w-3.5" /> Community feed
            </span>
            <h2 className="mt-2 font-heading text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.5px] text-navy">
              Ask the people ahead of you
            </h2>
            <p className="mt-1.5 max-w-xl text-[14.5px] text-gray-text">
              One live feed of real timelines and questions. Pick what you&apos;re
              interested in — open any post to see the full journey and join the
              conversation.
            </p>
          </div>
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-purple px-5 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-purple/25 transition-colors hover:bg-purple-deep"
          >
            <Plus className="h-4 w-4" /> Share your timeline
          </button>
        </div>

        {/* 3-column app shell */}
        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[236px_minmax(0,1fr)] xl:grid-cols-[236px_minmax(0,1fr)_304px]">
          {/* left */}
          <aside className="lg:sticky lg:top-20">
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
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <span className="font-heading text-[16px] font-semibold text-navy">
                {current.label}
                <span className="ml-2 text-[13px] font-medium text-gray-text">
                  {journeys.length} {journeys.length === 1 ? "post" : "posts"}
                </span>
              </span>
              <div className="inline-flex rounded-full border border-border bg-gray-light/60 p-1">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSort(s.id)}
                    className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                      sort === s.id
                        ? "bg-white text-navy shadow-sm"
                        : "text-gray-text hover:text-navy"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-border bg-white py-16 text-gray-text">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading feed…
              </div>
            ) : journeys.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center">
                <MessageCircle className="mx-auto h-8 w-8 text-gray-text/40" />
                <p className="mt-3 text-[14px] font-medium text-navy">
                  Nothing here yet — be the first to post.
                </p>
                <button
                  onClick={() => setShareOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-purple/30 bg-white px-4 py-2 text-[13.5px] font-semibold text-purple hover:bg-purple/5"
                >
                  <Plus className="h-4 w-4" /> Share yours
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
          <aside className="hidden flex-col gap-4 xl:sticky xl:top-20 xl:flex">
            <div className="rounded-2xl bg-gradient-to-br from-purple-deep to-purple p-5 text-white shadow">
              <h4 className="font-heading text-[18px] font-semibold">
                Share your journey
              </h4>
              <p className="mt-2 text-[12.5px] text-white/85">
                Post a timeline or a question
                {identity ? <> as <b>{identity.handle}</b></> : null}. Help the people
                behind you.
              </p>
              <button
                onClick={() => setShareOpen(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[13.5px] font-semibold text-purple-deep hover:bg-white/90"
              >
                <PenLine className="h-4 w-4" /> Share a timeline or question
              </button>
            </div>

            <div className="rounded-2xl border border-teal-light/60 bg-gradient-to-b from-teal/5 to-white p-5">
              <h4 className="text-[13px] font-bold uppercase tracking-wide text-teal">
                Built to stay honest
              </h4>
              <div className="mt-3 flex flex-col gap-2.5">
                {GUARDRAILS.map(({ Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-start gap-2.5 text-[12.5px] text-navy"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5">
              <h4 className="text-[13px] font-bold uppercase tracking-wide text-gray-text">
                Popular spaces
              </h4>
              <div className="mt-2.5 flex flex-col gap-1">
                {FEED_FILTERS.filter((f) => f.group === "Visa families" || f.params.category)
                  .slice(0, 4)
                  .map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilter(f.id)}
                      className="flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-gray-light"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple/10">
                        <f.Icon className="h-4 w-4 text-purple" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-navy">
                          {f.label}
                        </span>
                        {f.sub && (
                          <span className="block truncate text-[11px] text-gray-text">
                            {f.sub}
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-text">
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
