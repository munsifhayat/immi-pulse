"use client";

import { TrendingUp, Minus } from "lucide-react";
import { UserBadge } from "./user-badge";
import {
  trendingTopics,
  topContributors,
  communityStats,
} from "../_lib/mock-data";

export function TrendingSidebar() {
  return (
    <div className="space-y-6">
      {/* Trending Topics */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <h3 className="font-heading text-[15px] font-semibold text-navy">
          Trending Topics
        </h3>
        <div className="mt-4 space-y-3">
          {trendingTopics.map((topic) => (
            <div
              key={topic.label}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-[13px] text-gray-text line-clamp-1">
                {topic.label}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-[12px] font-medium text-navy">
                  {topic.postCount}
                </span>
                {topic.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-teal" />
                ) : (
                  <Minus className="h-3 w-3 text-gray-text/40" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Community Stats */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <h3 className="font-heading text-[15px] font-semibold text-navy">
          Community Stats
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-gray-light/50 p-3 text-center">
            <p className="font-heading text-lg font-semibold text-purple">
              {(communityStats.totalMembers / 1000).toFixed(1)}k
            </p>
            <p className="text-[11px] text-gray-text">Members</p>
          </div>
          <div className="rounded-lg bg-gray-light/50 p-3 text-center">
            <p className="font-heading text-lg font-semibold text-teal">
              {communityStats.answeredPercentage}%
            </p>
            <p className="text-[11px] text-gray-text">Answered</p>
          </div>
          <div className="rounded-lg bg-gray-light/50 p-3 text-center">
            <p className="font-heading text-lg font-semibold text-navy">
              {(communityStats.totalThreads / 1000).toFixed(1)}k
            </p>
            <p className="text-[11px] text-gray-text">Threads</p>
          </div>
          <div className="rounded-lg bg-gray-light/50 p-3 text-center">
            <p className="font-heading text-lg font-semibold text-purple">
              {communityStats.verifiedAgents}
            </p>
            <p className="text-[11px] text-gray-text">Verified Agents</p>
          </div>
        </div>
      </div>

      {/* Top Contributors */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <h3 className="font-heading text-[15px] font-semibold text-navy">
          Top Contributors
        </h3>
        <div className="mt-4 space-y-3">
          {topContributors.map((contributor) => (
            <div
              key={contributor.name}
              className="flex items-center gap-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple/10 text-[11px] font-semibold text-purple">
                {contributor.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-navy truncate">
                    {contributor.name}
                  </span>
                  <UserBadge type={contributor.badge} />
                </div>
                <p className="text-[11px] text-gray-text/60">
                  {contributor.posts} posts
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
