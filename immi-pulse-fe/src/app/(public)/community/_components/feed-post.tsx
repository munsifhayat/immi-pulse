"use client";

import { ArrowRight, Heart, MessageCircle } from "lucide-react";
import {
  useToggleJourneyVote,
  type JourneyOut,
} from "@/lib/api/hooks/community";
import { formatDays, timeAgo } from "../_lib/format";
import { MilestoneStrip } from "./milestone-strip";
import { ReportControl } from "./report-dialog";

function statusChip(journey: JourneyOut): { label: string; cls: string } | null {
  if (journey.post_type !== "timeline") return null;
  if (journey.outcome === "granted") {
    return {
      label:
        journey.processing_days != null
          ? `Granted · ${formatDays(journey.processing_days)}`
          : "Granted",
      cls: "bg-teal/10 text-teal",
    };
  }
  if (journey.outcome === "refused") {
    return { label: "Decided", cls: "bg-[#D6465B]/10 text-[#C23A50]" };
  }
  return {
    label:
      journey.elapsed_days != null ? `${journey.elapsed_days}d waiting` : "Waiting",
    cls: "bg-[#C77D18]/10 text-[#B4700F]",
  };
}

export function FeedPost({
  journey,
  onOpen,
}: {
  journey: JourneyOut;
  onOpen: (id: string) => void;
}) {
  const vote = useToggleJourneyVote();
  const isQuestion = journey.post_type === "question";
  const chip = statusChip(journey);

  const kicker = isQuestion
    ? "Question"
    : [journey.subclass_code, journey.category_name].filter(Boolean).join(" · ") ||
      "Timeline";

  function handleVote(e: React.MouseEvent) {
    e.stopPropagation();
    if (!vote.isPending) vote.mutate(journey.id);
  }

  return (
    <article
      onClick={() => onOpen(journey.id)}
      className="c-row group cursor-pointer rounded-2xl border border-hair bg-white p-5 hover:border-purple-light hover:shadow-[0_1px_2px_rgba(16,18,29,0.03),0_18px_40px_-28px_rgba(16,18,29,0.28)]"
    >
      {/* head */}
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white"
          style={{ backgroundColor: journey.color }}
        >
          {journey.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
              {journey.handle}
            </span>
            <span className="c-mono shrink-0 text-[11px] text-ink-soft">
              {timeAgo(journey.created_at)}
            </span>
          </div>
          <div
            className={`c-mono mt-0.5 truncate text-[10.5px] uppercase tracking-[0.14em] ${
              isQuestion ? "text-purple-deep" : "text-ink-soft"
            }`}
          >
            {kicker}
            {journey.is_sample && (
              <span className="text-ink-soft/60"> · sample</span>
            )}
          </div>
        </div>
        {chip && (
          <span
            className={`c-mono shrink-0 self-start rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${chip.cls}`}
          >
            {chip.label}
          </span>
        )}
      </div>

      {/* title (questions) */}
      {isQuestion && journey.title && (
        <h3 className="mt-3 font-heading text-[16px] font-semibold leading-snug text-ink">
          {journey.title}
        </h3>
      )}

      {/* note */}
      {journey.note && (
        <p
          className={`mt-2 text-[13.5px] leading-relaxed text-ink-soft ${
            isQuestion ? "" : "border-l-2 border-purple-muted pl-3 italic"
          }`}
        >
          {isQuestion ? journey.note : `“${journey.note}”`}
        </p>
      )}

      {/* milestone rail */}
      {!isQuestion && journey.milestones.length > 0 && (
        <MilestoneStrip journey={journey} />
      )}

      {/* footer */}
      <div className="mt-4 flex items-center gap-5 border-t border-hair pt-3.5">
        <button
          onClick={handleVote}
          className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors ${
            journey.viewer_voted ? "text-rose-500" : "text-ink-soft hover:text-purple"
          }`}
          aria-pressed={journey.viewer_voted}
        >
          <Heart
            className="h-[15px] w-[15px]"
            strokeWidth={1.75}
            fill={journey.viewer_voted ? "currentColor" : "none"}
          />
          <span className="c-mono">{journey.upvotes}</span>
        </button>
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
          <MessageCircle className="h-[15px] w-[15px]" strokeWidth={1.75} />
          <span className="c-mono">{journey.comment_count}</span>
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ReportControl
            targetType="journey"
            targetId={journey.id}
            className="inline-flex items-center text-ink-soft/50 opacity-0 transition-all hover:text-rose-500 group-hover:opacity-100"
          />
          <span className="inline-flex translate-x-1 items-center gap-1 text-[11px] font-semibold text-purple opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
            Open <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </div>
      </div>
    </article>
  );
}
