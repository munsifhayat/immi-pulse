"use client";

import { useState } from "react";
import { Check, Loader2, Lock, ShieldAlert } from "lucide-react";
import {
  useMyComments,
  useMyPosts,
  usePublishJourney,
  type JourneyOut,
} from "@/lib/api/hooks/community";
import { timeAgo } from "@/lib/room/format";
import { FeedPost } from "./feed-post";
import { PostDetailDrawer } from "./post-detail-drawer";
import { RoomHeader } from "./room-shell";
import { SignedOutPanel } from "./signed-out-panel";
import { useRoom } from "./room-context";

type Tab = "posts" | "comments";

/**
 * A saved-but-unpublished timeline, and the one place it can be shared from.
 *
 * `/me/posts` deliberately includes drafts — this profile is the only surface
 * that ever sees them, which is why it is also the only surface that can offer
 * the publish action.
 */
function DraftPublishRow({ journey }: { journey: JourneyOut }) {
  const publish = usePublishJourney();
  const [done, setDone] = useState(false);

  // A post an automatic check has parked for review. Said plainly, because the
  // alternative is a post that looks live to its author and is invisible to
  // everyone else — which is how a member concludes the room is broken. It is
  // named as a check rather than a verdict, since that is what it is: a
  // moderator has not looked yet.
  if (journey.is_held) {
    return (
      <div className="border-b border-hair bg-paper-deep/50 px-5 py-3">
        <p className="flex items-start gap-2 text-[12.5px] font-medium text-ink">
          <ShieldAlert
            className="mt-px h-3.5 w-3.5 shrink-0 text-[#B4700F]"
            strokeWidth={1.75}
          />
          <span>
            Waiting on a moderator. Something in this post matched a check we run
            on everything, so it is not in the feed yet. You can still see it
            here.
          </span>
        </p>
      </div>
    );
  }

  if (journey.is_published) return null;

  return (
    <div className="border-b border-hair bg-paper-deep/50 px-5 py-3">
      {done ? (
        <p className="flex items-center gap-2 text-[12.5px] font-medium text-teal">
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
          Shared with the room — it counts toward the numbers now.
        </p>
      ) : (
        <>
          <p className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
            <Lock className="h-3.5 w-3.5 text-ink-soft" strokeWidth={1.75} />
            Only you can see this. It is not in the feed or in any published
            figure.
          </p>
          <button
            onClick={async () => {
              await publish.mutateAsync(journey.id);
              setDone(true);
            }}
            disabled={publish.isPending}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {publish.isPending && (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
            )}
            Share it with the room
          </button>
        </>
      )}
    </div>
  );
}

/** The "You" profile — Posts and Comments, the way Reddit does it. */
export function YouView() {
  const { account, accountLoading } = useRoom();
  const [tab, setTab] = useState<Tab>("posts");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: posts = [], isLoading: postsLoading } = useMyPosts(!!account);
  const { data: comments = [], isLoading: commentsLoading } = useMyComments(
    !!account
  );

  if (!account) {
    return (
      <SignedOutPanel
        title="Everything"
        accent="you've written"
        loading={accountLoading}
        body="Your questions, your timelines and every reply you've left, in one place — on any device you log in from. A handle takes fifteen seconds and asks for no name."
      />
    );
  }

  const loading = tab === "posts" ? postsLoading : commentsLoading;

  return (
    <>
      <RoomHeader
        title={account.handle}
        right={
          <span className="c-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
            {account.can_recover ? "Recoverable" : "No recovery"}
          </span>
        }
      >
        <div className="flex">
          {(
            [
              { id: "posts", label: `Posts (${posts.length})` },
              { id: "comments", label: `Comments (${comments.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex-1 py-3 text-center text-[13.5px] font-semibold transition-colors ${
                tab === t.id
                  ? "text-ink"
                  : "text-ink-soft hover:bg-black/[0.03] hover:text-ink"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 left-1/2 h-[3px] w-14 -translate-x-1/2 rounded-full bg-ink" />
              )}
            </button>
          ))}
        </div>
      </RoomHeader>

      {/*
        A member with no email cannot recover this account, and the one place
        that is worth repeating is the profile they will look at again.
      */}
      {!account.can_recover && (
        <p className="border-b border-hair bg-[#C77D18]/[0.05] px-5 py-2.5 text-[11.5px] leading-relaxed text-[#B4700F]">
          No email on file, so this account cannot be recovered. If you lose the
          password, {account.handle} and everything under it goes with it.
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          Loading…
        </div>
      ) : tab === "posts" ? (
        posts.length === 0 ? (
          <p className="px-6 py-20 text-center text-[13.5px] text-ink-soft">
            Nothing posted yet. Ask the room something, or share where your
            application has got to.
          </p>
        ) : (
          posts.map((j) => (
            <div key={j.id}>
              <DraftPublishRow journey={j} />
              <FeedPost journey={j} onOpen={setSelectedId} />
            </div>
          ))
        )
      ) : comments.length === 0 ? (
        <p className="px-6 py-20 text-center text-[13.5px] text-ink-soft">
          No replies yet. Someone a few months behind you is asking the question
          you already know the answer to.
        </p>
      ) : (
        comments.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.journey_id)}
            className="block w-full border-b border-hair px-5 py-4 text-left transition-colors hover:bg-black/[0.02]"
          >
            <div className="c-mono flex items-center gap-2 text-[10.5px] uppercase tracking-[0.1em] text-ink-soft">
              <span className="min-w-0 truncate">
                {c.journey_title ?? "a post in the room"}
              </span>
              <span className="shrink-0">· {timeAgo(c.created_at)}</span>
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
              {c.body}
            </p>
            <p className="c-mono mt-1.5 text-[11px] text-ink-soft">
              {c.upvotes} helpful
            </p>
          </button>
        ))
      )}

      <PostDetailDrawer
        journeyId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
