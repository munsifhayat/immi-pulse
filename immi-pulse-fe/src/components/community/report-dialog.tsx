"use client";

import { useState } from "react";
import { CheckCircle2, Flag, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useReportContent,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/api/hooks/community";

// s276-aware reasons. "Misleading or unlicensed advice" is the one that keeps
// this community on the right side of Australia's unregistered-advice law, so
// it gets first-class billing in the report flow.
const REASONS: { value: ReportReason; label: string; hint: string }[] = [
  {
    value: "misleading_advice",
    label: "Misleading or unlicensed advice",
    hint: "Someone advising on a specific application without being a registered agent",
  },
  {
    value: "spam",
    label: "Spam or advertising",
    hint: "Promotions, link drops, or repeated posting",
  },
  {
    value: "harassment",
    label: "Harassment or abuse",
    hint: "Targeting, threats, or hateful content",
  },
  {
    value: "other",
    label: "Something else",
    hint: "Tell us what feels wrong about this",
  },
];

export function ReportControl({
  targetType,
  targetId,
  label,
  className,
}: {
  targetType: ReportTargetType;
  targetId: string;
  /** Optional text shown next to the flag. Omit for an icon-only trigger. */
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("misleading_advice");
  const [detail, setDetail] = useState("");
  const [done, setDone] = useState(false);
  const report = useReportContent();

  const noun = targetType === "journey" ? "post" : "comment";

  async function submit() {
    if (report.isPending) return;
    await report.mutateAsync({
      target_type: targetType,
      target_id: targetId,
      reason,
      description: detail.trim() || undefined,
    });
    setDone(true);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset after the close animation so the panel does not flicker.
      window.setTimeout(() => {
        setDone(false);
        setDetail("");
        setReason("misleading_advice");
      }, 180);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          className ??
          "inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-text transition-colors hover:text-rose-500"
        }
        aria-label={`Report this ${noun}`}
      >
        <Flag className="h-3.5 w-3.5" />
        {label}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-md gap-0 rounded-2xl border-border p-0"
          onClick={(e) => e.stopPropagation()}
        >
          {done ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-teal/10">
                <CheckCircle2 className="h-6 w-6 text-teal" />
              </span>
              <DialogTitle className="font-heading text-[17px] font-semibold text-navy">
                Thanks for flagging this
              </DialogTitle>
              <DialogDescription className="max-w-[19rem] text-[13.5px] text-gray-text">
                A moderator will take a look. We review reports about advice on
                a real application first, so keep them coming when you see them.
              </DialogDescription>
              <button
                onClick={() => handleOpenChange(false)}
                className="mt-3 rounded-lg bg-navy px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy/90"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <DialogHeader className="space-y-1.5 border-b border-border px-6 pb-4 pt-6 text-left">
                <DialogTitle className="flex items-center gap-2 font-heading text-[17px] font-semibold text-navy">
                  <Flag className="h-4 w-4 text-rose-500" />
                  Report this {noun}
                </DialogTitle>
                <DialogDescription className="text-[13px] text-gray-text">
                  Reports are anonymous. Pick the closest reason so the team can
                  act quickly.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2.5 px-6 py-5">
                {REASONS.map((r) => {
                  const active = reason === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setReason(r.value)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                        active
                          ? "border-purple bg-purple/[0.04] ring-1 ring-purple/40"
                          : "border-border bg-white hover:border-purple-light"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                          active ? "border-purple" : "border-gray-300"
                        }`}
                      >
                        {active && (
                          <span className="h-2 w-2 rounded-full bg-purple" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-navy">
                          {r.label}
                        </span>
                        <span className="block text-[12px] leading-snug text-gray-text">
                          {r.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}

                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Add any context (optional)"
                  className="mt-1 w-full resize-y rounded-xl border border-border bg-white px-3 py-2.5 text-[13.5px] text-navy outline-none focus:border-purple/60 focus:ring-2 focus:ring-purple/15"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
                <button
                  onClick={() => handleOpenChange(false)}
                  className="rounded-lg px-4 py-2 text-[13px] font-semibold text-gray-text transition-colors hover:bg-gray-light"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={report.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
                >
                  {report.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Submit report
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
