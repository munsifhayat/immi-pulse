"use client";

import { useState } from "react";
import { Heart, Reply, Send } from "lucide-react";
import {
  usePostJourneyComment,
  useToggleCommentVote,
  type JourneyMessage,
  type JourneyReply,
} from "@/lib/api/hooks/community";
import { timeAgo } from "../_lib/format";

function Avatar({
  color,
  initials,
  size = 34,
}: {
  color: string;
  initials: string;
  size?: number;
}) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        fontSize: size <= 28 ? 10 : 11,
      }}
    >
      {initials}
    </span>
  );
}

function ReplyRow({
  reply,
  journeyId,
}: {
  reply: JourneyReply;
  journeyId: string;
}) {
  const vote = useToggleCommentVote(journeyId);
  return (
    <div className="flex gap-2.5">
      <Avatar color={reply.color} initials={reply.initials} size={28} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] font-bold text-navy">{reply.handle}</span>
          <span className="text-[11px] text-gray-text">· {timeAgo(reply.created_at)}</span>
          {reply.is_op && (
            <span className="rounded bg-purple/10 px-1.5 text-[9.5px] font-bold uppercase text-purple-deep">
              OP
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[13px] leading-snug text-navy">{reply.body}</p>
        <button
          onClick={() => !vote.isPending && vote.mutate(reply.id)}
          className={`mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold ${
            reply.viewer_voted ? "text-rose-500" : "text-gray-text hover:text-purple"
          }`}
        >
          <Heart className="h-3 w-3" fill={reply.viewer_voted ? "currentColor" : "none"} />
          {reply.upvotes}
        </button>
      </div>
    </div>
  );
}

function MessageBlock({
  message,
  journeyId,
}: {
  message: JourneyMessage;
  journeyId: string;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const vote = useToggleCommentVote(journeyId);
  const post = usePostJourneyComment(journeyId);

  async function sendReply() {
    const body = draft.trim();
    if (!body || post.isPending) return;
    await post.mutateAsync({ body, parent_comment_id: message.id });
    setDraft("");
    setReplyOpen(false);
  }

  return (
    <div className="border-t border-gray-light py-4">
      <div className="flex gap-3">
        <Avatar color={message.color} initials={message.initials} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-bold text-navy">{message.handle}</span>
            <span className="text-[11px] text-gray-text">· {timeAgo(message.created_at)}</span>
            {message.is_op && (
              <span className="rounded bg-purple/10 px-1.5 text-[9.5px] font-bold uppercase text-purple-deep">
                OP
              </span>
            )}
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-navy">{message.body}</p>
          <div className="mt-1.5 flex gap-4">
            <button
              onClick={() => !vote.isPending && vote.mutate(message.id)}
              className={`inline-flex items-center gap-1 text-[12px] font-semibold ${
                message.viewer_voted ? "text-rose-500" : "text-gray-text hover:text-purple"
              }`}
            >
              <Heart className="h-3.5 w-3.5" fill={message.viewer_voted ? "currentColor" : "none"} />
              {message.upvotes}
            </button>
            <button
              onClick={() => setReplyOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-text hover:text-purple"
            >
              <Reply className="h-3.5 w-3.5" /> Reply
            </button>
          </div>
        </div>
      </div>

      {message.replies.length > 0 && (
        <div className="ml-[45px] mt-2 flex flex-col gap-3 border-l-2 border-gray-light pl-3.5">
          {message.replies.map((r) => (
            <ReplyRow key={r.id} reply={r} journeyId={journeyId} />
          ))}
        </div>
      )}

      {replyOpen && (
        <div className="ml-[45px] mt-2.5 flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Reply to ${message.handle}…`}
            rows={2}
            className="min-h-[40px] flex-1 resize-y rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-navy outline-none focus:border-purple/60 focus:ring-2 focus:ring-purple/15"
          />
          <button
            onClick={sendReply}
            disabled={post.isPending || !draft.trim()}
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg bg-purple text-white disabled:opacity-50"
            aria-label="Send reply"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function Conversation({
  journeyId,
  messages,
}: {
  journeyId: string;
  messages: JourneyMessage[];
}) {
  const total =
    messages.length + messages.reduce((n, m) => n + m.replies.length, 0);

  return (
    <div>
      <div className="mt-5 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-gray-text">
        Conversation
        <span className="ml-auto text-[11.5px] font-medium normal-case tracking-normal text-gray-text">
          {total} {total === 1 ? "message" : "messages"}
        </span>
      </div>
      {messages.length === 0 ? (
        <p className="border-t border-gray-light py-6 text-center text-[13px] text-gray-text">
          No replies yet — be the first to respond.
        </p>
      ) : (
        messages.map((m) => (
          <MessageBlock key={m.id} message={m} journeyId={journeyId} />
        ))
      )}
    </div>
  );
}
