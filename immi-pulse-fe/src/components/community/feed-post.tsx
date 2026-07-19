"use client";

import { useState } from "react";
import { ArrowBigUp, Check, Link2, MessageCircle } from "lucide-react";
import {
  useToggleJourneyVote,
  type JourneyOut,
} from "@/lib/api/hooks/community";
import { formatDays, timeAgo } from "@/lib/community/format";
import { MilestoneStrip } from "./milestone-strip";
import { ReportControl } from "./report-dialog";
import { useCommunity } from "./community-context";

function statusChip(journey: JourneyOut): { label: string; cls: string } | null {
  if (journey.post_type !== "timeline") return null;
  if (journey.outcome === "granted") {
    return {
      label:
        journey.processing_days != null
          ? `Granted · ${formatDays(journey.processing_days)}`
          : "Granted",
      cls: "border-teal/25 bg-teal/[0.08] text-teal",
    };
  }
  if (journey.outcome === "refused") {
    return {
      label: "Decided",
      cls: "border-[#D6465B]/25 bg-[#D6465B]/[0.08] text-[#C23A50]",
    };
  }
  return {
    label:
      journey.elapsed_days != null ? `Day ${journey.elapsed_days}` : "Waiting",
    cls: "border-[#C77D18]/28 bg-[#C77D18]/[0.08] text-[#B4700F]",
  };
}

/**
 * A feed row.
 *
 * Exactly two actions — upvote and reply — with share as a quiet third. There
 * is no separate like, no repost, no bookmark: every extra verb is one more
 * decision between reading a stranger's question and answering it, and the
 * whole product depends on people answering.
 */
export function FeedPost({
  journey,
  onOpen,
}: {
  journey: JourneyOut;
  onOpen: (id: string) => void;
}) {
  const vote = useToggleJourneyVote();
  const { canWrite } = useCommunity();
  const [copied, setCopied] = useState(false);
  const isQuestion = journey.post_type === "question";
  const chip = statusChip(journey);

  const kicker = isQuestion
    ? [journey.subclass_code, "question"].filter(Boolean).join(" · ")
    : [journey.subclass_code, journey.category_name].filter(Boolean).join(" · ") ||
      "timeline";

  function handleVote(e: React.MouseEvent) {
    e.stopPropagation();
    // A vote is a write, so it needs a handle like every other write. The
    // prompt opens here rather than after a request we know would be refused.
    if (!canWrite("post")) return;
    if (!vote.isPending) vote.mutate(journey.id);
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/community/journey/${journey.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }

  return (
    <article
      onClick={() => onOpen(journey.id)}
      className="c-row group cursor-pointer border-b border-hair px-5 py-4 hover:bg-black/[0.02]"
    >
      <div className="flex gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-semibold text-white"
          style={{ backgroundColor: journey.color }}
        >
          {journey.initials}
        </span>

        <div className="min-w-0 flex-1">
          {/* who · what queue · where in it · when */}
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[14px] font-bold text-ink">
              {journey.handle}
            </span>
            {kicker && (
              <span className="c-mono inline-flex items-center gap-1.5 rounded-md border border-hair bg-white px-2 py-[3px] text-[9.5px] tracking-[0.05em] text-ink-soft">
                <span
                  className="h-[7px] w-[7px] rounded-sm"
                  style={{ backgroundColor: journey.color }}
                />
                {kicker}
              </span>
            )}
            {chip && (
              <span
                className={`c-mono rounded-md border px-2 py-[3px] text-[9.5px] tracking-[0.05em] ${chip.cls}`}
              >
                {chip.label}
              </span>
            )}
            <span className="c-mono text-[10.5px] text-ink-soft">
              · {timeAgo(journey.created_at)}
            </span>
            {!journey.is_published && (
              <span className="c-mono rounded-md border border-hair bg-paper-deep px-2 py-[3px] text-[9.5px] tracking-[0.05em] text-ink-soft">
                Draft · only you
              </span>
            )}
          </div>

          {isQuestion && journey.title && (
            <h3 className="mt-1 text-[15px] font-semibold leading-[1.45] tracking-[-0.005em] text-ink">
              {journey.title}
            </h3>
          )}

          {journey.note && (
            <p
              className={`mt-1.5 line-clamp-3 text-[13.5px] leading-[1.6] text-ink-soft ${
                isQuestion ? "" : "border-l-2 border-purple-muted pl-3 italic"
              }`}
            >
              {isQuestion ? journey.note : `“${journey.note}”`}
            </p>
          )}

          {!isQuestion && journey.milestones.length > 0 && (
            <MilestoneStrip journey={journey} />
          )}

          {/* Two actions, then share. */}
          <div className="mt-2.5 flex max-w-[430px] items-center justify-between">
            <button
              onClick={handleVote}
              aria-pressed={journey.viewer_voted}
              className={`c-mono inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] transition-colors ${
                journey.viewer_voted
                  ? "text-purple-deep"
                  : "text-ink-soft hover:bg-purple/[0.07] hover:text-purple-deep"
              }`}
            >
              <ArrowBigUp
                className="h-4 w-4"
                strokeWidth={1.75}
                fill={journey.viewer_voted ? "currentColor" : "none"}
              />
              {journey.upvotes} helpful
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen(journey.id);
              }}
              className="c-mono inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] text-ink-soft transition-colors hover:bg-purple/[0.07] hover:text-purple-deep"
            >
              <MessageCircle className="h-[15px] w-[15px]" strokeWidth={1.75} />
              {journey.comment_count}{" "}
              {journey.comment_count === 1 ? "reply" : "replies"}
            </button>

            {/* Quiet tertiary — deliberately not a peer of the other two. */}
            <button
              onClick={handleShare}
              aria-label="Copy link to this post"
              className="c-mono inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] text-ink-soft/70 transition-colors hover:bg-black/[0.04] hover:text-ink-soft"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-teal" strokeWidth={2} />
                  copied
                </>
              ) : (
                <>
                  <Link2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  share
                </>
              )}
            </button>

            <ReportControl
              targetType="journey"
              targetId={journey.id}
              className="inline-flex items-center text-ink-soft/40 opacity-0 transition-all hover:text-rose-500 group-hover:opacity-100"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
