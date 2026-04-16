"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  usePendingAgentProfiles,
  useApproveAgentProfile,
  useRejectAgentProfile,
  useAdminAddAgent,
  TIER_LABELS,
  TIER_ORDER,
  type AgentProfileOut,
  type AgentProfileTier,
  type AdminAddAgentPayload,
  type ListingType,
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

const VISA_TYPES = [
  "Skilled Worker (482)",
  "Employer Sponsored (186)",
  "Partner Visa (820/801)",
  "Student Visa (500)",
  "Graduate Visa (485)",
  "Business Innovation (188)",
  "Parent Visa (143)",
  "Skilled Independent (189)",
  "Skilled Nominated (190)",
  "Regional (491)",
];

const LANGUAGES = [
  "English", "Mandarin", "Hindi", "Punjabi", "Arabic", "Vietnamese",
  "Korean", "Tagalog", "Spanish", "Nepali", "Tamil", "Urdu", "Thai",
  "Japanese", "Cantonese",
];

const CITIES = [
  { name: "Sydney", state: "NSW" },
  { name: "Melbourne", state: "VIC" },
  { name: "Brisbane", state: "QLD" },
  { name: "Perth", state: "WA" },
  { name: "Adelaide", state: "SA" },
  { name: "Canberra", state: "ACT" },
  { name: "Hobart", state: "TAS" },
  { name: "Darwin", state: "NT" },
];

const ROLES = [
  "Principal Agent",
  "Senior Consultant",
  "Migration Lawyer",
  "Registered Agent",
  "Immigration Advisor",
];

function TierSelector({
  value,
  onChange,
}: {
  value: AgentProfileTier;
  onChange: (t: AgentProfileTier) => void;
}) {
  return (
    <div className="flex rounded-md border border-border p-0.5">
      {TIER_ORDER.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={
              active
                ? t === "highly_recommended"
                  ? "flex-1 rounded bg-amber-500 px-2 py-1 text-xs font-medium text-white"
                  : t === "recommended"
                  ? "flex-1 rounded bg-purple px-2 py-1 text-xs font-medium text-white"
                  : "flex-1 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
                : "flex-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            }
          >
            {t === "highly_recommended" && (
              <Sparkles className="mr-1 inline h-3 w-3" />
            )}
            {t === "recommended" && (
              <Award className="mr-1 inline h-3 w-3" />
            )}
            {TIER_LABELS[t]}
          </button>
        );
      })}
    </div>
  );
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

const inputClass =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary";

export default function AgentApprovalsPage() {
  const pending = usePendingAgentProfiles();
  const approve = useApproveAgentProfile();
  const reject = useRejectAgentProfile();
  const adminAdd = useAdminAddAgent();

  const [tierByProfile, setTierByProfile] = useState<
    Record<string, AgentProfileTier>
  >({});
  const [rejectTarget, setRejectTarget] = useState<AgentProfileOut | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Add consultant form state
  const [addForm, setAddForm] = useState<AdminAddAgentPayload>({
    email: "",
    first_name: "",
    last_name: "",
    omara_number: "",
    listing_type: "individual",
    tier: "verified",
    featured: false,
    specializations: [],
    languages: [],
  });
  const [addError, setAddError] = useState<string | null>(null);

  const setTier = (id: string, tier: AgentProfileTier) =>
    setTierByProfile((s) => ({ ...s, [id]: tier }));

  const handleApprove = async (profile: AgentProfileOut) => {
    const tier = tierByProfile[profile.id] ?? "verified";
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

  const handleAdminAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!addForm.first_name || !addForm.last_name || !addForm.email || !addForm.omara_number) {
      setAddError("Name, email, and OMARA number are required.");
      return;
    }
    try {
      await adminAdd.mutateAsync({
        ...addForm,
        specializations: (addForm.specializations?.length ?? 0) > 0 ? addForm.specializations : undefined,
        languages: (addForm.languages?.length ?? 0) > 0 ? addForm.languages : undefined,
        firm_name: addForm.firm_name || undefined,
        bio: addForm.bio || undefined,
        website: addForm.website || undefined,
        phone: addForm.phone || undefined,
        role: addForm.role || undefined,
        city: addForm.city || undefined,
        state: addForm.state || undefined,
        years_experience: addForm.years_experience ?? undefined,
        consultation_fee: addForm.consultation_fee ?? undefined,
        response_time_hours: addForm.response_time_hours ?? undefined,
      });
      setShowAddForm(false);
      setAddForm({
        email: "",
        first_name: "",
        last_name: "",
        omara_number: "",
        listing_type: "individual",
        tier: "verified",
        featured: false,
        specializations: [],
        languages: [],
      });
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.detail ?? "Failed to add consultant.";
      setAddError(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  const updateAdd = <K extends keyof AdminAddAgentPayload>(
    key: K,
    value: AdminAddAgentPayload[K]
  ) => {
    setAddForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <motion.div
      className="space-y-6 text-foreground"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Agent approvals
              </h2>
              <p className="text-sm text-muted-foreground">
                Review new marketplace applications or add consultants directly.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Consultant
          </Button>
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
              const tier = tierByProfile[profile.id] ?? "verified";
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
                        {profile.listing_type === "company" && (
                          <Badge variant="outline">Company</Badge>
                        )}
                        {profile.firm_name && (
                          <span className="text-sm text-muted-foreground">
                            · {profile.firm_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {profile.email}
                        {profile.phone && ` · ${profile.phone}`}
                        {profile.website && ` · ${profile.website}`}
                        {" · "}
                        {profile.city ? `${profile.city}, ${profile.state}` : "—"}{" "}
                        · Submitted{" "}
                        {profile.submitted_at
                          ? new Date(profile.submitted_at).toLocaleString()
                          : "—"}
                      </p>
                      {profile.role && (
                        <p className="text-xs text-muted-foreground">
                          Role: {profile.role}
                        </p>
                      )}
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

                    <div className="flex flex-col items-stretch gap-2 lg:w-64">
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Tier on approval
                        </p>
                        <TierSelector
                          value={tier}
                          onChange={(t) => setTier(profile.id, t)}
                        />
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

      {/* Add Consultant dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add consultant directly</DialogTitle>
            <DialogDescription>
              This consultant will be auto-approved and immediately listed in the
              directory.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdminAdd} className="space-y-5">
            {/* Listing type */}
            <div className="flex gap-2">
              {(["individual", "company"] as ListingType[]).map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => updateAdd("listing_type", type)}
                  className={
                    addForm.listing_type === type
                      ? "flex-1 rounded-md border-2 border-primary bg-primary/5 px-3 py-2 text-xs font-medium text-primary"
                      : "flex-1 rounded-md border-2 border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/30"
                  }
                >
                  {type === "individual" ? "Individual" : "Company"}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">First name *</label>
                <input required value={addForm.first_name} onChange={(e) => updateAdd("first_name", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Last name *</label>
                <input required value={addForm.last_name} onChange={(e) => updateAdd("last_name", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Email *</label>
                <input type="email" required value={addForm.email} onChange={(e) => updateAdd("email", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">OMARA number *</label>
                <input required value={addForm.omara_number} onChange={(e) => updateAdd("omara_number", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Phone</label>
                <input value={addForm.phone ?? ""} onChange={(e) => updateAdd("phone", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Website</label>
                <input value={addForm.website ?? ""} onChange={(e) => updateAdd("website", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Firm name</label>
                <input value={addForm.firm_name ?? ""} onChange={(e) => updateAdd("firm_name", e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Role</label>
                <select value={addForm.role ?? ""} onChange={(e) => updateAdd("role", e.target.value)} className={inputClass}>
                  <option value="">Select role</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">City</label>
                <select
                  value={addForm.city ?? ""}
                  onChange={(e) => {
                    const c = CITIES.find((ci) => ci.name === e.target.value);
                    updateAdd("city", e.target.value);
                    if (c) updateAdd("state", c.state);
                  }}
                  className={inputClass}
                >
                  <option value="">Select city</option>
                  {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}, {c.state}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Years experience</label>
                <input type="number" min="0" max="60" value={addForm.years_experience ?? ""} onChange={(e) => updateAdd("years_experience", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Fee (AUD)</label>
                <input type="number" min="0" value={addForm.consultation_fee ?? ""} onChange={(e) => updateAdd("consultation_fee", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Response time (hrs)</label>
                <input type="number" min="0" max="720" value={addForm.response_time_hours ?? ""} onChange={(e) => updateAdd("response_time_hours", e.target.value ? Number(e.target.value) : undefined)} className={inputClass} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Bio</label>
              <textarea rows={3} value={addForm.bio ?? ""} onChange={(e) => updateAdd("bio", e.target.value)} className={`${inputClass} resize-y`} />
            </div>

            {/* Specializations */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Specializations</label>
              <div className="flex flex-wrap gap-1.5">
                {VISA_TYPES.map((v) => {
                  const on = (addForm.specializations ?? []).includes(v);
                  return (
                    <button
                      type="button"
                      key={v}
                      onClick={() => updateAdd("specializations", toggle(addForm.specializations ?? [], v))}
                      className={on
                        ? "rounded-full border border-primary bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground"
                        : "rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-primary/40"
                      }
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Languages</label>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((l) => {
                  const on = (addForm.languages ?? []).includes(l);
                  return (
                    <button
                      type="button"
                      key={l}
                      onClick={() => updateAdd("languages", toggle(addForm.languages ?? [], l))}
                      className={on
                        ? "rounded-full border border-primary bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground"
                        : "rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-primary/40"
                      }
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tier */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Tier</label>
              <TierSelector
                value={addForm.tier ?? "verified"}
                onChange={(t) => updateAdd("tier", t)}
              />
            </div>

            {/* Featured */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addForm.featured ?? false}
                onChange={(e) => updateAdd("featured", e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Featured listing (gets priority placement)
            </label>

            {addError && (
              <p className="text-xs font-medium text-destructive">{addError}</p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button size="sm" type="submit" disabled={adminAdd.isPending}>
                {adminAdd.isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Add & Approve
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
