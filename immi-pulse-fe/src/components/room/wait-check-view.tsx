"use client";

import { OfficialTimes } from "./official-times";
import { RoomHeader } from "./room-shell";
import { WaitCheck } from "./wait-check";

/**
 * Wait Check on its own route.
 *
 * Completely open: no account, no device token, no gate of any kind. It is the
 * reason most people arrive and the one page that answers their question
 * without asking for anything first — putting a sign-in in front of it would
 * trade the acquisition hook for nothing.
 */
export function WaitCheckView() {
  return (
    <>
      <RoomHeader title="Wait" accent="check" />
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
      </div>
    </>
  );
}
