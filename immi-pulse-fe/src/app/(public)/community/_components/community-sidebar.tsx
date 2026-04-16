"use client";

import Link from "next/link";
import { MessageSquare, MessagesSquare, LayoutGrid } from "lucide-react";
import {
  useCommunityStats,
  useCommunitySpaces,
  type CommunitySpaceOut,
} from "@/lib/api/hooks/community";

function StatCard({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-lg bg-gray-light/50 p-3 text-center">
      <p className="font-heading text-lg font-semibold text-purple">{value}</p>
      <p className="text-[11px] text-gray-text">{label}</p>
    </div>
  );
}

export function CommunitySidebar() {
  const statsQuery = useCommunityStats();
  const spacesQuery = useCommunitySpaces();

  const stats = statsQuery.data;
  const spaces = spacesQuery.data ?? [];

  // Sort spaces by thread_count desc, take top 5
  const activeSpaces = [...spaces]
    .sort((a, b) => b.thread_count - a.thread_count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Community Stats */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <h3 className="font-heading text-[15px] font-semibold text-navy">
          Community Stats
        </h3>
        {stats ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard value={stats.total_spaces} label="Spaces" />
            <StatCard value={stats.total_threads} label="Threads" />
            <StatCard value={stats.total_comments} label="Comments" />
            <StatCard
              value={
                stats.total_threads > 0
                  ? Math.round(
                      (stats.total_comments / stats.total_threads) * 10
                    ) / 10
                  : 0
              }
              label="Avg Replies"
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-gray-light/50"
              />
            ))}
          </div>
        )}
      </div>

      {/* Most Active Spaces */}
      {activeSpaces.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-6">
          <h3 className="font-heading text-[15px] font-semibold text-navy">
            Most Active Spaces
          </h3>
          <div className="mt-4 space-y-3">
            {activeSpaces.map((space: CommunitySpaceOut) => (
              <Link
                key={space.id}
                href={`/community/${space.slug}`}
                className="flex items-center justify-between gap-2 group"
              >
                <span className="text-[13px] text-gray-text group-hover:text-purple line-clamp-1 transition-colors">
                  {space.name}
                </span>
                <span className="shrink-0 text-[12px] font-medium text-navy">
                  {space.thread_count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Info */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <h3 className="font-heading text-[15px] font-semibold text-navy">
          How It Works
        </h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <LayoutGrid className="mt-0.5 h-4 w-4 shrink-0 text-purple" />
            <p className="text-[13px] text-gray-text">
              Pick a visa space that matches your journey
            </p>
          </div>
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-purple" />
            <p className="text-[13px] text-gray-text">
              Start a thread or join a discussion — no sign-in needed
            </p>
          </div>
          <div className="flex items-start gap-3">
            <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-purple" />
            <p className="text-[13px] text-gray-text">
              Post anonymously or with a display name — your choice
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
