"use client";

/**
 * Quiet ambient atmosphere matching the signup page —
 * a faint top radial wash and one slow drifting orb.
 * No grid lattice, no compass seals.
 */
export function ConsoleAtmosphere() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Top radial wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 60% -5%, color-mix(in srgb, var(--purple) 9%, transparent), transparent 65%)",
        }}
      />
      {/* Bottom-right ambient orb */}
      <div
        className="animate-orb-drift absolute -right-44 top-32 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: "color-mix(in srgb, var(--purple) 6%, transparent)" }}
      />
      <div
        className="animate-orb-drift absolute -left-40 -bottom-44 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{
          animationDelay: "-7s",
          background: "color-mix(in srgb, var(--purple-muted) 12%, transparent)",
        }}
      />
    </div>
  );
}
