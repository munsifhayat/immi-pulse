"use client";

import { OfficialTimes } from "./official-times";
import { CommunityHeader } from "./community-shell";
import { WaitCheck } from "./wait-check";
import { useCommunity } from "./community-context";
import { CommunityTimelinesGlyph, TimelineGlyph } from "./timeline-glyph";

/**
 * Wait Check on its own route.
 *
 * Completely open: no account, no device token, no gate of any kind. It is the
 * reason most people arrive and the one page that answers their question
 * without asking for anything first — putting a sign-in in front of it would
 * trade the acquisition hook for nothing.
 */
export function WaitCheckView() {
  const { openShare } = useCommunity();

  return (
    <>
      <CommunityHeader
        title="Wait"
        accent="check"
        right={
          <button
            onClick={() => openShare()}
            className="hidden items-center gap-1.5 rounded-full border border-hair bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink sm:inline-flex"
          >
            <TimelineGlyph className="h-3.5 w-3.5" strokeWidth={2} />
            Share yours
          </button>
        }
      />
      <div className="px-5 pb-16 pt-6 sm:px-6">
        <span className="c-eyebrow">Free · no account needed</span>
        <h2 className="mt-3 font-heading text-[clamp(1.9rem,4vw,2.4rem)] font-semibold leading-[1.05] tracking-[-1px] text-ink">
          “Is my wait{" "}
          <span className="c-serif text-[1.12em] text-purple-deep">normal?</span>
          ”
        </h2>
        <p className="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-soft">
          Pick your visa, enter your lodgement date, and see where you sit
          against real timelines people have shared — beside the department&apos;s
          own published figures, so you can judge both.
        </p>

        <div className="mt-6">
          <WaitCheck />
        </div>

        <div className="mt-6">
          <OfficialTimes />
        </div>

        {/*
          The reciprocity ask, and the reason the numbers above exist at all.
          Every answer on this page was paid for by somebody who shared theirs,
          so this is the one place it is fair to ask.
        */}
        <div className="mt-6 rounded-2xl border border-hair bg-white p-5 sm:p-6">
          <CommunityTimelinesGlyph
            className="h-8 w-8 text-purple-deep"
            strokeWidth={1.6}
          />
          <h3 className="mt-3 font-heading text-[19px] font-semibold tracking-[-0.3px] text-ink">
            Every number above came from someone&apos;s timeline
          </h3>
          <p className="mt-2 max-w-[54ch] text-[13.5px] leading-relaxed text-ink-soft">
            The answer you just got exists because people ahead of you posted
            their dates. Adding yours takes about a minute, stays anonymous, and
            is what lets us answer this for the person lodging tomorrow.
          </p>
          <button
            onClick={() => openShare()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper transition-opacity hover:opacity-90"
          >
            <TimelineGlyph className="h-4 w-4" strokeWidth={2} />
            Share your timeline
          </button>
        </div>
      </div>
    </>
  );
}
