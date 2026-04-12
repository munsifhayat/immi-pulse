"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  Clock,
  Globe,
  Loader2,
  MapPin,
  Mail,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useAgentProfile } from "@/lib/api/hooks/marketplace";
import { fadeUp, stagger } from "@/lib/motion";

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "platinum";
}) {
  return (
    <span
      className={
        variant === "platinum"
          ? "inline-flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-100 to-yellow-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900"
          : "inline-flex items-center rounded-full border border-border bg-white px-2.5 py-0.5 text-[11px] font-medium text-navy"
      }
    >
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

      <motion.div
        variants={fadeUp}
        custom={1}
        className="relative overflow-hidden rounded-3xl border border-border bg-white p-8 shadow-sm"
      >
        {p.tier === "platinum" && (
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300" />
        )}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-purple/10 text-2xl font-bold text-purple">
            {(name.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-navy">
                {name}
              </h1>
              {p.tier === "platinum" && <Badge variant="platinum">Platinum</Badge>}
              <Badge>
                <ShieldCheck className="h-3 w-3 text-emerald-600" /> OMARA{" "}
                {p.omara_number}
              </Badge>
            </div>
            {p.firm_name && (
              <p className="mt-1 flex items-center gap-1.5 text-[15px] text-gray-text">
                <Briefcase className="h-4 w-4" /> {p.firm_name}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px] text-gray-text">
              {p.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {p.city}, {p.state}
                </span>
              )}
              {p.rating > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {p.rating.toFixed(1)} ({p.review_count} reviews)
                </span>
              )}
              {p.response_time_hours !== null &&
                p.response_time_hours !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Responds within{" "}
                    {p.response_time_hours}h
                  </span>
                )}
            </div>
          </div>
        </div>

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

        {p.specializations && p.specializations.length > 0 && (
          <div className="mt-6 border-t border-border/60 pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-purple">
              Specializations
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.specializations.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {p.languages && p.languages.length > 0 && (
          <div className="mt-6 border-t border-border/60 pt-6">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple">
              <Globe className="h-3.5 w-3.5" /> Languages
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.languages.map((l) => (
                <Badge key={l}>{l}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col items-start gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {p.consultation_fee !== null && p.consultation_fee !== undefined && (
              <p className="text-xs font-semibold uppercase tracking-wider text-purple">
                Consultation fee
              </p>
            )}
            {p.consultation_fee !== null && p.consultation_fee !== undefined && (
              <p className="text-lg font-semibold text-navy">
                AUD ${p.consultation_fee}
              </p>
            )}
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
