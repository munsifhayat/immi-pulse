"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppRefresh } from "@/lib/use-app-refresh";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  preCasesApi,
  type PreCaseListItem,
} from "@/lib/api/services";
import { Briefcase, RefreshCw, Search, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, EditorialButton } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<string, { label: string; tone: string }> = {
  qualified: { label: "Qualified", tone: "bg-sky-100 text-sky-700 border-sky-200" },
  letter_sent: { label: "Letter sent", tone: "bg-amber-100 text-amber-800 border-amber-200" },
  letter_signed: { label: "Letter signed", tone: "bg-violet-100 text-violet-700 border-violet-200" },
  paid: { label: "Paid · ready to convert", tone: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

function progressFromStatus(status: string): number {
  switch (status) {
    case "qualified":
      return 25;
    case "letter_sent":
      return 50;
    case "letter_signed":
      return 75;
    case "paid":
      return 100;
    default:
      return 0;
  }
}

export default function PreCasesPage() {
  const [items, setItems] = useState<PreCaseListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await preCasesApi.list({ group: "precase", limit: 200 });
      setItems(data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAppRefresh(load);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) =>
      [p.client_name, p.client_email, p.questionnaire_name, p.ai_summary]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  const isLoading = items === null;
  const isEmpty = !isLoading && (filtered?.length ?? 0) === 0 && !search;

  const counts = useMemo(() => {
    if (!items) return { total: 0, ready: 0, awaitingPayment: 0, awaitingSignature: 0 };
    return {
      total: items.length,
      ready: items.filter((p) => p.status === "paid").length,
      awaitingPayment: items.filter((p) => p.status === "letter_signed").length,
      awaitingSignature: items.filter((p) => p.status === "letter_sent").length,
    };
  }, [items]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Folio Nº 003 — Pre-Cases"
        title={
          <>
            Leads <em>in flight</em>.
          </>
        }
        description="Qualified leads — engagement letter and payment in flight. Once both gates are passed, the pre-case becomes a paying case."
        actions={
          <EditorialButton variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </EditorialButton>
        }
      />

      {/* Stats strip */}
      {!isEmpty && !isLoading && (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Total in flight" value={counts.total} />
          <StatCard label="Awaiting signature" value={counts.awaitingSignature} />
          <StatCard label="Awaiting payment" value={counts.awaitingPayment} />
          <StatCard label="Ready to convert" value={counts.ready} accent />
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-sm text-muted-foreground">Loading…</p>
          </CardContent>
        </Card>
      ) : isEmpty ? (
        <EmptyState
          icon={Briefcase}
          title="No pre-cases yet"
          description="When you qualify a lead from your inbox, it lands here. From this stage you send an engagement letter and collect the retainer before opening a case."
          primaryAction={{ label: "Go to inbox", href: "/dashboard/inbox" }}
          secondaryAction={{ label: "View clients", href: "/dashboard/clients" }}
          steps={[
            {
              title: "Qualify from the inbox",
              description: "Open a query, review the AI summary, and click 'Mark qualified'.",
            },
            {
              title: "Send the engagement letter",
              description: "Compose with auto-fill from the template, send a secure link to the client.",
            },
            {
              title: "Receive payment",
              description: "Stripe link, bank transfer, PayID, BPAY, cash — record it however it arrives.",
            },
            {
              title: "Open the case",
              description: "Once both gates pass, one click opens the case and triggers the checklist.",
            },
          ]}
        />
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by client, email, or visa…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>

          <Card>
            <CardContent className="px-0">
              <div className="divide-y divide-border/60">
                {(filtered ?? []).map((p) => {
                  const stage = STAGE_LABELS[p.status];
                  const progress = progressFromStatus(p.status);
                  return (
                    <Link
                      key={p.id}
                      href={`/dashboard/precases/${p.id}`}
                      className="block px-6 py-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {p.client_name || p.client_email || "Anonymous"}
                            </p>
                            {stage && (
                              <Badge variant="outline" className={cn("text-[11px]", stage.tone)}>
                                {stage.label}
                              </Badge>
                            )}
                            {p.skipped_payment && (
                              <Badge variant="outline" className="text-[11px] bg-orange-50 text-orange-700 border-orange-200">
                                Payment waived
                              </Badge>
                            )}
                          </div>
                          {p.ai_summary && (
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              {p.ai_summary}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {p.client_email}
                            {p.qualified_at && (
                              <>
                                {" · qualified "}
                                {new Date(p.qualified_at).toLocaleDateString()}
                              </>
                            )}
                          </p>
                          {/* Progress ladder */}
                          <div className="mt-3 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              {progress}%
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {search && (filtered?.length ?? 0) === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No matches for &ldquo;{search}&rdquo;.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative h-full rounded-2xl border bg-card p-5 shadow-[0_1px_0_rgba(15,17,23,0.02)] transition-all hover:-translate-y-0.5",
        accent
          ? "border-emerald-500/30 bg-emerald-500/[0.04] hover:border-emerald-500/55 hover:shadow-[0_18px_40px_-24px_rgba(16,185,129,0.45)]"
          : "border-border hover:border-[color:var(--purple)]/30 hover:shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--purple)_55%,transparent)]",
      )}
    >
      <p className="font-heading text-[13.5px] font-semibold text-foreground">
        {label}
      </p>
      <p
        className={cn(
          "font-heading mt-4 text-[40px] font-medium leading-none tracking-[-1.2px] tabular-nums",
          accent
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
