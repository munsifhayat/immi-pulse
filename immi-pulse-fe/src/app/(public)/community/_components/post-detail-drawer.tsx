"use client";

import { useState } from "react";
import { Heart, Loader2, MessageCircle, Send, ShieldCheck } from "lucide-react";
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
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[600px]"
      >
        {isLoading || !journey ? (
          <div className="flex flex-1 items-center justify-center text-gray-text">
            <SheetTitle className="sr-only">Loading post</SheetTitle>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* header */}
            <SheetHeader className="flex-row items-start gap-3 border-b border-border p-5">
              <span
                className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full text-[15px] font-bold text-white"
                style={{ backgroundColor: journey.color }}
              >
                {journey.initials}
              </span>
              <div className="min-w-0 flex-1 pr-6 text-left">
                <SheetTitle className="font-heading text-[18px] font-semibold text-navy">
                  {isQuestion ? journey.title : journey.handle}
                </SheetTitle>
                <p className="mt-0.5 text-[12.5px] text-gray-text">
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
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {chips.map((c, i) => (
                      <span
                        key={i}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          i === 0
                            ? "bg-purple/10 text-purple-deep"
                            : "bg-gray-light text-gray-text"
                        }`}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </SheetHeader>

            {/* scroll body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {journey.note && (
                <p className="text-[15px] leading-relaxed text-navy">
                  {isQuestion ? journey.note : `“${journey.note}”`}
                </p>
              )}

              {!isQuestion && <JourneyBox journey={journey} />}

              {/* reactions */}
              <div className="mt-4 flex items-center gap-5 border-y border-border py-3.5">
                <button
                  onClick={() => !vote.isPending && vote.mutate(journey.id)}
                  className={`inline-flex items-center gap-1.5 text-[13.5px] font-semibold ${
                    journey.viewer_voted
                      ? "text-rose-500"
                      : "text-gray-text hover:text-purple"
                  }`}
                >
                  <Heart
                    className="h-4 w-4"
                    fill={journey.viewer_voted ? "currentColor" : "none"}
                  />
                  {journey.upvotes}
                </button>
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-gray-text">
                  <MessageCircle className="h-4 w-4" />
                  {journey.comment_count}
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-gray-text">
                  <ShieldCheck className="h-3 w-3" /> One vote per person
                </span>
              </div>

              <Conversation journeyId={journey.id} messages={journey.messages} />
            </div>

            {/* composer */}
            <div className="border-t border-border bg-white p-4">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] text-gray-text">
                Replying as{" "}
                <b className="text-purple-deep">{identity?.handle ?? journey.handle}</b>{" "}
                · anonymous
              </div>
              <div className="flex items-end gap-2.5">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a message to the conversation…"
                  rows={2}
                  className="max-h-[120px] min-h-[42px] flex-1 resize-y rounded-lg border border-border bg-white px-3 py-2.5 text-[13.5px] text-navy outline-none focus:border-purple/60 focus:ring-2 focus:ring-purple/15"
                />
                <button
                  onClick={sendMessage}
                  disabled={post.isPending || !draft.trim()}
                  className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-lg bg-purple text-white transition-colors hover:bg-purple-deep disabled:opacity-50"
                  aria-label="Send message"
                >
                  {post.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
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
