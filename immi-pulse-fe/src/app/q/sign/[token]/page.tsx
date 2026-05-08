"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2,
  FileSignature,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    if (!signerName.trim()) return setErr("Please enter your full legal name");
    if (pin.length !== 6) return setErr("PIN must be 6 digits");
    if (!consent) return setErr("Please confirm your consent to electronic signature");
    if (method === "drawn" && !signatureB64)
      return setErr("Please draw your signature in the box below");

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
      <FolioShell>
        <FolioCard>
          <div className="px-10 py-16 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600">
              <Lock className="h-5 w-5" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-rose-700">
              Link unavailable
            </p>
            <p className="mt-3 font-heading text-[20px] font-normal tracking-[-0.02em] text-foreground">
              {loadErr}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              If you believe this is a mistake, contact the firm that sent you the link.
            </p>
          </div>
        </FolioCard>
      </FolioShell>
    );
  }

  if (!letter) {
    return (
      <FolioShell>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <Loader2 className="mr-3 h-4 w-4 animate-spin text-[color:var(--purple)]" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em]">
            Loading agreement…
          </span>
        </div>
      </FolioShell>
    );
  }

  if (signed) {
    return (
      <FolioShell>
        <FolioCard>
          <div className="relative overflow-hidden px-10 py-16 text-center">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
            <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="relative font-mono text-[10.5px] uppercase tracking-[0.32em] text-emerald-700">
              Agreement · Signed
            </p>
            <h1 className="relative mt-3 font-heading text-[28px] font-normal leading-[1.05] tracking-[-0.025em] text-foreground">
              Thank you, the agreement is signed.
            </h1>
            <p className="relative mt-4 mx-auto max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
              <strong className="text-foreground">{letter.firm_name}</strong> has been
              notified and will be in touch with next steps. A copy will be emailed to you.
            </p>
          </div>
        </FolioCard>
      </FolioShell>
    );
  }

  return (
    <FolioShell>
      {/* ── Letterhead ── */}
      <FolioCard className="overflow-hidden">
        <div className="relative">
          {/* Top stripe — purple gradient, mirrors the email layout's brand band */}
          <div className="h-1 bg-gradient-to-r from-[color:var(--purple-deep)] via-[color:var(--purple)] to-[color:var(--purple-light)]" />
          {/* Atmospheric backdrop */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[color:var(--purple)]/[0.10] blur-3xl" />
          </div>
          <div className="relative px-10 py-9">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="editorial-eyebrow">
                  <span>Engagement Agreement</span>
                </p>
                <h1 className="mt-4 font-heading text-[32px] font-normal leading-[1.02] tracking-[-0.025em] text-foreground">
                  {letter.firm_name}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
                  {letter.omara_number && <span>OMARA · {letter.omara_number}</span>}
                  {letter.omara_number && letter.abn && (
                    <span className="opacity-30">·</span>
                  )}
                  {letter.abn && <span>ABN · {letter.abn}</span>}
                </div>
              </div>
              <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[color:var(--purple)]/20 bg-[color:var(--purple)]/[0.04] px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--purple)]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">
                  Secure signing
                </span>
              </div>
            </div>
          </div>
        </div>
      </FolioCard>

      {/* ── Agreement body ── */}
      <FolioCard>
        <div className="px-10 py-9">
          <p className="editorial-eyebrow">
            <span>The Agreement</span>
          </p>
          <div className="mt-6 font-sans text-[14px] leading-[1.7] text-foreground">
            <AgreementMarkdown body={letter.rendered_body_md} />
          </div>

          {letter.fee_lines.length > 0 && (
            <div className="mt-10 overflow-hidden rounded-2xl border border-border/60 bg-card/70">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                  Fee Schedule
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                  AUD · GST inc.
                </p>
              </div>
              <table className="w-full">
                <tbody>
                  {letter.fee_lines.map((fl, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="px-5 py-3.5 text-[13.5px] text-foreground/90">
                        {fl.label}
                      </td>
                      <td className="px-5 py-3.5 text-right font-heading text-[15px] font-medium tabular-nums text-foreground">
                        A${fl.amount_aud}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FolioCard>

      {/* ── Signing pane ── */}
      <FolioCard>
        <div className="px-10 py-9">
          <p className="editorial-eyebrow">
            <span>Sign · Section {letter.fee_lines.length > 0 ? "VIII" : "—"}</span>
          </p>
          <h2 className="mt-4 font-heading text-[24px] font-normal leading-tight tracking-[-0.02em] text-foreground">
            Sign this agreement
          </h2>
          <p className="mt-2 max-w-prose text-[13.5px] leading-relaxed text-muted-foreground">
            Enter your full legal name and the 6-digit PIN sent to you separately,
            then choose how you&apos;d like to apply your signature.
          </p>

          <div className="mt-7 space-y-6">
            {/* Name */}
            <FieldShell label="Full legal name" hint="Required">
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Sarah Anne Chen"
                aria-label="Full legal name"
                className="h-11 w-full bg-transparent pb-2 font-heading text-[18px] font-normal tracking-[-0.01em] text-foreground outline-none placeholder:text-muted-foreground/35"
              />
            </FieldShell>

            {/* PIN */}
            <FieldShell
              label="6-digit signing PIN"
              hint="Sent to you separately"
            >
              <input
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="••••••"
                inputMode="numeric"
                aria-label="6-digit PIN"
                maxLength={6}
                className="h-12 w-full bg-transparent pb-2 text-center font-mono text-[24px] font-medium tracking-[0.5em] text-foreground outline-none placeholder:text-muted-foreground/30"
              />
            </FieldShell>

            {/* Method picker */}
            <div>
              <p className="mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground/85">
                How would you like to sign?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <MethodOption
                  active={method === "typed_name"}
                  label="Type my name"
                  caption="Apply your typed signature"
                  onClick={() => {
                    setMethod("typed_name");
                    setSignatureB64(null);
                  }}
                />
                <MethodOption
                  active={method === "drawn"}
                  label="Draw signature"
                  caption="Use your finger or mouse"
                  onClick={() => setMethod("drawn")}
                />
              </div>
            </div>

            {method === "drawn" && (
              <SignaturePad
                onCapture={setSignatureB64}
                hasSignature={!!signatureB64}
              />
            )}

            {/* Consent */}
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border bg-card/60 p-4 transition-colors",
                consent
                  ? "border-[color:var(--purple)]/30 bg-[color:var(--purple)]/[0.03]"
                  : "border-border/60 hover:border-border",
              )}
            >
              <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="peer absolute inset-0 h-4 w-4 cursor-pointer opacity-0"
                />
                <span
                  className={cn(
                    "h-4 w-4 rounded-[5px] border transition-all",
                    consent
                      ? "border-[color:var(--purple)] bg-[color:var(--purple)]"
                      : "border-border bg-background peer-hover:border-foreground/30",
                  )}
                />
                {consent && (
                  <CheckCircle2 className="absolute h-2.5 w-2.5 text-white" strokeWidth={4} />
                )}
              </span>
              <span className="text-[12.5px] leading-relaxed text-muted-foreground">
                {CONSENT_TEXT}
              </span>
            </label>

            {err && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-300/60 bg-rose-50 px-3.5 py-2.5 text-[12.5px] leading-snug text-rose-700">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                <span>{err}</span>
              </div>
            )}

            {/* Submit */}
            <SignButton
              busy={busy}
              disabled={busy || !signerName || pin.length !== 6 || !consent}
              missingName={!signerName}
              missingPin={pin.length !== 6}
              missingConsent={!consent}
              onClick={submit}
            />

            <div className="flex items-start gap-2 pt-1">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />
              <p className="text-[10.5px] leading-relaxed text-muted-foreground/70">
                Your electronic signature is legally recognised under the
                Electronic Transactions Act 1999 (Cth). We log your IP, browser
                and timestamp for audit.
              </p>
            </div>
          </div>
        </div>
      </FolioCard>

      {/* Footer mark */}
      <div className="pb-12 pt-3 text-center">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.32em] text-muted-foreground/60">
          IMMI&#8209;PULSE · Australian immigration intelligence
        </p>
      </div>
    </FolioShell>
  );
}

/* ── Layout shells ─────────────────────────────────────────────────────── */

function FolioShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[color:var(--gray-light)]">
      {/* Atmospheric backdrop on the page itself */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-[color:var(--purple)]/[0.05] blur-3xl" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.018]" aria-hidden>
          <defs>
            <pattern
              id="folio-grid"
              x="0"
              y="0"
              width="56"
              height="56"
              patternUnits="userSpaceOnUse"
            >
              <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#7C5CFC" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#folio-grid)" />
        </svg>
      </div>

      <div className="relative">
        <div className="mx-auto max-w-3xl px-4 pt-10 sm:pt-14">
          {/* Top folio strip */}
          <div className="mb-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground/70">
            <span>Folio · Engagement</span>
            <span>
              {new Date().toLocaleDateString("en-AU", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FolioCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-[0_30px_60px_-30px_rgba(15,17,23,0.18)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── Field shell — borderless input + slide-up purple hairline ─────────── */
function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground/85">
          {label}
        </p>
        {hint && (
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/45">
            {hint}
          </p>
        )}
      </div>
      <div className="relative">
        {children}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-[color:var(--purple)] transition-transform duration-300 group-focus-within:scale-x-100" />
      </div>
    </div>
  );
}

/* ── Method picker option ──────────────────────────────────────────────── */
function MethodOption({
  active,
  label,
  caption,
  onClick,
}: {
  active: boolean;
  label: string;
  caption: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl border bg-card/60 p-4 text-left transition-all",
        active
          ? "border-[color:var(--purple)]/40 bg-[color:var(--purple)]/[0.04] shadow-[0_8px_22px_-12px_rgba(124,92,252,0.4)]"
          : "border-border/60 hover:border-foreground/20 hover:bg-card",
      )}
    >
      {active && (
        <span className="absolute right-3 top-3 flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--purple)] opacity-60" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-[color:var(--purple)]" />
        </span>
      )}
      <p
        className={cn(
          "font-heading text-[14.5px] font-medium tracking-[-0.005em]",
          active ? "text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]" : "text-foreground",
        )}
      >
        {label}
      </p>
      <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
        {caption}
      </p>
    </button>
  );
}

/* ── Sign button — primary CTA with explicit "what's missing" copy ────── */
function SignButton({
  busy,
  disabled,
  missingName,
  missingPin,
  missingConsent,
  onClick,
}: {
  busy: boolean;
  disabled: boolean;
  missingName: boolean;
  missingPin: boolean;
  missingConsent: boolean;
  onClick: () => void;
}) {
  const missing = [
    missingName && "name",
    missingPin && "PIN",
    missingConsent && "consent",
  ].filter(Boolean);

  return (
    <div>
      <Button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "group relative h-12 w-full gap-2 overflow-hidden rounded-2xl text-[14px] font-medium tracking-tight transition-all",
          disabled
            ? "border border-border bg-muted text-muted-foreground/70 shadow-none hover:bg-muted"
            : "border border-[color:var(--purple-deep)]/40 bg-[color:var(--purple)] text-white shadow-[0_14px_30px_-12px_rgba(124,92,252,0.6)] hover:bg-[color:var(--purple-deep)] hover:shadow-[0_18px_36px_-12px_rgba(124,92,252,0.7)]",
        )}
      >
        {!disabled && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
        )}
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="relative">Signing…</span>
          </>
        ) : (
          <>
            <FileSignature className="h-4 w-4" />
            <span className="relative">Sign agreement</span>
          </>
        )}
      </Button>
      {missing.length > 0 && !busy && (
        <p className="mt-2.5 text-center font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground/80">
          Complete {missing.join(" · ")} to sign
        </p>
      )}
    </div>
  );
}

/* ── Markdown renderer styled in the editorial folio language ──────────── */
function AgreementMarkdown({ body }: { body: string }) {
  // Memoize the components map so react-markdown doesn't re-bind on every keystroke
  const components = useMemo(
    () => ({
      h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h1
          {...props}
          className="mb-6 mt-2 font-heading text-[26px] font-normal leading-[1.1] tracking-[-0.025em] text-foreground"
        />
      ),
      h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2
          {...props}
          className="mt-9 mb-3 font-heading text-[16px] font-medium tracking-[-0.01em] text-foreground"
        />
      ),
      h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3
          {...props}
          className="mt-6 mb-2 font-heading text-[14px] font-medium tracking-tight text-foreground"
        />
      ),
      p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p
          {...props}
          className="mb-4 text-[13.5px] leading-[1.7] text-foreground/85"
        />
      ),
      strong: (props: React.HTMLAttributes<HTMLElement>) => (
        <strong {...props} className="font-medium text-foreground" />
      ),
      em: (props: React.HTMLAttributes<HTMLElement>) => (
        <em {...props} className="font-serif italic text-foreground/80" />
      ),
      ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
        <ul
          {...props}
          className="mb-4 space-y-1.5 pl-5 text-[13.5px] leading-[1.7] text-foreground/85 [&>li]:list-disc [&>li]:marker:text-[color:var(--purple)]/60"
        />
      ),
      ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
        <ol
          {...props}
          className="mb-4 space-y-1.5 pl-5 text-[13.5px] leading-[1.7] text-foreground/85 [&>li]:list-decimal [&>li]:marker:text-[color:var(--purple)]/60"
        />
      ),
      a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a
          {...props}
          className="text-[color:var(--purple-deep)] underline decoration-[color:var(--purple)]/30 underline-offset-4 transition-colors hover:decoration-[color:var(--purple)] dark:text-[color:var(--purple-light)]"
        />
      ),
      hr: () => <hr className="my-8 border-0 border-t border-border/60" />,
      table: (props: React.HTMLAttributes<HTMLTableElement>) => (
        <div className="my-5 overflow-hidden rounded-xl border border-border/60">
          <table {...props} className="w-full border-collapse" />
        </div>
      ),
      thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
        <thead {...props} className="bg-muted/30" />
      ),
      th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
        <th
          {...props}
          className="border-b border-border/60 px-4 py-2.5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        />
      ),
      td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
        <td
          {...props}
          className="border-b border-border/40 px-4 py-2.5 text-[13px] text-foreground/85 last:border-b-0 [&:last-child]:text-right [&:last-child]:font-heading [&:last-child]:font-medium [&:last-child]:tabular-nums [&:last-child]:text-foreground"
        />
      ),
      code: (props: React.HTMLAttributes<HTMLElement>) => (
        <code
          {...props}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground"
        />
      ),
      blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
        <blockquote
          {...props}
          className="my-4 border-l-2 border-[color:var(--purple)]/40 pl-4 text-[13px] italic text-muted-foreground"
        />
      ),
    }),
    [],
  );

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {body}
    </ReactMarkdown>
  );
}

/* ── Signature pad ─────────────────────────────────────────────────────── */
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
    ctx.strokeStyle = "#0f1117";
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
      <p className="mb-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground/85">
        Sign in the box
      </p>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
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
          className="w-full cursor-crosshair touch-none"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground/80">
          {hasSignature ? "Signature captured" : "Use your finger or mouse to sign"}
        </p>
        <button
          type="button"
          onClick={clear}
          className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

