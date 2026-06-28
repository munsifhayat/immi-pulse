"use client";

import {
  ArrowRight,
  Heart,
  MessageCircle,
} from "lucide-react";
import {
  useToggleJourneyVote,
  type JourneyOut,
} from "@/lib/api/hooks/community";
import { formatDays, timeAgo } from "../_lib/format";
import { MilestoneStrip } from "./milestone-strip";

function WaitBadge({ journey }: { journey: JourneyOut }) {
  if (journey.post_type !== "timeline") return null;
  let label: string;
  let cls: string;
  if (journey.outcome === "granted") {
    label = journey.processing_days != null
      ? `Granted · ${formatDays(journey.processing_days)}`
      : "Granted";
    cls = "bg-teal/10 text-teal";
  } else if (journey.outcome === "refused") {
    label = "Decided";
    cls = "bg-rose-50 text-rose-600";
  } else {
    label = journey.elapsed_days != null
      ? `${journey.elapsed_days}d waiting`
      : "In progress";
    cls = "bg-amber-50 text-amber-600";
  }
  return (
    <span
      className={`ml-auto shrink-0 self-start whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}
    >
      {label}
    </span>
  );
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

  const visaTag = [journey.subclass_code, journey.category_name]
    .filter(Boolean)
    .join(" · ");

  function handleVote(e: React.MouseEvent) {
    e.stopPropagation();
    if (!vote.isPending) vote.mutate(journey.id);
  }

  return (
    <article
      onClick={() => onOpen(journey.id)}
      className="group cursor-pointer rounded-2xl border border-border bg-white p-4 transition-all hover:border-purple-light hover:shadow-sm sm:p-[18px]"
    >
      {/* head */}
      <div className="flex items-start gap-3">
        <span
          className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full text-[14px] font-bold text-white"
          style={{ backgroundColor: journey.color }}
        >
          {journey.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[14.5px] font-bold text-navy">
            {journey.handle}
            <span className="text-[11.5px] font-medium text-gray-text">
              · {timeAgo(journey.created_at)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isQuestion
                  ? "bg-purple/10 text-purple-deep"
                  : "bg-teal/10 text-teal"
              }`}
            >
              {isQuestion ? "Question" : "Timeline"}
            </span>
            {visaTag && (
              <span className="rounded-md bg-gray-light px-2 py-0.5 text-[11px] font-semibold text-gray-text">
                {visaTag}
              </span>
            )}
            {journey.is_sample && (
              <span className="rounded-md border border-border bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-text">
                Sample
              </span>
            )}
          </div>
        </div>
        <WaitBadge journey={journey} />
      </div>

      {/* title + body */}
      <h3 className="mt-3 font-heading text-[15.5px] font-semibold leading-snug text-navy">
        {isQuestion
          ? journey.title
          : `${journey.handle}’s ${journey.subclass_code ?? "visa"} journey`}
      </h3>
      {journey.note && (
        <p
          className={`mt-1.5 text-[13px] leading-relaxed text-gray-text ${
            isQuestion ? "" : "italic"
          }`}
        >
          {isQuestion ? journey.note : `“${journey.note}”`}
        </p>
      )}

      {/* milestone strip */}
      {!isQuestion && journey.milestones.length > 0 && (
        <MilestoneStrip journey={journey} />
      )}

      {/* footer */}
      <div className="mt-3.5 flex items-center gap-5 border-t border-gray-light pt-3">
        <button
          onClick={handleVote}
          className={`inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${
            journey.viewer_voted ? "text-rose-500" : "text-gray-text hover:text-purple"
          }`}
          aria-pressed={journey.viewer_voted}
        >
          <Heart
            className="h-4 w-4"
            fill={journey.viewer_voted ? "currentColor" : "none"}
          />
          {journey.upvotes}
        </button>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-text">
          <MessageCircle className="h-4 w-4" />
          {journey.comment_count}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-semibold text-purple opacity-0 transition-opacity group-hover:opacity-100">
          Open <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </article>
  );
}
