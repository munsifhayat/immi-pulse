"use client";

interface PulseMarkProps {
  size?: number;
  label?: string;
  className?: string;
  rings?: boolean;
  tone?: "purple" | "white";
}

export function PulseMark({
  size = 40,
  label = "II",
  className = "",
  rings = true,
  tone = "purple",
}: PulseMarkProps) {
  const radius = Math.round(size * 0.28);
  const fontPx = Math.max(11, Math.round(size * 0.42));

  const surface =
    tone === "white"
      ? "bg-white text-purple-deep ring-1 ring-purple/15"
      : "bg-gradient-to-br from-purple via-purple to-purple-deep text-white";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {rings && (
        <>
          <span className="pulse-mark__ring pulse-mark__ring--1" />
          <span className="pulse-mark__ring pulse-mark__ring--2" />
          <span className="pulse-mark__ring pulse-mark__ring--3" />
        </>
      )}
      <span
        className={`relative z-10 flex h-full w-full items-center justify-center ${surface}`}
        style={{
          borderRadius: radius,
          boxShadow:
            tone === "purple"
              ? "0 8px 22px -10px rgba(91,58,219,0.55), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -10px 14px -10px rgba(15,17,23,0.35)"
              : "0 4px 14px -6px rgba(15,17,23,0.12)",
        }}
      >
        <span
          className="font-heading font-semibold leading-none tracking-tight"
          style={{ fontSize: fontPx }}
        >
          {label}
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 top-[14%] h-[18%] rounded-full bg-white/22 blur-[3px]"
        />
      </span>
    </span>
  );
}
