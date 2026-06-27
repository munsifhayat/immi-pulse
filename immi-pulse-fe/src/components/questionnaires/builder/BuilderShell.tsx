"use client";

import { useState } from "react";
import { ChevronUp, Eye } from "lucide-react";
import type { QuestionField, FieldType } from "@/lib/api/services";
import type { QuestionnaireTemplate } from "@/lib/questionnaire-templates";
import type { AutosaveStatus } from "./BuilderTopBar";
import type { BuilderMode } from "./constants";
import { BuilderTopBar } from "./BuilderTopBar";
import { BuilderCanvas } from "./BuilderCanvas";
import { PreviewPanel } from "@/components/questionnaires/preview/PreviewPanel";

interface Props {
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  name: string;
  description: string;
  audience: string;
  fields: QuestionField[];
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onAudienceChange: (audience: string) => void;
  onAddField: (type: FieldType) => void;
  onUpdateField: (index: number, patch: Partial<QuestionField>) => void;
  onRemoveField: (index: number) => void;
  onMoveField: (index: number, dir: -1 | 1) => void;
  onReorderFields: (from: number, to: number) => void;
  onApplyRecipe: (recipe: QuestionnaireTemplate) => void;
  selectedKey: string | null;
  onSelectField: (key: string | null) => void;
  highlightedKey: string | null;
  lastAddedIndex: number | null;
  branchingRevealedKeys: Set<string>;
  onRevealBranching: (key: string) => void;
  errorsByKey: Record<string, string[]>;
  ruleErrorCount: number;
  fieldRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onFlowNodeClick: (key: string) => void;
  saving?: boolean;
  savingDraft?: boolean;
  saveLabel?: string;
  autosaveStatus?: AutosaveStatus;
  onSaveDraft: () => void;
  onSavePublish: () => void;
  showSaveDraft?: boolean;
}

export function BuilderShell({
  mode,
  onModeChange,
  name,
  description,
  audience,
  fields,
  detailsOpen,
  onDetailsOpenChange,
  onNameChange,
  onDescriptionChange,
  onAudienceChange,
  onAddField,
  onUpdateField,
  onRemoveField,
  onMoveField,
  onReorderFields,
  onApplyRecipe,
  selectedKey,
  onSelectField,
  highlightedKey,
  lastAddedIndex,
  branchingRevealedKeys,
  onRevealBranching,
  errorsByKey,
  ruleErrorCount,
  fieldRefs,
  onFlowNodeClick,
  saving,
  savingDraft,
  saveLabel,
  autosaveStatus,
  onSaveDraft,
  onSavePublish,
  showSaveDraft,
}: Props) {
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(true);

  return (
    <div className="-mx-4 flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_0_rgba(15,17,23,0.02)] sm:-mx-0">
      <BuilderTopBar
        mode={mode}
        onModeChange={onModeChange}
        name={name}
        onNameChange={onNameChange}
        saving={saving}
        savingDraft={savingDraft}
        saveLabel={saveLabel}
        ruleErrorCount={ruleErrorCount}
        autosaveStatus={autosaveStatus}
        onSaveDraft={onSaveDraft}
        onSavePublish={onSavePublish}
        showSaveDraft={showSaveDraft}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-h-0 border-b border-border xl:border-b-0 xl:border-r">
          <BuilderCanvas
            mode={mode}
            name={name}
            description={description}
            audience={audience}
            fields={fields}
            detailsOpen={detailsOpen}
            onDetailsOpenChange={onDetailsOpenChange}
            onNameChange={onNameChange}
            onDescriptionChange={onDescriptionChange}
            onAudienceChange={onAudienceChange}
            onAddField={onAddField}
            onUpdateField={onUpdateField}
            onRemoveField={onRemoveField}
            onMoveField={onMoveField}
            onReorderFields={onReorderFields}
            onApplyRecipe={onApplyRecipe}
            selectedKey={selectedKey}
            onSelectField={onSelectField}
            highlightedKey={highlightedKey}
            lastAddedIndex={lastAddedIndex}
            branchingRevealedKeys={branchingRevealedKeys}
            onRevealBranching={onRevealBranching}
            errorsByKey={errorsByKey}
            fieldRefs={fieldRefs}
          />
        </div>

        <div className="hidden min-h-0 xl:flex xl:flex-col">
          <div className="sticky top-0 flex min-h-0 flex-1 flex-col p-4">
            <PreviewPanel
              fields={fields}
              formName={name}
              formDescription={description}
              highlightedKey={highlightedKey}
              selectedKey={selectedKey}
              onFlowNodeClick={onFlowNodeClick}
              showFlowTab={mode === "advanced"}
              className="min-h-[480px] flex-1"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border xl:hidden">
        <button
          type="button"
          onClick={() => setMobilePreviewOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 bg-[#F4F2FB] px-4 py-3 text-left"
        >
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground">
            <Eye className="h-4 w-4 text-purple" />
            Client preview
          </span>
          <ChevronUp
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              mobilePreviewOpen ? "" : "rotate-180"
            }`}
          />
        </button>
        {mobilePreviewOpen && (
          <div className="max-h-[70vh] overflow-y-auto p-4">
            <PreviewPanel
              fields={fields}
              formName={name}
              highlightedKey={highlightedKey}
              selectedKey={selectedKey}
              onFlowNodeClick={onFlowNodeClick}
              showFlowTab={mode === "advanced"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
