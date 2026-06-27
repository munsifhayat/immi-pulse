"use client";

import { Save, Loader2, GitBranch, Sparkles, Wand2, Cloud } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BuilderMode } from "./constants";

export type AutosaveStatus = "idle" | "unsaved" | "saving" | "saved";

interface Props {
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  name: string;
  onNameChange: (name: string) => void;
  saving?: boolean;
  savingDraft?: boolean;
  saveLabel?: string;
  ruleErrorCount?: number;
  autosaveStatus?: AutosaveStatus;
  onSaveDraft: () => void;
  onSavePublish: () => void;
  showSaveDraft?: boolean;
}

export function BuilderTopBar({
  mode,
  onModeChange,
  name,
  onNameChange,
  saving = false,
  savingDraft = false,
  saveLabel = "Save & publish",
  ruleErrorCount = 0,
  autosaveStatus = "idle",
  onSaveDraft,
  onSavePublish,
  showSaveDraft = true,
}: Props) {
  const statusLabel = (() => {
    switch (autosaveStatus) {
      case "saving":
        return "Saving draft…";
      case "saved":
        return "Draft saved";
      case "unsaved":
        return "Unsaved changes";
      default:
        return null;
    }
  })();

  return (
    <div className="flex flex-col gap-4 border-b border-border bg-card px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <ModeSegment mode={mode} onChange={onModeChange} />
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Untitled form"
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-muted/40 px-3 py-2 font-heading text-[15px] font-medium tracking-tight text-foreground placeholder:text-muted-foreground/60 transition-all hover:border-border focus:border-purple focus:bg-background focus:outline-none focus:ring-4 focus:ring-purple/12"
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
        {statusLabel && (
          <span
            className={`inline-flex items-center gap-1.5 text-[11.5px] ${
              autosaveStatus === "unsaved"
                ? "text-amber-700"
                : autosaveStatus === "saved"
                  ? "text-emerald-700"
                  : "text-muted-foreground"
            }`}
          >
            {autosaveStatus === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
            {autosaveStatus === "saved" && <Cloud className="h-3 w-3" />}
            {statusLabel}
          </span>
        )}

        {ruleErrorCount > 0 && (
          <span className="hidden text-[11.5px] text-rose-600 sm:inline">
            {ruleErrorCount} rule issue{ruleErrorCount === 1 ? "" : "s"}
          </span>
        )}

        {showSaveDraft && (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={saving || savingDraft || !name.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] font-medium text-foreground transition-all hover:border-purple/40 hover:bg-purple/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingDraft ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Cloud className="h-3.5 w-3.5" />
            )}
            Save draft
          </button>
        )}

        <button
          type="button"
          onClick={onSavePublish}
          disabled={saving || savingDraft || !name.trim() || ruleErrorCount > 0}
          className="group relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-navy px-5 py-2.5 text-[13.5px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(124,92,252,0.7)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <span
            aria-hidden
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(120deg, #0F1117 0%, #3E1C96 60%, #7C5CFC 100%)",
            }}
          />
          <span className="relative inline-flex items-center gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {saveLabel}
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

function ModeSegment({
  mode,
  onChange,
}: {
  mode: BuilderMode;
  onChange: (m: BuilderMode) => void;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="inline-flex shrink-0 rounded-xl border border-border bg-background p-1 shadow-[0_1px_0_rgba(15,17,23,0.02)]">
        <button
          type="button"
          onClick={() => onChange("standard")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
            mode === "standard"
              ? "bg-foreground text-background shadow-[0_4px_14px_-6px_rgba(15,17,23,0.5)]"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Standard
        </button>
        <button
          type="button"
          onClick={() => onChange("advanced")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
            mode === "advanced"
              ? "bg-foreground text-background shadow-[0_4px_14px_-6px_rgba(15,17,23,0.5)]"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" />
          Advanced
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground/60"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Recommended</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] uppercase tracking-[0.15em] text-muted-foreground">
                P2
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>AI-drafted forms — coming in Phase 2.</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
