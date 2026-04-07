"use client";

/**
 * Abstract 3D geometric backdrop for the hero section.
 * Floating panels, gradient orbs, and grid textures — no portrait.
 */
export function GradientMesh() {
  return (
    <div className="relative h-full w-full" style={{ perspective: "1000px" }}>
      {/* Large soft gradient orb — visual anchor */}
      <div
        className="absolute left-1/2 top-[45%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple/[0.12] via-purple-light/[0.08] to-purple-muted/[0.14]"
        aria-hidden="true"
      />

      {/* 3D tilted panel — primary */}
      <div
        className="absolute left-[8%] top-[12%] h-[320px] w-[280px] overflow-hidden rounded-2xl border border-purple/[0.12] bg-gradient-to-br from-white/60 to-white/30 shadow-lg shadow-purple/[0.04] backdrop-blur-sm"
        style={{
          transform: "rotateY(-10deg) rotateX(4deg)",
          transformStyle: "preserve-3d",
        }}
        aria-hidden="true"
      >
        <svg className="h-full w-full opacity-[0.06]">
          <defs>
            <pattern
              id="panel-grid-1"
              x="0"
              y="0"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 28 0 L 0 0 0 28"
                fill="none"
                stroke="#7C5CFC"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#panel-grid-1)" />
        </svg>
      </div>

      {/* 3D tilted panel — secondary (smaller, different angle) */}
      <div
        className="absolute bottom-[14%] right-[4%] h-[220px] w-[200px] overflow-hidden rounded-xl border border-purple/[0.08] bg-gradient-to-tl from-purple/[0.04] to-transparent"
        style={{
          transform: "rotateY(8deg) rotateX(-3deg)",
          transformStyle: "preserve-3d",
        }}
        aria-hidden="true"
      >
        <svg className="h-full w-full opacity-[0.05]">
          <defs>
            <pattern
              id="panel-grid-2"
              x="0"
              y="0"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="#7C5CFC"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#panel-grid-2)" />
        </svg>
      </div>

      {/* Accent circles */}
      <div className="absolute left-[18%] top-[8%] h-3 w-3 rounded-full bg-purple/20" aria-hidden="true" />
      <div className="absolute right-[12%] top-[25%] h-2 w-2 rounded-full bg-purple-light/30" aria-hidden="true" />
      <div className="absolute bottom-[22%] left-[35%] h-4 w-4 rounded-full border border-purple/15" aria-hidden="true" />
      <div className="absolute right-[30%] top-[6%] h-2.5 w-2.5 rounded-full bg-purple-muted/40" aria-hidden="true" />

      {/* Dashed connecting lines */}
      <svg
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <line
          x1="25%"
          y1="12%"
          x2="65%"
          y2="35%"
          stroke="#7C5CFC"
          strokeWidth="0.5"
          strokeDasharray="4 6"
          opacity="0.1"
        />
        <line
          x1="55%"
          y1="18%"
          x2="82%"
          y2="55%"
          stroke="#7C5CFC"
          strokeWidth="0.5"
          strokeDasharray="4 6"
          opacity="0.08"
        />
        <line
          x1="20%"
          y1="60%"
          x2="50%"
          y2="80%"
          stroke="#7C5CFC"
          strokeWidth="0.5"
          strokeDasharray="4 6"
          opacity="0.06"
        />
      </svg>

      {/* Small inner glow */}
      <div
        className="absolute left-[55%] top-[30%] h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple/[0.06] blur-2xl"
        aria-hidden="true"
      />
    </div>
  );
}
