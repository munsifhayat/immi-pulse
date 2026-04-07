"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Mail, Paperclip, Search, Inbox } from "lucide-react";
import { mockInboxEmails } from "@/lib/mock-data/immigration-mock";
import type { InboxEmail } from "@/lib/types/immigration";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ── Classification badge colors ────────────────────────────
const classificationColors: Record<string, string> = {
  "New Inquiry": "bg-purple-100 text-purple-700",
  "Document Submission": "bg-teal-100 text-teal-700",
  "Case Update": "bg-blue-100 text-blue-700",
  "Government Correspondence": "bg-amber-100 text-amber-700",
  Newsletter: "bg-gray-100 text-gray-600",
};

// ── Relative time helper ───────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
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

// ── Tab filter type ────────────────────────────────────────
type InboxTab = "all" | "case-linked" | "unmatched" | "ai-classified";

function filterEmails(emails: InboxEmail[], tab: InboxTab): InboxEmail[] {
  switch (tab) {
    case "case-linked":
      return emails.filter((e) => e.linked_case_id);
    case "unmatched":
      return emails.filter((e) => !e.linked_case_id);
    case "ai-classified":
      return emails.filter((e) => e.classification);
    default:
      return emails;
  }
}

// ── Stat card ──────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5">
          <Icon className="h-5 w-5 text-primary/70" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}

// ── Email row ──────────────────────────────────────────────
function EmailRow({ email, index }: { email: InboxEmail; index: number }) {
  const colorClass =
    classificationColors[email.classification ?? ""] ?? "bg-gray-100 text-gray-600";

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className={cn(
        "flex items-center gap-3 border-b border-border/40 px-4 py-3 transition-colors hover:bg-accent/30",
        !email.is_read && "bg-primary/[0.02]"
      )}
    >
      {/* Unread indicator */}
      <div className="w-2 shrink-0 flex justify-center">
        {!email.is_read && (
          <span className="block h-2 w-2 rounded-full bg-purple-600" />
        )}
      </div>

      {/* From */}
      <div className="w-[180px] shrink-0 min-w-0">
        <p
          className={cn(
            "truncate text-sm",
            !email.is_read ? "font-semibold" : "font-medium"
          )}
        >
          {email.from_name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {email.from_email}
        </p>
      </div>

      {/* Subject + preview */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "truncate text-sm",
            !email.is_read ? "font-semibold" : "font-medium"
          )}
        >
          {email.subject}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {email.preview}
        </p>
      </div>

      {/* Classification badge */}
      {email.classification && (
        <Badge
          variant="secondary"
          className={cn(
            "shrink-0 text-[11px] font-medium border-0 px-2 py-0.5",
            colorClass
          )}
        >
          {email.classification}
        </Badge>
      )}

      {/* Linked case */}
      {email.linked_case_id && (
        <span className="hidden shrink-0 text-xs text-muted-foreground lg:inline-flex items-center gap-1">
          <span className="font-medium">
            Visa {email.linked_case_visa}
          </span>
          <span className="text-muted-foreground/50">&middot;</span>
          {email.linked_client_name}
        </span>
      )}

      {/* Attachment icon */}
      <div className="w-5 shrink-0 flex justify-center">
        {email.has_attachments && (
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground/60" />
        )}
      </div>

      {/* Time */}
      <div className="w-[70px] shrink-0 text-right">
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(email.received_at)}
        </span>
      </div>
    </motion.div>
  );
}

// ── Empty state ────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
        <Mail className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        No emails match this filter
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        Try a different tab or clear your search query.
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function InboxPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<InboxTab>("all");

  const emails = useMemo(() => {
    let result = filterEmails(mockInboxEmails, activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.from_name.toLowerCase().includes(q) ||
          e.from_email.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.preview.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeTab, search]);

  // Stats
  const totalEmails = mockInboxEmails.length;
  const unreadCount = mockInboxEmails.filter((e) => !e.is_read).length;
  const attachmentCount = mockInboxEmails.filter(
    (e) => e.has_attachments
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Inbox</h1>
          <Badge
            variant="outline"
            className="border-purple-300 text-purple-600 text-[11px]"
          >
            Demo Data
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-3"
      >
        <motion.div variants={fadeUp} custom={0}>
          <StatCard label="Total Emails" value={totalEmails} icon={Mail} />
        </motion.div>
        <motion.div variants={fadeUp} custom={1}>
          <StatCard label="Unread" value={unreadCount} icon={Inbox} />
        </motion.div>
        <motion.div variants={fadeUp} custom={2}>
          <StatCard
            label="With Attachments"
            value={attachmentCount}
            icon={Paperclip}
          />
        </motion.div>
      </motion.div>

      {/* Tabs + Search + Email list */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as InboxTab)}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="case-linked">Case-Linked</TabsTrigger>
            <TabsTrigger value="unmatched">Unmatched</TabsTrigger>
            <TabsTrigger value="ai-classified">AI Classified</TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Shared content for all tabs — filtering handled by useMemo */}
        {(
          ["all", "case-linked", "unmatched", "ai-classified"] as InboxTab[]
        ).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card className="border-border/60 shadow-sm overflow-hidden">
              {/* Column headers */}
              <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <div className="w-2 shrink-0" />
                <div className="w-[180px] shrink-0">From</div>
                <div className="flex-1">Subject</div>
                <div className="shrink-0">Classification</div>
                <div className="hidden shrink-0 lg:block">Case</div>
                <div className="w-5 shrink-0" />
                <div className="w-[70px] shrink-0 text-right">Time</div>
              </div>

              {/* Email rows */}
              {emails.length > 0 ? (
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                >
                  {emails.map((email, i) => (
                    <EmailRow key={email.id} email={email} index={i} />
                  ))}
                </motion.div>
              ) : (
                <EmptyState />
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
