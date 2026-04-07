"use client";

import type { CommunitySpace } from "../_lib/types";

export function SpaceCard({ space }: { space: CommunitySpace }) {
  const Icon = space.icon;

  return (
    <div className="rounded-2xl border border-border bg-white p-7 transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple/10">
        <Icon className="h-5 w-5 text-purple" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-heading text-[17px] font-semibold text-navy">
        {space.name}
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-gray-text line-clamp-2">
        {space.description}
      </p>
      <div className="mt-4 flex items-center gap-3 text-[12px] text-gray-text/70">
        <span>{space.memberCount.toLocaleString()} members</span>
        <span className="text-border">&bull;</span>
        <span>{space.threadCount.toLocaleString()} threads</span>
        <span className="text-border">&bull;</span>
        <span className="text-teal">{space.latestActivity}</span>
      </div>
    </div>
  );
}
