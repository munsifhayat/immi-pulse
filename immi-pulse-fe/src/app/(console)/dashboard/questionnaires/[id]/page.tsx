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
    <div className="space-y-6">
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
          <div className="flex flex-col items-start gap-2 sm:items-end">
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="max-w-[220px] truncate font-mono text-[11px] text-muted-foreground sm:max-w-[320px]">
                {publicUrl}
              </span>
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:border-purple/40"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:border-purple/40"
              >
                <ExternalLink className="h-3 w-3" />
                Open
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ── Builder ── */}
      <QuestionnaireBuilder
        initialName={q.name}
        initialDescription={q.description || ""}
        initialAudience={q.audience}
        initialFields={q.fields}
        questionnaireId={q.id}
        saving={saving}
        saveLabel="Save & publish"
        modeStorageKey={`questionnaire-builder-mode:${q.id}`}
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
