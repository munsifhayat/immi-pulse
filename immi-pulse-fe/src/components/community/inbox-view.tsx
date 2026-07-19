"use client";

import { useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useInbox, useMarkInboxRead } from "@/lib/api/hooks/community";
import { timeAgo } from "@/lib/community/format";
import { PostDetailDrawer } from "./post-detail-drawer";
import { CommunityHeader } from "./community-shell";
import { SignedOutPanel } from "./signed-out-panel";
import { useCommunity } from "./community-context";

/**
 * The Inbox.
 *
 * The primary notification channel, not email — which is exactly what makes
 * optional email workable: you always have somewhere to find your replies.
 */
export function InboxView() {
  const { account, accountLoading } = useCommunity();
  const { data, isLoading } = useInbox(!!account);
  const markRead = useMarkInboxRead();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!account) {
    return (
      <SignedOutPanel
        title="Your"
        accent="inbox"
        loading={accountLoading}
        body="When someone answers your question or replies to your comment, it lands here. That is why a handle is worth the fifteen seconds — otherwise you post into a void you can never find again."
      />
    );
  }

  const items = data?.items ?? [];
  const unread = data?.unread_count ?? 0;

  return (
    <>
      <CommunityHeader
        title="Your"
        accent="inbox"
        right={
          unread > 0 ? (
            <button
              onClick={() => markRead.mutate(undefined)}
              disabled={markRead.isPending}
              className="c-mono inline-flex items-center gap-1.5 rounded-full border border-hair bg-white px-3 py-1.5 text-[10.5px] uppercase tracking-[0.07em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
            >
              <CheckCheck className="h-3 w-3" strokeWidth={2} />
              Mark all read
            </button>
          ) : null
        }
      >
        <p className="c-mono px-5 pb-2.5 text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">
          {unread > 0 ? `${unread} unread` : "All caught up"}
        </p>
      </CommunityHeader>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <Bell className="mx-auto h-8 w-8 text-ink-soft/35" strokeWidth={1.5} />
          <p className="mt-3 text-[14px] font-medium text-ink">
            Nothing here yet.
          </p>
          <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-soft">
            Replies to your posts and your comments will show up here — and only
            here, unless you asked for email as well.
          </p>
        </div>
      ) : (
        items.map((n) => {
          const isUnread = !n.read_at;
          return (
            <button
              key={n.id}
              onClick={() => {
                setSelectedId(n.journey_id);
                if (isUnread) markRead.mutate([n.id]);
              }}
              className={`flex w-full gap-3 border-b border-hair px-5 py-4 text-left transition-colors hover:bg-black/[0.02] ${
                isUnread ? "bg-purple/[0.035]" : ""
              }`}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold text-white"
                style={{ backgroundColor: n.actor_color }}
              >
                {n.actor_initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="text-[13.5px] font-semibold text-ink">
                    {n.actor_handle}
                  </span>
                  <span className="text-[13px] text-ink-soft">
                    {n.type === "reply_to_post"
                      ? "answered your post"
                      : "replied to your comment"}
                  </span>
                  <span className="c-mono text-[10.5px] text-ink-soft">
                    · {timeAgo(n.created_at)}
                  </span>
                  {isUnread && (
                    <span className="h-1.5 w-1.5 rounded-full bg-purple" />
                  )}
                </div>
                {n.context_title && (
                  <p className="c-mono mt-0.5 truncate text-[10.5px] uppercase tracking-[0.1em] text-ink-soft/80">
                    {n.context_title}
                  </p>
                )}
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">
                  {n.preview}
                </p>
              </div>
            </button>
          );
        })
      )}

      <PostDetailDrawer
        journeyId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
