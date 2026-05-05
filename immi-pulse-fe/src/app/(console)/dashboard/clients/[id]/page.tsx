"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileText,
  FilePlus,
  FileSignature,
  FolderOpen,
  Loader2,
  Mail,
  PenSquare,
  Send,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  clientsApi,
  questionnairesApi,
  type ClientDetail,
  type QuestionnaireListItem,
} from "@/lib/api/services";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  query: FileText,
  precase: Briefcase,
  letter_sent: Send,
  letter_signed: FileSignature,
  payment: Wallet,
  case_opened: FolderOpen,
  case_stage: Zap,
  manual_note: PenSquare,
};

const KIND_TONE: Record<string, string> = {
  query: "bg-sky-100 text-sky-700",
  precase: "bg-violet-100 text-violet-700",
  letter_sent: "bg-amber-100 text-amber-800",
  letter_signed: "bg-emerald-100 text-emerald-700",
  payment: "bg-emerald-100 text-emerald-700",
  case_opened: "bg-emerald-100 text-emerald-700",
  case_stage: "bg-blue-100 text-blue-700",
  manual_note: "bg-muted text-muted-foreground",
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [showSendQ, setShowSendQ] = useState(false);
  const [showOpenCase, setShowOpenCase] = useState(false);
  const [showLink, setShowLink] = useState<{ url: string; note: string } | null>(null);

  const load = useCallback(async () => {
    const c = await clientsApi.get(params.id);
    setClient(c);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!client) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/dashboard/clients" className="hover:text-foreground">
          Clients
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{client.name || client.primary_email}</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-lg font-semibold text-white"
            aria-hidden
          >
            {(client.name || client.primary_email)[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {client.name || client.primary_email}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {client.primary_email}
              </span>
              {client.phone && <span>{client.phone}</span>}
              {client.country && <span>{client.country}</span>}
              {client.first_seen_at && (
                <span>
                  In your funnel since {new Date(client.first_seen_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowSendQ(true)} className="gap-2">
            <Send className="h-4 w-4" />
            Send form
          </Button>
          <Button onClick={() => setShowOpenCase(true)} className="gap-2">
            <FilePlus className="h-4 w-4" />
            Open case directly
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Queries" value={client.queries.length} />
        <StatCard label="Pre-cases in flight" value={client.precases.length} />
        <StatCard label="Cases" value={client.cases.length} accent />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {client.history.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            ) : (
              <ol className="space-y-4">
                {client.history.map((h, i) => {
                  const Icon = KIND_ICON[h.kind] ?? FileText;
                  const tone = KIND_TONE[h.kind] ?? "bg-muted";
                  return (
                    <li key={i} className="flex gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          tone
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 border-b border-border/40 pb-3 last:border-0">
                        <p className="text-sm font-medium">{h.title}</p>
                        {h.detail && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {h.detail}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(h.occurred_at).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {client.cases.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Cases</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {client.cases.map((c) => (
                  <Link
                    key={String(c.id)}
                    href={`/dashboard/cases/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <div>
                      <p className="font-medium">
                        {String(c.visa_subclass || "Case")} {c.visa_name ? `· ${c.visa_name}` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">{String(c.stage)}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {client.precases.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Pre-cases in flight</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {client.precases.map((p) => (
                  <Link
                    key={String(p.id)}
                    href={`/dashboard/precases/${p.id}`}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <div>
                      <p className="font-medium capitalize">{String(p.status).replace(/_/g, " ")}</p>
                      <p className="line-clamp-1 text-[10px] text-muted-foreground">
                        {String(p.ai_summary ?? "")}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {client.queries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">In inbox</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {client.queries.map((q) => (
                  <Link
                    key={String(q.id)}
                    href={`/dashboard/inbox/${q.id}`}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <div>
                      <p className="font-medium capitalize">{String(q.status)}</p>
                      <p className="line-clamp-1 text-[10px] text-muted-foreground">
                        {String(q.ai_summary ?? "")}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SendQuestionnaireDialog
        open={showSendQ}
        onClose={() => setShowSendQ(false)}
        clientId={client.id}
        clientName={client.name || client.primary_email}
        onSent={(info) => {
          setShowSendQ(false);
          setShowLink(info);
        }}
      />
      <ShareLinkDialog
        info={showLink}
        onClose={() => setShowLink(null)}
      />
      <OpenCaseDirectDialog
        open={showOpenCase}
        onClose={() => setShowOpenCase(false)}
        clientId={client.id}
        onOpened={(caseId) => {
          setShowOpenCase(false);
          router.push(`/dashboard/cases/${caseId}`);
        }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "border-border/60 px-4 py-3",
        accent && "border-emerald-200 bg-emerald-50/40"
      )}
    >
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </Card>
  );
}

function SendQuestionnaireDialog({
  open,
  onClose,
  clientId,
  clientName,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onSent: (info: { url: string; note: string }) => void;
}) {
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      questionnairesApi.list().then((qs) => {
        const active = qs.filter((q) => q.is_active);
        setQuestionnaires(active);
        if (active[0]) setSelectedId(active[0].id);
      });
      setNote(`Hi ${clientName}, please complete this short intake form so we can review your case.`);
    }
  }, [open, clientName]);

  const submit = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const r = await clientsApi.sendQuestionnaire(clientId, {
        questionnaire_id: selectedId,
        personal_note: note || undefined,
      });
      onSent({ url: r.public_link, note: r.note });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send a form to this client</DialogTitle>
          <DialogDescription>
            Generates a personalised public link with the email pre-filled.
            Send it via email, WhatsApp, or any channel.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="qsel" className="text-xs">Form</Label>
            <select
              id="qsel"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {questionnaires.length === 0 && <option value="">No active forms</option>}
              {questionnaires.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="note" className="text-xs">Personal note (optional)</Label>
            <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !selectedId} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareLinkDialog({
  info,
  onClose,
}: {
  info: { url: string; note: string } | null;
  onClose: () => void;
}) {
  if (!info) return null;
  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Personalised link ready</DialogTitle>
          <DialogDescription>
            Copy and send this to your client. The note is just a suggestion —
            paste whatever feels right for your channel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Link</Label>
            <div className="mt-1 flex items-center gap-2">
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
          <div>
            <Label className="text-xs">Suggested note</Label>
            <Textarea value={info.note} readOnly rows={3} className="mt-1 text-xs" />
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => navigator.clipboard.writeText(`${info.note}\n\n${info.url}`)}
            >
              <ClipboardCheck className="mr-1.5 h-3 w-3" />
              Copy note + link
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OpenCaseDirectDialog({
  open,
  onClose,
  clientId,
  onOpened,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  onOpened: (caseId: string) => void;
}) {
  const [visaSubclass, setVisaSubclass] = useState("");
  const [visaName, setVisaName] = useState("");
  const [skipReason, setSkipReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await clientsApi.openCaseDirect(clientId, {
        visa_subclass: visaSubclass || undefined,
        visa_name: visaName || undefined,
        skip_reason: skipReason || "Client engaged offline",
        notes: notes || undefined,
      });
      onOpened(r.case_id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Open a case directly</DialogTitle>
          <DialogDescription>
            Skip the inbox and pre-case ladder — open a case immediately for this
            client. Use when the client has engaged offline (relative case,
            walk-in, paper agreement, etc.).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="ocsub" className="text-xs">Visa subclass</Label>
              <Input id="ocsub" value={visaSubclass} onChange={(e) => setVisaSubclass(e.target.value)} placeholder="482" />
            </div>
            <div>
              <Label htmlFor="ocname" className="text-xs">Visa name</Label>
              <Input id="ocname" value={visaName} onChange={(e) => setVisaName(e.target.value)} placeholder="TSS" />
            </div>
          </div>
          <div>
            <Label htmlFor="ocsr" className="text-xs">Why skip the pre-case ladder?</Label>
            <Input
              id="ocsr"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Relative case · paper agreement signed in person"
            />
          </div>
          <div>
            <Label htmlFor="ocn" className="text-xs">Notes (optional)</Label>
            <Textarea id="ocn" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Open case
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
