"use client";

import { useState } from "react";
import { Heart, Reply, Send } from "lucide-react";
import {
  usePostJourneyComment,
  useToggleCommentVote,
  type JourneyMessage,
  type JourneyReply,
} from "@/lib/api/hooks/community";
import { timeAgo } from "@/lib/community/format";
import { ReportControl } from "./report-dialog";
import { useCommunity } from "./community-context";

function Avatar({
  color,
  initials,
  size = 32,
}: {
  color: string;
  initials: string;
  size?: number;
}) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
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

function OpTag() {
  return (
    <span className="c-mono rounded bg-purple/10 px-1.5 text-[9px] uppercase text-purple-deep">
      OP
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
          <span className="text-[12.5px] font-semibold text-ink">
            {reply.handle}
          </span>
          <span className="c-mono text-[10.5px] text-ink-soft">
            · {timeAgo(reply.created_at)}
          </span>
          {reply.is_op && <OpTag />}
        </div>
        <p className="mt-0.5 text-[13px] leading-snug text-ink">{reply.body}</p>
        <div className="mt-1.5 flex items-center gap-3.5">
          <button
            onClick={() => !vote.isPending && vote.mutate(reply.id)}
            className={`inline-flex items-center gap-1 text-[11.5px] font-semibold ${
              reply.viewer_voted ? "text-rose-500" : "text-ink-soft hover:text-purple"
            }`}
          >
            <Heart
              className="h-3 w-3"
              strokeWidth={1.75}
              fill={reply.viewer_voted ? "currentColor" : "none"}
            />
            <span className="c-mono">{reply.upvotes}</span>
          </button>
          <ReportControl
            targetType="journey_comment"
            targetId={reply.id}
            className="inline-flex items-center text-[11.5px] font-semibold text-ink-soft transition-colors hover:text-rose-500"
          />
        </div>
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
  const { canWrite } = useCommunity();

  async function sendReply() {
    const body = draft.trim();
    if (!body || post.isPending || !canWrite("reply")) return;
    await post.mutateAsync({ body, parent_comment_id: message.id });
    setDraft("");
    setReplyOpen(false);
  }

  return (
    <div className="border-t border-hair py-4">
      <div className="flex gap-3">
        <Avatar color={message.color} initials={message.initials} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-semibold text-ink">
              {message.handle}
            </span>
            <span className="c-mono text-[10.5px] text-ink-soft">
              · {timeAgo(message.created_at)}
            </span>
            {message.is_op && <OpTag />}
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink">
            {message.body}
          </p>
          <div className="mt-1.5 flex gap-4">
            <button
              onClick={() => !vote.isPending && vote.mutate(message.id)}
              className={`inline-flex items-center gap-1 text-[12px] font-semibold ${
                message.viewer_voted ? "text-rose-500" : "text-ink-soft hover:text-purple"
              }`}
            >
              <Heart
                className="h-3.5 w-3.5"
                strokeWidth={1.75}
                fill={message.viewer_voted ? "currentColor" : "none"}
              />
              <span className="c-mono">{message.upvotes}</span>
            </button>
            {/* One level of nesting and no more — a reply to a reply is where
                a phone-sized thread stops being readable. */}
            <button
              onClick={() => canWrite("reply") && setReplyOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-soft hover:text-purple"
            >
              <Reply className="h-3.5 w-3.5" strokeWidth={1.75} /> Reply
            </button>
            <ReportControl
              targetType="journey_comment"
              targetId={message.id}
              className="inline-flex items-center text-[12px] font-semibold text-ink-soft transition-colors hover:text-rose-500"
            />
          </div>
        </div>
      </div>

      {message.replies.length > 0 && (
        <div className="ml-[42px] mt-3 flex flex-col gap-3 border-l border-hair pl-3.5">
          {message.replies.map((r) => (
            <ReplyRow key={r.id} reply={r} journeyId={journeyId} />
          ))}
        </div>
      )}

      {replyOpen && (
        <div className="ml-[42px] mt-2.5 flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Reply to ${message.handle}…`}
            rows={2}
            className="min-h-[40px] flex-1 resize-y rounded-xl border border-hair bg-white px-3 py-2 text-[13px] text-ink outline-none transition-all focus:border-purple/50 focus:ring-4 focus:ring-purple/10"
          />
          <button
            onClick={sendReply}
            disabled={post.isPending || !draft.trim()}
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl bg-ink text-white disabled:opacity-40"
            aria-label="Send reply"
          >
            <Send className="h-4 w-4" strokeWidth={1.75} />
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
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <span className="c-eyebrow">Conversation</span>
        <span className="c-mono text-[11px] text-ink-soft">
          {total} {total === 1 ? "message" : "messages"}
        </span>
      </div>
      {messages.length === 0 ? (
        <p className="mt-3 border-t border-hair py-8 text-center text-[13px] text-ink-soft">
          No replies yet — be the first to respond.
        </p>
      ) : (
        <div className="mt-1">
          {messages.map((m) => (
            <MessageBlock key={m.id} message={m} journeyId={journeyId} />
          ))}
        </div>
      )}
    </div>
  );
}
