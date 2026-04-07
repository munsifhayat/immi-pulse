"use client";

import {
  Star,
  MapPin,
  Briefcase,
  Globe,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Consultant } from "../_lib/consultants-data";

interface ConsultantCardProps {
  consultant: Consultant;
  view: "grid" | "list";
}

export function ConsultantCard({ consultant, view }: ConsultantCardProps) {
  const maxSpecs = view === "grid" ? 2 : 3;
  const visibleSpecs = consultant.specializations.slice(0, maxSpecs);
  const extraCount = consultant.specializations.length - maxSpecs;

  if (view === "list") {
    return (
      <div
        className={cn(
          "flex flex-col gap-4 rounded-2xl border bg-white p-5 transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/5 sm:flex-row sm:items-center",
          consultant.isFeatured
            ? "border-purple/20 shadow-md shadow-purple/5"
            : "border-border"
        )}
      >
        {/* Avatar + Info */}
        <div className="flex flex-1 items-center gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold",
              consultant.avatarColor
            )}
          >
            {consultant.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-[16px] font-semibold text-navy truncate">
                {consultant.name}
              </h3>
              {consultant.isOMARAVerified && (
                <ShieldCheck className="h-4 w-4 shrink-0 text-teal" aria-label="OMARA Verified" />
              )}
            </div>
            <p className="text-[13px] text-gray-text truncate">
              {consultant.firm}
            </p>
          </div>
        </div>

        {/* Specs */}
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

        {/* Rating + Location */}
        <div className="flex items-center gap-4 text-[13px] sm:min-w-[180px] sm:justify-end">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="font-semibold tabular-nums text-navy">{consultant.rating}</span>
            <span className="tabular-nums text-gray-text/60">({consultant.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 text-gray-text">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {consultant.city}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-6 transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/5",
        consultant.isFeatured
          ? "border-purple/20 shadow-md shadow-purple/5"
          : "border-border"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[17px] font-semibold",
            consultant.avatarColor
          )}
        >
          {consultant.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-lg font-semibold text-navy truncate">
              {consultant.name}
            </h3>
            {consultant.isOMARAVerified && (
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal" aria-label="OMARA Verified" />
            )}
          </div>
          <p className="text-[13px] text-gray-text">{consultant.firm}</p>
          <span className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-gray-text">
            {consultant.role}
          </span>
        </div>
      </div>

      {/* Rating */}
      <div className="mt-4 flex items-center gap-1.5">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
        <span className="text-[14px] font-semibold tabular-nums text-navy">
          {consultant.rating}
        </span>
        <span className="text-[13px] tabular-nums text-gray-text/60">
          ({consultant.reviewCount} reviews)
        </span>
      </div>

      {/* Specializations */}
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

      {/* Details */}
      <div className="mt-4 space-y-2 text-[13px] text-gray-text">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {consultant.city}, {consultant.state}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{consultant.yearsExperience} years experience</span>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {consultant.languages.slice(0, 3).join(", ")}
            {consultant.languages.length > 3 && ` +${consultant.languages.length - 3}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{consultant.responseTime}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-[13px] font-medium text-navy">
          {consultant.consultationFee}
        </span>
        <button
          aria-label={`View profile for ${consultant.name}`}
          className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-navy transition-colors hover:border-purple/30 hover:bg-purple/5 hover:text-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2"
        >
          View Profile
        </button>
      </div>
    </div>
  );
}
