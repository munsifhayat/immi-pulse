"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";
import type { QuestionField, FieldType } from "@/lib/api/services";

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "yes_no", label: "Yes / No" },
  { value: "single_select", label: "Single choice" },
  { value: "multi_select", label: "Multiple choice" },
];

interface Props {
  initialName?: string;
  initialDescription?: string;
  initialAudience?: string;
  initialFields?: QuestionField[];
  saving?: boolean;
  saveLabel?: string;
  onSave: (payload: {
    name: string;
    description: string;
    audience: string;
    fields: QuestionField[];
  }) => Promise<void> | void;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "field";

export function QuestionnaireBuilder({
  initialName = "",
  initialDescription = "",
  initialAudience = "general",
  initialFields = [],
  saving = false,
  saveLabel = "Save & publish",
  onSave,
}: Props) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [audience, setAudience] = useState(initialAudience);
  const [fields, setFields] = useState<QuestionField[]>(initialFields);

  const addField = (type: FieldType) => {
    const baseLabel =
      type === "email" ? "Email" : type === "phone" ? "Phone" : "New field";
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
  };

  const updateField = (idx: number, patch: Partial<QuestionField>) => {
    setFields((f) => f.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };

  const removeField = (idx: number) =>
    setFields((f) => f.filter((_, i) => i !== idx));

  const move = (idx: number, dir: -1 | 1) => {
    setFields((f) => {
      const next = [...f];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return f;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const submit = async () => {
    // Auto-generate keys from labels for any field whose label changed but key not synced
    const cleanFields = fields.map((f, i) => ({
      ...f,
      key: f.key && f.key.trim() ? f.key : slugify(f.label) + "_" + (i + 1),
    }));
    await onSave({ name, description, audience, fields: cleanFields });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,260px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Form details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="q-name">Name</Label>
              <Input
                id="q-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Employer intake"
              />
            </div>
            <div>
              <Label htmlFor="q-desc">Description (shown on the public form)</Label>
              <Textarea
                id="q-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="max-w-xs">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="onshore">Onshore</SelectItem>
                  <SelectItem value="offshore">Offshore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <span className="font-medium">Always collected:</span> full name, email
              (mandatory on every form). Add the questions specific to this audience below.
            </div>
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No custom fields yet. Add some on the right.
              </p>
            )}
            {fields.map((f, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                  <Input
                    value={f.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder="Question"
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => move(i, 1)}
                    disabled={i === fields.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeField(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={f.type}
                      onValueChange={(val) => updateField(i, { type: val as FieldType })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={f.required}
                        onCheckedChange={(checked) => updateField(i, { required: checked })}
                      />
                      <Label className="text-xs">Required</Label>
                    </div>
                  </div>
                </div>
                {(f.type === "single_select" || f.type === "multi_select") && (
                  <div>
                    <Label className="text-xs">Options (one per line)</Label>
                    <Textarea
                      rows={3}
                      value={(f.options || []).join("\n")}
                      onChange={(e) =>
                        updateField(i, {
                          options: e.target.value
                            .split("\n")
                            .map((o) => o.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Add a field</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {FIELD_TYPE_OPTIONS.map((o) => (
              <Button
                key={o.value}
                variant="outline"
                className="w-full justify-start"
                onClick={() => addField(o.value)}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                {o.label}
              </Button>
            ))}
          </CardContent>
        </Card>
        <Button onClick={submit} disabled={saving || !name.trim()} className="w-full">
          {saving ? "Saving…" : saveLabel}
        </Button>
      </div>
    </div>
  );
}
