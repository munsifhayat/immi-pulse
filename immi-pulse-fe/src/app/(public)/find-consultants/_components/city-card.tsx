"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface CityCardProps {
  name: string;
  state: string;
  tagline: string;
  isActive: boolean;
  onClick: () => void;
}

const cityAccents: Record<string, string> = {
  Sydney: "border-t-purple",
  Melbourne: "border-t-teal",
  Brisbane: "border-t-purple-deep",
  Perth: "border-t-teal-light",
  Adelaide: "border-t-purple-light",
  Canberra: "border-t-navy",
  Hobart: "border-t-purple-muted",
  Darwin: "border-t-teal",
};

export function CityCard({
  name,
  state,
  tagline,
  isActive,
  onClick,
}: CityCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-full w-full flex-col rounded-2xl border-t-[3px] border border-border bg-white p-5 text-left transition-all duration-300 hover:shadow-lg hover:shadow-purple/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2",
        cityAccents[name] || "border-t-purple",
        isActive
          ? "border-purple/30 shadow-lg shadow-purple/5 ring-1 ring-purple/20"
          : "hover:border-purple/20"
      )}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-heading text-[16px] font-semibold text-navy">
          {name}
        </h3>
        <span className="text-[11px] font-medium text-gray-text/60">
          {state}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-gray-text">{tagline}</p>
      <div className="mt-auto flex items-center gap-1.5 pt-3">
        <MapPin className="h-3 w-3 text-purple" aria-hidden="true" />
        <span className="text-[12px] font-medium text-purple">
          Browse consultants
        </span>
      </div>
    </button>
  );
}
