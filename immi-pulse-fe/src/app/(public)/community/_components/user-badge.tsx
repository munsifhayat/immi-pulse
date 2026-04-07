"use client";

import { Shield, CheckCircle2, User } from "lucide-react";
import type { UserBadgeType } from "../_lib/types";

const badgeConfig: Record<
  UserBadgeType,
  { label: string; className: string; icon: typeof Shield }
> = {
  "omara-agent": {
    label: "OMARA Agent",
    className: "bg-purple/10 text-purple border-purple/20",
    icon: Shield,
  },
  "visa-holder": {
    label: "Visa Holder",
    className: "bg-teal/10 text-teal border-teal/20",
    icon: CheckCircle2,
  },
  applicant: {
    label: "Applicant",
    className: "bg-gray-light text-gray-text border-border",
    icon: User,
  },
};

export function UserBadge({ type }: { type: UserBadgeType }) {
  const config = badgeConfig[type];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}
