"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileSignature,
  Loader2,
  MoreVertical,
  RefreshCw,
  Send,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  preCasesApi,
  lettersApi,
  paymentsApi,
  type PreCaseDetail,
  type LetterOut,
  type PaymentRecord,
  type FeeLine,
  type PaymentMethod,
} from "@/lib/api/services";
import { cn } from "@/lib/utils";

const OUTCOME_LABEL: Record<string, { label: string; tone: string }> = {
  likely_fit: { label: "Likely fit", tone: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  needs_info: { label: "Needs info", tone: "bg-amber-100 text-amber-700 border-amber-200" },
  paid_consult: { label: "Paid consult", tone: "bg-violet-100 text-violet-700 border-violet-200" },
  unlikely_fit: { label: "Unlikely fit", tone: "bg-rose-100 text-rose-700 border-rose-200" },
};

type Stage = "inbox" | "qualified" | "letter_sent" | "letter_signed" | "paid" | "converted" | "archived";

function stageOf(status: string): Stage {
  if (status === "pending" || status === "in_review") return "inbox";
  if (status === "qualified") return "qualified";
  if (status === "letter_sent") return "letter_sent";
  if (status === "letter_signed") return "letter_signed";
  if (status === "paid") return "paid";
  if (status === "converted") return "converted";
  return "archived";
}

const STAGE_ORDER: Stage[] = ["inbox", "qualified", "letter_sent", "letter_signed", "paid", "converted"];
const STAGE_LABELS: Record<Stage, string> = {
  inbox: "Inbox",
  qualified: "Qualified",
  letter_sent: "Letter sent",
  letter_signed: "Signed",
  paid: "Paid",
  converted: "Case open",
  archived: "Archived",
};

export function PreCaseDetail({ precaseId }: { precaseId: string }) {
  const router = useRouter();
  const [pc, setPc] = useState<PreCaseDetail | null>(null);
  const [letter, setLetter] = useState<LetterOut | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Modals
  const [showLetterCompose, setShowLetterCompose] = useState(false);
  const [showLetterSent, setShowLetterSent] = useState<{ url: string; pin: string; expires: string } | null>(null);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showSkipPayment, setShowSkipPayment] = useState(false);
  const [showMarkSignedManual, setShowMarkSignedManual] = useState(false);
  const [showForceConvert, setShowForceConvert] = useState(false);

  const load = useCallback(async () => {
    const detail = await preCasesApi.get(precaseId);
    setPc(detail);
    const [lt, pays] = await Promise.all([
      lettersApi.getForPreCase(precaseId).catch(() => null),
      paymentsApi.list({ pre_case_id: precaseId }).catch(() => []),
    ]);
    setLetter(lt);
    setPayments(pays);
    setLoading(false);
  }, [precaseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !pc) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const stage = stageOf(pc.status);
  const outcome = pc.ai_suggested_outcome ? OUTCOME_LABEL[pc.ai_suggested_outcome] : null;
  const fieldByKey = new Map((pc.questionnaire_fields || []).map((f) => [f.key, f.label]));

  const qualify = async () => {
    setBusy(true);
    try {
      const updated = await preCasesApi.qualify(pc.id);
      setPc(updated);
      router.push(`/dashboard/precases/${pc.id}`);
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!confirm("Archive this pre-case? You can find it in archived later.")) return;
    setBusy(true);
    try {
      await preCasesApi.archive(pc.id);
      router.push(stage === "inbox" ? "/dashboard/inbox" : "/dashboard/precases");
    } finally {
      setBusy(false);
    }
  };

  const promote = async () => {
    setBusy(true);
    try {
      const result = await preCasesApi.promote(pc.id);
      router.push(`/dashboard/cases/${result.case_id}`);
    } finally {
      setBusy(false);
    }
  };

  const retriggerAi = async () => {
    setBusy(true);
    try {
      await preCasesApi.retriggerAi(pc.id);
      setTimeout(load, 1500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href={stage === "inbox" ? "/dashboard/inbox" : "/dashboard/precases"} className="hover:text-foreground">
          {stage === "inbox" ? "Inbox" : "Pre-cases"}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{pc.client_name || pc.client_email || "Anonymous"}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {pc.client_name || pc.client_email || "Anonymous"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {pc.client_email && <span>{pc.client_email}</span>}
            {pc.questionnaire_name && (
              <>
                <span>·</span>
                <span>{pc.questionnaire_name}</span>
              </>
            )}
            {pc.submitted_at && (
              <>
                <span>·</span>
                <span>Submitted {new Date(pc.submitted_at).toLocaleDateString()}</span>
              </>
            )}
            {outcome && (
              <Badge variant="outline" className={cn("text-[11px]", outcome.tone)}>
                {outcome.label}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {stage === "converted" && pc.promoted_case_id && (
            <Button asChild>
              <Link href={`/dashboard/cases/${pc.promoted_case_id}`}>
                Open case <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}

          {stage === "inbox" && (
            <Button onClick={qualify} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Mark qualified
            </Button>
          )}

          {stage === "qualified" && (
            <Button onClick={() => setShowLetterCompose(true)} className="gap-2">
              <FileSignature className="h-4 w-4" />
              Send engagement letter
            </Button>
          )}

          {stage === "letter_sent" && (
            <Button variant="outline" onClick={() => setShowMarkSignedManual(true)} className="gap-2">
              <CheckCheck className="h-4 w-4" />
              Mark signed manually
            </Button>
          )}

          {stage === "letter_signed" && (
            <Button onClick={() => setShowRecordPayment(true)} className="gap-2">
              <Wallet className="h-4 w-4" />
              Record payment
            </Button>
          )}

          {stage === "paid" && (
            <Button onClick={promote} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Convert to case
            </Button>
          )}

          {/* Manual override menu (always available except converted) */}
          {stage !== "converted" && stage !== "archived" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={busy}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs">Manual overrides</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {stage !== "letter_signed" && stage !== "paid" && (
                  <DropdownMenuItem onClick={() => setShowMarkSignedManual(true)}>
                    Mark letter signed manually
                  </DropdownMenuItem>
                )}
                {stage !== "paid" && (
                  <DropdownMenuItem onClick={() => setShowSkipPayment(true)}>
                    Skip payment (relative / pro-bono)
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowForceConvert(true)}>
                  Force convert to case
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={retriggerAi}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Re-run AI triage
                </DropdownMenuItem>
                <DropdownMenuItem onClick={archive} className="text-destructive">
                  <Archive className="mr-2 h-3.5 w-3.5" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Stage stepper */}
      <StageStepper stage={stage} pc={pc} />

      {/* Two-column layout */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Left: AI summary + answers */}
        <div className="space-y-4">
          {pc.ai_summary && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">AI summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{pc.ai_summary}</p>
                {pc.ai_extracted && Object.keys(pc.ai_extracted).length > 0 && (
                  <dl className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                    {Object.entries(pc.ai_extracted).map(([k, v]) => (
                      <div key={k} className="min-w-0">
                        <dt className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
                          {k.replace(/_/g, " ")}
                        </dt>
                        <dd className="truncate text-[13px] text-foreground">
                          {String(v ?? "—")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>
          )}

          {Object.keys(pc.answers).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Questionnaire answers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  {Object.entries(pc.answers).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs font-medium text-muted-foreground">
                        {fieldByKey.get(key) || key}
                      </dt>
                      <dd className="mt-0.5 text-sm">
                        {Array.isArray(value)
                          ? value.join(", ")
                          : typeof value === "boolean"
                          ? value
                            ? "Yes"
                            : "No"
                          : String(value ?? "—")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: lifecycle status */}
        <div className="space-y-4">
          {/* Engagement letter card */}
          {(stage === "qualified" ||
            stage === "letter_sent" ||
            stage === "letter_signed" ||
            stage === "paid" ||
            stage === "converted") && (
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Engagement letter</CardTitle>
                {letter?.status === "signed" && (
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                    Signed
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {!letter && stage === "qualified" && (
                  <p className="text-xs text-muted-foreground">
                    No letter sent yet. Click &quot;Send engagement letter&quot; above.
                  </p>
                )}
                {letter && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {letter.status === "sent" && "Awaiting client signature"}
                      {letter.status === "signed" &&
                        `Signed ${letter.signed_at ? new Date(letter.signed_at).toLocaleDateString() : ""}`}
                      {letter.status === "voided" && "Voided"}
                      {letter.status === "superseded" && "Replaced by newer letter"}
                    </p>
                    {letter.sign_url && letter.status === "sent" && (
                      <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Signing link
                        </p>
                        <div className="flex items-center gap-2">
                          <Input value={letter.sign_url} readOnly className="text-xs" />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(letter.sign_url!)}
                          >
                            Copy
                          </Button>
                        </div>
                        {letter.sign_link_expires_at && (
                          <p className="text-[10px] text-muted-foreground">
                            Expires {new Date(letter.sign_link_expires_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                    {pc.skipped_letter && (
                      <p className="text-[11px] text-orange-700">⚠ {pc.skipped_letter}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payments card */}
          {(stage === "letter_signed" ||
            stage === "paid" ||
            stage === "converted") && (
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Payments</CardTitle>
                {payments.length > 0 && (
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                    Received
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {payments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No payment recorded yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {payments.map((p) => (
                      <li key={p.id} className="rounded-lg bg-muted/30 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">A${p.amount_aud}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {p.method.replace("_", " ")}
                          </Badge>
                        </div>
                        {p.reference && (
                          <p className="mt-1 text-muted-foreground">Ref: {p.reference}</p>
                        )}
                        {p.notes && (
                          <p className="mt-1 italic text-muted-foreground">{p.notes}</p>
                        )}
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {p.receipt_number} · {new Date(p.received_at).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {pc.skipped_payment && (
                  <p className="text-[11px] text-orange-700">⚠ {pc.skipped_payment}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Client card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{pc.client_name || "—"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{pc.client_email || "—"}</p>
              {pc.client_id && (
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href={`/dashboard/clients/${pc.client_id}`}>
                    View client profile
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <LetterComposeDialog
        open={showLetterCompose}
        onClose={() => setShowLetterCompose(false)}
        precaseId={pc.id}
        clientName={pc.client_name || ""}
        defaultVisaSubclass={String(pc.ai_extracted?.visa_interest || pc.ai_extracted?.visa_subclass || "")}
        onSent={(result) => {
          setShowLetterCompose(false);
          setShowLetterSent({
            url: result.sign_url,
            pin: result.sign_pin,
            expires: result.expires_at,
          });
          load();
        }}
      />
      <LetterSentDialog
        open={!!showLetterSent}
        info={showLetterSent}
        onClose={() => setShowLetterSent(null)}
      />
      <RecordPaymentDialog
        open={showRecordPayment}
        onClose={() => setShowRecordPayment(false)}
        precaseId={pc.id}
        onRecorded={() => {
          setShowRecordPayment(false);
          load();
        }}
      />
      <SkipPaymentDialog
        open={showSkipPayment}
        onClose={() => setShowSkipPayment(false)}
        precaseId={pc.id}
        onSkipped={() => {
          setShowSkipPayment(false);
          load();
        }}
      />
      <MarkSignedManualDialog
        open={showMarkSignedManual}
        onClose={() => setShowMarkSignedManual(false)}
        precaseId={pc.id}
        clientName={pc.client_name || ""}
        onMarked={() => {
          setShowMarkSignedManual(false);
          load();
        }}
      />
      <ForceConvertDialog
        open={showForceConvert}
        onClose={() => setShowForceConvert(false)}
        precaseId={pc.id}
        onConverted={(caseId) => {
          setShowForceConvert(false);
          router.push(`/dashboard/cases/${caseId}`);
        }}
      />
    </div>
  );
}

function StageStepper({ stage, pc }: { stage: Stage; pc: PreCaseDetail }) {
  if (stage === "archived") {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-3">
          <p className="text-center text-xs text-muted-foreground">
            This pre-case was archived.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentIndex = STAGE_ORDER.indexOf(stage);
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STAGE_ORDER.map((s, i) => {
            const isDone = i < currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 min-w-7 items-center justify-center rounded-full text-[11px] font-medium",
                    isDone && "bg-emerald-100 text-emerald-700",
                    isCurrent && "bg-primary text-primary-foreground",
                    !isDone && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap text-xs",
                    isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {STAGE_LABELS[s]}
                </span>
                {i < STAGE_ORDER.length - 1 && (
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Modals ──────────────────────────────────────────────────────────────────

function LetterComposeDialog({
  open,
  onClose,
  precaseId,
  clientName,
  defaultVisaSubclass,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  precaseId: string;
  clientName: string;
  defaultVisaSubclass: string;
  onSent: (r: { letter_id: string; sign_url: string; sign_pin: string; expires_at: string }) => void;
}) {
  const [visaSubclass, setVisaSubclass] = useState(defaultVisaSubclass);
  const [visaName, setVisaName] = useState("");
  const [scope, setScope] = useState("Lodgement of visa application and supporting submissions.");
  const [profFee, setProfFee] = useState("4500");
  const [disbursements, setDisbursements] = useState("1455");
  const [retainer, setRetainer] = useState("1500");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setVisaSubclass(defaultVisaSubclass);
    }
  }, [open, defaultVisaSubclass]);

  const send = async () => {
    setBusy(true);
    try {
      const fee_lines: FeeLine[] = [];
      if (Number(profFee) > 0)
        fee_lines.push({ label: "Professional fees", amount_aud: profFee, kind: "professional_fee" });
      if (Number(disbursements) > 0)
        fee_lines.push({ label: "Disbursements (VAC + medicals etc.)", amount_aud: disbursements, kind: "disbursement" });
      if (Number(retainer) > 0)
        fee_lines.push({ label: "Retainer (due now)", amount_aud: retainer, kind: "retainer" });

      const result = await lettersApi.send(precaseId, {
        compose: {
          visa_subclass: visaSubclass || undefined,
          visa_name: visaName || undefined,
          scope,
          fee_lines,
        },
        expires_in_days: 14,
      });
      onSent(result);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send engagement letter</DialogTitle>
          <DialogDescription>
            Compose for {clientName || "this client"}. We&apos;ll mint a secure link
            with a 6-digit PIN you can share separately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="vsub" className="text-xs">Visa subclass</Label>
              <Input id="vsub" value={visaSubclass} onChange={(e) => setVisaSubclass(e.target.value)} placeholder="482" />
            </div>
            <div>
              <Label htmlFor="vname" className="text-xs">Visa name</Label>
              <Input id="vname" value={visaName} onChange={(e) => setVisaName(e.target.value)} placeholder="TSS work visa" />
            </div>
          </div>
          <div>
            <Label htmlFor="scope" className="text-xs">Scope of work</Label>
            <Textarea id="scope" value={scope} onChange={(e) => setScope(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="pf" className="text-xs">Professional A$</Label>
              <Input id="pf" type="number" value={profFee} onChange={(e) => setProfFee(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="db" className="text-xs">Disbursements A$</Label>
              <Input id="db" type="number" value={disbursements} onChange={(e) => setDisbursements(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rt" className="text-xs">Retainer A$</Label>
              <Input id="rt" type="number" value={retainer} onChange={(e) => setRetainer(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send letter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LetterSentDialog({
  open,
  info,
  onClose,
}: {
  open: boolean;
  info: { url: string; pin: string; expires: string } | null;
  onClose: () => void;
}) {
  if (!info) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Letter ready to share</DialogTitle>
          <DialogDescription>
            Send this link to your client over the channel they prefer (email,
            WhatsApp, SMS). Send the PIN over a different channel for security.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Signing link</Label>
            <div className="flex items-center gap-2">
              <Input value={info.url} readOnly className="text-xs" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(info.url)}
              >
                Copy
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">PIN (share separately)</Label>
            <div className="flex items-center gap-2">
              <Input value={info.pin} readOnly className="font-mono text-base tracking-widest" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(info.pin)}
              >
                Copy
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              The PIN is shown only once. If lost, void this letter and resend.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Expires {new Date(info.expires).toLocaleDateString()}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({
  open,
  onClose,
  precaseId,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  precaseId: string;
  onRecorded: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [amount, setAmount] = useState("1500");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await paymentsApi.record({
        pre_case_id: precaseId,
        method,
        amount_aud: amount,
        reference: reference || undefined,
        received_at: new Date(receivedAt).toISOString(),
        notes: notes || undefined,
      });
      onRecorded();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment received</DialogTitle>
          <DialogDescription>
            Stripe webhook will land here automatically once it&apos;s wired. For
            now, record bank transfers, PayID, BPAY, cash or cheque manually.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="method" className="text-xs">Method</Label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="bank_transfer">Bank transfer (EFT)</option>
              <option value="payid">PayID</option>
              <option value="bpay">BPAY</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="amt" className="text-xs">Amount A$</Label>
              <Input id="amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rcv" className="text-xs">Received on</Label>
              <Input id="rcv" type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="ref" className="text-xs">Reference (optional)</Label>
            <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank ref / cheque #" />
          </div>
          <div>
            <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SkipPaymentDialog({
  open,
  onClose,
  precaseId,
  onSkipped,
}: {
  open: boolean;
  onClose: () => void;
  precaseId: string;
  onSkipped: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await paymentsApi.skip({ pre_case_id: precaseId, reason });
      onSkipped();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Skip payment</DialogTitle>
          <DialogDescription>
            Record this pre-case as paid without a payment (e.g. relative
            case, pro-bono work). A $0 waiver record is added for audit.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="reason" className="text-xs">Reason</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Family member — no fee charged"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !reason.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Skip payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkSignedManualDialog({
  open,
  onClose,
  precaseId,
  clientName,
  onMarked,
}: {
  open: boolean;
  onClose: () => void;
  precaseId: string;
  clientName: string;
  onMarked: () => void;
}) {
  const [signerName, setSignerName] = useState(clientName);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setSignerName(clientName);
  }, [open, clientName]);

  const submit = async () => {
    if (!reason.trim() || !signerName.trim()) return;
    setBusy(true);
    try {
      await lettersApi.markSignedManually(precaseId, {
        signer_name: signerName,
        method: "consultant_attest",
        reason,
      });
      onMarked();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark engagement letter signed manually</DialogTitle>
          <DialogDescription>
            Use this when the client signed offline (paper, in person, video
            call) instead of via the e-sign portal. Your attestation is logged.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="sname" className="text-xs">Signer&apos;s full name</Label>
            <Input id="sname" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mr" className="text-xs">Reason / how it was signed</Label>
            <Textarea
              id="mr"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Signed in person at office on 2 May 2026"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !reason.trim() || !signerName.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark signed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ForceConvertDialog({
  open,
  onClose,
  precaseId,
  onConverted,
}: {
  open: boolean;
  onClose: () => void;
  precaseId: string;
  onConverted: (caseId: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [visaSubclass, setVisaSubclass] = useState("");
  const [visaName, setVisaName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      const r = await preCasesApi.forceConvert(precaseId, {
        reason,
        visa_subclass: visaSubclass || undefined,
        visa_name: visaName || undefined,
      });
      onConverted(r.case_id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Force-convert to case</DialogTitle>
          <DialogDescription>
            Skip any remaining gates and open the case immediately. Use sparingly
            — both the skipped letter and skipped payment are logged in the audit
            trail.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="fcvsub" className="text-xs">Visa subclass</Label>
              <Input id="fcvsub" value={visaSubclass} onChange={(e) => setVisaSubclass(e.target.value)} placeholder="482" />
            </div>
            <div>
              <Label htmlFor="fcvname" className="text-xs">Visa name</Label>
              <Input id="fcvname" value={visaName} onChange={(e) => setVisaName(e.target.value)} placeholder="TSS" />
            </div>
          </div>
          <div>
            <Label htmlFor="fcr" className="text-xs">Reason</Label>
            <Textarea
              id="fcr"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Engagement signed offline, retainer received via international wire — proceeding."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !reason.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Force convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
