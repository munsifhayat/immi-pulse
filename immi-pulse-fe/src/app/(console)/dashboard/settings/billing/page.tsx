"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Sparkles,
  Users,
  Briefcase,
  Crown,
  Shield,
  User as UserIcon,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { orgApi, type BillingSummary, type Plan } from "@/lib/api/services";
import { cn } from "@/lib/utils";

const ROLE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  owner: { label: "Owners", icon: Crown, tone: "text-amber-600" },
  admin: { label: "Admins", icon: Shield, tone: "text-purple-600" },
  consultant: { label: "Consultants", icon: UserIcon, tone: "text-blue-600" },
  staff: { label: "Staff", icon: Briefcase, tone: "text-teal-600" },
};

function daysBetween(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function fmtAud(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BillingSettingsPage() {
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmTier, setConfirmTier] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([orgApi.getBilling(), orgApi.listPlans()]);
      setBilling(b);
      setPlans(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const trialDaysLeft = useMemo(
    () => daysBetween(billing?.trial_ends_at ?? null),
    [billing]
  );

  const onSelectPlan = async (tier: Plan["tier"]) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await orgApi.selectPlan(tier);
      setBilling(updated);
      setConfirmTier(null);
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not update plan";
      setError(typeof detail === "string" ? detail : "Could not update plan");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !billing) {
    return <p className="text-sm text-muted-foreground">Loading billing…</p>;
  }

  return (
    <div className="space-y-6">
      {/* ── Current plan + bill summary ──────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardDescription className="text-xs uppercase tracking-wider">
                  Current plan
                </CardDescription>
                <CardTitle className="mt-1 flex items-center gap-3 text-2xl">
                  {billing.plan_name}
                  <StatusBadge status={billing.status} />
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{billing.price_label}</p>
              </div>
              {billing.status === "trial" && trialDaysLeft !== null && (
                <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 px-4 py-3 text-right dark:border-amber-900/40 dark:bg-amber-950/20">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Trial ends in
                  </p>
                  <p className="mt-0.5 font-heading text-2xl font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                    {trialDaysLeft} <span className="text-sm font-normal">days</span>
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {billing.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground/80">{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* ── Bill card ──────────────────────────────────────────── */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-muted-foreground" />
              This month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {billing.is_custom ? (
              <div>
                <p className="font-heading text-3xl font-semibold tabular-nums">Custom</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pricing is set after contracting with our team.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-heading text-3xl font-semibold tabular-nums">
                      {fmtAud(billing.monthly_total_aud)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {billing.status === "trial"
                      ? "First charge after trial ends"
                      : "Billed monthly"}
                  </p>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-baseline gap-1.5">
                    <span>
                      {billing.total_seats} seat{billing.total_seats === 1 ? "" : "s"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      × {fmtAud(billing.price_per_seat_aud_monthly)}
                    </span>
                  </div>
                  <span className="tabular-nums">{fmtAud(billing.monthly_total_aud)}</span>
                </div>
              </>
            )}

            <Separator />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {billing.status === "trial" ? (
                <span>Trial ends {fmtDate(billing.trial_ends_at)}</span>
              ) : billing.current_period_end ? (
                <span>Renews {fmtDate(billing.current_period_end)}</span>
              ) : (
                <span>No upcoming renewal</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Role breakdown ───────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your team</CardTitle>
          <CardDescription>
            Role is a permission level. Every seat is billed at the plan&rsquo;s per-seat price.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            {(["owner", "admin", "consultant", "staff"] as const).map((role) => {
              const count = billing.role_counts?.[role] ?? 0;
              const meta = ROLE_META[role];
              const Icon = meta.icon;
              return (
                <div
                  key={role}
                  className="rounded-lg border border-border/60 bg-card p-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", meta.tone)} />
                    <span className="text-xs font-medium">{meta.label}</span>
                  </div>
                  <p className="mt-2 font-heading text-2xl font-semibold tabular-nums">
                    {count}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Plan picker ──────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Choose your plan</h2>
        </div>
        {error && (
          <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.tier === billing.tier;
            const highlighted = plan.tier === "pro";
            return (
              <Card
                key={plan.tier}
                className={cn(
                  "relative flex flex-col border-border/60 transition-all",
                  highlighted && "border-primary/40 shadow-md shadow-primary/5",
                  isCurrent && "ring-1 ring-primary/40"
                )}
              >
                {highlighted && !isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                    Most popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background">
                    Current plan
                  </span>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                  <div className="mt-3">
                    {plan.is_custom ? (
                      <span className="text-sm text-muted-foreground">{plan.price_label}</span>
                    ) : (
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-heading text-3xl font-semibold tracking-tight">
                          ${plan.price_per_seat_aud_monthly}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / seat / month
                        </span>
                      </div>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Add as many seats as you need. No caps.
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <ul className="flex-1 space-y-2 border-t border-border/60 pt-4">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="text-foreground/75">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? "outline" : highlighted ? "default" : "outline"}
                    disabled={isCurrent || busy}
                    onClick={() => setConfirmTier(plan)}
                    className="w-full"
                  >
                    {isCurrent
                      ? "Current plan"
                      : plan.is_custom
                      ? "Talk to sales"
                      : `Switch to ${plan.name}`}
                    {!isCurrent && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Stripe checkout is being wired in — for now plan changes apply immediately and we
          collect payment when the integration ships. Enterprise sales takes 1–2 days.
        </p>
      </div>

      <Dialog open={!!confirmTier} onOpenChange={(o) => !o && setConfirmTier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to {confirmTier?.name}?</DialogTitle>
            <DialogDescription>
              {confirmTier?.is_custom
                ? "We'll move you to a custom Enterprise track — our team will reach out within 1 business day to confirm seats and pricing."
                : `Move to ${confirmTier?.name} at $${confirmTier?.price_per_seat_aud_monthly} / seat / month. Your existing seats are preserved; the next bill reflects the new rate.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmTier(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmTier && onSelectPlan(confirmTier.tier)}
              disabled={busy}
            >
              {busy ? "Updating…" : `Confirm ${confirmTier?.name}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: BillingSummary["status"] }) {
  const map: Record<BillingSummary["status"], { label: string; className: string }> = {
    trial: {
      label: "On trial",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400",
    },
    active: {
      label: "Active",
      className:
        "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400",
    },
    past_due: { label: "Past due", className: "border-red-200 bg-red-50 text-red-700" },
    canceled: { label: "Canceled", className: "border-border text-muted-foreground" },
    frozen: { label: "Frozen", className: "border-border text-muted-foreground" },
    archived: { label: "Archived", className: "border-border text-muted-foreground" },
  };
  const cfg = map[status] || map.active;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}
