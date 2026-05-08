"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href?: string; onClick?: () => void };
  steps?: { title: string; description: string }[];
  className?: string;
  children?: ReactNode;
  /** Optional uppercase eyebrow above the title. */
  eyebrow?: string;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  steps,
  className,
  children,
  eyebrow,
}: EmptyStateProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-16 shadow-[0_1px_0_rgba(15,17,23,0.02)] sm:px-10 sm:py-20",
        className,
      )}
    >
      {/* Quiet top wash — same vibe as signup feature cards */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 0%, color-mix(in srgb, var(--purple) 8%, transparent), transparent 65%)",
        }}
      />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        {Icon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--purple)]/10 ring-1 ring-[color:var(--purple)]/15"
          >
            <Icon className="h-6 w-6 text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]" />
          </motion.div>
        )}

        {eyebrow && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease }}
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]"
          >
            {eyebrow}
          </motion.p>
        )}

        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22, ease }}
          className="font-heading max-w-[20ch] font-normal leading-[1.05] tracking-[-0.8px] text-foreground"
          style={{ fontSize: "clamp(1.85rem, 2.6vw, 2.4rem)" }}
        >
          {title}
        </motion.h3>

        {description && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3, ease }}
            className="mt-4 max-w-[54ch] text-[14.5px] leading-[1.65] text-muted-foreground"
          >
            {description}
          </motion.p>
        )}

        {(primaryAction || secondaryAction) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4, ease }}
            className="mt-7 flex flex-wrap items-center justify-center gap-2.5"
          >
            {primaryAction && <ActionButton {...primaryAction} variant="primary" />}
            {secondaryAction && <ActionButton {...secondaryAction} variant="ghost" />}
          </motion.div>
        )}

        {children && <div className="mt-6 w-full">{children}</div>}
      </div>

      {steps && steps.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.08, delayChildren: 0.45 },
            },
          }}
          className="relative mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {steps.map((step, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease },
                },
              }}
              className="group relative flex flex-col gap-2 rounded-2xl border border-border bg-background p-5 text-left shadow-[0_1px_0_rgba(15,17,23,0.02)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--purple)]/30 hover:shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--purple)_55%,transparent)]"
            >
              <div className="flex items-baseline justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">
                  Step {String(i + 1).padStart(2, "0")}
                </p>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="font-heading mt-1 text-[15px] font-semibold leading-snug text-foreground">
                {step.title}
              </p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.section>
  );
}

function ActionButton({
  label,
  href,
  onClick,
  variant,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  variant: "primary" | "ghost";
}) {
  const cls = cn(
    "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-medium transition-all",
    variant === "primary"
      ? "border-2 border-[color:var(--purple)] bg-[color:var(--purple)] text-white shadow-[0_10px_24px_-10px_rgba(124,92,252,0.5)] hover:border-[color:var(--purple-deep)] hover:bg-[color:var(--purple-deep)]"
      : "border border-border text-foreground hover:border-foreground/30 hover:bg-foreground/[0.04]",
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {label}
        <ArrowRight />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {label}
      <ArrowRight />
    </button>
  );
}

function ArrowRight() {
  return (
    <svg
      aria-hidden
      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M3 8h10m0 0L9 4m4 4l-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
