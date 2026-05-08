"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Eye, FileSignature, Loader2, RotateCcw } from "lucide-react";
import { lettersApi, type LetterTemplate } from "@/lib/api/services";

const VARIABLES = [
  "client_name",
  "client_email",
  "firm_name",
  "omara_number",
  "abn",
  "today",
  "scope",
  "visa_subclass",
  "visa_name",
  "fee_table",
  "retainer",
];

export default function LetterTemplatePage() {
  const [tpl, setTpl] = useState<LetterTemplate | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [profFee, setProfFee] = useState("");
  const [disb, setDisb] = useState("");
  const [retainer, setRetainer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const load = async () => {
    const t = await lettersApi.getDefaultTemplate();
    setTpl(t);
    setName(t.name);
    setBody(t.body_md);
    setProfFee(String(t.fee_defaults?.professional_fee ?? ""));
    setDisb(String(t.fee_defaults?.disbursements ?? ""));
    setRetainer(String(t.fee_defaults?.retainer ?? ""));
  };

  useEffect(() => {
    load();
  }, []);

  if (!tpl) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const dirty =
    name !== tpl.name ||
    body !== tpl.body_md ||
    profFee !== String(tpl.fee_defaults?.professional_fee ?? "") ||
    disb !== String(tpl.fee_defaults?.disbursements ?? "") ||
    retainer !== String(tpl.fee_defaults?.retainer ?? "");

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const updated = await lettersApi.patchTemplate(tpl.id, {
        name,
        body_md: body,
        fee_defaults: {
          professional_fee: profFee || "0",
          disbursements: disb || "0",
          retainer: retainer || "0",
          currency: "AUD",
        },
      });
      setTpl(updated);
      setSavedAt(Date.now());
    } catch (e) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not save template";
      setErr(typeof msg === "string" ? msg : "Could not save template");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setName(tpl.name);
    setBody(tpl.body_md);
    setProfFee(String(tpl.fee_defaults?.professional_fee ?? ""));
    setDisb(String(tpl.fee_defaults?.disbursements ?? ""));
    setRetainer(String(tpl.fee_defaults?.retainer ?? ""));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSignature className="h-4 w-4 text-muted-foreground" />
            Engagement letter template
          </CardTitle>
          <CardDescription>
            This is the OMARA-compliant agreement that gets sent to every
            client when you click &quot;Send engagement letter&quot;. Variables
            in <code className="rounded bg-muted px-1">{"{{double_braces}}"}</code> are
            auto-filled per pre-case.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="tname">Template name</Label>
            <Input id="tname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="tbody">Body (Markdown)</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPreview((v) => !v)}
                className="gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                {showPreview ? "Hide preview" : "Preview"}
              </Button>
            </div>
            <Textarea
              id="tbody"
              rows={20}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="font-mono text-xs leading-relaxed"
            />
            {showPreview && (
              <div className="mt-2 rounded-lg border border-border/60 bg-muted/20 p-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Preview (raw markdown — actual letter will render the variables)
                </p>
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
                  {body}
                </pre>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <p className="text-sm font-medium">Default fees</p>
            <p className="text-[11px] text-muted-foreground">
              These pre-fill the compose form when sending. You can override
              per-pre-case.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="pf" className="text-xs">Professional A$</Label>
                <Input id="pf" type="number" value={profFee} onChange={(e) => setProfFee(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="db" className="text-xs">Disbursements A$</Label>
                <Input id="db" type="number" value={disb} onChange={(e) => setDisb(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rt" className="text-xs">Retainer A$</Label>
                <Input id="rt" type="number" value={retainer} onChange={(e) => setRetainer(e.target.value)} />
              </div>
            </div>
          </div>

          {err && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {err}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} disabled={!dirty || busy || !name}>
              {busy ? "Saving…" : "Save template"}
            </Button>
            {dirty && (
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Discard
              </Button>
            )}
            {savedAt && !dirty && (
              <span className="text-xs text-muted-foreground">Saved.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variables</CardTitle>
          <CardDescription>Use these in your template body.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {VARIABLES.map((v) => (
              <li key={v} className="flex items-center justify-between text-xs">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{`{{${v}}}`}</code>
                <Badge variant="outline" className="text-[10px]">auto-filled</Badge>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
            <strong>Tip:</strong> The default template already includes OMARA
            Code of Conduct disclosures, complaints clause, and Privacy Act
            collection notice. Edit only if you have legal advice.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
