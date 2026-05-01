"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Archive, ArrowRight, RefreshCw } from "lucide-react";
import {
  preCasesApi,
  checkpointsApi,
  type PreCaseDetail,
  type Checkpoint,
} from "@/lib/api/services";
import { CheckpointDialog } from "@/components/CheckpointDialog";

const OUTCOME_LABEL: Record<string, { label: string; tone: string }> = {
  likely_fit: { label: "Likely fit", tone: "bg-green-50 text-green-700 border-green-200" },
  needs_info: { label: "Needs more info", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  paid_consult: { label: "Paid consultation", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  unlikely_fit: { label: "Unlikely fit", tone: "bg-red-50 text-red-700 border-red-200" },
};

export default function PreCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [pc, setPc] = useState<PreCaseDetail | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showCheckpoint, setShowCheckpoint] = useState(false);

  const load = useCallback(async () => {
    const detail = await preCasesApi.get(params.id);
    setPc(detail);
    const cps = await checkpointsApi.list({ pre_case_id: params.id });
    setCheckpoints(cps);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !pc) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const outcome = pc.ai_suggested_outcome ? OUTCOME_LABEL[pc.ai_suggested_outcome] : null;
  const fieldByKey = new Map((pc.questionnaire_fields || []).map((f) => [f.key, f.label]));

  const archive = async () => {
    setBusy(true);
    try {
      await preCasesApi.archive(pc.id);
      router.push("/dashboard/precases");
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
      // Wait briefly and reload — triage runs async
      setTimeout(load, 1500);
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (id: string) => {
    await checkpointsApi.markPaid(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/precases")}
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Back to inbox
          </button>
          <h1 className="mt-1 text-2xl font-semibold">
            {pc.client_name || pc.client_email || "Anonymous"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {pc.client_email} · submitted via &ldquo;{pc.questionnaire_name}&rdquo;
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pc.status === "promoted" ? (
            <Badge variant="default">Promoted to case</Badge>
          ) : pc.status === "archived" ? (
            <Badge variant="outline">Archived</Badge>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Answers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(pc.answers || {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">No answers recorded.</p>
            ) : (
              Object.entries(pc.answers).map(([key, val]) => (
                <div key={key} className="border-l-2 border-muted pl-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {fieldByKey.get(key) || key}
                  </p>
                  <p className="text-sm">
                    {Array.isArray(val) ? val.join(", ") : (val as string)?.toString() || "—"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI suggestion
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={retriggerAi} disabled={busy}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pc.ai_status === "pending" || pc.ai_status === "running" ? (
                <p className="text-xs text-muted-foreground">AI triage running…</p>
              ) : pc.ai_status === "succeeded" ? (
                <>
                  {outcome && (
                    <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${outcome.tone}`}>
                      {outcome.label}
                    </div>
                  )}
                  {pc.ai_summary && (
                    <p className="text-sm text-foreground">{pc.ai_summary}</p>
                  )}
                  {typeof pc.ai_confidence === "number" && (
                    <p className="text-[11px] text-muted-foreground">
                      Confidence: {(pc.ai_confidence * 100).toFixed(0)}%
                    </p>
                  )}
                  {pc.ai_extracted && Object.keys(pc.ai_extracted).length > 0 && (
                    <div className="space-y-1 pt-2">
                      <p className="text-xs font-medium">Key facts</p>
                      {Object.entries(pc.ai_extracted).map(([k, v]) => (
                        <p key={k} className="text-xs text-muted-foreground">
                          <span className="font-medium">{k}:</span> {v as string}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  AI suggestion unavailable. Review the answers and decide manually.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pc.status !== "promoted" && (
                <>
                  <Button
                    className="w-full"
                    onClick={() => setShowCheckpoint(true)}
                    disabled={busy}
                  >
                    Send checkpoint & promote
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={promote}
                    disabled={busy}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Promote without checkpoint
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={archive}
                    disabled={busy}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive (not a fit)
                  </Button>
                </>
              )}
              {pc.status === "promoted" && pc.promoted_case_id && (
                <Button
                  className="w-full"
                  onClick={() => router.push(`/dashboard/cases/${pc.promoted_case_id}`)}
                >
                  Open case →
                </Button>
              )}
            </CardContent>
          </Card>

          {checkpoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Checkpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {checkpoints.map((cp) => (
                  <div key={cp.id} className="space-y-1.5 rounded border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{cp.title}</p>
                      <Badge
                        variant={
                          cp.status === "paid"
                            ? "default"
                            : cp.status === "sent"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {cp.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AUD {cp.amount_aud} · {cp.type}
                    </p>
                    {cp.payment_link_url && (
                      <p className="text-[11px] text-muted-foreground break-all">
                        {cp.payment_link_url}
                      </p>
                    )}
                    {cp.status === "sent" && (
                      <Button size="sm" variant="outline" onClick={() => markPaid(cp.id)}>
                        Mark paid
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CheckpointDialog
        open={showCheckpoint}
        onOpenChange={setShowCheckpoint}
        preCaseId={pc.id}
        onCreated={async (cp) => {
          // Auto-promote after sending checkpoint
          const result = await preCasesApi.promote(pc.id);
          // Re-attach checkpoint to the newly created case (simpler in MVP: just navigate)
          router.push(`/dashboard/cases/${result.case_id}`);
        }}
      />
    </div>
  );
}
