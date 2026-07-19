"use client";

import { useMemo, useState } from "react";
import {
  useVisaSubclasses,
  type VisaSubclassOut,
} from "@/lib/api/hooks/community";

/**
 * Pick a visa in two steps: the program, then the stream.
 *
 * Home Affairs publishes processing times per (subclass, stream) pair — 43
 * programs across 76 rows — and the stream is not cosmetic. A 500 Non-Award
 * applicant waits under a day; a 500 Vocational Education applicant waits seven
 * months. Same subclass number, 35x apart. Flattening all 76 into one dropdown
 * would be unreadable, and asking "which stream?" for the 27 subclasses that
 * have none would be noise, so the second step only appears when it is real.
 *
 * This replaced a hardcoded five-item list — "Direct Entry (DE)", "TRT",
 * "Labour Agreement", "Points-tested", "Not sure" — that was correct for the 186
 * and meaningless for the other 42 programs, and which defaulted to "Direct
 * Entry (DE)" so that *every* timeline carried a stream nobody had chosen.
 *
 * `value` is the stream slug (e.g. `186-direct-entry`) — the same key the API
 * takes as `subclass_slug`, so callers hand it straight to the write path.
 */

const SIZES = {
  sm: "w-full rounded-lg border border-hair bg-white px-3 py-2 text-[13px] text-ink outline-none transition-all focus:border-purple/50 focus:ring-4 focus:ring-purple/10",
  md: "w-full rounded-xl border border-hair bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition-all focus:border-purple/50 focus:ring-4 focus:ring-purple/10",
  lg: "w-full rounded-xl border border-hair bg-white px-3.5 py-3 text-[14px] text-ink outline-none transition-all focus:border-purple/50 focus:ring-4 focus:ring-purple/10",
} as const;

const labelCls =
  "mb-1.5 block c-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft";

export interface VisaGroup {
  groupKey: string;
  code: string;
  name: string;
  categorySlug?: string | null;
  /** Selectable streams only — lodgement stages are never offered. */
  streams: VisaSubclassOut[];
}

/** Group the flat catalogue into programs, preserving server sort order. */
export function useVisaGroups() {
  const { data: subclasses = [], isLoading } = useVisaSubclasses();
  const groups = useMemo(() => {
    const out = new Map<string, VisaGroup>();
    for (const s of subclasses) {
      // Nomination and sponsorship are lodgement stages with their own clocks,
      // not an answer to "which stream are you on?".
      if (s.is_stage) continue;
      const key = s.group_key ?? s.code;
      let g = out.get(key);
      if (!g) {
        g = {
          groupKey: key,
          code: s.code,
          name: s.name,
          categorySlug: s.category_slug,
          streams: [],
        };
        out.set(key, g);
      }
      g.streams.push(s);
    }
    return [...out.values()];
  }, [subclasses]);

  const bySlug = useMemo(() => {
    const m = new Map<string, VisaSubclassOut>();
    for (const s of subclasses) m.set(s.slug, s);
    return m;
  }, [subclasses]);

  return { groups, bySlug, isLoading };
}

export function VisaPicker({
  value,
  onChange,
  size = "md",
  labels = true,
  visaLabel = "Visa subclass",
  required = false,
  disabled = false,
}: {
  value: string;
  onChange: (slug: string) => void;
  size?: keyof typeof SIZES;
  labels?: boolean;
  visaLabel?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const { groups, bySlug } = useVisaGroups();
  const fieldCls = SIZES[size];

  // The chosen program is held here, not derived from `value` alone: picking a
  // multi-stream program leaves `value` empty until a stream is chosen too, so
  // deriving it would make the first dropdown snap back to "Select your visa…"
  // the instant you used it.
  const [groupKey, setGroupKey] = useState("");

  const selected = value ? bySlug.get(value) : undefined;
  // A `value` set from outside (deep link, "add the rest" hand-off) still has to
  // light up the right program.
  const effectiveGroupKey = selected
    ? selected.group_key ?? selected.code
    : groupKey;
  const activeGroup = groups.find((g) => g.groupKey === effectiveGroupKey);

  // Only ask the second question when the program actually has a choice in it.
  const showStream = !!activeGroup && activeGroup.streams.length > 1;

  function pickGroup(key: string) {
    setGroupKey(key);
    const g = groups.find((x) => x.groupKey === key);
    if (!g) return onChange("");
    // A single-stream program is fully determined by its group — selecting it
    // should complete the pick, not leave the member on a dead dropdown.
    onChange(g.streams.length === 1 ? g.streams[0].slug : "");
  }

  return (
    <div className={showStream ? "grid gap-3 sm:grid-cols-2" : undefined}>
      <div>
        {labels && (
          <label className={labelCls}>
            {visaLabel}
            {required ? " *" : ""}
          </label>
        )}
        <select
          className={fieldCls}
          value={effectiveGroupKey}
          disabled={disabled}
          onChange={(e) => pickGroup(e.target.value)}
        >
          <option value="">Select your visa…</option>
          {groups.map((g) => (
            <option key={g.groupKey} value={g.groupKey}>
              {g.code} · {g.name}
            </option>
          ))}
        </select>
      </div>

      {showStream && (
        <div>
          {labels && <label className={labelCls}>Stream{required ? " *" : ""}</label>}
          <select
            className={fieldCls}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Which stream?</option>
            {activeGroup!.streams.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.stream ?? s.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
