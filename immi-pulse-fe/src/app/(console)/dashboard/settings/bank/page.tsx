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
import { Badge } from "@/components/ui/badge";
import { Wallet, Banknote, CreditCard, Info } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { orgApi } from "@/lib/api/services";

export default function BankSettingsPage() {
  const { org, refresh } = useAuth();
  const [abn, setAbn] = useState("");
  const [bsb, setBsb] = useState("");
  const [acctNo, setAcctNo] = useState("");
  const [acctName, setAcctName] = useState("");
  const [payid, setPayid] = useState("");
  const [bpay, setBpay] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setAbn(org?.abn || "");
    setBsb(org?.bsb || "");
    setAcctNo(org?.bank_account_number || "");
    setAcctName(org?.bank_account_name || "");
    setPayid(org?.payid || "");
    setBpay(org?.bpay_biller_code || "");
  }, [org]);

  const dirty =
    abn !== (org?.abn || "") ||
    bsb !== (org?.bsb || "") ||
    acctNo !== (org?.bank_account_number || "") ||
    acctName !== (org?.bank_account_name || "") ||
    payid !== (org?.payid || "") ||
    bpay !== (org?.bpay_biller_code || "");

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await orgApi.update({
        abn: abn || undefined,
        bsb: bsb || undefined,
        bank_account_number: acctNo || undefined,
        bank_account_name: acctName || undefined,
        payid: payid || undefined,
        bpay_biller_code: bpay || undefined,
      });
      await refresh();
      setSavedAt(Date.now());
    } catch (e) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Could not save changes";
      setErr(typeof msg === "string" ? msg : "Could not save changes");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Payment details
          </CardTitle>
          <CardDescription>
            Your bank, PayID, and BPAY details are auto-rendered into client
            payment instructions and engagement letter receipts. Stripe
            integration is on the roadmap — for now, record manual payments
            against checkpoints.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="abn">ABN (Australian Business Number)</Label>
            <Input
              id="abn"
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              placeholder="51 824 753 556"
            />
            <p className="text-[11px] text-muted-foreground">
              Auto-included on receipts and engagement letters.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Bank account (for EFT)</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bsb" className="text-xs">BSB</Label>
                <Input
                  id="bsb"
                  value={bsb}
                  onChange={(e) => setBsb(e.target.value)}
                  placeholder="062-001"
                />
              </div>
              <div>
                <Label htmlFor="acctno" className="text-xs">Account number</Label>
                <Input
                  id="acctno"
                  value={acctNo}
                  onChange={(e) => setAcctNo(e.target.value)}
                  placeholder="1234 5678"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="acctname" className="text-xs">Account name</Label>
              <Input
                id="acctname"
                value={acctName}
                onChange={(e) => setAcctName(e.target.value)}
                placeholder="Your Firm Pty Ltd"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">PayID & BPAY (optional)</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="payid" className="text-xs">PayID</Label>
                <Input
                  id="payid"
                  value={payid}
                  onChange={(e) => setPayid(e.target.value)}
                  placeholder="payments@yourfirm.com.au or ABN"
                />
              </div>
              <div>
                <Label htmlFor="bpay" className="text-xs">BPAY biller code</Label>
                <Input
                  id="bpay"
                  value={bpay}
                  onChange={(e) => setBpay(e.target.value)}
                  placeholder="123456"
                />
              </div>
            </div>
          </div>

          {err && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {err}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} disabled={!dirty || busy}>
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
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-muted-foreground" />
            Compliance notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p>
            Under the OMARA Code of Conduct, fees received in advance must be
            held appropriately and receipts issued. Every recorded payment in
            IMMI-PULSE generates a sequential per-org receipt number.
          </p>
          <p>
            <Badge variant="outline" className="mr-1">Roadmap</Badge>
            Stripe Connect Express will let card / Apple Pay / BECS payments
            land directly in your account, with auto-confirm on webhooks.
          </p>
          <p>
            <Badge variant="outline" className="mr-1">Best practice</Badge>
            Always reconcile your bank statement against the payment ledger in
            IMMI-PULSE weekly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
