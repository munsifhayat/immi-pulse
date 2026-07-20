"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Dices,
  HelpCircle,
  Info,
  Loader2,
  Lock,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  JourneyCapError,
  MILESTONE_TYPES,
  useCreateJourney,
  useRerollIdentity,
  useVisaSubclasses,
  type CommunityIdentity,
  type MilestoneType,
  type PostType,
  type TimelineOutcome,
} from "@/lib/api/hooks/community";
import { shortDate } from "@/lib/community/format";
import { milestoneMeta } from "./milestone-meta";
import { OccupationPicker } from "./occupation-picker";
import { TimelineGlyph } from "./timeline-glyph";
import { VisaPicker } from "./visa-picker";

const fieldCls =
  "w-full rounded-xl border border-hair bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition-all focus:border-purple/50 focus:ring-4 focus:ring-purple/10";
const labelCls =
  "mb-1.5 block c-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "ACT", "TAS", "NT", "Offshore"];

function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-hair bg-gray-light p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold transition-colors ${
            value === o.value
              ? "bg-white text-ink shadow-sm"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface Milestone {
  type: MilestoneType;
  date: string;
}

export function ShareJourney({
  open,
  onOpenChange,
  identity,
  onCapReached,
  defaultSubclass,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  identity?: CommunityIdentity;
  onCapReached: () => void;
  defaultSubclass?: string;
}) {
  const { data: subclasses = [] } = useVisaSubclasses();
  const create = useCreateJourney();
  const reroll = useRerollIdentity();

  const canPostTimeline = identity?.can_post_timeline ?? true;
  const canReroll =
    !!identity && identity.journeys_posted === 0 && !identity.is_claimed;

  const [postType, setPostType] = useState<PostType>(
    canPostTimeline ? "timeline" : "question"
  );
  const [subclass, setSubclass] = useState(defaultSubclass ?? "");
  // The occupation *slug*, not free text — the picker's value and the API's
  // `occupation_slug`. The ANZSCO code is resolved server-side.
  const [occupationSlug, setOccupationSlug] = useState("");
  const [stateVal, setStateVal] = useState(STATES[0]);
  const [area, setArea] = useState<"metro" | "regional">("metro");
  const [sponsor, setSponsor] = useState<"accredited" | "non_accredited">(
    "accredited"
  );
  // Asked of everyone on a timeline — every visa is lodged from somewhere, and
  // both of these apply regardless of subclass.
  const [lodgedFrom, setLodgedFrom] = useState<"onshore" | "offshore">("onshore");
  const [lodgedVia, setLodgedVia] = useState<"self" | "agent">("self");
  // Never published. Collected because processing genuinely differs and members
  // on the public trackers already self-organise this way; kept private because
  // a pseudonym plus a nationality plus a date re-identifies people in a small
  // cohort.
  const [nationality, setNationality] = useState("");
  // Tri-state, and the third state matters: unset means "didn't say", which is
  // a different claim from "there was contact".
  const [directGrant, setDirectGrant] = useState(false);
  const [outcome, setOutcome] = useState<TimelineOutcome>("waiting");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [msType, setMsType] = useState("");
  const [msDate, setMsDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const selected = useMemo(
    () => subclasses.find((s) => s.slug === subclass),
    [subclasses, subclass]
  );

  // Whether to ask for an occupation at all — driven by reference data, never
  // by `if (subclass === "186")`. False means hidden, not optional: a 600
  // Tourist or partner-visa applicant has no ANZSCO occupation, and a field
  // they have to guess at would pool their timeline into a cohort it does not
  // belong to.
  const needsOccupation =
    postType === "timeline" && !!selected?.requires_occupation;
  // Same contract for the rest of the profile. Every one of these used to be
  // shown to everybody, so a 600 Tourist applicant was asked whether their
  // employer was an accredited sponsor — a question with no referent, whose
  // answer we then stored.
  const isTimeline = postType === "timeline";
  const needsState = isTimeline && !!selected?.requires_state_nomination;
  const needsRegion = isTimeline && !!selected?.requires_region;
  const needsSponsor = isTimeline && !!selected?.requires_sponsor_type;

  // Changing the visa invalidates the occupation: the eligible list differs per
  // subclass, and the server refuses an occupation that is not on the chosen
  // visa's list. Clearing it here — on the event, not in an effect — means the
  // member finds out by seeing the field empty rather than by being rejected at
  // submit time.
  function pickSubclass(slug: string) {
    setSubclass(slug);
    setOccupationSlug("");
  }

  function reset() {
    setDone(false);
    setError(null);
    setPostType(canPostTimeline ? "timeline" : "question");
    setSubclass(defaultSubclass ?? "");
    setOccupationSlug("");
    setStateVal(STATES[0]);
    setArea("metro");
    setSponsor("accredited");
    setLodgedFrom("onshore");
    setLodgedVia("self");
    setNationality("");
    setDirectGrant(false);
    setOutcome("waiting");
    setTitle("");
    setNote("");
    setMilestones([]);
    setMsType("");
    setMsDate("");
  }

  // Single close path used by the Done button, the X/esc, and overlay clicks —
  // always schedules a reset so a reopened builder never shows stale state.
  function close() {
    onOpenChange(false);
    setTimeout(reset, 200);
  }

  function addMilestone() {
    if (!msType || !msDate) {
      setError("Pick a milestone type and date.");
      return;
    }
    setError(null);
    setMilestones((prev) =>
      [...prev, { type: msType as MilestoneType, date: msDate }].sort(
        (a, b) => +new Date(a.date) - +new Date(b.date)
      )
    );
    setMsType("");
    setMsDate("");
  }

  function removeMilestone(i: number) {
    setMilestones((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setError(null);
    if (postType === "timeline") {
      if (!subclass) return setError("Pick your visa subclass.");
      // Required, not optional. Occupation is what lets us tell this member
      // how long people *like them* waited rather than how long everyone did.
      if (needsOccupation && !occupationSlug)
        return setError(
          "Pick your nominated occupation — timelines for this visa are grouped by it."
        );
      if (milestones.length === 0)
        return setError("Add at least one milestone — start with what you've lodged.");
    } else {
      if (!title.trim()) return setError("Give your question a title.");
      if (!note.trim()) return setError("Add some detail to your question.");
    }
    try {
      await create.mutateAsync({
        post_type: postType,
        subclass_slug: subclass || null,
        category_slug: selected?.category_slug ?? null,
        occupation_slug: needsOccupation ? occupationSlug || null : null,
        // Only send what this visa actually asks. The server drops the rest
        // anyway, but sending a value we never showed is how a field nobody
        // filled in ends up looking like an answer.
        state: needsState ? stateVal : null,
        area: needsRegion ? area : null,
        sponsor_type: needsSponsor ? sponsor : null,
        lodgement_location: isTimeline ? lodgedFrom : null,
        nationality: isTimeline ? nationality.trim() || null : null,
        lodged_via: isTimeline ? lodgedVia : null,
        // Only ever sent as an assertion. Leaving the box unticked means "not
        // stated", which is not the same as "there was contact" — so it sends
        // null rather than false.
        direct_grant: isTimeline && directGrant ? true : null,
        // This dialog's submit button *is* the consent — the member came here
        // to post. The wait-check saves privately and publishes separately.
        publish: true,
        outcome,
        title: postType === "question" ? title : null,
        note: note || null,
        milestones:
          postType === "timeline"
            ? milestones.map((m) => ({
                milestone_type: m.type,
                occurred_on: m.date,
              }))
            : [],
      });
      setDone(true);
    } catch (err) {
      if (err instanceof JourneyCapError) {
        onOpenChange(false);
        onCapReached();
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) onOpenChange(true);
        else close();
      }}
    >
      <DialogContent className="c-paper max-h-[92vh] overflow-y-auto sm:max-w-xl">
        {done ? (
          <div className="py-8 text-center">
            <DialogTitle className="sr-only">Shared successfully</DialogTitle>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal/10">
              <Check className="h-8 w-8 text-teal" strokeWidth={1.75} />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-ink">
              You&apos;re live, {identity?.handle}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-ink-soft">
              {postType === "timeline"
                ? "Your timeline is now in the feed and feeding the live processing-time stats. It just helped answer “is my wait normal?” for everyone behind you."
                : "Your question is now in the feed. Someone ahead of you will likely have an answer soon."}
            </p>
            {postType === "timeline" && (
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl border border-hair bg-white px-3.5 py-2.5 text-[12px] text-ink">
                <Lock className="h-3.5 w-3.5 text-teal" strokeWidth={1.75} />
                That&apos;s your one anonymous timeline — sign in to add or edit more.
              </div>
            )}
            <div className="mt-6">
              <button
                onClick={close}
                className="rounded-xl bg-ink px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-ink/90"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-heading text-xl font-semibold text-ink">
                <TimelineGlyph className="h-5 w-5 text-purple" strokeWidth={1.9} />
                Share with the community
              </DialogTitle>
              <DialogDescription className="text-[13px] text-ink-soft">
                Anonymous &amp; free. Post a milestone timeline or ask a question —
                every detail helps the next applicant.
              </DialogDescription>
            </DialogHeader>

            {/* identity row */}
            {identity && (
              <div className="flex items-center gap-3 rounded-xl border border-hair bg-white px-4 py-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white"
                  style={{ backgroundColor: identity.color }}
                >
                  {identity.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="c-eyebrow">Posting as</div>
                  <div className="mt-0.5 font-heading text-[16px] font-semibold text-ink">
                    {identity.handle}
                  </div>
                </div>
                {canReroll && (
                  <button
                    type="button"
                    onClick={() => reroll.mutate()}
                    disabled={reroll.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-hair px-3 py-2 text-[12px] font-semibold text-purple transition-colors hover:bg-purple/5 disabled:opacity-50"
                  >
                    {reroll.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Dices className="h-3.5 w-3.5" />
                    )}
                    New name
                  </button>
                )}
              </div>
            )}

            {/* post type toggle */}
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => canPostTimeline && setPostType("timeline")}
                disabled={!canPostTimeline}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13.5px] font-semibold transition-colors ${
                  postType === "timeline"
                    ? "border-purple bg-purple/5 text-purple-deep"
                    : "border-hair bg-white text-ink-soft hover:border-purple-light"
                } ${!canPostTimeline ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <TimelineGlyph className="h-4 w-4" strokeWidth={2} /> Timeline
              </button>
              <button
                type="button"
                onClick={() => setPostType("question")}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13.5px] font-semibold transition-colors ${
                  postType === "question"
                    ? "border-purple bg-purple/5 text-purple-deep"
                    : "border-hair bg-white text-ink-soft hover:border-purple-light"
                }`}
              >
                <HelpCircle className="h-4 w-4" strokeWidth={1.75} /> Question
              </button>
            </div>

            {!canPostTimeline && postType === "timeline" ? (
              <div className="rounded-xl border border-hair bg-white p-6 text-center">
                <Lock className="mx-auto h-6 w-6 text-ink-soft" strokeWidth={1.5} />
                <p className="mt-2 text-[14px] font-semibold text-ink">
                  You&apos;ve already shared your anonymous timeline
                </p>
                <p className="mx-auto mt-1 max-w-xs text-[12.5px] text-ink-soft">
                  Sign in to share another timeline or edit your existing one. You
                  can still ask a question anytime.
                </p>
                <button
                  onClick={() => {
                    close();
                    onCapReached();
                  }}
                  className="mt-4 rounded-xl bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-ink/90"
                >
                  Sign in to add more
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* visa */}
                <div>
                  <VisaPicker
                    value={subclass}
                    onChange={pickSubclass}
                    size="md"
                    visaLabel={
                      postType === "question"
                        ? "Visa subclass (optional)"
                        : "Visa subclass"
                    }
                    required={postType === "timeline"}
                  />
                </div>

                {postType === "timeline" ? (
                  <>
                    {/* Occupation gets the full width to itself. It is a
                        searchable picker over 700+ grouped rows, and it was
                        previously sharing a two-column grid with the state
                        dropdown — half a row is not enough for a field this
                        dense, and it is the field that makes cohort matching
                        possible. */}
                    {needsOccupation && (
                      <OccupationPicker
                        subclass={subclass}
                        value={occupationSlug}
                        onChange={setOccupationSlug}
                        required
                        error={!!error && !occupationSlug}
                      />
                    )}

                    {/* profile — every field below is conditional on what the
                        chosen visa actually needs, driven by reference data
                        rather than a subclass check. Before this, a tourist
                        applicant was asked for their ANZSCO occupation and
                        whether their employer was an accredited sponsor. */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {needsState && (
                        <div>
                          <label className={labelCls}>State / territory</label>
                          <select
                            value={stateVal}
                            onChange={(e) => setStateVal(e.target.value)}
                            className={fieldCls}
                          >
                            {STATES.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {needsRegion && (
                        <div>
                          <label className={labelCls}>Area</label>
                          <Seg
                            value={area}
                            onChange={setArea}
                            options={[
                              { value: "metro", label: "Metro" },
                              { value: "regional", label: "Regional" },
                            ]}
                          />
                        </div>
                      )}
                      {needsSponsor && (
                        <div>
                          <label className={labelCls}>Sponsor type</label>
                          <Seg
                            value={sponsor}
                            onChange={setSponsor}
                            options={[
                              { value: "accredited", label: "Accredited" },
                              { value: "non_accredited", label: "Non-accred." },
                            ]}
                          />
                        </div>
                      )}
                      {/* Asked of everyone: every visa is lodged from
                          somewhere, and "Offshore" used to be smuggled into the
                          state dropdown as if it were a state. */}
                      <div>
                        <label className={labelCls}>Lodged from</label>
                        <Seg
                          value={lodgedFrom}
                          onChange={setLodgedFrom}
                          options={[
                            { value: "onshore", label: "Onshore" },
                            { value: "offshore", label: "Offshore" },
                          ]}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Lodged by</label>
                        <Seg
                          value={lodgedVia}
                          onChange={setLodgedVia}
                          options={[
                            { value: "self", label: "Myself" },
                            { value: "agent", label: "Agent" },
                          ]}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>
                          Nationality{" "}
                          <span className="font-normal text-gray-text">
                            (optional, never shown)
                          </span>
                        </label>
                        <input
                          className={fieldCls}
                          value={nationality}
                          onChange={(e) => setNationality(e.target.value)}
                          placeholder="e.g. Indian"
                          maxLength={60}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Current status</label>
                        <Seg
                          value={outcome}
                          onChange={setOutcome}
                          options={[
                            { value: "waiting", label: "Waiting" },
                            { value: "granted", label: "Granted" },
                            { value: "refused", label: "Refused" },
                          ]}
                        />
                      </div>
                    </div>

                    {/* milestones */}
                    <div>
                      <label className={labelCls}>Your milestones</label>
                      {milestones.length === 0 ? (
                        <div className="rounded-xl border border-hair bg-white px-4 py-3.5 text-center text-[12.5px] text-ink-soft">
                          No milestones yet — add your first below. Most people start
                          with “Visa Lodged” or “Nomination Lodged”.
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          {milestones.map((m, i) => {
                            const { Icon, color } = milestoneMeta(m.type);
                            const next = milestones[i + 1];
                            const gap = next
                              ? Math.round(
                                  (+new Date(next.date) - +new Date(m.date)) /
                                    86_400_000
                                )
                              : null;
                            return (
                              <div key={i}>
                                <div className="flex items-center gap-3">
                                  <span
                                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white"
                                    style={{ backgroundColor: color }}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                  </span>
                                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-hair bg-white px-3 py-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[13px] font-semibold text-ink">
                                        {m.type}
                                      </div>
                                      <div className="c-mono text-[11px] text-ink-soft">
                                        {shortDate(m.date)}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeMilestone(i)}
                                      className="grid h-7 w-7 place-items-center rounded-md text-ink-soft transition-colors hover:bg-rose-50 hover:text-rose-600"
                                      aria-label="Remove milestone"
                                    >
                                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                                    </button>
                                  </div>
                                </div>
                                {gap != null && gap > 0 && (
                                  <div className="c-mono ml-9 py-1 text-[10px] font-semibold text-purple">
                                    ↓ {gap} {gap === 1 ? "day" : "days"} later
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-2.5 grid grid-cols-1 gap-2 rounded-xl border border-dashed border-purple-light bg-purple/[0.04] p-3 sm:grid-cols-[1fr_150px_auto]">
                        <select
                          value={msType}
                          onChange={(e) => setMsType(e.target.value)}
                          className={fieldCls}
                        >
                          <option value="">Milestone type…</option>
                          {MILESTONE_TYPES.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          max={today}
                          value={msDate}
                          onChange={(e) => setMsDate(e.target.value)}
                          className={`${fieldCls} c-mono`}
                        />
                        <button
                          type="button"
                          onClick={addMilestone}
                          className="grid h-[42px] w-full place-items-center rounded-xl bg-ink text-white hover:bg-ink/90 sm:w-[42px]"
                          aria-label="Add milestone"
                        >
                          <Plus className="h-5 w-5" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>

                    {/* A positive claim, not an absent milestone. Roughly one
                        timeline post in five says some version of "no CO
                        contact, direct from received to finalised" — it is the
                        densest thing in a skilled timeline, and until now an
                        empty milestone list and a confirmed-clean run looked
                        identical to us. */}
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-hair bg-paper px-3.5 py-3">
                      <input
                        type="checkbox"
                        checked={directGrant}
                        onChange={(e) => setDirectGrant(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-purple"
                      />
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-ink">
                          Direct grant — no case officer contact
                        </span>
                        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-gray-text">
                          Tick only if it ran straight through with no s56, no
                          Form 80 and no further requests. Leaving it unticked
                          says nothing either way.
                        </span>
                      </span>
                    </label>

                    <div>
                      <label className={labelCls}>
                        Add a note{" "}
                        <span className="font-normal text-gray-text">— optional</span>
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={280}
                        rows={3}
                        className={`${fieldCls} resize-y`}
                        placeholder="Anything you'd tell someone with the same profile?"
                      />
                      <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-dashed border-purple-light bg-white px-3 py-1.5 text-[11.5px] text-purple-deep">
                        <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Posts to the feed <b>&amp;</b> updates the live
                        processing-time stats for your visa.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className={labelCls}>Your question</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={200}
                        className={fieldCls}
                        placeholder="e.g. How long after s56 does a decision take?"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Details</label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={4}
                        maxLength={2000}
                        className={`${fieldCls} resize-y`}
                        placeholder="Add context — your visa, timeline so far, what you've tried…"
                      />
                    </div>
                  </>
                )}

                {error && <p className="text-[13px] text-rose-600">{error}</p>}

                <div className="flex items-center gap-3 border-t border-hair pt-4">
                  <span className="c-mono inline-flex items-center gap-1.5 text-[10.5px] text-ink-soft">
                    <ShieldCheck className="h-3.5 w-3.5 text-teal" strokeWidth={1.75} />
                    {postType === "timeline"
                      ? "One timeline per anonymous identity"
                      : "Anonymous & rate-limited"}
                  </span>
                  <button
                    onClick={submit}
                    disabled={create.isPending}
                    className="ml-auto inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-60"
                  >
                    {create.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                    ) : (
                      <Send className="h-4 w-4" strokeWidth={1.75} />
                    )}
                    {postType === "timeline" ? "Post my timeline" : "Post my question"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
