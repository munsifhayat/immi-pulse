"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * Lightweight CSS-driven confetti burst. No dependencies, no canvas.
 * Mount it with a `key` that changes when you want a new burst — each mount
 * runs once and removes itself via the parent (e.g. setTimeout).
 *
 *   {showBurst && <ConfettiBurst key={burstKey} />}
 */

const PALETTE = ["#7C5CFC", "#5B3ADB", "#BDB4FE", "#2DD4BF", "#1B7B6F", "#F59E0B"];
const SHAPES: Array<"square" | "circle" | "bar"> = ["square", "circle", "bar"];

interface Particle {
  id: number;
  color: string;
  shape: "square" | "circle" | "bar";
  size: number;
  startX: number;
  endX: number;
  endY: number;
  rotate: number;
  duration: number;
  delay: number;
}

function makeParticles(count: number): Particle[] {
  // Deterministic-ish but varied: derive from index so renders are stable.
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const distance = 80 + Math.random() * 110;
    const drop = 40 + Math.random() * 80;
    return {
      id: i,
      color: PALETTE[i % PALETTE.length],
      shape: SHAPES[i % SHAPES.length],
      size: 5 + Math.round(Math.random() * 5),
      startX: 0,
      endX: Math.cos(angle) * distance,
      endY: Math.sin(angle) * distance + drop,
      rotate: -180 + Math.random() * 360,
      duration: 0.9 + Math.random() * 0.6,
      delay: Math.random() * 0.08,
    };
  });
}

export function ConfettiBurst({ count = 22 }: { count?: number }) {
  const particles = useMemo(() => makeParticles(count), [count]);

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-0 w-0"
    >
      {particles.map((p) => {
        const baseStyle: React.CSSProperties = {
          width: p.shape === "bar" ? p.size * 2 : p.size,
          height: p.shape === "bar" ? p.size / 2 : p.size,
          backgroundColor: p.color,
          borderRadius: p.shape === "circle" ? "50%" : p.shape === "bar" ? 1 : 1,
        };
        return (
          <motion.span
            key={p.id}
            style={{ position: "absolute", ...baseStyle }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.6 }}
            animate={{
              x: p.endX,
              y: p.endY,
              rotate: p.rotate,
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1, 1, 0.9],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.18, 0.68, 0.4, 1],
              times: [0, 0.15, 0.7, 1],
            }}
          />
        );
      })}
    </span>
  );
}
