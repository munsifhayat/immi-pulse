"use client";

import type { CommunityIdentity } from "@/lib/api/hooks/community";

/** The "you, anonymously" chip — avatar + handle for the current device. */
export function IdentityBadge({
  identity,
  className = "",
}: {
  identity?: CommunityIdentity;
  className?: string;
}) {
  if (!identity) return null;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-purple-light bg-purple/5 px-2.5 py-1 text-[12px] font-semibold text-purple-deep ${className}`}
      title="Your anonymous identity for this device"
    >
      <span
        className="grid h-[18px] w-[18px] place-items-center rounded-full text-[9px] font-bold text-white"
        style={{ backgroundColor: identity.color }}
      >
        {identity.initials}
      </span>
      {identity.handle}
    </span>
  );
}
