"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Check,
  Copy,
  Inbox as InboxIcon,
  Loader2,
  Mail,
  Paperclip,
  RefreshCw,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  useCreateCaseFromEmail,
  useDemoInbox,
  useResetDemo,
} from "@/lib/api/hooks/demo";
import type { DemoInboxEmail } from "@/lib/types/immigration";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

const classificationPalette: Record<string, string> = {
  "New Inquiry": "bg-purple-100 text-purple-700 border-purple-200",
  "Document Submission": "bg-teal-100 text-teal-700 border-teal-200",
  "Case Update": "bg-blue-100 text-blue-700 border-blue-200",
  "Government Correspondence": "bg-amber-100 text-amber-700 border-amber-200",
  Newsletter: "bg-gray-100 text-gray-700 border-gray-200",
};

const urgencyColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

function ClassificationBadge({
  category,
  className,
}: {
  category?: string;
  className?: string;
}) {
  if (!category) return null;
  const palette =
    classificationPalette[category] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <Badge
      variant="outline"
      className={cn(
        "border text-[11px] font-medium px-2 py-0.5",
        palette,
        className
      )}
    >
      {category}
    </Badge>
  );
}

function EmailRow({
  email,
  isSelected,
  onSelect,
}: {
  email: DemoInboxEmail;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full flex-col gap-1 border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-accent/30",
        !email.is_read && "bg-primary/[0.03]",
        isSelected && "bg-primary/10 hover:bg-primary/10"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 shrink-0">
          {!email.is_read && (
            <span className="block h-2 w-2 rounded-full bg-purple-600" />
          )}
        </div>
        <p
          className={cn(
            "flex-1 truncate text-sm",
            !email.is_read ? "font-semibold" : "font-medium"
          )}
        >
          {email.from_name}
        </p>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {formatRelativeTime(email.received_at)}
        </span>
      </div>
      <p
        className={cn(
          "truncate text-sm pl-4",
          !email.is_read ? "font-semibold" : "font-medium text-foreground/90"
        )}
      >
        {email.subject}
      </p>
      <p className="line-clamp-1 pl-4 text-xs text-muted-foreground">
        {email.preview}
      </p>
      <div className="flex items-center gap-2 pl-4 pt-1">
        <ClassificationBadge category={email.classification?.category} />
        {email.linked_case_id && (
          <Badge
            variant="secondary"
            className="gap-1 text-[11px] bg-emerald-100 text-emerald-700 border-0"
          >
            <BadgeCheck className="h-3 w-3" />
            Case created
          </Badge>
        )}
        {email.has_attachments && (
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground/60" />
        )}
      </div>
    </button>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color =
    pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

function ExtractedDetails({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details ?? {});
  if (entries.length === 0) return null;
  return (
    <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="min-w-0">
          <dt className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
            {key.replace(/_/g, " ")}
          </dt>
          <dd className="truncate text-[13px] text-foreground">
            {String(value ?? "—")}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyRightPanel() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
        <Mail className="h-6 w-6 text-primary/50" />
      </div>
      <p className="text-sm font-medium text-foreground">No email selected</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Pick an incoming email on the left to see the AI summary and proposed
        visa pathway.
      </p>
    </div>
  );
}

function AISummaryPanel({
  email,
  onCreate,
  creating,
  onOpen,
}: {
  email: DemoInboxEmail;
  onCreate: () => void;
  creating: boolean;
  onOpen: () => void;
}) {
  const classification = email.classification;
  const summary = email.ai_summary;
  const hasSummary = !!summary;

  return (
    <motion.div
      key={email.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex h-full flex-col overflow-hidden"
    >
      {/* Email header */}
      <div className="space-y-3 border-b border-border/60 p-5">
        <div className="flex items-center gap-2">
          <ClassificationBadge category={classification?.category} />
          {classification?.urgency && (
            <Badge
              variant="secondary"
              className={cn(
                "text-[11px] capitalize border-0",
                urgencyColors[classification.urgency] ?? "bg-slate-100"
              )}
            >
              {classification.urgency} priority
            </Badge>
          )}
          {email.has_attachments && (
            <Badge
              variant="outline"
              className="gap-1 text-[11px] border-border/60"
            >
              <Paperclip className="h-3 w-3" />
              Attachments
            </Badge>
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-tight">
            {email.subject}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {email.from_name} &middot; {email.from_email} &middot;{" "}
            {formatRelativeTime(email.received_at)}
          </p>
        </div>
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 p-3 font-sans text-[13px] leading-relaxed text-foreground/90">
{email.body}
        </pre>
      </div>

      {/* AI insights */}
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {hasSummary ? (
          <>
            <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/10">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">
                      AI Intake Classifier
                    </p>
                    {typeof classification?.confidence === "number" && (
                      <span className="text-[11px] text-purple-700">
                        {Math.round(classification.confidence * 100)}% confident
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] leading-relaxed text-foreground">
                    {summary!.summary}
                  </p>
                </div>
              </div>
            </div>

            {summary?.proposed_visa_subclass && (
              <Card className="border border-border/60 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Proposed visa pathway
                    </p>
                    <p className="mt-0.5 text-base font-semibold">
                      {summary.proposed_visa_name}
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-0">
                    Subclass {summary.proposed_visa_subclass}
                  </Badge>
                </div>
                {typeof summary.confidence === "number" && (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Match confidence
                    </p>
                    <ConfidenceMeter value={summary.confidence} />
                  </div>
                )}
                {summary.reasoning && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Reasoning
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-foreground/90">
                      {summary.reasoning}
                    </p>
                  </div>
                )}
              </Card>
            )}

            {summary && summary.key_points.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Key points
                </p>
                <ul className="space-y-1.5">
                  {summary.key_points.map((point, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[13px] text-foreground"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary &&
              Object.keys(summary.extracted_details ?? {}).length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Extracted details
                  </p>
                  <ExtractedDetails details={summary.extracted_details} />
                </div>
              )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
              <Mail className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Not an immigration inquiry
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              The classifier decided this email doesn&apos;t need a case. Nothing
              to action.
            </p>
          </div>
        )}
      </div>

      {/* Action bar */}
      {email.case_defaults && (
        <div className="border-t border-border/60 bg-muted/20 p-4">
          {email.linked_case_id ? (
            <Button className="w-full gap-2" onClick={onOpen}>
              Open case
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="w-full gap-2"
              onClick={onCreate}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating case with seeded checklist…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Create case &amp; generate checklist
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function InboxPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const inbox = useDemoInbox();
  const createCase = useCreateCaseFromEmail();
  const resetDemo = useResetDemo();

  const emails = useMemo(() => inbox.data ?? [], [inbox.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emails;
    return emails.filter((e) =>
      [e.from_name, e.from_email, e.subject, e.preview]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [emails, search]);

  // Derive the currently-highlighted email: explicit selection wins; otherwise
  // auto-pick the first email in the filtered list. This keeps the right
  // panel populated without the setState-in-effect anti-pattern.
  const selected = useMemo(() => {
    if (selectedId) {
      return emails.find((e) => e.id === selectedId) ?? null;
    }
    return filtered[0] ?? null;
  }, [selectedId, emails, filtered]);
  const effectiveSelectedId = selected?.id ?? null;

  const unreadCount = emails.filter((e) => !e.is_read).length;
  const classifiedCount = emails.filter(
    (e) => e.classification?.is_immigration_inquiry
  ).length;
  const caseCount = emails.filter((e) => e.linked_case_id).length;

  const handleCreate = async () => {
    if (!selected) return;
    try {
      const caseOut = await createCase.mutateAsync({ email_id: selected.id });
      router.push(`/dashboard/cases/${caseOut.id}`);
    } catch (err) {
      console.error("Failed to create case from email", err);
    }
  };

  const handleOpen = () => {
    if (selected?.linked_case_id) {
      router.push(`/dashboard/cases/${selected.linked_case_id}`);
    }
  };

  const handleReset = async () => {
    await resetDemo.mutateAsync();
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Inbox</h1>
          <Badge variant="outline" className="border-purple-300 text-purple-600 text-[11px]">
            Live AI Intake
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => inbox.refetch()}
            disabled={inbox.isFetching}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", inbox.isFetching && "animate-spin")}
            />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={resetDemo.isPending}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            {resetDemo.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Reset demo
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-4"
      >
        {[
          { label: "Emails", value: emails.length, icon: Mail },
          { label: "Unread", value: unreadCount, icon: InboxIcon },
          { label: "AI-classified inquiries", value: classifiedCount, icon: Sparkles },
          { label: "Cases created", value: caseCount, icon: FolderKanbanIcon },
        ].map((s, i) => (
          <motion.div variants={fadeUp} custom={i} key={s.label}>
            <Card className="border-border/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5">
                  <s.icon className="h-4 w-4 text-primary/70" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{s.value}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Two-column layout */}
      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        {/* Email list */}
        <Card className="flex min-h-0 flex-col overflow-hidden border-border/60">
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search inbox…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {inbox.isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Mail className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm">No emails match.</p>
              </div>
            ) : (
              filtered.map((email) => (
                <EmailRow
                  key={email.id}
                  email={email}
                  isSelected={email.id === effectiveSelectedId}
                  onSelect={() => setSelectedId(email.id)}
                />
              ))
            )}
          </div>
          <Separator />
          <div className="px-3 py-2 text-[11px] text-muted-foreground">
            Showing {filtered.length} of {emails.length}
          </div>
        </Card>

        {/* Right panel */}
        <Card className="min-h-0 overflow-hidden border-border/60">
          <AnimatePresence mode="wait">
            {selected ? (
              <AISummaryPanel
                key={selected.id}
                email={selected}
                creating={createCase.isPending}
                onCreate={handleCreate}
                onOpen={handleOpen}
              />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <EmptyRightPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}

function FolderKanbanIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M8 10v4" />
      <path d="M12 10v2" />
      <path d="M16 10v6" />
    </svg>
  );
}
