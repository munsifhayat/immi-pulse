"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { publicQuestionnairesApi, type QuestionField } from "@/lib/api/services";
import { CheckCircle } from "lucide-react";

export default function PublicQuestionnairePage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<{
    id: string;
    name: string;
    description: string | null;
    org_name: string;
    fields: QuestionField[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    publicQuestionnairesApi
      .get(params.slug)
      .then((r) => setData(r))
      .catch((e) => setError(e?.response?.data?.detail || "Form not found"))
      .finally(() => setLoading(false));
  }, [params.slug]);

  const setAnswer = (key: string, val: unknown) =>
    setAnswers((a) => ({ ...a, [key]: val }));

  const validate = (): string | null => {
    if (!submitterName.trim()) return "Please enter your full name";
    if (!submitterEmail.trim()) return "Please enter your email";
    if (!data) return null;
    for (const f of data.fields) {
      if (f.required) {
        const v = answers[f.key];
        if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
          return `Please answer: ${f.label}`;
        }
      }
    }
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await publicQuestionnairesApi.submit(params.slug, {
        submitter_email: submitterEmail.trim(),
        submitter_name: submitterName.trim(),
        answers,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Submission failed";
      setError(typeof detail === "string" ? detail : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Form not available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error || "This form is no longer accepting responses."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CheckCircle className="h-10 w-10 text-green-600" />
            <CardTitle>Thanks — we&apos;ll be in touch</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {data.org_name} has received your submission. They&apos;ll reach out shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-8">
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">{data.org_name}</p>
            <CardTitle className="text-2xl">{data.name}</CardTitle>
            {data.description && (
              <p className="text-sm text-muted-foreground">{data.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <Label htmlFor="full-name">Full name *</Label>
                <Input
                  id="full-name"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="full-email">Email *</Label>
                <Input
                  id="full-email"
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  required
                />
              </div>

              {data.fields.map((f) => (
                <FieldRenderer
                  key={f.key}
                  field={f}
                  value={answers[f.key]}
                  onChange={(v) => setAnswer(f.key, v)}
                />
              ))}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Powered by IMMI-PULSE
        </p>
      </div>
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: QuestionField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const baseLabel = (
    <Label>
      {field.label}
      {field.required && " *"}
    </Label>
  );

  switch (field.type) {
    case "long_text":
      return (
        <div>
          {baseLabel}
          <Textarea
            rows={3}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
          />
        </div>
      );
    case "yes_no":
      return (
        <div>
          {baseLabel}
          <RadioGroup
            value={(value as string) || ""}
            onValueChange={onChange}
            className="flex gap-4 pt-1"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" id={`${field.key}-yes`} />
              <Label htmlFor={`${field.key}-yes`}>Yes</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" id={`${field.key}-no`} />
              <Label htmlFor={`${field.key}-no`}>No</Label>
            </div>
          </RadioGroup>
        </div>
      );
    case "single_select":
      return (
        <div>
          {baseLabel}
          <RadioGroup
            value={(value as string) || ""}
            onValueChange={onChange}
            className="space-y-1.5 pt-1"
          >
            {(field.options || []).map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <RadioGroupItem value={opt} id={`${field.key}-${opt}`} />
                <Label htmlFor={`${field.key}-${opt}`}>{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    case "multi_select": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div>
          {baseLabel}
          <div className="space-y-1.5 pt-1">
            {(field.options || []).map((opt) => {
              const checked = arr.includes(opt);
              return (
                <div key={opt} className="flex items-center gap-2">
                  <Checkbox
                    id={`${field.key}-${opt}`}
                    checked={checked}
                    onCheckedChange={(c) => {
                      const next = c
                        ? [...arr, opt]
                        : arr.filter((x) => x !== opt);
                      onChange(next);
                    }}
                  />
                  <Label htmlFor={`${field.key}-${opt}`}>{opt}</Label>
                </div>
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
          {baseLabel}
          <Input
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
          />
        </div>
      );
  }
}
