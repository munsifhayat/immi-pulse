"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { preCasesApi, type PreCaseListItem } from "@/lib/api/services";
import {
  ChevronLeft,
  ChevronRight,
  Inbox as InboxIcon,
  RefreshCw,
  Search,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  PageHeader,
  EditorialButton,
  EditorialTag,
} from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { useAppRefresh } from "@/lib/use-app-refresh";

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

const PAGE_SIZE = 20;

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "").trim();
  if (!source) return "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function InboxPage() {
  const [items, setItems] = useState<PreCaseListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  // Track unread across the whole inbox (separate from the paginated view).
  const [unreadCount, setUnreadCount] = useState(0);

  // Debounce search input → reset to page 0 when query changes.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 250);
    return () => clearTimeout(id);
  }, [search]);

  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await preCasesApi.list({
        group: "inbox",
        q: debouncedSearch || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      // Drop stale responses if a newer request fired after this one.
      if (seq !== requestSeq.current) return;
      setItems(data.items);
      setTotal(data.total);
    } catch {
      if (seq !== requestSeq.current) return;
      setItems([]);
      setTotal(0);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Pull a small unfiltered page just to compute the unread badge accurately.
  const refreshUnread = useCallback(async () => {
    try {
      const data = await preCasesApi.list({ group: "inbox", limit: 200 });
      setUnreadCount(data.items.filter((p) => !p.read_at).length);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread, page, debouncedSearch]);

  useAppRefresh(useCallback(() => {
    load();
    refreshUnread();
  }, [load, refreshUnread]));

  const isInitialLoading = items === null;
  const hasResults = (items?.length ?? 0) > 0;
  const isEmptyAll = !isInitialLoading && total === 0 && !debouncedSearch;
  const isEmptySearch = !isInitialLoading && total === 0 && !!debouncedSearch;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const endIndex = Math.min(total, page * PAGE_SIZE + (items?.length ?? 0));

  const handleRefresh = () => {
    load();
    refreshUnread();
  };

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
            <EditorialButton variant="ghost" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Refresh
            </EditorialButton>
          </>
        }
      />

      {isEmptyAll ? (
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or questionnaire…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>
            {total > 0 && (
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{startIndex}</span>–
                <span className="font-medium text-foreground">{endIndex}</span> of{" "}
                <span className="font-medium text-foreground">{total}</span>
              </p>
            )}
          </div>

          <Card>
            <CardContent className="px-0">
              {isInitialLoading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : isEmptySearch ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No matches for &ldquo;{debouncedSearch}&rdquo;.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {(items ?? []).map((p) => {
                    const outcome = p.ai_suggested_outcome
                      ? OUTCOME_LABEL[p.ai_suggested_outcome]
                      : null;
                    const unread = !p.read_at;
                    const displayName = p.client_name || p.client_email || "Anonymous";
                    return (
                      <Link
                        key={p.id}
                        href={`/dashboard/inbox/${p.id}`}
                        className={cn(
                          "group flex items-start gap-3 px-5 py-4 transition-colors sm:px-6",
                          "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                        )}
                      >
                        <div
                          className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            unread ? "bg-primary" : "bg-transparent"
                          )}
                          aria-label={unread ? "Unread" : undefined}
                        />
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-wide",
                            unread
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {getInitials(p.client_name, p.client_email)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={cn(
                                "truncate text-sm",
                                unread ? "font-semibold" : "font-medium"
                              )}
                            >
                              {displayName}
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
                        <ChevronRight
                          className={cn(
                            "mt-2 h-4 w-4 shrink-0 text-muted-foreground/60 transition-all",
                            "group-hover:translate-x-0.5 group-hover:text-foreground"
                          )}
                          aria-hidden="true"
                        />
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {hasResults && totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Page <span className="font-medium text-foreground">{page + 1}</span> of{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => (p + 1 < totalPages ? p + 1 : p))
                  }
                  disabled={page + 1 >= totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
