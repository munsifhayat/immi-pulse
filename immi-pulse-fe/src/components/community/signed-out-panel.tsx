"use client";

import { Loader2 } from "lucide-react";
import { CommunityHeader } from "./community-shell";
import { useCommunity } from "./community-context";

/**
 * What a visitor sees where a member would see their own things.
 *
 * Deliberately not a 404 and not a redirect: the point of the page is to
 * explain what an account is *for*, and someone who clicked "Inbox" has already
 * told us they are interested.
 */
export function SignedOutPanel({
  title,
  accent,
  body,
  loading = false,
}: {
  title: string;
  accent: string;
  body: string;
  loading?: boolean;
}) {
  const { openAccount } = useCommunity();

  return (
    <>
      <CommunityHeader title={title} accent={accent} />
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          Checking…
        </div>
      ) : (
        <div className="px-6 py-16 text-center">
          <p className="mx-auto max-w-sm text-[14px] leading-relaxed text-ink-soft">
            {body}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => openAccount("signup")}
              className="rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper transition-opacity hover:opacity-90"
            >
              Get a handle
            </button>
            <button
              onClick={() => openAccount("login")}
              className="rounded-full border border-hair bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink transition-colors hover:border-ink"
            >
              I already have one
            </button>
          </div>
        </div>
      )}
    </>
  );
}
