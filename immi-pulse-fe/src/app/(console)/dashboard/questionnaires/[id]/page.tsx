"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuestionnaireBuilder } from "@/components/QuestionnaireBuilder";
import { questionnairesApi, type Questionnaire } from "@/lib/api/services";
import { Copy, ExternalLink, Loader2, Check } from "lucide-react";

export default function EditQuestionnairePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [q, setQ] = useState<Questionnaire | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    questionnairesApi.get(params.id).then(setQ);
  }, [params.id]);

  if (!q) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-purple" />
          <span className="font-mono-d text-[10.5px] uppercase tracking-[0.28em]">
            Loading questionnaire
          </span>
        </div>
      </div>
    );
  }

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/q/${q.slug}`
      : `/q/${q.slug}`;

  const onCopy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-10">
      {/* ── Page header — editorial folio ── */}
      <header>
        <div className="editorial-eyebrow">Folio nº 006 · Form editor</div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="editorial-title">
              <span className="title-accent"><em>{q.name}</em></span>
            </h1>
            <p className="mt-3 max-w-[60ch] text-[14px] leading-[1.6] text-muted-foreground">
              Edit the form below. Saving creates a new version — past responses
              keep their original schema.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono-d text-[10px] uppercase tracking-[0.2em] ${
                q.is_active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  q.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"
                }`}
              />
              {q.is_active ? "Active" : "Paused"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Public link panel ── */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border/60 bg-muted/40 px-6 py-3.5">
          <span className="font-mono-d text-[10.5px] uppercase tracking-[0.28em] text-purple">
            Public link
          </span>
          <span className="hidden text-[12px] text-muted-foreground sm:inline">
            · Share anywhere — submissions land in your Pre-Cases inbox
          </span>
        </div>
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center">
          <div className="flex-1 overflow-hidden rounded-lg border border-border bg-background px-3.5 py-2.5">
            <span className="block truncate font-mono text-[13px] text-foreground">
              {publicUrl}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5 text-[13px] font-medium text-foreground transition-all hover:border-purple/40 hover:bg-purple/5 hover:text-purple"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5 text-[13px] font-medium text-foreground transition-all hover:border-purple/40 hover:bg-purple/5 hover:text-purple"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
          </div>
        </div>
      </section>

      {/* ── Builder ── */}
      <QuestionnaireBuilder
        initialName={q.name}
        initialDescription={q.description || ""}
        initialAudience={q.audience}
        initialFields={q.fields}
        saving={saving}
        saveLabel="Save changes"
        onSave={async (payload) => {
          setSaving(true);
          try {
            await questionnairesApi.update(q.id, payload);
            router.push("/dashboard/questionnaires");
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
