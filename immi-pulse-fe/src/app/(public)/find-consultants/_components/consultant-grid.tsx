"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, LayoutGrid, List, SearchX, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMarketplaceAgents, type MarketplaceFilters } from "@/lib/api/hooks/marketplace";
import { VISA_TYPES, LANGUAGES, CITIES } from "../_lib/constants";
import type { City, VisaType, Language } from "../_lib/constants";
import { ConsultantCard } from "./consultant-card";

export function ConsultantGrid({ activeCity }: { activeCity: City | "all" }) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<City | "all">(activeCity);
  const [visaType, setVisaType] = useState<VisaType | "all">("all");
  const [language, setLanguage] = useState<Language | "all">("all");
  const [sortBy, setSortBy] = useState<"rating" | "experience" | "response_time">(
    "rating"
  );
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showAll, setShowAll] = useState(false);

  // Sync city from parent
  useEffect(() => {
    setCity(activeCity);
  }, [activeCity]);

  // Build API filter params
  const filters: MarketplaceFilters = useMemo(() => {
    const f: MarketplaceFilters = { sort: sortBy, limit: 200 };
    if (city !== "all") f.city = city;
    if (visaType !== "all") f.visa_type = visaType;
    if (language !== "all") f.language = language;
    if (search.trim()) f.search = search.trim();
    return f;
  }, [city, visaType, language, sortBy, search]);

  const { data: agents, isLoading, isError } = useMarketplaceAgents(filters);

  const displayed = useMemo(() => {
    if (!agents) return [];
    return showAll ? agents : agents.slice(0, 12);
  }, [agents, showAll]);

  return (
    <div>
      {/* Filter Bar */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text/50" aria-hidden="true" />
            <input
              type="search"
              name="consultant-search"
              autoComplete="off"
              placeholder="Search by name, firm, or specialization…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-gray-light pl-10 pr-3 text-[13px] text-navy placeholder:text-gray-text/50 focus-visible:border-purple focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              name="city"
              aria-label="Filter by city"
              value={city}
              onChange={(e) => setCity(e.target.value as City | "all")}
              className="h-10 rounded-lg border border-border bg-white px-3 text-[13px] text-navy focus-visible:border-purple focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple"
            >
              <option value="all">All Cities</option>
              {CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              name="visa-type"
              aria-label="Filter by visa type"
              value={visaType}
              onChange={(e) => setVisaType(e.target.value as VisaType | "all")}
              className="h-10 rounded-lg border border-border bg-white px-3 text-[13px] text-navy focus-visible:border-purple focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple"
            >
              <option value="all">All Visa Types</option>
              {VISA_TYPES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <select
              name="language"
              aria-label="Filter by language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language | "all")}
              className="h-10 rounded-lg border border-border bg-white px-3 text-[13px] text-navy focus-visible:border-purple focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple"
            >
              <option value="all">All Languages</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              name="sort"
              aria-label="Sort consultants"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "rating" | "experience" | "response_time")
              }
              className="h-10 rounded-lg border border-border bg-white px-3 text-[13px] text-navy focus-visible:border-purple focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple"
            >
              <option value="rating">Highest Rated</option>
              <option value="experience">Most Experienced</option>
              <option value="response_time">Fastest Response</option>
            </select>

            {/* View toggle */}
            <div className="hidden items-center gap-1 rounded-lg border border-border p-1 sm:flex">
              <button
                onClick={() => setView("grid")}
                className={`rounded-md p-1.5 transition-colors ${
                  view === "grid"
                    ? "bg-purple/10 text-purple"
                    : "text-gray-text hover:text-navy"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`rounded-md p-1.5 transition-colors ${
                  view === "list"
                    ? "bg-purple/10 text-purple"
                    : "text-gray-text hover:text-navy"
                }`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="mt-12 flex flex-col items-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple" />
          <p className="mt-3 text-[15px] text-gray-text">Loading consultants…</p>
        </div>
      )}

      {/* Error — treat as "coming soon" since the directory is new */}
      {isError && (
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple/5">
            <ShieldCheck className="h-7 w-7 text-purple" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-heading text-lg font-semibold text-navy">
            Our Directory Is Being Curated
          </h3>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-gray-text">
            Every consultant on IMMI-PULSE goes through a multi-step
            verification process — OMARA registration check, credential
            review, and practice validation — before their profile goes
            live. Approved consultants will appear here shortly.
          </p>
          <Link
            href="/find-consultants/apply"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-purple-deep"
          >
            Are you a consultant? Get listed
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Results */}
      {!isLoading && !isError && (
        <>
          {(agents?.length ?? 0) > 0 && (
            <p className="mt-6 text-[14px] text-gray-text">
              Showing{" "}
              <span className="font-semibold text-navy">
                {displayed.length}
              </span>{" "}
              of <span className="font-semibold text-navy">{agents?.length ?? 0}</span>{" "}
              consultants
            </p>
          )}

          {(agents?.length ?? 0) === 0 ? (
            <div className="mt-12 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple/5">
                <ShieldCheck className="h-7 w-7 text-purple" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold text-navy">
                Verified Consultants Coming Soon
              </h3>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-gray-text">
                Every listing undergoes OMARA registration verification,
                credential review, and practice validation before going live.
                Approved consultants will appear here as they clear our
                vetting process.
              </p>
              <Link
                href="/find-consultants/apply"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-purple-deep"
              >
                Are you a consultant? Get listed
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <div
                className={
                  view === "grid"
                    ? "mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    : "mt-6 space-y-4"
                }
              >
                {displayed.map((c) => (
                  <ConsultantCard key={c.id} consultant={c} view={view} />
                ))}
              </div>

              {!showAll && (agents?.length ?? 0) > 12 && (
                <div className="mt-10 text-center">
                  <button
                    onClick={() => setShowAll(true)}
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-border bg-white px-7 py-3 text-[15px] font-medium text-navy transition-colors hover:border-purple/30 hover:bg-purple/5"
                  >
                    Show All Consultants ({agents?.length})
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
