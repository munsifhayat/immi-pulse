"use client";

import { useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useSubmitTimeline,
  useVisaSubclasses,
  type TimelineOutcome,
} from "@/lib/api/hooks/community";

const fieldCls =
  "w-full rounded-xl border border-hair bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition-all focus:border-purple/50 focus:ring-4 focus:ring-purple/10";
const labelCls = "c-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft";

const OUTCOMES: { value: TimelineOutcome; label: string }[] = [
  { value: "waiting", label: "Still waiting" },
  { value: "granted", label: "Granted" },
  { value: "refused", label: "Refused" },
];

export function ShareTimeline({
  defaultSubclass,
  trigger,
}: {
  defaultSubclass?: string;
  trigger?: React.ReactNode;
}) {
  const { data: subclasses = [] } = useVisaSubclasses();
  const submit = useSubmitTimeline();

  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [subclass, setSubclass] = useState(defaultSubclass ?? "");
  const [lodgedOn, setLodgedOn] = useState("");
  const [outcome, setOutcome] = useState<TimelineOutcome>("waiting");
  const [decidedOn, setDecidedOn] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  function reset() {
    setDone(false);
    setSubclass(defaultSubclass ?? "");
    setLodgedOn("");
    setOutcome("waiting");
    setDecidedOn("");
    setCountry("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!subclass || !lodgedOn) {
      setError("Pick your visa and lodgement date.");
      return;
    }
    if (outcome !== "waiting" && !decidedOn) {
      setError("Add the date your decision came through.");
      return;
    }
    try {
      await submit.mutateAsync({
        subclass_slug: subclass,
        lodged_on: lodgedOn,
        outcome,
        decided_on: outcome === "waiting" ? null : decidedOn,
        country: country || undefined,
      });
      setDone(true);
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Something went wrong. Please try again.";
      setError(typeof detail === "string" ? detail : "Please check your dates.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(reset, 200);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <button className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink/90">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Share your timeline
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal/10">
              <Check className="h-6 w-6 text-teal" strokeWidth={1.75} />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-ink">
              Thank you
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-[14px] text-ink-soft">
              Your timeline helps everyone else answer “is my wait normal?”. It’s
              anonymous and now part of the community data.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="mt-6 rounded-xl bg-ink px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink/90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl font-semibold text-ink">
                Share your timeline
              </DialogTitle>
              <DialogDescription className="text-[13px] text-ink-soft">
                Anonymous and free. No sign-in, no personal details — just dates
                that help the next applicant.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="mt-2 space-y-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Visa</label>
                <select
                  value={subclass}
                  onChange={(e) => setSubclass(e.target.value)}
                  className={fieldCls}
                >
                  <option value="">Select a visa…</option>
                  {subclasses.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.code} · {s.name}
                      {s.stream ? ` (${s.stream})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelCls}>Lodged on</label>
                  <input
                    type="date"
                    max={today}
                    value={lodgedOn}
                    onChange={(e) => setLodgedOn(e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Status</label>
                  <select
                    value={outcome}
                    onChange={(e) =>
                      setOutcome(e.target.value as TimelineOutcome)
                    }
                    className={fieldCls}
                  >
                    {OUTCOMES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {outcome !== "waiting" && (
                <div className="space-y-1.5">
                  <label className={labelCls}>
                    {outcome === "granted" ? "Granted on" : "Decided on"}
                  </label>
                  <input
                    type="date"
                    min={lodgedOn || undefined}
                    max={today}
                    value={decidedOn}
                    onChange={(e) => setDecidedOn(e.target.value)}
                    className={fieldCls}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className={labelCls}>
                  Country <span className="text-ink-soft/70">(optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. India"
                  className={fieldCls}
                />
              </div>

              {error && (
                <p className="text-[13px] text-rose-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={submit.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-60"
              >
                {submit.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                )}
                Add my timeline
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
