"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUp,
  Flag,
  Loader2,
  MessageCircle,
} from "lucide-react";
import {
  useCommunityThread,
  useCreateComment,
  useReportTarget,
  useUpvoteComment,
  useUpvoteThread,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/api/hooks/community";
import { fadeUp } from "@/lib/motion";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "misleading_advice", label: "Misleading advice" },
  { value: "other", label: "Other" },
];

export default function CommunityThreadPage() {
  const params = useParams<{ id: string }>();
  const threadId = params?.id;

  const threadQuery = useCommunityThread(threadId);
  const upvoteThread = useUpvoteThread();
  const upvoteComment = useUpvoteComment(threadId ?? "");
  const createComment = useCreateComment(threadId ?? "");
  const reportMutation = useReportTarget();

  const [commentBody, setCommentBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  const [reportTarget, setReportTarget] = useState<
    { type: ReportTargetType; id: string } | null
  >(null);
  const [reportReason, setReportReason] = useState<ReportReason>("spam");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSent, setReportSent] = useState(false);

  if (threadQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center py-32 text-gray-text">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading thread…
      </div>
    );
  }

  if (threadQuery.isError || !threadQuery.data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center text-gray-text">
        Thread not found.
      </div>
    );
  }

  const thread = threadQuery.data;

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    if (!commentBody.trim()) return;
    if (!isAnonymous && !displayName.trim()) {
      setCommentError("Enter a display name or post anonymously.");
      return;
    }
    try {
      await createComment.mutateAsync({
        body: commentBody.trim(),
        is_anonymous: isAnonymous,
        author_display_name: isAnonymous ? undefined : displayName.trim(),
      });
      setCommentBody("");
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.detail ?? "Comment failed.";
      setCommentError(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  const handleReport = async () => {
    if (!reportTarget) return;
    try {
      await reportMutation.mutateAsync({
        target_type: reportTarget.type,
        target_id: reportTarget.id,
        reason: reportReason,
        description: reportDescription || undefined,
      });
      setReportSent(true);
      setTimeout(() => {
        setReportTarget(null);
        setReportSent(false);
        setReportDescription("");
        setReportReason("spam");
      }, 1500);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.detail ?? "Report failed.";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-3xl px-6 py-16"
    >
      <Link
        href={thread.space_slug ? `/community/${thread.space_slug}` : "/community"}
        className="inline-flex items-center gap-1.5 text-sm text-purple hover:text-purple-deep"
      >
        <ArrowLeft className="h-4 w-4" /> Back to{" "}
        {thread.space_name ?? "community"}
      </Link>

      {/* Thread card */}
      <div className="mt-6 rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <button
            onClick={() => threadId && upvoteThread.mutate(threadId)}
            className="flex flex-col items-center gap-0.5 rounded-lg bg-gray-light px-3 py-2 text-[11px] text-gray-text transition-colors hover:bg-purple/10 hover:text-purple"
          >
            <ArrowUp className="h-4 w-4" />
            <span className="font-semibold text-navy">{thread.upvotes}</span>
          </button>
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-navy">
              {thread.title}
            </h1>
            <p className="mt-1 text-[11px] text-gray-text">
              by {thread.is_anonymous ? "Anonymous" : thread.author_display_name}{" "}
              · {formatRelative(thread.created_at)} · {thread.view_count} views
            </p>
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">
              {thread.body}
            </p>
            <div className="mt-4 flex items-center gap-3 text-[11px] text-gray-text">
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {thread.reply_count} replies
              </span>
              <button
                onClick={() =>
                  setReportTarget({ type: "thread", id: thread.id })
                }
                className="flex items-center gap-1 hover:text-red-600"
              >
                <Flag className="h-3 w-3" />
                Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comment form */}
      <form
        onSubmit={handleComment}
        className="mt-6 rounded-3xl border border-border bg-white p-6 shadow-sm space-y-4"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-purple">
          Add a comment
        </h2>
        <textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Share your thoughts, ask a follow-up…"
          className="w-full resize-y rounded-lg border border-border bg-gray-light px-3 py-2 text-[14px] text-navy outline-none focus:border-purple"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-gray-text">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            Post anonymously
          </label>
          {!isAnonymous && (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              maxLength={60}
              className="h-8 w-48 rounded border border-border bg-white px-2 text-[12px] outline-none focus:border-purple"
            />
          )}
        </div>
        {commentError && (
          <p className="text-[12px] font-medium text-red-600">{commentError}</p>
        )}
        <button
          type="submit"
          disabled={createComment.isPending || !commentBody.trim()}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-5 py-2 text-[13px] font-medium text-white hover:border-purple-deep hover:bg-purple-deep disabled:opacity-60"
        >
          {createComment.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          Post comment
        </button>
      </form>

      {/* Comments */}
      <div className="mt-6 space-y-3">
        {thread.comments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-sm text-gray-text">
            No comments yet — be the first to reply.
          </p>
        ) : (
          thread.comments.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-border bg-white p-4"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => upvoteComment.mutate(c.id)}
                  className="flex flex-col items-center gap-0.5 rounded-lg bg-gray-light px-2.5 py-1.5 text-[11px] text-gray-text hover:bg-purple/10 hover:text-purple"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span className="font-semibold text-navy">{c.upvotes}</span>
                </button>
                <div className="flex-1">
                  <p className="text-[11px] text-gray-text">
                    by{" "}
                    {c.is_anonymous ? "Anonymous" : c.author_display_name}{" "}
                    · {formatRelative(c.created_at)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[14px] text-navy">
                    {c.body}
                  </p>
                  <button
                    onClick={() =>
                      setReportTarget({ type: "comment", id: c.id })
                    }
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-text hover:text-red-600"
                  >
                    <Flag className="h-3 w-3" /> Report
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Report modal (simple overlay) */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-navy">
              Report this {reportTarget.type}
            </h3>
            {reportSent ? (
              <p className="mt-4 text-sm text-emerald-700">
                Report submitted. Thanks for helping keep the community clean.
              </p>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  <label className="block text-[12px] font-medium text-gray-text">
                    Reason
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) =>
                      setReportReason(e.target.value as ReportReason)
                    }
                    className="h-9 w-full rounded border border-border bg-white px-2 text-[13px] outline-none focus:border-purple"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <label className="block text-[12px] font-medium text-gray-text">
                    More detail (optional)
                  </label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="w-full resize-y rounded border border-border bg-white px-2 py-1.5 text-[13px] outline-none focus:border-purple"
                  />
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={() => setReportTarget(null)}
                    className="rounded border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-navy hover:bg-gray-light"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={reportMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded border-2 border-red-600 bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white hover:border-red-700 hover:bg-red-700 disabled:opacity-60"
                  >
                    {reportMutation.isPending && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    Submit report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
