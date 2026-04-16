"use client";

import Link from "next/link";
import { ArrowBigUp, MessageCircle, Eye, Pin } from "lucide-react";
import type { ThreadOut } from "@/lib/api/hooks/community";

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

export function ThreadPreview({ thread }: { thread: ThreadOut }) {
  return (
    <Link
      href={`/community/thread/${thread.id}`}
      className="flex gap-4 rounded-xl border border-border bg-white p-5 transition-all duration-200 hover:border-purple/10 hover:bg-purple/[0.01]"
    >
      {/* Vote count */}
      <div className="hidden flex-col items-center gap-0.5 sm:flex">
        <div className="flex flex-col items-center rounded-lg border border-border bg-gray-light/50 px-2.5 py-2">
          <ArrowBigUp className="h-4 w-4 text-purple" aria-hidden="true" />
          <span className="text-[13px] font-semibold text-navy">
            {thread.upvotes}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {thread.is_pinned && (
            <Pin
              className="mt-1 h-3.5 w-3.5 shrink-0 text-purple"
              aria-label="Pinned"
            />
          )}
          <h3 className="font-heading text-[15px] font-semibold leading-snug text-navy">
            {thread.title}
          </h3>
        </div>

        <p className="mt-1.5 text-[13px] leading-relaxed text-gray-text line-clamp-2">
          {thread.body}
        </p>

        {/* Author + Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-gray-text/70">
          <span className="font-medium text-navy">
            {thread.is_anonymous ? "Anonymous" : thread.author_display_name}
          </span>
          {thread.space_name && (
            <>
              <span className="text-border">in</span>
              <span className="font-medium text-purple/80">
                {thread.space_name}
              </span>
            </>
          )}
          <span>{formatRelative(thread.created_at)}</span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {thread.reply_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {thread.view_count}
          </span>
          {/* Mobile vote count */}
          <span className="inline-flex items-center gap-1 sm:hidden">
            <ArrowBigUp className="h-3 w-3 text-purple" />
            {thread.upvotes}
          </span>
        </div>
      </div>
    </Link>
  );
}
