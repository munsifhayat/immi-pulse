"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Brand palette (matches the prototype client-portal-mvp.html) ─────────────
export const PC = {
  navy: "#101928",
  purple: "#7A5AF8",
  purpleDeep: "#3E1C96",
  purpleLight: "#BDB4FE",
  purpleMuted: "#EBE9FE",
  purpleTint: "#F4F3FF",
  teal: "#1B7B6F",
  tealLight: "#2DD4BF",
  tealTint: "#F0FBF8",
  amber: "#B54708",
  amberBg: "#FEF6EE",
  rose: "#B42318",
  ink: "#101928",
  body: "#475367",
  muted: "#667085",
  faint: "#98A2B3",
  soft: "#F7F8FB",
  soft2: "#F0F2F5",
  line: "#E4E7EC",
  line2: "#EEF0F3",
};

// ── Firm monogram logo ───────────────────────────────────────────────────────
export function FirmMark({ name, size = 34 }: { name: string; size?: number }) {
  const initials = (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      className="flex flex-none items-center justify-center font-semibold"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: `linear-gradient(135deg, ${PC.teal}, ${PC.tealLight})`,
        color: "#06251f",
        fontSize: size * 0.4,
        fontFamily: "var(--font-outfit), sans-serif",
      }}
    >
      {initials || "★"}
    </div>
  );
}

// ── Lightweight toast (no extra dep) ─────────────────────────────────────────
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const ToastHost = msg ? (
    <div
      className="fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl"
      style={{ background: PC.navy }}
      role="status"
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full"
        style={{ background: PC.teal }}
      >
        <Check className="h-3 w-3" />
      </span>
      {msg}
    </div>
  ) : null;
  return { notify, ToastHost };
}

// ── Signature pad (canvas) ───────────────────────────────────────────────────
export function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = PC.ink;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    dirty.current = true;
  };
  const end = () => {
    drawing.current = false;
    if (dirty.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  };
  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
    onChange(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={460}
        height={140}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full touch-none rounded-xl border bg-white"
        style={{ borderColor: PC.line, cursor: "crosshair" }}
      />
      <button
        type="button"
        onClick={clear}
        className="mt-2 text-xs font-medium underline"
        style={{ color: PC.muted }}
      >
        Clear signature
      </button>
    </div>
  );
}

// ── Modal shell ──────────────────────────────────────────────────────────────
export function PortalModal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(16,25,40,.45)" }}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: PC.line2 }}
        >
          <h3
            className="text-base font-bold"
            style={{ fontFamily: "var(--font-outfit), sans-serif" }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-xl leading-none"
            style={{ color: PC.muted }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div
            className="flex justify-end gap-2 border-t px-6 py-4"
            style={{ borderColor: PC.line2 }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function btnPrimary(extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${extra}`;
}
export function btnGhost(extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${extra}`;
}
