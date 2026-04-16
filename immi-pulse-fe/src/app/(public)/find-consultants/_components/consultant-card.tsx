"use client";

import Link from "next/link";
import {
  Star,
  MapPin,
  Briefcase,
  Globe,
  Clock,
  ShieldCheck,
  Award,
  Phone,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentProfileOut } from "@/lib/api/hooks/marketplace";
import { TIER_LABELS } from "@/lib/api/hooks/marketplace";

interface ConsultantCardProps {
  consultant: AgentProfileOut;
  view: "grid" | "list";
}

function getInitials(name?: string | null): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatFee(fee?: number | null): string {
  if (fee == null) return "Contact for pricing";
  if (fee === 0) return "Free consultation";
  return `From $${fee}`;
}

function formatResponseTime(hours?: number | null): string {
  if (hours == null) return "—";
  if (hours <= 2) return `Within ${hours}h`;
  if (hours <= 24) return "Within 24h";
  return `Within ${Math.ceil(hours / 24)}d`;
}

const AVATAR_COLORS = [
  "bg-purple/10 text-purple",
  "bg-teal/10 text-teal",
  "bg-navy/10 text-navy",
  "bg-purple-muted/30 text-purple-deep",
  "bg-teal-light/20 text-teal",
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function TierBadge({ tier }: { tier: AgentProfileOut["tier"] }) {
  if (tier === "verified") return null;
  const isHighly = tier === "highly_recommended";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        isHighly
          ? "bg-amber-100 text-amber-700"
          : "bg-purple/10 text-purple"
      )}
    >
      <Award className="h-3 w-3" />
      {TIER_LABELS[tier]}
    </span>
  );
}

export function ConsultantCard({ consultant, view }: ConsultantCardProps) {
  const specs = consultant.specializations ?? [];
  const maxSpecs = view === "grid" ? 2 : 3;
  const visibleSpecs = specs.slice(0, maxSpecs);
  const extraCount = specs.length - maxSpecs;
  const initials = getInitials(consultant.display_name);
  const avatarColor = consultant.avatar_color || getAvatarColor(consultant.id);
  const isFeatured = consultant.featured;

  if (view === "list") {
    return (
      <Link href={`/find-consultants/${consultant.id}`} className="block">
        <div
          className={cn(
            "flex flex-col gap-4 rounded-2xl border bg-white p-5 transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/5 sm:flex-row sm:items-center",
            isFeatured
              ? "border-purple/20 shadow-md shadow-purple/5"
              : "border-border"
          )}
        >
          <div className="flex flex-1 items-center gap-4">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold",
                avatarColor
              )}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-[16px] font-semibold text-navy truncate">
                  {consultant.display_name || "Unnamed"}
                </h3>
                <ShieldCheck className="h-4 w-4 shrink-0 text-teal" aria-label="OMARA Verified" />
                <TierBadge tier={consultant.tier} />
              </div>
              <p className="text-[13px] text-gray-text truncate">
                {consultant.firm_name || "Independent consultant"}
                {consultant.role && ` · ${consultant.role}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:max-w-[280px]">
            {visibleSpecs.map((spec) => (
              <span
                key={spec}
                className="rounded-full border border-border bg-gray-light/50 px-2.5 py-1 text-[11px] font-medium text-gray-text"
              >
                {spec}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="rounded-full border border-border bg-gray-light/50 px-2.5 py-1 text-[11px] font-medium text-purple">
                +{extraCount} more
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-[13px] sm:min-w-[180px] sm:justify-end">
            {consultant.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                <span className="font-semibold tabular-nums text-navy">{consultant.rating.toFixed(1)}</span>
                <span className="tabular-nums text-gray-text/60">({consultant.review_count})</span>
              </div>
            )}
            {consultant.city && (
              <div className="flex items-center gap-1 text-gray-text">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {consultant.city}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/find-consultants/${consultant.id}`} className="block">
      <div
        className={cn(
          "rounded-2xl border bg-white p-6 transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/5",
          isFeatured
            ? "border-purple/20 shadow-md shadow-purple/5"
            : "border-border"
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[17px] font-semibold",
              avatarColor
            )}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-lg font-semibold text-navy truncate">
                {consultant.display_name || "Unnamed"}
              </h3>
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal" aria-label="OMARA Verified" />
            </div>
            <p className="text-[13px] text-gray-text">
              {consultant.firm_name || "Independent consultant"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {consultant.role && (
                <span className="inline-block rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-gray-text">
                  {consultant.role}
                </span>
              )}
              <TierBadge tier={consultant.tier} />
            </div>
          </div>
        </div>

        {/* Rating */}
        {consultant.rating > 0 && (
          <div className="mt-4 flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="text-[14px] font-semibold tabular-nums text-navy">
              {consultant.rating.toFixed(1)}
            </span>
            <span className="text-[13px] tabular-nums text-gray-text/60">
              ({consultant.review_count} reviews)
            </span>
          </div>
        )}

        {/* Specializations */}
        {visibleSpecs.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {visibleSpecs.map((spec) => (
              <span
                key={spec}
                className="rounded-full border border-border bg-gray-light/50 px-2.5 py-1 text-[11px] font-medium text-gray-text"
              >
                {spec}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="rounded-full border border-border bg-gray-light/50 px-2.5 py-1 text-[11px] font-medium text-purple">
                +{extraCount} more
              </span>
            )}
          </div>
        )}

        {/* Details */}
        <div className="mt-4 space-y-2 text-[13px] text-gray-text">
          {consultant.city && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {consultant.city}{consultant.state ? `, ${consultant.state}` : ""}
              </span>
            </div>
          )}
          {consultant.years_experience != null && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{consultant.years_experience} years experience</span>
            </div>
          )}
          {consultant.languages && consultant.languages.length > 0 && (
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {consultant.languages.slice(0, 3).join(", ")}
                {consultant.languages.length > 3 && ` +${consultant.languages.length - 3}`}
              </span>
            </div>
          )}
          {consultant.response_time_hours != null && (
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{formatResponseTime(consultant.response_time_hours)}</span>
            </div>
          )}
          {consultant.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{consultant.phone}</span>
            </div>
          )}
          {consultant.website && (
            <div className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate text-purple">{consultant.website}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-[13px] font-medium text-navy">
            {formatFee(consultant.consultation_fee)}
          </span>
          <span
            className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-navy transition-colors hover:border-purple/30 hover:bg-purple/5 hover:text-purple"
          >
            View Profile
          </span>
        </div>
      </div>
    </Link>
  );
}
