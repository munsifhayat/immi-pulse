"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppRefresh } from "@/lib/use-app-refresh";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, EditorialButton } from "@/components/layout/page-header";
import { clientsApi, type ClientListItem } from "@/lib/api/services";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  query: "bg-sky-100 text-sky-700 border-sky-200",
  precase: "bg-violet-100 text-violet-700 border-violet-200",
  case: "bg-emerald-100 text-emerald-700 border-emerald-200",
  none: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
  query: "Query",
  precase: "Pre-case",
  case: "Active case",
  none: "—",
};

export default function ClientsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ClientListItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientsApi.list();
      setItems(data);
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
    return items.filter((c) =>
      [c.primary_email, c.name, c.phone, c.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  const isLoading = items === null;
  const isEmpty = !isLoading && (filtered?.length ?? 0) === 0 && !search;

  const stats = useMemo(() => {
    if (!items) return { total: 0, queries: 0, precases: 0, cases: 0 };
    return {
      total: items.length,
      queries: items.reduce((acc, c) => acc + c.query_count, 0),
      precases: items.reduce((acc, c) => acc + c.precase_count, 0),
      cases: items.reduce((acc, c) => acc + c.case_count, 0),
    };
  }, [items]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Folio Nº 004 — Register"
        title={
          <>
            The <em>client</em> register.
          </>
        }
        description="Everyone who's ever entered your funnel — from inbox queries to engaged cases. The same email is one client across every interaction."
        actions={
          <EditorialButton variant="solid" onClick={() => setShowCreate(true)}>
            <Plus className="h-3 w-3" />
            New client
          </EditorialButton>
        }
      />

      {!isLoading && !isEmpty && (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Total clients" value={stats.total} icon={Users} />
          <StatCard label="Queries" value={stats.queries} icon={FileText} />
          <StatCard label="Pre-cases" value={stats.precases} icon={Briefcase} />
          <StatCard label="Active cases" value={stats.cases} icon={FolderOpen} accent />
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      ) : isEmpty ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Clients are created automatically when someone submits one of your forms. You can also add a client manually if they reached out by other channels."
          primaryAction={{ label: "View inbox", href: "/dashboard/inbox" }}
          secondaryAction={{ label: "Manage forms", href: "/dashboard/questionnaires" }}
        />
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>

          <Card>
            <CardContent className="px-0">
              <div className="divide-y divide-border/60">
                {(filtered ?? []).map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/clients/${c.id}`}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-semibold text-white"
                      aria-hidden
                    >
                      {(c.name || c.primary_email)[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {c.name || c.primary_email}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            STATUS_TONE[c.latest_status] ?? STATUS_TONE.none
                          )}
                        >
                          {STATUS_LABEL[c.latest_status]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {c.primary_email}
                        {c.country && ` · ${c.country}`}
                      </p>
                    </div>
                    <div className="hidden gap-3 text-[11px] sm:flex">
                      <Pill label="queries" value={c.query_count} />
                      <Pill label="pre-cases" value={c.precase_count} />
                      <Pill label="cases" value={c.case_count} />
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
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

      <NewClientDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(c) => {
          setShowCreate(false);
          router.push(`/dashboard/clients/${c.id}`);
        }}
      />
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
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
      <div className="flex items-start justify-between">
        <p className="font-heading text-[13.5px] font-semibold text-foreground">
          {label}
        </p>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl ring-1",
            accent
              ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300"
              : "bg-[color:var(--purple)]/10 text-[color:var(--purple-deep)] ring-[color:var(--purple)]/15 dark:text-[color:var(--purple-light)]",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p
        className={cn(
          "font-heading mt-4 text-[40px] font-medium leading-none tracking-[-1.2px] tabular-nums",
          accent ? "text-emerald-700 dark:text-emerald-300" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function NewClientDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (c: ClientListItem) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!email.includes("@")) {
      setErr("A valid email is required");
      return;
    }
    setBusy(true);
    try {
      const c = await clientsApi.create({
        primary_email: email,
        name: name || undefined,
        phone: phone || undefined,
        country: country || undefined,
      });
      onCreated(c);
      setEmail("");
      setName("");
      setPhone("");
      setCountry("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create client";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>
            Manually add a client (walk-in, referral, repeat client, etc.).
            Once created, you can open a case directly without going through the
            inbox.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="ce" className="text-xs">Email *</Label>
            <Input id="ce" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cn" className="text-xs">Name</Label>
            <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="cp" className="text-xs">Phone</Label>
              <Input id="cp" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cc" className="text-xs">Country</Label>
              <Input id="cc" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Create client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
