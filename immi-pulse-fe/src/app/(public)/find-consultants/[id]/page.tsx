"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  Briefcase,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { useAgentProfile, TIER_LABELS, type AgentProfileOut } from "@/lib/api/hooks/marketplace";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

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

function formatFee(fee?: number | null): string {
  if (fee == null) return "Contact for pricing";
  if (fee === 0) return "Free consultation";
  return `AUD $${fee}`;
}

function formatResponseTime(hours?: number | null): string {
  if (hours == null) return "—";
  if (hours <= 2) return `within ${hours}h`;
  if (hours <= 24) return "within 24h";
  return `within ${Math.ceil(hours / 24)} days`;
}

function TierBadge({ tier }: { tier: AgentProfileOut["tier"] }) {
  if (tier === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2.5 py-0.5 text-[11px] font-semibold text-teal">
        <ShieldCheck className="h-3 w-3" /> Verified
      </span>
    );
  }
  const isHighly = tier === "highly_recommended";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        isHighly
          ? "bg-amber-100 text-amber-700"
          : "bg-purple/10 text-purple"
      )}
    >
      {isHighly ? <Sparkles className="h-3 w-3" /> : <Award className="h-3 w-3" />}
      {TIER_LABELS[tier]}
    </span>
  );
}

function InfoBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-white px-2.5 py-0.5 text-[11px] font-medium text-navy">
      {children}
    </span>
  );
}

export default function AgentProfileDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const profileQuery = useAgentProfile(params?.id);

  if (profileQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center py-32 text-gray-text">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading profile…
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24">
        <button
          onClick={() => router.push("/find-consultants")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-purple hover:text-purple-deep"
        >
          <ArrowLeft className="h-4 w-4" /> Back to directory
        </button>
        <div className="rounded-2xl border border-border bg-white p-10 text-center text-gray-text">
          Profile not found or not yet approved.
        </div>
      </div>
    );
  }

  const p = profileQuery.data;
  const name = p.display_name || "Migration Agent";
  const initials = (name.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase();
  const avatarColor = p.avatar_color || getAvatarColor(p.id);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-4xl px-6 py-16"
    >
      <motion.button
        variants={fadeUp}
        custom={0}
        onClick={() => router.push("/find-consultants")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-purple hover:text-purple-deep"
      >
        <ArrowLeft className="h-4 w-4" /> Back to directory
      </motion.button>

      {/* Main card */}
      <motion.div
        variants={fadeUp}
        custom={1}
        className="relative overflow-hidden rounded-3xl border border-border bg-white p-8 shadow-sm"
      >
        {p.tier === "highly_recommended" && (
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300" />
        )}
        {p.tier === "recommended" && (
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple/60 via-purple to-purple/60" />
        )}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div
            className={cn(
              "flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold",
              avatarColor
            )}
          >
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-navy">
                {name}
              </h1>
              <TierBadge tier={p.tier} />
            </div>
            {p.firm_name && (
              <p className="mt-1 flex items-center gap-1.5 text-[15px] text-gray-text">
                <Briefcase className="h-4 w-4" /> {p.firm_name}
              </p>
            )}
            {p.role && (
              <span className="mt-2 inline-block rounded-full border border-border px-3 py-1 text-[12px] font-medium text-gray-text">
                {p.role}
              </span>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-teal">
              <ShieldCheck className="h-4 w-4" />
              OMARA Verified · MARN {p.omara_number}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px] text-gray-text">
              {p.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {p.city}{p.state ? `, ${p.state}` : ""}
                </span>
              )}
              {p.rating > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {p.rating.toFixed(1)} ({p.review_count} reviews)
                </span>
              )}
              {p.response_time_hours != null && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Responds {formatResponseTime(p.response_time_hours)}
                </span>
              )}
              {p.years_experience != null && (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> {p.years_experience} years
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {p.bio && (
          <div className="mt-8 border-t border-border/60 pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-purple">
              About
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">
              {p.bio}
            </p>
          </div>
        )}

        {/* Specializations */}
        {p.specializations && p.specializations.length > 0 && (
          <div className="mt-6 border-t border-border/60 pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-purple">
              Specializations
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.specializations.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-purple/20 bg-purple/5 px-3 py-1 text-[12px] font-medium text-purple"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {p.languages && p.languages.length > 0 && (
          <div className="mt-6 border-t border-border/60 pt-6">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple">
              <Globe className="h-3.5 w-3.5" /> Languages
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.languages.map((l) => (
                <InfoBadge key={l}>{l}</InfoBadge>
              ))}
            </div>
          </div>
        )}

        {/* Contact & pricing footer */}
        <div className="mt-8 flex flex-col items-start gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple">
              Consultation fee
            </p>
            <p className="text-lg font-semibold text-navy">
              {formatFee(p.consultation_fee)}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-gray-text">
              {p.phone && (
                <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 text-purple hover:underline">
                  <Phone className="h-3.5 w-3.5" /> {p.phone}
                </a>
              )}
              {p.website && (
                <a
                  href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-purple hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Website
                </a>
              )}
            </div>
          </div>
          {p.email && (
            <a
              href={`mailto:${p.email}`}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-6 py-3 text-[15px] font-medium text-white shadow-lg shadow-purple/20 transition-all hover:border-purple-deep hover:bg-purple-deep"
            >
              <Mail className="h-4 w-4" />
              Contact {name.split(" ")[0]}
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
