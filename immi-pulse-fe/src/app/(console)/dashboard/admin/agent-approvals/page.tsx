"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  usePendingAgentProfiles,
  useApproveAgentProfile,
  useRejectAgentProfile,
  type AgentProfileOut,
  type AgentProfileTier,
} from "@/lib/api/hooks/marketplace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fadeUp, stagger } from "@/lib/motion";

export default function AgentApprovalsPage() {
  const pending = usePendingAgentProfiles();
  const approve = useApproveAgentProfile();
  const reject = useRejectAgentProfile();

  const [tierByProfile, setTierByProfile] = useState<
    Record<string, AgentProfileTier>
  >({});
  const [rejectTarget, setRejectTarget] = useState<AgentProfileOut | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const setTier = (id: string, tier: AgentProfileTier) =>
    setTierByProfile((s) => ({ ...s, [id]: tier }));

  const handleApprove = async (profile: AgentProfileOut) => {
    const tier = tierByProfile[profile.id] ?? "basic";
    await approve.mutateAsync({ profile_id: profile.id, tier });
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    await reject.mutateAsync({
      profile_id: rejectTarget.id,
      reason: rejectReason || "Not approved.",
    });
    setRejectTarget(null);
    setRejectReason("");
  };

  return (
    <motion.div
      className="space-y-6 text-foreground"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Agent approvals
            </h2>
            <p className="text-sm text-muted-foreground">
              Review new marketplace applications. Verify each OMARA number
              against the public register before approving.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        {pending.isLoading ? (
          <Card className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading pending applications…
          </Card>
        ) : pending.isError ? (
          <Card className="p-10 text-center text-muted-foreground">
            Couldn&apos;t load the approval queue. Is the backend running?
          </Card>
        ) : (pending.data ?? []).length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-3 text-sm font-medium">All caught up.</p>
            <p className="text-xs text-muted-foreground">
              No pending applications in the queue.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {(pending.data ?? []).map((profile) => {
              const tier = tierByProfile[profile.id] ?? "basic";
              const omaraUrl = `https://www.mara.gov.au/search-the-register-of-migration-agents/`;
              return (
                <Card key={profile.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">
                          {profile.display_name || "Unnamed agent"}
                        </h3>
                        <Badge variant="secondary">
                          OMARA {profile.omara_number}
                        </Badge>
                        {profile.firm_name && (
                          <span className="text-sm text-muted-foreground">
                            · {profile.firm_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {profile.email} ·{" "}
                        {profile.city ? `${profile.city}, ${profile.state}` : "—"}{" "}
                        · Submitted{" "}
                        {profile.submitted_at
                          ? new Date(profile.submitted_at).toLocaleString()
                          : "—"}
                      </p>
                      {profile.bio && (
                        <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                          {profile.bio}
                        </p>
                      )}
                      {profile.specializations &&
                        profile.specializations.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {profile.specializations.map((s) => (
                              <span
                                key={s}
                                className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      <a
                        href={omaraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        Verify OMARA number on official register{" "}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 lg:w-56">
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Tier on approval
                        </p>
                        <div className="flex rounded-md border border-border p-0.5">
                          <button
                            onClick={() => setTier(profile.id, "basic")}
                            className={
                              tier === "basic"
                                ? "flex-1 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
                                : "flex-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                            }
                          >
                            Basic
                          </button>
                          <button
                            onClick={() => setTier(profile.id, "platinum")}
                            className={
                              tier === "platinum"
                                ? "flex-1 rounded bg-amber-500 px-2 py-1 text-xs font-medium text-white"
                                : "flex-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                            }
                          >
                            <Sparkles className="mr-1 inline h-3 w-3" />
                            Platinum
                          </button>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={approve.isPending}
                        onClick={() => handleApprove(profile)}
                      >
                        {approve.isPending ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectTarget(profile)}
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Reject dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>
              The applicant will see this reason. Be specific — they may
              resubmit after fixing the issue.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="e.g. Could not verify OMARA number against the register."
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              size="sm"
              disabled={reject.isPending}
              onClick={handleReject}
            >
              {reject.isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
