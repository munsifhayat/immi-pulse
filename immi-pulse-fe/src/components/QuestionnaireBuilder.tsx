"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { QuestionField, FieldType } from "@/lib/api/services";
import { questionnairesApi } from "@/lib/api/services";
import { validateFieldRules } from "@/lib/questionnaires/rulesEngine";
import { type QuestionnaireTemplate } from "@/lib/questionnaire-templates";
import { BuilderShell } from "@/components/questionnaires/builder/BuilderShell";
import type { AutosaveStatus } from "@/components/questionnaires/builder/BuilderTopBar";
import {
  FIELD_TYPE_OPTIONS,
  slugify,
  type BuilderMode,
} from "@/components/questionnaires/builder/constants";

type DraftPayload = {
  name: string;
  description: string;
  audience: string;
  fields: QuestionField[];
  savedAt: string;
};

interface Props {
  initialName?: string;
  initialDescription?: string;
  initialAudience?: string;
  initialFields?: QuestionField[];
  questionnaireId?: string;
  /** Overrides localStorage draft key segment (e.g. `new:employer-intake`). */
  draftId?: string;
  saving?: boolean;
  saveLabel?: string;
  modeStorageKey?: string;
  onSave: (payload: {
    name: string;
    description: string;
    audience: string;
    fields: QuestionField[];
  }) => Promise<void> | void;
}

function draftKey(id?: string) {
  return `questionnaire-draft:${id ?? "new"}`;
}

function readDraft(key: string): DraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as DraftPayload;
  } catch {
    return null;
  }
}

function writeDraft(key: string, payload: DraftPayload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(payload));
}

function clearDraft(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export function QuestionnaireBuilder({
  initialName = "",
  initialDescription = "",
  initialAudience = "general",
  initialFields = [],
  questionnaireId,
  draftId,
  saving = false,
  saveLabel = "Save & publish",
  modeStorageKey,
  onSave,
}: Props) {
  const storageKey = draftKey(draftId ?? questionnaireId);
  const hydrated = useRef(false);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [audience, setAudience] = useState(initialAudience);
  const [fields, setFields] = useState<QuestionField[]>(initialFields);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [savingDraft, setSavingDraft] = useState(false);
  const [branchingRevealedKeys, setBranchingRevealedKeys] = useState<Set<string>>(new Set());

  const [mode, setMode] = useState<BuilderMode>(() => {
    if (typeof window === "undefined" || !modeStorageKey) {
      return initialFields.some((f) => f.logic || f.flags) ? "advanced" : "standard";
    }
    const stored = window.localStorage.getItem(modeStorageKey);
    if (stored === "standard" || stored === "advanced") return stored;
    return initialFields.some((f) => f.logic || f.flags) ? "advanced" : "standard";
  });

  useEffect(() => {
    if (modeStorageKey && typeof window !== "undefined") {
      window.localStorage.setItem(modeStorageKey, mode);
    }
  }, [mode, modeStorageKey]);

  // Restore local draft once on mount
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const draft = readDraft(storageKey);
    if (!draft) return;
    const hasContent =
      draft.fields.length > 0 ||
      draft.name.trim().length > 0 ||
      draft.description.trim().length > 0;
    if (!hasContent) return;
    setName(draft.name);
    setDescription(draft.description);
    setAudience(draft.audience);
    setFields(draft.fields);
    setAutosaveStatus("saved");
  }, [storageKey]);

  const [detailsOpen, setDetailsOpen] = useState(initialFields.length === 0);
  const [lastAdded, setLastAdded] = useState<{ index: number; label: string } | null>(null);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const fieldRefs = useRef<(HTMLDivElement | null)[]>([]);
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverPatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lastAdded === null) return;
    const node = fieldRefs.current[lastAdded.index];
    if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setLastAdded(null), 2200);
    return () => clearTimeout(t);
  }, [lastAdded]);

  const buildPayload = useCallback(
    () => ({
      name,
      description,
      audience,
      fields: fields.map((f, i) => ({
        ...f,
        key: f.key && f.key.trim() ? f.key : slugify(f.label) + "_" + (i + 1),
      })),
    }),
    [name, description, audience, fields],
  );

  // Debounced local autosave
  useEffect(() => {
    if (!hydrated.current) return;
    setAutosaveStatus("unsaved");
    if (patchTimer.current) clearTimeout(patchTimer.current);
    patchTimer.current = setTimeout(() => {
      setAutosaveStatus("saving");
      writeDraft(storageKey, {
        ...buildPayload(),
        savedAt: new Date().toISOString(),
      });
      setAutosaveStatus("saved");
    }, 600);

    return () => {
      if (patchTimer.current) clearTimeout(patchTimer.current);
    };
  }, [name, description, audience, fields, storageKey, buildPayload]);

  // Debounced server PATCH for edit mode
  useEffect(() => {
    if (!questionnaireId || !hydrated.current) return;
    if (serverPatchTimer.current) clearTimeout(serverPatchTimer.current);
    serverPatchTimer.current = setTimeout(async () => {
      try {
        await questionnairesApi.update(questionnaireId, buildPayload());
      } catch {
        /* silent — manual save draft still available */
      }
    }, 2500);

    return () => {
      if (serverPatchTimer.current) clearTimeout(serverPatchTimer.current);
    };
  }, [name, description, audience, fields, questionnaireId, buildPayload]);

  const addField = (type: FieldType) => {
    const def = FIELD_TYPE_OPTIONS.find((o) => o.value === type)!;
    const baseLabel = type === "email" ? "Email" : type === "phone" ? "Phone" : "New field";
    const newIndex = fields.length;
    setFields((f) => [
      ...f,
      {
        key: slugify(baseLabel) + "_" + (f.length + 1),
        label: baseLabel,
        type,
        required: false,
        options: type === "single_select" || type === "multi_select" ? ["Option 1"] : null,
      },
    ]);
    setLastAdded({ index: newIndex, label: def.label });
  };

  const updateField = (idx: number, patch: Partial<QuestionField>) =>
    setFields((f) => f.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const removeField = (idx: number) =>
    setFields((f) => f.filter((_, i) => i !== idx));

  const moveField = (idx: number, dir: -1 | 1) => {
    setFields((f) => {
      const next = [...f];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return f;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const reorderFields = (from: number, to: number) => {
    setFields((f) => arrayMove(f, from, to));
  };

  const applyRecipe = (recipe: QuestionnaireTemplate) => {
    if (fields.length > 0) {
      const ok = window.confirm(
        `This will replace your ${fields.length} current field(s) with the "${recipe.name}" recipe. Continue?`,
      );
      if (!ok) return;
    }
    setFields(recipe.fields);
    if (!name.trim()) setName(recipe.name);
    if (!description.trim()) setDescription(recipe.description);
    setAudience(recipe.audience);
    if (recipe.fields.some((f) => f.logic || f.flags)) setMode("advanced");
  };

  const revealBranching = (key: string) => {
    setBranchingRevealedKeys((prev) => new Set(prev).add(key));
  };

  const saveDraftNow = async () => {
    const payload = buildPayload();
    writeDraft(storageKey, { ...payload, savedAt: new Date().toISOString() });
    if (questionnaireId) {
      setSavingDraft(true);
      try {
        await questionnairesApi.update(questionnaireId, payload);
        setAutosaveStatus("saved");
      } finally {
        setSavingDraft(false);
      }
    } else {
      setAutosaveStatus("saved");
    }
  };

  const publish = async () => {
    const payload = buildPayload();
    await onSave(payload);
    clearDraft(storageKey);
    setAutosaveStatus("idle");
  };

  const ruleErrors = useMemo(() => validateFieldRules(fields), [fields]);
  const errorsByKey = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const e of ruleErrors) {
      if (!map[e.fieldKey]) map[e.fieldKey] = [];
      map[e.fieldKey].push(e.message);
    }
    return map;
  }, [ruleErrors]);

  const onFlowNodeClick = (key: string) => {
    const idx = fields.findIndex((f) => f.key === key);
    if (idx < 0) return;
    setSelectedKey(key);
    setHighlightedKey(key);
    const node = fieldRefs.current[idx];
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightedKey(null), 1800);
  };

  return (
    <BuilderShell
      mode={mode}
      onModeChange={setMode}
      name={name}
      description={description}
      audience={audience}
      fields={fields}
      detailsOpen={detailsOpen}
      onDetailsOpenChange={setDetailsOpen}
      onNameChange={setName}
      onDescriptionChange={setDescription}
      onAudienceChange={setAudience}
      onAddField={addField}
      onUpdateField={updateField}
      onRemoveField={removeField}
      onMoveField={moveField}
      onReorderFields={reorderFields}
      onApplyRecipe={applyRecipe}
      selectedKey={selectedKey}
      onSelectField={setSelectedKey}
      highlightedKey={highlightedKey}
      lastAddedIndex={lastAdded?.index ?? null}
      branchingRevealedKeys={branchingRevealedKeys}
      onRevealBranching={revealBranching}
      errorsByKey={errorsByKey}
      ruleErrorCount={ruleErrors.length}
      fieldRefs={fieldRefs}
      onFlowNodeClick={onFlowNodeClick}
      saving={saving}
      savingDraft={savingDraft}
      saveLabel={saveLabel}
      autosaveStatus={autosaveStatus}
      onSaveDraft={saveDraftNow}
      onSavePublish={publish}
      showSaveDraft
    />
  );
}
