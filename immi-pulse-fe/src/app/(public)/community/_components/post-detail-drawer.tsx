"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Heart, Loader2, MessageCircle, Send } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useJourney,
  usePostJourneyComment,
  useToggleJourneyVote,
  type CommunityIdentity,
} from "@/lib/api/hooks/community";
import { timeAgo } from "../_lib/format";
import { JourneyBox } from "./milestone-strip";
import { Conversation } from "./conversation";
import { ReportControl } from "./report-dialog";

export function PostDetailDrawer({
  journeyId,
  identity,
  onClose,
}: {
  journeyId: string | null;
  identity?: CommunityIdentity;
  onClose: () => void;
}) {
  const { data: journey, isLoading } = useJourney(journeyId ?? undefined);
  const vote = useToggleJourneyVote();
  const post = usePostJourneyComment(journeyId ?? "");
  const [draft, setDraft] = useState("");

  async function sendMessage() {
    const body = draft.trim();
    if (!body || post.isPending) return;
    await post.mutateAsync({ body });
    setDraft("");
  }

  const isQuestion = journey?.post_type === "question";
  const chips = journey
    ? [
        journey.subclass_code,
        journey.stream,
        journey.occupation,
        [journey.state, journey.area].filter(Boolean).join(" · ") || null,
        journey.sponsor_type,
      ].filter(Boolean)
    : [];

  return (
    <Sheet open={!!journeyId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="c-paper flex w-full flex-col gap-0 p-0 sm:max-w-[600px]"
      >
        {isLoading || !journey ? (
          <div className="flex flex-1 items-center justify-center text-ink-soft">
            <SheetTitle className="sr-only">Loading post</SheetTitle>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={1.75} />{" "}
            Loading…
          </div>
        ) : (
          <>
            {/* header */}
            <SheetHeader className="flex-row items-start gap-3 border-b border-hair bg-white p-5">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[14px] font-semibold text-white"
                style={{ backgroundColor: journey.color }}
              >
                {journey.initials}
              </span>
              <div className="min-w-0 flex-1 pr-6 text-left">
                <div className="c-eyebrow mb-1">
                  {isQuestion ? "Question" : "Timeline"}
                </div>
                <SheetTitle className="font-heading text-[18px] font-semibold leading-snug text-ink">
                  {isQuestion ? journey.title : journey.handle}
                </SheetTitle>
                <p className="c-mono mt-1 text-[11px] text-ink-soft">
                  {[
                    journey.subclass_code,
                    journey.category_name,
                    journey.handle,
                    timeAgo(journey.created_at),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {chips.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {chips.map((c, i) => (
                      <span
                        key={i}
                        className={`c-mono rounded-md px-2 py-0.5 text-[10.5px] ${
                          i === 0
                            ? "bg-purple/10 text-purple-deep"
                            : "border border-hair text-ink-soft"
                        }`}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  href={`/community/journey/${journey.id}`}
                  className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-purple transition-colors hover:text-purple-deep"
                >
                  Open full page <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
              </div>
            </SheetHeader>

            {/* scroll body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {journey.note && (
                <p
                  className={`text-[15px] leading-relaxed text-ink ${
                    isQuestion ? "" : "border-l-2 border-purple-muted pl-4 italic"
                  }`}
                >
                  {isQuestion ? journey.note : `“${journey.note}”`}
                </p>
              )}

              {!isQuestion && <JourneyBox journey={journey} />}

              {/* reactions */}
              <div className="mt-5 flex items-center gap-5 border-y border-hair py-3.5">
                <button
                  onClick={() => !vote.isPending && vote.mutate(journey.id)}
                  className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${
                    journey.viewer_voted
                      ? "text-rose-500"
                      : "text-ink-soft hover:text-purple"
                  }`}
                >
                  <Heart
                    className="h-4 w-4"
                    strokeWidth={1.75}
                    fill={journey.viewer_voted ? "currentColor" : "none"}
                  />
                  <span className="c-mono">{journey.upvotes}</span>
                </button>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                  <span className="c-mono">{journey.comment_count}</span>
                </span>
                <ReportControl
                  targetType="journey"
                  targetId={journey.id}
                  label="Report"
                  className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft transition-colors hover:text-rose-500"
                />
              </div>

              <Conversation journeyId={journey.id} messages={journey.messages} />
            </div>

            {/* composer */}
            <div className="border-t border-hair bg-white p-4">
              <div className="c-mono mb-2 flex items-center gap-1.5 text-[10.5px] text-ink-soft">
                replying as{" "}
                <b className="font-semibold text-purple-deep">
                  {identity?.handle ?? journey.handle}
                </b>{" "}
                · anonymous
              </div>
              <div className="flex items-end gap-2.5">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a message to the conversation…"
                  rows={2}
                  className="max-h-[120px] min-h-[42px] flex-1 resize-y rounded-xl border border-hair bg-white px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-all focus:border-purple/50 focus:ring-4 focus:ring-purple/10"
                />
                <button
                  onClick={sendMessage}
                  disabled={post.isPending || !draft.trim()}
                  className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-ink text-white transition-colors hover:bg-ink/90 disabled:opacity-40"
                  aria-label="Send message"
                >
                  {post.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Send className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
