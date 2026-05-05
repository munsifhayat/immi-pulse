"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  FileSignature,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { publicLettersApi, type PublicLetterView } from "@/lib/api/services";
import { cn } from "@/lib/utils";

const CONSENT_TEXT =
  "I have read and agree to the terms of this engagement agreement. I consent to electronic signature under the Electronic Transactions Act 1999 (Cth).";

export default function SignLetterPage() {
  const params = useParams<{ token: string }>();
  const [letter, setLetter] = useState<PublicLetterView | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Form state
  const [signerName, setSignerName] = useState("");
  const [pin, setPin] = useState("");
  const [consent, setConsent] = useState(false);
  const [method, setMethod] = useState<"typed_name" | "drawn">("typed_name");
  const [signatureB64, setSignatureB64] = useState<string | null>(null);

  useEffect(() => {
    publicLettersApi
      .get(params.token)
      .then((l) => {
        setLetter(l);
        if (l.status === "signed") setSigned(true);
      })
      .catch((e) => {
        setLoadErr(
          e?.response?.data?.detail ||
            "This signing link is invalid or has expired."
        );
      });
  }, [params.token]);

  const submit = async () => {
    setErr(null);
    if (!signerName.trim()) {
      setErr("Please enter your full legal name");
      return;
    }
    if (pin.length !== 6) {
      setErr("PIN must be 6 digits");
      return;
    }
    if (!consent) {
      setErr("Please confirm you consent to electronic signature");
      return;
    }
    if (method === "drawn" && !signatureB64) {
      setErr("Please draw your signature in the box below");
      return;
    }

    setBusy(true);
    try {
      await publicLettersApi.sign(params.token, {
        pin,
        consent_given: consent,
        signer_name: signerName,
        method,
        signature_image_b64: signatureB64 || undefined,
      });
      setSigned(true);
    } catch (e) {
      const eo = e as { response?: { data?: { detail?: string } } };
      setErr(eo?.response?.data?.detail || "Failed to sign — check your PIN");
    } finally {
      setBusy(false);
    }
  };

  if (loadErr) {
    return (
      <FullScreenShell>
        <Card>
          <CardContent className="py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <Lock className="h-5 w-5" />
            </div>
            <p className="text-base font-medium">Link unavailable</p>
            <p className="mt-1 text-sm text-muted-foreground">{loadErr}</p>
          </CardContent>
        </Card>
      </FullScreenShell>
    );
  }

  if (!letter) {
    return (
      <FullScreenShell>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading agreement…
        </div>
      </FullScreenShell>
    );
  }

  if (signed) {
    return (
      <FullScreenShell>
        <Card>
          <CardContent className="py-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-lg font-semibold">Agreement signed</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Thank you. <strong>{letter.firm_name}</strong> has been notified
              and will be in touch with next steps. A copy will be emailed to
              you.
            </p>
          </CardContent>
        </Card>
      </FullScreenShell>
    );
  }

  return (
    <FullScreenShell>
      {/* Firm header */}
      <Card className="overflow-hidden">
        <CardContent className="bg-gradient-to-br from-violet-50 via-white to-sky-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Engagement agreement
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">
                {letter.firm_name}
              </h1>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                {letter.omara_number && <span>OMARA {letter.omara_number}</span>}
                {letter.abn && <span>ABN {letter.abn}</span>}
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 border-violet-200 bg-white text-violet-700">
              <ShieldCheck className="mr-1 h-3 w-3" /> Secure signing
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Letter body */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            <FileSignature className="mr-2 inline h-4 w-4 align-text-top" />
            Your agreement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
            {letter.rendered_body_md}
          </div>

          {letter.fee_lines.length > 0 && (
            <div className="mt-6 rounded-lg border border-border/60 p-4">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Fees & disbursements
              </p>
              <table className="w-full text-sm">
                <tbody>
                  {letter.fee_lines.map((fl, i) => (
                    <tr key={i} className="border-b border-border/40 last:border-0">
                      <td className="py-2">{fl.label}</td>
                      <td className="py-2 text-right font-medium">
                        A${fl.amount_aud}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signing form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Sign this agreement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sn" className="text-xs">Your full legal name</Label>
            <Input
              id="sn"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Sarah Anne Chen"
            />
          </div>

          <div>
            <Label htmlFor="pin" className="text-xs">
              6-digit PIN (sent to you separately)
            </Label>
            <Input
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
              className="font-mono tracking-widest"
            />
          </div>

          <div>
            <Label className="text-xs">How would you like to sign?</Label>
            <div className="mt-1.5 flex gap-2">
              <Button
                type="button"
                variant={method === "typed_name" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setMethod("typed_name");
                  setSignatureB64(null);
                }}
              >
                Type my name
              </Button>
              <Button
                type="button"
                variant={method === "drawn" ? "default" : "outline"}
                size="sm"
                onClick={() => setMethod("drawn")}
              >
                Draw signature
              </Button>
            </div>
          </div>

          {method === "drawn" && (
            <SignaturePad
              onCapture={setSignatureB64}
              hasSignature={!!signatureB64}
            />
          )}

          <label className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span className="text-muted-foreground">{CONSENT_TEXT}</span>
          </label>

          {err && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 border border-rose-200">
              {err}
            </p>
          )}

          <Button
            onClick={submit}
            disabled={busy || !signerName || pin.length !== 6 || !consent}
            className="w-full gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing…
              </>
            ) : (
              <>
                <FileSignature className="h-4 w-4" /> Sign agreement
              </>
            )}
          </Button>

          <p className="text-center text-[10px] text-muted-foreground">
            By signing you agree under the Electronic Transactions Act 1999 (Cth).
            We log your IP, browser and timestamp for audit purposes.
          </p>
        </CardContent>
      </Card>
    </FullScreenShell>
  );
}

function FullScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10">
      <div className="mx-auto max-w-2xl space-y-4 px-4">
        {children}
      </div>
    </div>
  );
}

function SignaturePad({
  onCapture,
  hasSignature,
}: {
  onCapture: (b64: string | null) => void;
  hasSignature: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  const getXY = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    return {
      x: ((point.clientX - rect.left) / rect.width) * c.width,
      y: ((point.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    const { x, y } = getXY(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getXY(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stop = () => {
    if (!drawing) return;
    setDrawing(false);
    const c = canvasRef.current!;
    onCapture(c.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""));
  };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, c.width, c.height);
    onCapture(null);
  };

  return (
    <div>
      <Label className="text-xs">Sign in the box</Label>
      <div className="mt-1.5 overflow-hidden rounded-lg border border-border/60 bg-white">
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={stop}
          className={cn(
            "w-full cursor-crosshair touch-none",
            hasSignature ? "" : ""
          )}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          {hasSignature ? "Signature captured" : "Use your finger or mouse to sign above"}
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
