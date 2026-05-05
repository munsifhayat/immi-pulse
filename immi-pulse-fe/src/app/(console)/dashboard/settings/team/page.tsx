"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  User as UserIcon,
  Briefcase,
  Copy,
  Check,
  RotateCw,
  Trash2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { orgApi, type SeatRow, type BillingSummary } from "@/lib/api/services";
import { cn } from "@/lib/utils";

const ROLE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string; blurb: string }
> = {
  owner: {
    label: "Owner",
    icon: Crown,
    tone: "text-amber-600",
    blurb: "Full control + billing.",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    tone: "text-purple-600",
    blurb: "Manage team, plan & cases.",
  },
  consultant: {
    label: "Consultant",
    icon: UserIcon,
    tone: "text-blue-600",
    blurb: "OMARA agent — owns and lodges cases.",
  },
  staff: {
    label: "Staff",
    icon: Briefcase,
    tone: "text-teal-600",
    blurb: "Paralegal — assists, can't lodge.",
  },
};

function fmtAud(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function TeamPage() {
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "consultant" | "staff">("consultant");
  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([orgApi.listSeats(), orgApi.getBilling()]);
      setSeats(s);
      setBilling(b);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const active = useMemo(() => seats.filter((s) => s.status === "active"), [seats]);
  const pending = useMemo(() => seats.filter((s) => s.status === "invited"), [seats]);
  const seatPrice = billing?.price_per_seat_aud_monthly ?? 0;

  const sendInvite = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await orgApi.invite(email.trim(), role);
      setInviteLink(result.invite_link);
      setEmail("");
      await load();
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not send invite";
      setError(typeof detail === "string" ? detail : "Could not send invite");
    } finally {
      setBusy(false);
    }
  };

  const resend = async (seatId: string) => {
    setBusy(true);
    try {
      const result = await orgApi.resendInvite(seatId);
      setInviteLink(result.invite_link);
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (seatId: string, label: string) => {
    if (!confirm(`Remove ${label} from the team?`)) return;
    await orgApi.removeSeat(seatId);
    await load();
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopyOk(true);
    setTimeout(() => setCopyOk(false), 1800);
  };

  const closeDialog = () => {
    setOpen(false);
    setInviteLink(null);
    setError(null);
    setEmail("");
    setRole("consultant");
  };

  return (
    <div className="space-y-6">
      {/* ── Header card ──────────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {billing?.plan_name || "—"} plan ·{" "}
                {billing?.is_custom
                  ? "custom pricing"
                  : `${fmtAud(seatPrice)} / seat / month`}
              </p>
              <p className="font-heading text-xl font-semibold tabular-nums">
                {seats.length}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  total seat{seats.length === 1 ? "" : "s"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {billing && !billing.is_custom && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Monthly
                </p>
                <p className="font-heading text-base font-semibold tabular-nums">
                  {fmtAud(billing.monthly_total_aud)}
                </p>
              </div>
            )}
            <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5" disabled={loading}>
              <UserPlus className="h-3.5 w-3.5" />
              Invite member
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Active members ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active members ({active.length})</CardTitle>
          <CardDescription>People who can sign in to the workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {active.map((s) => (
                <SeatItem
                  key={s.id}
                  seat={s}
                  seatPrice={seatPrice}
                  isCustom={billing?.is_custom ?? false}
                  onRemove={() =>
                    remove(s.id, s.user_name || s.user_email || "this member")
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pending invites ───────────────────────────────────────── */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invites ({pending.length})</CardTitle>
            <CardDescription>
              These people haven&rsquo;t accepted yet. You can resend or revoke.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {pending.map((s) => (
                <SeatItem
                  key={s.id}
                  seat={s}
                  seatPrice={seatPrice}
                  isCustom={billing?.is_custom ?? false}
                  onResend={() => resend(s.id)}
                  onRemove={() => remove(s.id, s.invited_email || "this invite")}
                  busy={busy}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Invite dialog ─────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inviteLink ? "Invite ready to share" : "Invite a teammate"}</DialogTitle>
          </DialogHeader>

          {inviteLink ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Email delivery is being wired up. For now, copy this link and send it to your
                teammate — it expires in 14 days.
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                  className="shrink-0"
                  aria-label="Copy invite link"
                >
                  {copyOk ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="teammate@firm.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <p className="text-xs text-muted-foreground">
                  Permissions only. Every seat costs {fmtAud(seatPrice)} / month on the{" "}
                  {billing?.plan_name} plan.
                </p>
                <div className="grid gap-2">
                  {(["consultant", "admin", "staff"] as const).map((r) => {
                    const meta = ROLE_META[r];
                    const Icon = meta.icon;
                    const selected = role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-border/80 hover:bg-muted/40"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60",
                            meta.tone
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{meta.label}</p>
                          <p className="text-xs text-muted-foreground">{meta.blurb}</p>
                        </div>
                        <div
                          className={cn(
                            "h-4 w-4 shrink-0 rounded-full border-2",
                            selected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              {!billing?.is_custom && seatPrice > 0 && (
                <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Adding this seat will increase your monthly bill by{" "}
                  <span className="font-medium text-foreground">{fmtAud(seatPrice)}</span>{" "}
                  starting next billing cycle.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            {inviteLink ? (
              <Button onClick={closeDialog}>Done</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={closeDialog} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={sendInvite} disabled={busy || !email.trim()}>
                  {busy ? "Creating…" : "Create invite"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeatItem({
  seat,
  seatPrice,
  isCustom,
  onResend,
  onRemove,
  busy,
}: {
  seat: SeatRow;
  seatPrice: number;
  isCustom: boolean;
  onResend?: () => void;
  onRemove?: () => void;
  busy?: boolean;
}) {
  const isPending = seat.status === "invited";
  const roleMeta = ROLE_META[seat.role] || ROLE_META.consultant;
  const RoleIcon = roleMeta.icon;
  const displayName = seat.user_name || seat.invited_email || seat.user_email || "(unknown)";
  const subline = isPending ? "Awaiting acceptance" : seat.user_email || seat.invited_email;
  const initials = (displayName || "U")
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className={cn("h-9 w-9", isPending && "opacity-60")}>
          <AvatarFallback className="text-xs">
            {isPending ? <Mail className="h-4 w-4" /> : initials || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{subline}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="outline" className={cn("gap-1 text-xs font-medium", roleMeta.tone)}>
          <RoleIcon className="h-3 w-3" />
          {roleMeta.label}
        </Badge>
        {!isCustom && seatPrice > 0 && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {`$${seatPrice}/mo`}
          </Badge>
        )}
        {isPending && (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400"
          >
            Pending
          </Badge>
        )}
        {onResend && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResend}
            disabled={busy}
            className="h-8 gap-1.5 text-xs"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Resend
          </Button>
        )}
        {seat.role !== "owner" && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            aria-label="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
