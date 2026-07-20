"use client";

import { useEffect, useState } from "react";
import { HelpCircle, Loader2, Lock } from "lucide-react";
import {
  JourneyCapError,
  useCreateJourney,
  useVisaSubclasses,
  type MilestonePayload,
  type PostType,
  type TimelineOutcome,
} from "@/lib/api/hooks/community";
import { useCommunity } from "./community-context";
import type { NavIcon } from "./left-rail";
import { TimelineGlyph } from "./timeline-glyph";
import { VisaPicker } from "./visa-picker";

const ASK_HINTS = [
  "What do you want to ask the community?",
  "“Is a 5-month wait normal for a 500?”",
  "“Can I travel while my 820 is processing?”",
  "“What does an s56 request actually mean?”",
  "“189 vs 190 — which queue moves faster right now?”",
];

const fieldCls =
  "w-full rounded-lg border border-hair bg-white px-3 py-2 text-[13px] text-ink outline-none transition-all focus:border-purple/50 focus:ring-4 focus:ring-purple/10";

/**
 * The composer that replaces the marketing hero.
 *
 * Exactly two modes. "Ask the community" is the default because a question is the
 * cheapest thing a frightened person can contribute, and "Share your story" is
 * the one that feeds the numbers. Anything else — polls, links, articles — is a
 * different product.
 */
export function Composer({ onPosted }: { onPosted?: () => void }) {
  const { account, identity, openAccount, canWrite, writeBlock, openShare } =
    useCommunity();
  const create = useCreateJourney();

  const [mode, setMode] = useState<PostType>("question");
  const [hint, setHint] = useState(0);

  // Ask mode
  const [question, setQuestion] = useState("");
  const [detail, setDetail] = useState("");
  const [askSubclass, setAskSubclass] = useState("");

  // Timeline mode
  const [tlSubclass, setTlSubclass] = useState("");
  const [lodgedOn, setLodgedOn] = useState("");
  const [outcome, setOutcome] = useState<TimelineOutcome>("waiting");
  const [decidedOn, setDecidedOn] = useState("");
  const [tlNote, setTlNote] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const block = writeBlock("post");

  // The quick form has no occupation picker, and a timeline on a visa that
  // nominates one is refused server-side. Rather than let someone fill the
  // form and collect a 400, the visa itself decides: pick a 189 here and the
  // composer hands over to the full builder instead of offering a Post button
  // that cannot work.
  const { data: subclasses = [] } = useVisaSubclasses();
  const needsFullBuilder = !!subclasses.find(
    (s) => s.slug === tlSubclass
  )?.requires_occupation;

  useEffect(() => {
    const t = setInterval(() => setHint((h) => (h + 1) % ASK_HINTS.length), 3600);
    return () => clearInterval(t);
  }, []);

  const askReady = question.trim().length > 0 && detail.trim().length > 0;
  const tlReady = !!tlSubclass && !!lodgedOn && !needsFullBuilder;
  const ready = mode === "question" ? askReady : tlReady;

  function reset() {
    setQuestion("");
    setDetail("");
    setTlSubclass("");
    setLodgedOn("");
    setDecidedOn("");
    setTlNote("");
    setOutcome("waiting");
  }

  async function submit() {
    // The gate runs *before* the request. A member who is signed out, or who
    // has spent today's allowance, is told so now — not handed a 429 after
    // they have finished writing.
    if (!canWrite("post") || !ready || create.isPending) return;

    try {
      if (mode === "question") {
        await create.mutateAsync({
          post_type: "question",
          title: question.trim().slice(0, 200),
          note: detail.trim(),
          subclass_slug: askSubclass || null,
          // Posting to the feed is what this composer is for — the button is
          // the consent. Stated rather than left to a server default.
          publish: true,
        });
      } else {
        const milestones: MilestonePayload[] = [
          { milestone_type: "Visa Lodged", occurred_on: lodgedOn },
        ];
        if (outcome === "granted" && decidedOn) {
          milestones.push({ milestone_type: "Visa Granted", occurred_on: decidedOn });
        }
        await create.mutateAsync({
          post_type: "timeline",
          subclass_slug: tlSubclass,
          outcome,
          note: tlNote.trim() || null,
          milestones,
          publish: true,
        });
      }
    } catch (err) {
      // The cap is a door, not a failure — send them to signup the way the
      // full builder does, rather than leaving raw error text under the form.
      if (err instanceof JourneyCapError) {
        create.reset();
        openAccount("signup");
        return;
      }
      return; // anything else stays visible via create.isError below
    }
    reset();
    onPosted?.();
  }

  return (
    <div className="border-b border-hair px-5 pb-4 pt-4">
      {/* Mode switch — two, and only two. */}
      <div className="mb-3.5 inline-flex gap-1 rounded-full border border-hair bg-white p-[3px]">
        {(
          [
            { id: "question", label: "Ask the community", Icon: HelpCircle },
            { id: "timeline", label: "Share your timeline", Icon: TimelineGlyph },
          ] as { id: PostType; label: string; Icon: NavIcon }[]
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`c-mono inline-flex items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[10.5px] uppercase tracking-[0.07em] transition-colors ${
              mode === id
                ? "bg-ink text-paper"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Icon className="h-3 w-3" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white"
          style={{ backgroundColor: account?.color ?? identity?.color ?? "#7C5CFC" }}
        >
          {account
            ? account.handle.slice(0, 2).toUpperCase()
            : identity?.initials ?? "··"}
        </span>

        <div className="min-w-0 flex-1">
          {mode === "question" ? (
            <>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={ASK_HINTS[hint]}
                rows={2}
                maxLength={200}
                className="w-full resize-none border-0 bg-transparent pt-1.5 text-[16.5px] leading-snug text-ink outline-none placeholder:text-ink-soft"
              />
              {question.trim() && (
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Add the detail that makes it answerable — your dates, what you've already tried…"
                  rows={3}
                  maxLength={2000}
                  className="mt-1 w-full resize-y rounded-lg border border-hair bg-white px-3 py-2 text-[13.5px] leading-relaxed text-ink outline-none transition-all focus:border-purple/50 focus:ring-4 focus:ring-purple/10"
                />
              )}
              <div className="mt-2">
                <VisaPicker
                  value={askSubclass}
                  onChange={setAskSubclass}
                  size="sm"
                  labels={false}
                />
              </div>
            </>
          ) : (
            <div className="pt-1">
              <div className="grid gap-2 sm:grid-cols-2">
                <VisaPicker
                  value={tlSubclass}
                  onChange={setTlSubclass}
                  size="sm"
                  labels={false}
                />
                <input
                  type="date"
                  max={today}
                  value={lodgedOn}
                  onChange={(e) => setLodgedOn(e.target.value)}
                  aria-label="Lodgement date"
                  className={`${fieldCls} c-mono`}
                />
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as TimelineOutcome)}
                  aria-label="Where you are now"
                  className={fieldCls}
                >
                  <option value="waiting">Still waiting</option>
                  <option value="granted">Granted</option>
                  <option value="refused">Decided — refused</option>
                </select>
                {outcome === "granted" && (
                  <input
                    type="date"
                    max={today}
                    value={decidedOn}
                    onChange={(e) => setDecidedOn(e.target.value)}
                    aria-label="Grant date"
                    className={`${fieldCls} c-mono`}
                  />
                )}
              </div>
              <textarea
                value={tlNote}
                onChange={(e) => setTlNote(e.target.value)}
                placeholder="Anything worth knowing — CO contact, medicals, the silence…"
                rows={2}
                maxLength={2000}
                className="mt-2 w-full resize-y rounded-lg border border-hair bg-white px-3 py-2 text-[13.5px] leading-relaxed text-ink outline-none transition-all focus:border-purple/50 focus:ring-4 focus:ring-purple/10"
              />
              {/*
                The quick form covers lodged → granted, which is what most
                people have. The full builder — every milestone, stream,
                occupation, state — is one click away rather than the default,
                because asking for all of it up front is how you get nothing.
              */}
              {needsFullBuilder ? (
                <button
                  type="button"
                  onClick={() => openShare({ subclass: tlSubclass })}
                  className="mt-2.5 flex w-full items-center gap-2.5 rounded-xl border border-purple-light bg-purple/[0.05] px-3.5 py-3 text-left transition-colors hover:bg-purple/[0.09]"
                >
                  <TimelineGlyph
                    className="h-4 w-4 shrink-0 text-purple"
                    strokeWidth={2}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">
                      This visa needs your nominated occupation
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-gray-text">
                      Timelines for it are grouped by occupation — continue in
                      the full builder to pick yours.
                    </span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openShare({ subclass: tlSubclass || undefined })}
                  className="c-mono mt-2 inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.07em] text-ink-soft transition-colors hover:text-ink"
                >
                  <TimelineGlyph className="h-3.5 w-3.5" strokeWidth={2} />
                  Add medicals, s56 and the rest
                </button>
              )}
            </div>
          )}

          {create.isError && (
            <p className="mt-2 text-[12px] text-[#C23A50]">
              {(create.error as Error).message}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <span className="c-mono mr-auto text-[9.5px] uppercase tracking-[0.05em] text-ink-soft">
              {account ? (
                <>Posting as {account.handle} · anonymous · experiences, not advice</>
              ) : (
                <>Reading is open · writing needs a handle</>
              )}
            </span>

            {/*
              The prompt is here, before the write. `block` is resolved from the
              account and the read-only allowance, so this never becomes a 429
              the member discovers after typing.
            */}
            {block === "no-account" ? (
              <button
                onClick={() => openAccount("signup")}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper transition-opacity hover:opacity-90"
              >
                <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                Get a handle to post
              </button>
            ) : block === "spent" ? (
              <span className="c-mono rounded-full border border-[#C77D18]/35 bg-[#C77D18]/[0.06] px-3.5 py-2 text-[11px] text-[#B4700F]">
                You&apos;ve written a lot today. Back tomorrow.
              </span>
            ) : (
              <button
                onClick={submit}
                disabled={!ready || create.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-[13px] font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {create.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                )}
                {mode === "question" ? "Ask the community" : "Share timeline"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
