"use client";

import Link from "next/link";
import { Bell, Bookmark, GitCommitHorizontal, LogIn, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FEATURES = [
  { Icon: GitCommitHorizontal, text: "Share & edit multiple timelines" },
  { Icon: Bell, text: "Get notified when someone replies to you" },
  { Icon: Bookmark, text: "Save visas and follow your cohort's progress" },
];

export function LoginGate({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-purple to-purple-deep text-white">
            <Sparkles className="h-7 w-7" />
          </span>
          <DialogTitle className="mt-3 font-heading text-xl font-semibold text-navy">
            Create a free account to do more
          </DialogTitle>
          <DialogDescription className="mx-auto max-w-xs text-[13.5px] text-gray-text">
            You&apos;ve used your one anonymous timeline. Sign in to keep going —
            it stays free, and your shared journey comes with you.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto mt-1 flex w-full max-w-xs flex-col gap-2.5">
          {FEATURES.map(({ Icon, text }) => (
            <div key={text} className="flex items-start gap-2.5 text-[13px] text-navy">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              {text}
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2.5">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-white px-4 py-2.5 text-[13.5px] font-semibold text-gray-text transition-colors hover:bg-gray-light"
          >
            Maybe later
          </button>
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 rounded-lg bg-purple px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-lg shadow-purple/25 transition-colors hover:bg-purple-deep"
          >
            <LogIn className="h-4 w-4" />
            Create my account
          </Link>
        </div>
        <p className="mt-1 text-center text-[12px] text-gray-text">
          Already have one?{" "}
          <Link href="/login" className="font-semibold text-purple hover:underline">
            Sign in
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
