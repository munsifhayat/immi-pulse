"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Lock } from "lucide-react";
import {
  usePublishJourney,
  useSaveWaitCheck,
  useVisaSubclasses,
  useWaitCheck,
  type CommunityDurationStats,
  type OfficialFigures,
  type WaitTier,
} from "@/lib/api/hooks/community";
import { formatDays } from "../_lib/format";

/* Tier → the one accent colour that the "you" marker + headline borrow. */
const TIER_COLOR: Record<WaitTier, string> = {
  on_track: "#1B7B6F",
  normal: "#1B7B6F",
  longer: "#C77D18",
  outlier: "#D6465B",
  unknown: "#8A8F9C",
};
const TIER_TEXT: Record<WaitTier, string> = {
  on_track: "text-teal",
  normal: "text-teal",
  longer: "text-[#B4700F]",
  outlier: "text-[#C23A50]",
  unknown: "text-ink-soft",
};

const fieldCls =
  "w-full rounded-xl border border-hair bg-white px-3.5 py-3 text-[14px] text-ink outline-none transition-all focus:border-purple/50 focus:ring-4 focus:ring-purple/10";

/**
 * The signature visual: a smoothed distribution of community grant times with
 * the applicant's own wait dropped onto the same axis. The curve is a stylised
 * model built from the real percentiles (median + IQR) — the honest facts are
 * the labelled median / 90% ticks and the "you" marker.
 */
function DistributionBand({
  elapsed,
  p25,
  p50,
  p75,
  p90,
  slowest,
  tier,
}: {
  elapsed: number;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  slowest: number | null;
  tier: WaitTier;
}) {
  const W = 640;
  const H = 176;
  const padX = 14;
  const baseY = 132;
  const topPad = 30;

  const geo = useMemo(() => {
    const scaleMax =
      Math.max(elapsed, p90 ?? 0, slowest ?? 0, p50 ?? 0, 1) * 1.16;
    const x = (v: number) =>
      padX + (Math.max(0, v) / scaleMax) * (W - padX * 2);

    const mu = p50 ?? (p25 != null && p75 != null ? (p25 + p75) / 2 : scaleMax / 2);
    const iqr = p25 != null && p75 != null ? Math.max(1, p75 - p25) : scaleMax / 4;
    const sigma = Math.max(iqr / 1.349, scaleMax * 0.05);
    const amp = baseY - topPad;
    const gauss = (d: number) => Math.exp(-0.5 * ((d - mu) / sigma) ** 2);

    const N = 72;
    const pts: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const day = (i / N) * scaleMax;
      pts.push([x(day), baseY - amp * gauss(day)]);
    }
    const line = pts
      .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join(" ");
    const area =
      `M${x(0).toFixed(1)} ${baseY} ` +
      pts.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") +
      ` L${x(scaleMax).toFixed(1)} ${baseY} Z`;

    return {
      scaleMax,
      x,
      line,
      area,
      youX: x(elapsed),
      youCurveY: baseY - amp * gauss(elapsed),
    };
  }, [elapsed, p25, p50, p75, p90, slowest]);

  const color = TIER_COLOR[tier];
  const { x } = geo;

  const youLabel = `YOU · ${formatDays(elapsed)}`;
  const chipW = Math.max(88, youLabel.length * 6.4 + 26);
  const chipX = Math.min(
    W - padX - chipW / 2,
    Math.max(padX + chipW / 2, geo.youX)
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Distribution of community grant times with your position marked"
    >
      <defs>
        <linearGradient id="c-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#7C5CFC" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* baseline */}
      <line
        x1={padX}
        y1={baseY}
        x2={W - padX}
        y2={baseY}
        stroke="var(--hair)"
        strokeWidth="1.5"
      />

      {/* typical range p25–p75 */}
      {p25 != null && p75 != null && (
        <rect
          x={x(p25)}
          y={topPad + 6}
          width={Math.max(2, x(p75) - x(p25))}
          height={baseY - topPad - 6}
          fill="#7C5CFC"
          opacity="0.05"
        />
      )}

      {/* distribution area + curve */}
      <path d={geo.area} fill="url(#c-band)" />
      <motion.path
        d={geo.line}
        fill="none"
        stroke="#7C5CFC"
        strokeWidth="2"
        strokeOpacity="0.55"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* median tick */}
      {p50 != null && (
        <g>
          <line
            x1={x(p50)}
            y1={topPad + 2}
            x2={x(p50)}
            y2={baseY}
            stroke="#16181D"
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity="0.4"
          />
          <text
            x={x(p50)}
            y={baseY + 16}
            textAnchor="middle"
            className="c-mono"
            fontSize="10"
            fill="var(--ink-soft)"
          >
            median {formatDays(p50)}
          </text>
        </g>
      )}

      {/* 90% tick */}
      {p90 != null && Math.abs(x(p90) - x(p50 ?? -999)) > 46 && (
        <g opacity="0.7">
          <line
            x1={x(p90)}
            y1={topPad + 10}
            x2={x(p90)}
            y2={baseY}
            stroke="#16181D"
            strokeWidth="1"
            strokeDasharray="1 4"
            opacity="0.3"
          />
          <text
            x={x(p90)}
            y={baseY + 16}
            textAnchor="middle"
            className="c-mono"
            fontSize="10"
            fill="var(--ink-soft)"
          >
            90% by {formatDays(p90)}
          </text>
        </g>
      )}

      {/* YOU — glides in from the left onto its axis position */}
      <motion.g
        initial={{ x: -(geo.youX - padX), opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 110, damping: 18, delay: 0.15 }}
      >
        <line
          x1={geo.youX}
          y1={topPad - 8}
          x2={geo.youX}
          y2={baseY}
          stroke={color}
          strokeWidth="1.5"
        />
        <circle cx={geo.youX} cy={baseY} r="3.5" fill={color} />
        {/* connector from marker line to the (possibly clamped) chip */}
        {Math.abs(chipX - geo.youX) > 1 && (
          <line
            x1={geo.youX}
            y1={topPad - 8}
            x2={chipX}
            y2={topPad - 10}
            stroke={color}
            strokeWidth="1.5"
          />
        )}
        {/* chip */}
        <g transform={`translate(${chipX}, ${topPad - 10})`}>
          <rect
            x={-chipW / 2}
            y={-13}
            width={chipW}
            height={24}
            rx={12}
            fill={color}
          />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            className="c-mono"
            fontSize="11"
            fontWeight="600"
            fill="#fff"
          >
            {youLabel}
          </text>
        </g>
        <circle
          cx={geo.youX}
          cy={geo.youCurveY}
          r="4.5"
          fill="#fff"
          stroke={color}
          strokeWidth="2"
        />
      </motion.g>
    </svg>
  );
}

/**
 * The composition of a Room figure, rendered beside it.
 *
 * Never render a community number without this. Timelines collected from public
 * forums count toward these figures, and the condition of that decision was that
 * the split is always in the open — so a reader who trusts a member's own report
 * more than a forum scrape can see exactly how much of the number is which and
 * discount it themselves.
 */
function ProvenanceLine({ room }: { room: CommunityDurationStats }) {
  if (!room.provenance_note) return null;
  return (
    <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
      {room.provenance_note}
      {room.pending > 0 && (
        <>
          {" "}
          {room.pending.toLocaleString()}{" "}
          {room.pending === 1 ? "person is" : "people are"} still waiting — their
          cases aren&apos;t in the median yet, which makes it a little
          optimistic.
        </>
      )}
    </p>
  );
}

/**
 * The official bands, always with their as-at date.
 *
 * The date is not decoration. These figures are hand-seeded from the Home
 * Affairs publication, not ingested on a schedule, so showing the number without
 * saying how old it is would be a claim we cannot support.
 */
function OfficialLine({ official }: { official: OfficialFigures }) {
  if (official.p50_days == null && official.p90_days == null) return null;
  return (
    <div className="c-mono text-[11px] leading-relaxed text-ink-soft">
      <span className="text-ink">{official.source}</span>
      {official.p50_days != null && (
        <> · 50% by {formatDays(official.p50_days)}</>
      )}
      {official.p90_days != null && (
        <> · 90% by {formatDays(official.p90_days)}</>
      )}
      {official.as_at && <> · as at {official.as_at}</>}
    </div>
  );
}

/**
 * Save this check as your own timeline, then — separately — share it.
 *
 * Two steps, on purpose. Saving is private and reversible in the member's mind;
 * publishing puts a piece of their immigration history in front of strangers.
 * Collapsing them into one button would harvest more data and would be a worse
 * product: people would share things they meant to keep, and the trust that
 * makes them come back for fourteen months is not worth one extra data point.
 */
function SaveAndShare({
  subclassSlug,
  lodgedOn,
}: {
  subclassSlug: string;
  lodgedOn: string;
}) {
  const save = useSaveWaitCheck();
  const publish = usePublishJourney();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  // A new check is a new thing to save — never leave the previous result's
  // "saved" state sitting under it.
  useEffect(() => {
    setSavedId(null);
    setPublished(false);
    save.reset();
    publish.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subclassSlug, lodgedOn]);

  const onSave = async () => {
    const journey = await save.mutateAsync({
      subclass_slug: subclassSlug,
      lodged_on: lodgedOn,
    });
    setSavedId(journey.id);
  };

  const onPublish = async () => {
    if (!savedId) return;
    await publish.mutateAsync(savedId);
    setPublished(true);
  };

  if (published) {
    return (
      <div className="mt-4 rounded-xl border border-teal/25 bg-teal/[0.04] px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] font-medium text-teal">
          <Check className="h-4 w-4" strokeWidth={2} />
          Shared with the room
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
          Your timeline now counts toward the figures above, and you can add the
          next step — medical, s56, the grant — whenever it happens.
        </p>
      </div>
    );
  }

  if (savedId) {
    return (
      <div className="mt-4 rounded-xl border border-hair bg-paper px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
          <Lock className="h-3.5 w-3.5 text-ink-soft" strokeWidth={1.75} />
          Saved. Only you can see this.
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
          It is not in the feed and it is not in any of the numbers above.
          Sharing it is a separate choice — it would appear anonymously, under
          your handle, and help answer this same question for the next person.
        </p>
        <button
          onClick={onPublish}
          disabled={publish.isPending}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {publish.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          )}
          Share it with the room
        </button>
        {publish.isError && (
          <p className="mt-2 text-[12px] text-[#C23A50]">
            That didn&apos;t go through. Your timeline is still saved privately.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-hair pt-3.5">
      <button
        onClick={onSave}
        disabled={save.isPending}
        className="inline-flex items-center gap-2 rounded-lg border border-hair bg-white px-3.5 py-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-black/[0.02] disabled:opacity-50"
      >
        {save.isPending && (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
        )}
        Keep this as my timeline
      </button>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
        Saved privately first — nothing is shared until you say so.
      </p>
      {save.isError && (
        <p className="mt-2 text-[12px] text-[#C23A50]">
          We couldn&apos;t save that. Try again in a moment.
        </p>
      )}
    </div>
  );
}

export function WaitCheck() {
  const { data: subclasses = [] } = useVisaSubclasses();
  const [subclass, setSubclass] = useState("");
  const [lodgedOn, setLodgedOn] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const { data: result, isFetching } = useWaitCheck(
    subclass || undefined,
    lodgedOn || undefined
  );

  const ready = !!subclass && !!lodgedOn;

  return (
    <div className="overflow-hidden rounded-2xl border border-hair bg-white shadow-[0_1px_2px_rgba(16,18,29,0.03),0_12px_40px_-24px_rgba(16,18,29,0.22)]">
      {/* Controls */}
      <div className="border-b border-hair px-5 pb-5 pt-5 sm:px-6">
        <span className="c-eyebrow">Wait check</span>
        <h3 className="mt-2 font-heading text-[19px] font-semibold tracking-[-0.3px] text-ink">
          Where does your wait sit?
        </h3>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_168px]">
          <select
            value={subclass}
            onChange={(e) => setSubclass(e.target.value)}
            className={fieldCls}
            aria-label="Visa subclass"
          >
            <option value="">Select your visa…</option>
            {subclasses.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.code} · {s.name}
                {s.stream ? ` (${s.stream})` : ""}
              </option>
            ))}
          </select>
          <input
            type="date"
            max={today}
            value={lodgedOn}
            onChange={(e) => setLodgedOn(e.target.value)}
            className={`${fieldCls} c-mono`}
            aria-label="Lodgement date"
          />
        </div>
      </div>

      {/* Result */}
      <div className="px-5 pb-5 pt-5 sm:px-6">
        {!ready ? (
          <div className="flex flex-col items-center gap-3 py-9 text-center">
            <svg width="132" height="40" viewBox="0 0 132 40" className="text-hair">
              <path
                d="M2 34 C 24 34, 34 8, 52 8 S 80 34, 98 34 130 20 130 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="52" cy="8" r="3" fill="#BDB4FE" />
            </svg>
            <p className="max-w-[15rem] text-[13px] leading-relaxed text-ink-soft">
              Pick a visa and your lodgement date to drop your wait onto the
              community curve.
            </p>
          </div>
        ) : isFetching && !result ? (
          <div className="flex items-center justify-center py-10 text-ink-soft">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
            Checking…
          </div>
        ) : !result ? (
          <div className="py-10 text-center text-[13px] text-ink-soft">
            We couldn&apos;t check that one. Try another visa.
          </div>
        ) : result.tier === "unknown" ? (
          <div className="py-6">
            <p className="text-center text-[15px] font-medium text-ink">
              {result.headline}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-center text-[13px] leading-relaxed text-ink-soft">
              {result.detail}
            </p>
            <SaveAndShare subclassSlug={subclass} lodgedOn={lodgedOn} />
          </div>
        ) : (
          <>
            <DistributionBand
              elapsed={result.elapsed_days}
              p25={result.p25}
              p50={result.p50}
              p75={result.p75}
              p90={result.p90}
              slowest={result.slowest}
              tier={result.tier}
            />

            <p
              className={`mt-4 font-heading text-[17px] font-semibold leading-snug tracking-[-0.3px] ${TIER_TEXT[result.tier]}`}
            >
              {result.headline}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
              {result.detail}
            </p>

            {/*
              Where the number came from. Both blocks always render together:
              the official figure alone is an unchecked claim, and the room's
              alone is a crowd-sourced number with nothing to corroborate it.
            */}
            <div className="mt-4 border-t border-hair pt-3.5">
              {result.basis === "official" ? (
                <>
                  <p className="text-[12px] font-medium text-ink">
                    Answered from official figures
                  </p>
                  <OfficialLine official={result.official} />
                  <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
                    {result.room.provenance.total > 0 ? (
                      <>
                        {result.room.provenance_note} That is fewer than the{" "}
                        {result.room.min_sample} decided cases we need before
                        publishing a median of our own, so this answer uses the
                        department&apos;s figures instead.
                      </>
                    ) : (
                      <>
                        Nobody has shared a timeline for this visa yet. Once{" "}
                        {result.room.min_sample} have been decided, we can tell
                        you what the room is actually seeing.
                      </>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[12px] font-medium text-ink">
                    From {result.room.provenance.total.toLocaleString()} shared
                    timelines · last {result.room.window_months} months
                  </p>
                  <ProvenanceLine room={result.room} />
                  <div className="mt-2.5 border-t border-hair pt-2.5">
                    <OfficialLine official={result.official} />
                  </div>
                </>
              )}
            </div>

            <SaveAndShare subclassSlug={subclass} lodgedOn={lodgedOn} />
          </>
        )}
      </div>
    </div>
  );
}
