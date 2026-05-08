"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { preCasesApi, type PreCaseListItem } from "@/lib/api/services";
import { Inbox as InboxIcon, RefreshCw, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  PageHeader,
  EditorialButton,
  EditorialTag,
} from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

const OUTCOME_LABEL: Record<
  string,
  { label: string; tone: "fit" | "info" | "consult" | "no" }
> = {
  likely_fit: { label: "Likely fit", tone: "fit" },
  needs_info: { label: "Needs info", tone: "info" },
  paid_consult: { label: "Paid consult", tone: "consult" },
  unlikely_fit: { label: "Unlikely fit", tone: "no" },
};

const TONE_CLASS: Record<string, string> = {
  fit: "bg-emerald-100 text-emerald-700 border-emerald-200",
  info: "bg-amber-100 text-amber-800 border-amber-200",
  consult: "bg-violet-100 text-violet-700 border-violet-200",
  no: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function InboxPage() {
  const [items, setItems] = useState<PreCaseListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await preCasesApi.list({ group: "inbox" });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  const unreadCount = items?.filter((p) => !p.read_at).length ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Folio Nº 002 — Intake"
        title={
          <>
            The <em>inbox</em>.
          </>
        }
        description="New questionnaire submissions and enquiries — review each one and decide whether to qualify it as a pre-case."
        actions={
          <>
            {unreadCount > 0 && (
              <EditorialTag tone="primary">{unreadCount} unread</EditorialTag>
            )}
            <EditorialButton variant="ghost" onClick={load} disabled={loading}>
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Refresh
            </EditorialButton>
          </>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-sm text-muted-foreground">Loading…</p>
          </CardContent>
        </Card>
      ) : isEmpty ? (
        <EmptyState
          icon={InboxIcon}
          title="Your inbox is empty"
          description="When someone submits one of your forms, it shows up here. Share your form link with prospects to start receiving leads."
          primaryAction={{ label: "Manage forms", href: "/dashboard/questionnaires" }}
          secondaryAction={{ label: "View clients", href: "/dashboard/clients" }}
          steps={[
            {
              title: "Share your form link",
              description: "Send the public form link to anyone enquiring about your services.",
            },
            {
              title: "Submission lands here",
              description: "Their answers are AI-triaged and appear in this inbox.",
            },
            {
              title: "Review & decide",
              description: "Open the submission, read the AI summary, decide whether to proceed.",
            },
            {
              title: "Qualify or dismiss",
              description: "Promising leads become Pre-cases. The rest get archived.",
            },
          ]}
        />
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or questionnaire…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>

          <Card>
            <CardContent className="px-0">
              <div className="divide-y divide-border/60">
                {(filtered ?? []).map((p) => {
                  const outcome = p.ai_suggested_outcome
                    ? OUTCOME_LABEL[p.ai_suggested_outcome]
                    : null;
                  const unread = !p.read_at;
                  return (
                    <Link
                      key={p.id}
                      href={`/dashboard/inbox/${p.id}`}
                      className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/40"
                    >
                      <div
                        className={cn(
                          "mt-1.5 h-2 w-2 rounded-full",
                          unread ? "bg-primary" : "bg-transparent"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {p.client_name || p.client_email || "Anonymous"}
                          </p>
                          {p.questionnaire_name && (
                            <Badge variant="outline" className="text-[11px]">
                              {p.questionnaire_name}
                            </Badge>
                          )}
                          {outcome && (
                            <Badge
                              variant="outline"
                              className={cn("text-[11px]", TONE_CLASS[outcome.tone])}
                            >
                              {outcome.label}
                            </Badge>
                          )}
                          {p.status === "in_review" && (
                            <Badge variant="outline" className="text-[11px]">
                              Reviewing
                            </Badge>
                          )}
                        </div>
                        {p.ai_summary && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {p.ai_summary}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {p.client_email} ·{" "}
                          {new Date(p.submitted_at || p.created_at).toLocaleString()}
                        </p>
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
