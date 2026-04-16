"use client";

import Link from "next/link";
import {
  Briefcase,
  Heart,
  GraduationCap,
  Building2,
  Award,
  Plane,
  Backpack,
  Users,
  Flag,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import type { CommunitySpaceOut } from "@/lib/api/hooks/community";

const iconMap: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  heart: Heart,
  "graduation-cap": GraduationCap,
  building: Building2,
  award: Award,
  plane: Plane,
  backpack: Backpack,
  users: Users,
  flag: Flag,
  "message-circle": MessageCircle,
};

export function SpaceCard({ space }: { space: CommunitySpaceOut }) {
  const Icon = iconMap[space.icon ?? ""] ?? MessageCircle;

  return (
    <Link
      href={`/community/${space.slug}`}
      className="block rounded-2xl border border-border bg-white p-7 transition-all duration-300 hover:border-purple/20 hover:shadow-lg hover:shadow-purple/5"
    >
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
        <span>
          {space.thread_count} {space.thread_count === 1 ? "thread" : "threads"}
        </span>
      </div>
    </Link>
  );
}
