"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { orgApi } from "@/lib/api/services";

export default function OrganizationSettingsPage() {
  const { org, refresh } = useAuth();
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [omara, setOmara] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(org?.name || "");
    setNiche(org?.niche || "");
    setOmara(org?.omara_number || "");
  }, [org]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await orgApi.update({
        name: name.trim(),
        niche: niche.trim() || undefined,
        omara_number: omara.trim() || undefined,
      });
      await refresh();
      setSavedAt(Date.now());
    } catch (err) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not save changes";
      setError(typeof msg === "string" ? msg : "Could not save changes");
    } finally {
      setBusy(false);
    }
  };

  const dirty =
    name !== (org?.name || "") ||
    niche !== (org?.niche || "") ||
    omara !== (org?.omara_number || "");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Organization profile</CardTitle>
          <CardDescription>
            How your firm appears across IMMI-PULSE. Niche feeds AI context for triage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Firm / practice name</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-niche">Niche / area of focus</Label>
            <Textarea
              id="org-niche"
              rows={3}
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. Employer-sponsored skilled (Australia), 482 / 186, 5+ yrs experience"
            />
            <p className="text-xs text-muted-foreground">
              Free-form. Used to give the AI context when triaging pre-cases.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-omara">OMARA number</Label>
            <Input
              id="org-omara"
              value={omara}
              onChange={(e) => setOmara(e.target.value)}
              placeholder="e.g. MARN 1234567"
            />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} disabled={!dirty || busy || !name.trim()}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
            {savedAt && !dirty && (
              <span className="text-xs text-muted-foreground">Saved.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace details</CardTitle>
          <CardDescription>Read-only metadata.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <DetailRow label="Workspace ID" value={org?.id || "—"} mono />
          <DetailRow label="Country" value={org?.country || "AU"} />
          <DetailRow label="Created" value={"—"} />
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              Need to transfer ownership or close the workspace?{" "}
              <Badge variant="outline" className="ml-1">Coming soon</Badge>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-xs text-foreground/80 text-right ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
