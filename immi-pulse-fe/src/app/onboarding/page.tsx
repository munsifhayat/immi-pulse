"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { orgApi } from "@/lib/api/services";

export default function OnboardingPage() {
  const router = useRouter();
  const { org, refresh } = useAuth();
  const [step, setStep] = useState(1);
  const [niche, setNiche] = useState(org?.niche || "");
  const [omara, setOmara] = useState(org?.omara_number || "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteSent, setInviteSent] = useState<string[]>([]);

  const saveStep1 = async () => {
    if (!niche.trim()) {
      setStep(2);
      return;
    }
    setBusy(true);
    try {
      await orgApi.update({ niche, omara_number: omara || undefined });
      await refresh();
      setStep(2);
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setBusy(true);
    try {
      await orgApi.invite(inviteEmail.trim(), "consultant");
      setInviteSent((s) => [...s, inviteEmail.trim()]);
      setInviteEmail("");
    } finally {
      setBusy(false);
    }
  };

  const finish = () => router.push("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <p className="text-sm text-muted-foreground">Step {step} of 3</p>
          <CardTitle className="text-2xl">
            {step === 1 && "Tell us about your practice"}
            {step === 2 && "Invite your team (optional)"}
            {step === 3 && "All set"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <Label htmlFor="niche">Niche / area of focus</Label>
                <Textarea
                  id="niche"
                  rows={3}
                  placeholder="e.g. Employer-sponsored skilled (Australia), 482 / 186 visas, 5+ years experience"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Used to give the AI context when reviewing pre-cases. Free-form, edit any time.
                </p>
              </div>
              <div>
                <Label htmlFor="omara">OMARA number (optional)</Label>
                <Input id="omara" value={omara} onChange={(e) => setOmara(e.target.value)} />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Skip
                </Button>
                <Button onClick={saveStep1} disabled={busy}>
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Invite teammates by email — they&apos;ll get a link to set their password and join.
                Skip if you&apos;re flying solo.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="email@team.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  type="email"
                />
                <Button onClick={sendInvite} disabled={busy || !inviteEmail.trim()}>
                  Send
                </Button>
              </div>
              {inviteSent.length > 0 && (
                <div className="space-y-1 rounded-md border bg-card p-3">
                  <p className="text-xs font-medium">Invited:</p>
                  {inviteSent.map((e) => (
                    <p key={e} className="text-sm text-muted-foreground">
                      ✓ {e}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)}>Continue</Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">
                Stripe payout setup is deferred — you can connect it later when you&apos;re ready
                to send your first invoice. Time to build your first questionnaire.
              </p>
              <Button onClick={finish} className="w-full">
                Go to dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
