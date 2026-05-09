"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { QuestionnaireBuilder } from "@/components/QuestionnaireBuilder";
import { questionnairesApi } from "@/lib/api/services";
import {
  TEMPLATES,
  ACCENT_CLASSES,
  type QuestionnaireTemplate,
} from "@/lib/questionnaire-templates";

export default function NewQuestionnairePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [chosen, setChosen] = useState<QuestionnaireTemplate | null>(null);

  if (!chosen) {
    return <TemplatePicker onPick={setChosen} />;
  }

  return (
    <div className="space-y-10">
      <header>
        <button
          type="button"
          onClick={() => setChosen(null)}
          className="inline-flex items-center gap-1.5 font-mono-d text-[10.5px] uppercase tracking-[0.28em] text-muted-foreground transition-colors hover:text-purple"
        >
          <ArrowLeft className="h-3 w-3" />
          Choose another template
        </button>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="editorial-eyebrow">
              Folio nº 006 · {chosen.shortName} template
            </div>
            <h1 className="mt-3 editorial-title">
              <span className="title-accent">
                <em>{chosen.name}</em>
              </span>
            </h1>
            <p className="mt-3 max-w-[60ch] text-[14px] leading-[1.6] text-muted-foreground">
              {chosen.description} Tweak the questions below before publishing.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple/20 bg-purple/[0.06] px-3 py-1 font-mono-d text-[10px] uppercase tracking-[0.22em] text-purple-deep">
            <Sparkles className="h-3 w-3" />
            Pre-filled · {chosen.fields.length}{" "}
            {chosen.fields.length === 1 ? "question" : "questions"}
          </span>
        </div>
      </header>

      <QuestionnaireBuilder
        initialName={chosen.name}
        initialDescription={chosen.description}
        initialAudience={chosen.audience}
        initialFields={chosen.fields}
        saving={saving}
        saveLabel="Save & publish"
        onSave={async (payload) => {
          setSaving(true);
          try {
            const result = await questionnairesApi.create(payload);
            router.push(`/dashboard/questionnaires/${result.id}`);
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}

/* ────────────────────────────  Template picker  ──────────────────────────── */

function TemplatePicker({
  onPick,
}: {
  onPick: (t: QuestionnaireTemplate) => void;
}) {
  const real = TEMPLATES.filter((t) => t.id !== "blank");
  const blank = TEMPLATES.find((t) => t.id === "blank")!;

  return (
    <div className="space-y-12">
      {/* Header */}
      <header>
        <div className="editorial-eyebrow">Folio nº 006 · New form</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <h1 className="editorial-title">
              Choose a <span className="title-accent"><em>starting point</em></span>.
            </h1>
            <p className="mt-3 max-w-[64ch] text-[14px] leading-[1.6] text-muted-foreground">
              Each template comes pre-loaded with the right questions for that
              audience. You can rename, reorder, and edit anything before
              publishing — these are starting points, not rules.
            </p>
          </div>
          <div className="hidden font-mono-d text-[10.5px] uppercase tracking-[0.28em] text-muted-foreground sm:block">
            {real.length} templates · 1 blank
          </div>
        </div>
      </header>

      {/* Always-collected reassurance */}
      <div className="flex items-start gap-3 rounded-2xl border border-purple/15 bg-purple/[0.04] px-5 py-4">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-purple-deep" />
        <p className="text-[13px] leading-[1.6] text-foreground">
          <span className="font-medium">Always collected on every form:</span>{" "}
          <span className="text-muted-foreground">
            first name, last name, email, and phone. The questions below are{" "}
            <span className="font-medium text-foreground">added on top</span> for
            this specific audience.
          </span>
        </p>
      </div>

      {/* Template grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.06 } },
        }}
        className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
      >
        {real.map((t) => (
          <TemplateCard key={t.id} template={t} onPick={onPick} />
        ))}
      </motion.div>

      {/* Blank option */}
      <div>
        <div className="editorial-rule" />
        <button
          type="button"
          onClick={() => onPick(blank)}
          className="group mt-6 flex w-full items-center justify-between gap-4 rounded-2xl border border-dashed border-border bg-card/40 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-card"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
              <blank.icon className="h-4 w-4" />
            </span>
            <div>
              <div className="font-mono-d text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
                {blank.shortName}
              </div>
              <div className="mt-0.5 font-heading text-[16px] font-medium tracking-tight text-foreground">
                {blank.name}
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {blank.description}
              </p>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors group-hover:border-foreground group-hover:text-foreground sm:inline-flex">
            Start blank
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </button>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onPick,
}: {
  template: QuestionnaireTemplate;
  onPick: (t: QuestionnaireTemplate) => void;
}) {
  const Icon = template.icon;
  const accent = ACCENT_CLASSES[template.accent];
  // Show up to 4 of the most informative field labels as a preview
  const previewFields = template.fields.slice(0, 4);
  const remaining = Math.max(0, template.fields.length - previewFields.length);

  return (
    <motion.button
      type="button"
      onClick={() => onPick(template)}
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`group flex flex-col rounded-2xl border border-border bg-card p-5 text-left transition-all duration-300 hover:-translate-y-1 ${accent.ring}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent.iconBg} ${accent.iconFg} transition-transform duration-300 group-hover:scale-105`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className={`font-mono-d text-[9.5px] uppercase tracking-[0.22em] ${accent.chip} rounded-full px-2.5 py-1`}
        >
          {template.shortName}
        </span>
      </div>

      <h3 className="mt-5 font-heading text-[18px] font-medium leading-tight tracking-tight text-foreground">
        {template.name}
      </h3>
      <p className="mt-1.5 text-[13px] leading-[1.55] text-muted-foreground">
        {template.description}
      </p>

      {/* Field preview */}
      <div className="mt-5 space-y-1.5">
        {previewFields.map((f) => (
          <div
            key={f.key}
            className="flex items-center gap-2 text-[12px] text-muted-foreground"
          >
            <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
            <span className="truncate">{f.label}</span>
            {f.required && (
              <span className="font-mono-d text-[9px] uppercase tracking-[0.2em] text-purple">
                req
              </span>
            )}
          </div>
        ))}
        {remaining > 0 && (
          <div className="font-mono-d text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            + {remaining} more
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
        <span className="font-mono-d text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
          {template.fields.length}{" "}
          {template.fields.length === 1 ? "question" : "questions"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground transition-colors group-hover:text-purple">
          Use this
          <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </motion.button>
  );
}
