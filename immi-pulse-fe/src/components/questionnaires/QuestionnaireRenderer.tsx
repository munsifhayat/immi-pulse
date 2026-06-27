"use client";

/**
 * Shared renderer for filling out a questionnaire.
 *
 * Used by both:
 *   - src/app/(public)/q/[slug]/page.tsx (real applicant)
 *   - src/components/questionnaires/preview/LivePreview.tsx (consultant preview)
 *
 * Centralising it means the consultant's Live Preview is guaranteed identical
 * to the form the applicant sees — no "looks fine in preview" surprises.
 *
 * Conditional logic (show/hide, required-if) is applied via the shared rules
 * engine in lib/questionnaires/rulesEngine.ts.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import type { QuestionField } from "@/lib/api/services";
import {
  isFieldRequired,
  isFieldVisible,
  type Answers,
} from "@/lib/questionnaires/rulesEngine";

interface Props {
  fields: QuestionField[];
  answers: Answers;
  setAnswer: (key: string, value: unknown) => void;
  /** When true, fields highlight required-state more aggressively (after a
   * failed submit attempt). Optional. */
  showErrors?: boolean;
  /** Highlight a field synced from canvas selection or flow click. */
  highlightedKey?: string | null;
}

export function QuestionnaireRenderer({
  fields,
  answers,
  setAnswer,
  showErrors = false,
  highlightedKey,
}: Props) {
  return (
    <div className="space-y-5">
      <AnimatePresence initial={false}>
        {fields.map((f) => {
          if (!isFieldVisible(f, answers)) return null;
          const required = isFieldRequired(f, answers);
          const highlighted = highlightedKey === f.key;
          return (
            <motion.div
              key={f.key}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={
                highlighted
                  ? "rounded-lg ring-2 ring-[#7C5CFC]/40 ring-offset-2 ring-offset-white"
                  : undefined
              }
            >
              <FieldRenderer
                field={f}
                required={required}
                value={answers[f.key]}
                onChange={(v) => setAnswer(f.key, v)}
                showErrors={showErrors}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────  Field renderer  ────────────────── */

function FieldRenderer({
  field,
  required,
  value,
  onChange,
  showErrors,
}: {
  field: QuestionField;
  required: boolean;
  value: unknown;
  onChange: (v: unknown) => void;
  showErrors: boolean;
}) {
  const isMissing =
    showErrors &&
    required &&
    (value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0));

  const labelHeader = (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label className="text-[13px] font-medium text-[#0F1117]">
        {field.label}
        {required && <span className="ml-1 text-[#7C5CFC]">*</span>}
      </label>
      {!required && (
        <span className="font-mono-d text-[9.5px] uppercase tracking-[0.22em] text-[#94A3B8]">
          Optional
        </span>
      )}
    </div>
  );

  const baseInputCls =
    "block w-full rounded-lg border bg-white px-3.5 py-3 text-[14.5px] text-[#0F1117] placeholder:text-[#A8A2BD] transition-all duration-200 focus:outline-none focus:ring-4";
  const okCls =
    "border-[#E4E2EE] hover:border-[#CDC4F8] focus:border-[#7C5CFC] focus:ring-[#7C5CFC]/12";
  const errCls =
    "border-rose-300 hover:border-rose-400 focus:border-rose-500 focus:ring-rose-500/12";
  const inputCls = `${baseInputCls} ${isMissing ? errCls : okCls}`;

  switch (field.type) {
    case "long_text":
      return (
        <div>
          {labelHeader}
          <textarea
            rows={4}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            className={`${inputCls} resize-y leading-[1.55]`}
          />
          {field.helper_text && (
            <p className="mt-1.5 text-[12px] leading-[1.5] text-[#475367]">
              {field.helper_text}
            </p>
          )}
        </div>
      );

    case "yes_no": {
      const v = (value as string) || "";
      return (
        <div>
          {labelHeader}
          <div className="flex gap-2.5 pt-1">
            {[
              { val: "yes", label: "Yes" },
              { val: "no", label: "No" },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => onChange(opt.val)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-[13.5px] font-medium transition-all ${
                  v === opt.val
                    ? "border-[#7C5CFC] bg-[#F2EEFF] text-[#3E1C96] shadow-[0_0_0_3px_rgba(124,92,252,0.10)]"
                    : "border-[#E4E2EE] bg-white text-[#1E293B] hover:border-[#CDC4F8]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "single_select": {
      const v = (value as string) || "";
      return (
        <div>
          {labelHeader}
          <div className="grid gap-2 pt-1">
            {(field.options || []).map((opt) => {
              const active = v === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(opt)}
                  className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-[13.5px] transition-all ${
                    active
                      ? "border-[#7C5CFC] bg-[#F8F5FF] text-[#0F1117]"
                      : "border-[#E4E2EE] bg-white text-[#1E293B] hover:border-[#CDC4F8] hover:bg-[#FBFAFF]"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      active ? "border-[#7C5CFC] bg-[#7C5CFC]" : "border-[#CFC9E0]"
                    }`}
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "multi_select": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div>
          {labelHeader}
          <div className="grid gap-2 pt-1">
            {(field.options || []).map((opt) => {
              const checked = arr.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const next = checked
                      ? arr.filter((x) => x !== opt)
                      : [...arr, opt];
                    onChange(next);
                  }}
                  className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-[13.5px] transition-all ${
                    checked
                      ? "border-[#7C5CFC] bg-[#F8F5FF] text-[#0F1117]"
                      : "border-[#E4E2EE] bg-white text-[#1E293B] hover:border-[#CDC4F8] hover:bg-[#FBFAFF]"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-[#7C5CFC] bg-[#7C5CFC]"
                        : "border-[#CFC9E0] bg-white"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "number":
    case "date":
    case "email":
    case "phone":
    case "short_text":
    default:
      return (
        <div>
          {labelHeader}
          <input
            type={
              field.type === "number"
                ? "number"
                : field.type === "date"
                ? "date"
                : field.type === "email"
                ? "email"
                : field.type === "phone"
                ? "tel"
                : "text"
            }
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            className={inputCls}
          />
          {field.helper_text && (
            <p className="mt-1.5 text-[12px] leading-[1.5] text-[#475367]">
              {field.helper_text}
            </p>
          )}
        </div>
      );
  }
}
