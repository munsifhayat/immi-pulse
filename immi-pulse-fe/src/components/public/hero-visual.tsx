"use client";

import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";
import { Check, Shield, User, FileText, Sparkles } from "lucide-react";

const springConfig = { stiffness: 150, damping: 25 };

const pipelineSteps = [
  { label: "AI Classification", status: "complete" as const, detail: "98.2% match" },
  { label: "Document Validation", status: "complete" as const, detail: "8/8 verified" },
  { label: "Compliance Check", status: "active" as const, detail: "In progress…" },
  { label: "Ready for Lodgement", status: "pending" as const, detail: "Pending" },
];

export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const rx = useSpring(useTransform(my, [-300, 300], [4, -4]), springConfig);
  const ry = useSpring(useTransform(mx, [-300, 300], [-4, 4]), springConfig);

  function onMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative flex h-full w-full items-center justify-center"
      style={{ perspective: "1200px" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple/[0.09] via-purple-light/[0.06] to-transparent blur-3xl"
        aria-hidden="true"
      />

      {/* ── Main dashboard card ── */}
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="relative z-10 w-[400px] overflow-hidden rounded-2xl border border-purple/[0.12] bg-white/95 shadow-2xl shadow-purple/[0.07] backdrop-blur-xl"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2.5">
          <span className="h-[9px] w-[9px] rounded-full bg-[#FF605C]" />
          <span className="h-[9px] w-[9px] rounded-full bg-[#FFBD44]" />
          <span className="h-[9px] w-[9px] rounded-full bg-[#00CA4E]" />
          <span className="ml-3 text-[11px] font-medium text-gray-text/40 select-none">
            console.immipulse.com
          </span>
        </div>

        <div className="space-y-4 p-5">
          {/* Case header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] font-semibold text-navy">
                Case #IP-2025-0482
              </p>
              <p className="mt-0.5 text-[11px] text-gray-text">
                Subclass 482 — Temporary Skill Shortage
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple/10">
              <Shield className="h-4 w-4 text-purple" />
            </div>
          </div>

          {/* Pipeline */}
          <div className="relative space-y-0">
            {/* Vertical connector line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gray-200" />

            {pipelineSteps.map((step, i) => (
              <div key={i} className="relative flex items-center gap-3 py-[7px]">
                <div
                  className={`relative z-[1] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    step.status === "complete"
                      ? "bg-teal/15 text-teal"
                      : step.status === "active"
                        ? "bg-purple/15 text-purple ring-[1.5px] ring-purple/30"
                        : "bg-gray-100 text-gray-text/30"
                  }`}
                >
                  {step.status === "complete" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    i + 1
                  )}
                </div>

                <p
                  className={`flex-1 text-[12px] font-medium ${step.status === "pending" ? "text-gray-text/35" : "text-navy"}`}
                >
                  {step.label}
                </p>

                <span
                  className={`text-[10px] ${
                    step.status === "complete"
                      ? "text-teal"
                      : step.status === "active"
                        ? "text-purple"
                        : "text-gray-text/25"
                  }`}
                >
                  {step.detail}
                </span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
            {[
              { value: "20", label: "Documents", color: "text-navy" },
              { value: "62%", label: "Complete", color: "text-purple" },
              { value: "3", label: "AI Insights", color: "text-teal" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-[16px] font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-text">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Floating card: Documents verified (top-right) ── */}
      <motion.div
        style={{ rotateX: rx, rotateY: ry, translateZ: 50, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, y: -16, x: 10 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute right-[-16px] top-[6%] z-20 w-[196px] rounded-xl border border-teal/15 bg-white p-3 shadow-lg shadow-teal/[0.06]"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal/12">
            <Check className="h-3.5 w-3.5 text-teal" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-navy">Docs Verified</p>
            <p className="text-[10px] text-gray-text">
              Passport, Skills Assessment
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Floating card: Client profile (bottom-left) ── */}
      <motion.div
        style={{ rotateX: rx, rotateY: ry, translateZ: 35, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="absolute bottom-[12%] left-[-24px] z-20 w-[185px] rounded-xl border border-purple/12 bg-white p-3 shadow-lg shadow-purple/[0.05]"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple/10">
            <User className="h-3.5 w-3.5 text-purple" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-navy">Client Profile</p>
            <p className="text-[10px] text-gray-text">Agent: Sarah K.</p>
          </div>
        </div>
      </motion.div>

      {/* ── Floating card: AI insight (mid-right, below docs) ── */}
      <motion.div
        style={{ rotateX: rx, rotateY: ry, translateZ: 65, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute bottom-[6%] right-[2%] z-20 w-[180px] rounded-xl border border-purple/10 bg-white p-3 shadow-lg shadow-purple/[0.04]"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple/10">
            <Sparkles className="h-3.5 w-3.5 text-purple" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-navy">AI Insight</p>
            <p className="text-[10px] text-gray-text">
              Missing: English test
            </p>
          </div>
        </div>
      </motion.div>

      {/* Decorative dots */}
      <div
        className="absolute left-[3%] top-[18%] h-2 w-2 animate-pulse rounded-full bg-purple/20"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[28%] right-[3%] h-1.5 w-1.5 animate-pulse rounded-full bg-teal/30"
        style={{ animationDelay: "1s" }}
        aria-hidden="true"
      />
      <div
        className="absolute left-[-2%] top-[55%] h-3 w-3 rounded-full border border-purple/10"
        aria-hidden="true"
      />
    </div>
  );
}
