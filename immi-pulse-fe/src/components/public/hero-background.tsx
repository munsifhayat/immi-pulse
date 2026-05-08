"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const PULSING_DOTS = [
  { left: "9%",  top: "22%", delay: 0,   size: 4 },
  { left: "18%", top: "68%", delay: 1.4, size: 3 },
  { left: "31%", top: "12%", delay: 2.6, size: 4 },
  { left: "27%", top: "84%", delay: 0.8, size: 3 },
  { left: "44%", top: "38%", delay: 3.2, size: 4 },
  { left: "58%", top: "76%", delay: 1.9, size: 3 },
  { left: "71%", top: "18%", delay: 0.4, size: 4 },
  { left: "84%", top: "55%", delay: 2.2, size: 3 },
  { left: "92%", top: "30%", delay: 3.6, size: 4 },
  { left: "65%", top: "88%", delay: 1.1, size: 3 },
];

export function HeroBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const spot = spotRef.current;
    if (!root || !spot) return;

    let frame = 0;
    let pendingX = 50;
    let pendingY = 35;

    const apply = () => {
      spot.style.setProperty("--mx", `${pendingX}%`);
      spot.style.setProperty("--my", `${pendingY}%`);
      frame = 0;
    };

    const handler = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pendingX = ((e.clientX - rect.left) / rect.width) * 100;
      pendingY = ((e.clientY - rect.top) / rect.height) * 100;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", handler, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handler);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Grid pattern with edge-fade mask */}
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <pattern
            id="hero-grid-pattern"
            x="0"
            y="0"
            width="56"
            height="56"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 56 0 L 0 0 0 56"
              fill="none"
              stroke="#7C5CFC"
              strokeWidth="0.5"
            />
          </pattern>
          <radialGradient id="hero-grid-fade" cx="50%" cy="40%" r="80%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="70%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0.85" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid-pattern)" opacity="0.09" />
        <rect width="100%" height="100%" fill="url(#hero-grid-fade)" />
      </svg>

      {/* Ambient gradient blobs */}
      <div className="absolute -right-40 -top-40 h-[640px] w-[640px] rounded-full bg-purple/[0.07] blur-3xl" />
      <div className="absolute -bottom-48 -left-40 h-[560px] w-[560px] rounded-full bg-purple-muted/[0.10] blur-3xl" />
      <div className="absolute right-[20%] top-[30%] h-[320px] w-[320px] rounded-full bg-teal/[0.04] blur-3xl" />

      {/* Slowly pulsing accent dots at grid intersections */}
      {PULSING_DOTS.map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-purple"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
          }}
          initial={{ opacity: 0.15, scale: 0.8 }}
          animate={{
            opacity: [0.15, 0.55, 0.15],
            scale: [0.8, 1.15, 0.8],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: d.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Mouse-tracking spotlight — driven via CSS variables for zero re-renders */}
      <div
        ref={spotRef}
        className="absolute inset-0 transition-[background-position] duration-300"
        style={{
          background:
            "radial-gradient(600px circle at var(--mx, 50%) var(--my, 35%), rgba(122,90,248,0.10), rgba(189,180,254,0.05) 35%, transparent 60%)",
        }}
      />
    </div>
  );
}
