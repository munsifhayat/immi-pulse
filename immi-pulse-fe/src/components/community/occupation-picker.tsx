"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { useOccupations, type OccupationOut } from "@/lib/api/hooks/community";

/**
 * Pick a nominated ANZSCO occupation, filtered to the chosen visa.
 *
 * This replaced a free-text box labelled "Occupation (optional)" whose
 * placeholder read "e.g. Nurse, Developer". That box made "Nurse", "nurse",
 * "RN" and "Registered Nurse (Medical)" four different cohorts — four samples
 * of one where there should have been one sample of four — on the field that
 * predicts a skilled-visa wait more strongly than anything except the subclass.
 *
 * Two things here that the trackers we are competing with do not do:
 *
 *   * **Filtered by subclass.** A 189 applicant sees the 212 occupations they
 *     can actually nominate, not all 714. The competitor ships one flat list
 *     for every visa.
 *   * **Grouped by ANZSCO major group.** Professionals, Technicians and Trades,
 *     Managers… The competitor tags every row "Other" because they never
 *     extracted the group, so their list opens on "Aboriginal and Torres Strait
 *     Islander Education Worker" and stays alphabetical for 714 rows.
 *
 * `value` is the occupation **slug** — the same key the API takes as
 * `occupation_slug`, so callers hand it straight to the write path. The ANZSCO
 * code is resolved server-side against the subclass's ANZSCO edition and is
 * never assembled here.
 */

const labelCls =
  "mb-1.5 block c-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft";

/** Sort key for a group heading. Numeric so "10" cannot sort before "2". */
function groupRank(code?: string | null) {
  const n = Number(code);
  return Number.isFinite(n) ? n : 99;
}

export function OccupationPicker({
  subclass,
  value,
  onChange,
  required = false,
  disabled = false,
  error = false,
}: {
  /** Subclass slug. The list is meaningless without one, so the field is disabled until it arrives. */
  subclass?: string | null;
  value: string;
  onChange: (slug: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** Paint the trigger as invalid — the parent owns validation messaging. */
  error?: boolean;
}) {
  const { data: occupations = [], isLoading } = useOccupations(subclass);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => occupations.find((o) => o.slug === value),
    [occupations, value]
  );

  // Note: clearing a selection that the new visa cannot nominate is the
  // *parent's* job, done when the subclass changes. Doing it here would mean
  // calling `onChange` from an effect on every list load, which cascades
  // renders — and the parent owns both fields anyway, so it is the only place
  // that can clear one because the other moved.

  // One close path for every way out — the trigger, a pick, an outside click,
  // Escape. It also drops the query, so reopening starts from the full grouped
  // list rather than from whatever the member last typed.
  function closePopover() {
    setOpen(false);
    setQuery("");
  }

  // Close on outside click and on Escape — a 700-row popover that will not
  // close is worse than no popover.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) closePopover();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePopover();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focusing the DOM is what an effect is actually for. Clearing the query is
  // not, so that happens in `closePopover` instead.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Filtered locally: the whole eligible set is already in memory, so the list
  // narrows as fast as the member types instead of once per round trip.
  // Matching the code as well as the name — an applicant who knows they are
  // 261313 knows that better than the department's phrasing of their job title.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? occupations.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            o.anzsco_2013_code?.includes(q) ||
            o.anzsco_2022_code?.includes(q)
        )
      : occupations;

    const map = new Map<string, { name: string; code: string; rows: OccupationOut[] }>();
    for (const o of matched) {
      const key = o.major_group_code ?? "99";
      let g = map.get(key);
      if (!g) {
        g = { name: o.major_group_name ?? "Other", code: key, rows: [] };
        map.set(key, g);
      }
      g.rows.push(o);
    }
    return [...map.values()].sort((a, b) => groupRank(a.code) - groupRank(b.code));
  }, [occupations, query]);

  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  const isDisabled = disabled || !subclass;

  return (
    <div ref={rootRef} className="relative">
      <label className={labelCls}>
        Nominated occupation{required ? " *" : ""}
      </label>

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => (open ? closePopover() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-[14px] outline-none transition-all focus:ring-4 focus:ring-purple/10 disabled:cursor-not-allowed disabled:bg-gray-light disabled:text-ink-soft ${
          error
            ? "border-rose-400 focus:border-rose-400"
            : "border-hair focus:border-purple/50"
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? "text-ink" : "text-ink-soft"}`}>
          {!subclass
            ? "Pick your visa first…"
            : selected
              ? selected.name
              : "Search 700+ occupations…"}
        </span>
        {selected?.anzsco_code && (
          <span className="c-mono shrink-0 text-[11px] text-purple">
            {selected.anzsco_code}
          </span>
        )}
        {isLoading && subclass ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-soft" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft" strokeWidth={1.75} />
        )}
      </button>

      {/* The ANZSCO edition is shown, not hidden. Home Affairs runs 2022 for
          186/482 and 2013 for everything else, and an applicant comparing our
          code against their skills assessment needs to know which one they are
          looking at. */}
      {selected && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-soft">
          <span className="c-mono">
            ANZSCO {selected.anzsco_version ?? "2013"} · {selected.anzsco_code}
          </span>
          {selected.assessing_authority && (
            <>
              <span aria-hidden>·</span>
              <span>Assessed by {selected.assessing_authority}</span>
            </>
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="ml-auto inline-flex items-center gap-1 text-purple hover:underline"
          >
            <X className="h-3 w-3" strokeWidth={2} />
            Clear
          </button>
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1.5 max-h-[320px] w-full overflow-hidden rounded-xl border border-hair bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-hair px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-ink-soft" strokeWidth={1.75} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Occupation or ANZSCO code…"
              className="w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
            />
          </div>

          <div className="max-h-[268px] overflow-y-auto overscroll-contain">
            {total === 0 ? (
              <p className="px-3 py-6 text-center text-[12.5px] text-ink-soft">
                {isLoading
                  ? "Loading occupations…"
                  : query
                    ? "No occupation matches that on this visa's list."
                    : "No occupations are listed for this visa."}
              </p>
            ) : (
              groups.map((g) => (
                <div key={g.code}>
                  <div className="c-mono sticky top-0 bg-gray-light px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                    {g.name} · {g.rows.length}
                  </div>
                  {g.rows.map((o) => (
                    <button
                      key={o.slug}
                      type="button"
                      onClick={() => {
                        onChange(o.slug);
                        closePopover();
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-purple/5 ${
                        o.slug === value ? "bg-purple/5" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                        {o.name}
                      </span>
                      <span className="c-mono shrink-0 text-[11px] text-ink-soft">
                        {o.anzsco_code}
                      </span>
                      {o.slug === value && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-purple" strokeWidth={2.25} />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
