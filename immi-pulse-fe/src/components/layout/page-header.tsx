"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

type PageHeaderProps = {
  /** Uppercase eyebrow shown above the title (e.g. "Inbox"). */
  eyebrow?: string;
  /** Display title. Wrap accent words in <em>…</em> for purple gradient. */
  title: ReactNode;
  /** Body description in Inter. */
  description?: ReactNode;
  /** Right-side actions slot (buttons, badges). */
  actions?: ReactNode;
  /** Optional secondary metadata shown on the right. */
  meta?: ReactNode;
  className?: string;
};

/**
 * Page header used across console pages.
 * Aesthetics match the public signup page: Outfit display heading,
 * purple gradient accent for italic words, soft eyebrow.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease }}
      className={cn("relative", className)}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">
              {eyebrow}
            </p>
          )}

          <h1
            className={cn(
              "font-heading title-accent mt-3 max-w-[22ch] font-normal leading-[1.05] tracking-[-0.8px] text-foreground",
              !eyebrow && "mt-0",
            )}
            style={{ fontSize: "clamp(2rem, 3.4vw, 2.8rem)" }}
          >
            {title}
          </h1>

          {description && (
            <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.65] text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {(actions || meta) && (
          <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
            {meta && (
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                {meta}
              </span>
            )}
            {actions && (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            )}
          </div>
        )}
      </div>
    </motion.section>
  );
}

/**
 * Add this CSS scope to <em> inside the header title for the
 * gradient + underline accent. Used by the title prop above when
 * the consumer wraps a word in <em>.
 */

/**
 * Pill badge for header actions or metadata.
 */
export function EditorialTag({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger" | "muted";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "border-border text-foreground/80 bg-card",
    primary:
      "border-[color:var(--purple)]/30 bg-[color:var(--purple)]/8 text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]",
    success:
      "border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300",
    warning:
      "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300",
    danger: "border-rose-500/30 bg-rose-500/8 text-rose-700 dark:text-rose-300",
    muted: "border-border text-muted-foreground bg-card",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Editorial button — match signup CTA style.
 */
export function EditorialButton({
  children,
  onClick,
  disabled,
  variant = "solid",
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "solid" | "ghost";
  type?: "button" | "submit";
  className?: string;
}) {
  const styles =
    variant === "solid"
      ? "border-2 border-[color:var(--purple)] bg-[color:var(--purple)] text-white shadow-[0_10px_24px_-10px_rgba(124,92,252,0.5)] hover:border-[color:var(--purple-deep)] hover:bg-[color:var(--purple-deep)]"
      : "border border-border text-foreground hover:border-foreground/30 hover:bg-foreground/[0.04]";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-50",
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}
