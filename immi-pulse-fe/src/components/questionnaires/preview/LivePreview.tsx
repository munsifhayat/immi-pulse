"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Smartphone, Monitor } from "lucide-react";
import type { OutcomeFlag, QuestionField } from "@/lib/api/services";
import { QuestionnaireRenderer } from "@/components/questionnaires/QuestionnaireRenderer";
import { isFieldVisible } from "@/lib/questionnaires/rulesEngine";

interface Props {
  fields: QuestionField[];
  formName: string;
  highlightedKey?: string | null;
  onAnswersChange?: (answers: Record<string, unknown>) => void;
}

export function LivePreview({
  fields,
  formName,
  highlightedKey,
  onAnswersChange,
}: Props) {
  const [view, setView] = useState<"phone" | "desktop">("phone");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const setAnswer = (key: string, value: unknown) => {
    setAnswers((a) => {
      const next = { ...a, [key]: value };
      onAnswersChange?.(next);
      return next;
    });
  };

  const resetAnswers = () => {
    setAnswers({});
    onAnswersChange?.({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
          <button
            type="button"
            onClick={() => setView("phone")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium transition-colors ${
              view === "phone"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3 w-3" />
            Phone
          </button>
          <button
            type="button"
            onClick={() => setView("desktop")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium transition-colors ${
              view === "desktop"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Monitor className="h-3 w-3" />
            Desktop
          </button>
        </div>
        <button
          type="button"
          onClick={resetAnswers}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Reset answers
        </button>
      </div>

      <div className="flex justify-center rounded-xl bg-[#F4F2FB] p-5">
        {view === "phone" ? (
          <PhoneFrame>
            <PreviewBody
              fields={fields}
              formName={formName}
              answers={answers}
              setAnswer={setAnswer}
              highlightedKey={highlightedKey}
              compact
            />
          </PhoneFrame>
        ) : (
          <DesktopFrame>
            <PreviewBody
              fields={fields}
              formName={formName}
              answers={answers}
              setAnswer={setAnswer}
              highlightedKey={highlightedKey}
            />
          </DesktopFrame>
        )}
      </div>
    </div>
  );
}

export function useActiveOutcomeFlags(
  fields: QuestionField[],
  answers: Record<string, unknown>,
): OutcomeFlag[] {
  return useMemo(() => {
    const flags = new Set<OutcomeFlag>();
    for (const f of fields) {
      if (!f.flags?.length) continue;
      if (!isFieldVisible(f, answers)) continue;
      for (const flag of f.flags) flags.add(flag);
    }
    return Array.from(flags);
  }, [fields, answers]);
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[300px] rounded-[28px] bg-[#0F1117] p-2.5 shadow-[0_30px_60px_-30px_rgba(15,17,23,0.4)]">
      <div className="overflow-hidden rounded-[20px] bg-white">
        <div className="max-h-[560px] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function DesktopFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-white shadow-[0_20px_50px_-25px_rgba(15,17,23,0.2)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
      </div>
      <div className="max-h-[560px] overflow-y-auto p-6">{children}</div>
    </div>
  );
}

function PreviewBody({
  fields,
  formName,
  answers,
  setAnswer,
  highlightedKey,
  compact,
}: {
  fields: QuestionField[];
  formName: string;
  answers: Record<string, unknown>;
  setAnswer: (k: string, v: unknown) => void;
  highlightedKey?: string | null;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="font-mono-d text-[9.5px] uppercase tracking-[0.28em] text-[#5B3ADB]">
        Intake form
      </div>
      <h3
        className={`mt-2 font-heading leading-[1.1] tracking-tight text-[#0F1117] ${
          compact ? "text-[18px]" : "text-[22px]"
        }`}
      >
        {formName || "Untitled form"}
      </h3>

      <div className="mt-5 space-y-4">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <MockField label="First name" placeholder="Jane" />
          <MockField label="Last name" placeholder="Doe" />
          <MockField label="Email" placeholder="you@example.com" />
          <MockField label="Phone" placeholder="+61 4XX XXX XXX" />
        </div>

        {fields.length > 0 && (
          <>
            <div className="mt-5 h-px bg-border" />
            <QuestionnaireRenderer
              fields={fields}
              answers={answers}
              setAnswer={setAnswer}
              highlightedKey={highlightedKey}
            />
          </>
        )}

        {fields.length === 0 && (
          <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-[12px] text-muted-foreground">
            Add a custom field to see it here.
          </p>
        )}
      </div>
    </div>
  );
}

function MockField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <div className="mb-1 text-[11.5px] font-medium text-[#0F1117]">
        {label}
        <span className="ml-1 text-[#7C5CFC]">*</span>
      </div>
      <div className="rounded-md border border-[#E4E2EE] bg-white px-2.5 py-1.5 text-[12px] text-[#A8A2BD]">
        {placeholder}
      </div>
    </div>
  );
}
