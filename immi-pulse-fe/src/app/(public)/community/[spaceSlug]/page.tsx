"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUp,
  Loader2,
  MessageCircle,
  Plus,
  Eye,
} from "lucide-react";
import {
  useCommunitySpace,
  useSpaceThreads,
  type ThreadSort,
} from "@/lib/api/hooks/community";
import { fadeUp, stagger } from "@/lib/motion";

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

export default function CommunitySpacePage() {
  const params = useParams<{ spaceSlug: string }>();
  const slug = params?.spaceSlug;
  const [sort, setSort] = useState<ThreadSort>("new");

  const spaceQuery = useCommunitySpace(slug);
  const threadsQuery = useSpaceThreads(slug, sort);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-4xl px-6 py-16"
    >
      <motion.div variants={fadeUp} custom={0}>
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-purple hover:text-purple-deep"
        >
          <ArrowLeft className="h-4 w-4" /> All communities
        </Link>
      </motion.div>

      <motion.div
        variants={fadeUp}
        custom={1}
        className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <h1 className="font-heading text-4xl font-normal tracking-tight text-navy">
            {spaceQuery.data?.name ?? (spaceQuery.isLoading ? "Loading…" : "Space")}
          </h1>
          {spaceQuery.data?.description && (
            <p className="mt-2 max-w-2xl text-[17px] leading-relaxed text-gray-text">
              {spaceQuery.data.description}
            </p>
          )}
        </div>
        <Link
          href={`/community/${slug}/new`}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border-2 border-purple bg-purple px-5 py-2.5 text-[14px] font-medium text-white shadow-lg shadow-purple/20 hover:border-purple-deep hover:bg-purple-deep"
        >
          <Plus className="h-4 w-4" />
          Start a thread
        </Link>
      </motion.div>

      <motion.div variants={fadeUp} custom={2} className="mt-8 flex items-center gap-1 rounded-lg border border-border bg-white p-1 w-fit">
        {(["new", "top", "trending"] as ThreadSort[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={
              sort === s
                ? "rounded-md bg-purple px-4 py-1.5 text-[12px] font-medium text-white capitalize"
                : "rounded-md px-4 py-1.5 text-[12px] font-medium text-gray-text hover:text-navy capitalize"
            }
          >
            {s}
          </button>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} custom={3} className="mt-6 space-y-3">
        {threadsQuery.isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-white p-10 text-gray-text">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading threads…
          </div>
        ) : threadsQuery.isError ? (
          <div className="rounded-2xl border border-border bg-white p-10 text-center text-gray-text">
            Couldn&apos;t load threads. Is the backend running?
          </div>
        ) : (threadsQuery.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-gray-text/40" />
            <p className="mt-3 text-sm font-medium text-navy">
              No threads yet — be the first to start a discussion.
            </p>
            <Link
              href={`/community/${slug}/new`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-purple hover:text-purple-deep"
            >
              <Plus className="h-4 w-4" /> Start a thread
            </Link>
          </div>
        ) : (
          (threadsQuery.data ?? []).map((thread) => (
            <Link
              key={thread.id}
              href={`/community/thread/${thread.id}`}
              className="block rounded-2xl border border-border bg-white p-5 transition-all hover:border-purple/30 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-0.5 rounded-lg bg-gray-light px-3 py-2 text-[11px] text-gray-text">
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span className="font-semibold text-navy">{thread.upvotes}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-navy group-hover:text-purple">
                    {thread.is_pinned && (
                      <span className="mr-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                        Pinned
                      </span>
                    )}
                    {thread.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[13px] text-gray-text">
                    {thread.body}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-text">
                    <span>
                      by {thread.is_anonymous ? "Anonymous" : thread.author_display_name}
                    </span>
                    <span>· {formatRelative(thread.created_at)}</span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {thread.reply_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {thread.view_count}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}
