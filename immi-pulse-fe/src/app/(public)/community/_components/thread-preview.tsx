"use client";

import { ArrowBigUp, MessageCircle, Eye, CheckCircle2, Pin } from "lucide-react";
import { UserBadge } from "./user-badge";
import type { ThreadPreview as ThreadPreviewType } from "../_lib/types";

export function ThreadPreview({ thread }: { thread: ThreadPreviewType }) {
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-white p-5 transition-all duration-200 hover:border-purple/10 hover:bg-purple/[0.01]">
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
          {thread.isPinned && (
            <Pin className="mt-1 h-3.5 w-3.5 shrink-0 text-purple" aria-label="Pinned" />
          )}
          <h3 className="font-heading text-[15px] font-semibold leading-snug text-navy">
            {thread.title}
          </h3>
        </div>

        <p className="mt-1.5 text-[13px] leading-relaxed text-gray-text line-clamp-2">
          {thread.excerpt}
        </p>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {thread.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-gray-light/50 px-2.5 py-0.5 text-[11px] font-medium text-gray-text"
            >
              {tag}
            </span>
          ))}
          {thread.hasBestAnswer && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2.5 py-0.5 text-[11px] font-semibold text-teal">
              <CheckCircle2 className="h-3 w-3" />
              Best Answer
            </span>
          )}
        </div>

        {/* Author + Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-gray-text/70">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple/10 text-[9px] font-semibold text-purple">
              {thread.author.initials}
            </div>
            <span className="font-medium text-navy">
              {thread.author.name}
            </span>
            <UserBadge type={thread.author.badge} />
          </div>
          <span>{thread.createdAt}</span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {thread.replyCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {thread.views}
          </span>
          {/* Mobile vote count */}
          <span className="inline-flex items-center gap-1 sm:hidden">
            <ArrowBigUp className="h-3 w-3 text-purple" />
            {thread.upvotes}
          </span>
        </div>
      </div>
    </div>
  );
}
