"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

type PageHeaderProps = {
  /** Mono uppercase eyebrow shown above the title (e.g. "Folio Nº 002 — Inbox"). */
  eyebrow?: string;
  /** Display title. Wrap the italic accent word in <em>…</em>. */
  title: ReactNode;
  /** Body description, kept readable in Inter. */
  description?: ReactNode;
  /** Right-side actions slot (buttons, badges). */
  actions?: ReactNode;
  /** Optional secondary metadata shown on the right (small mono uppercase). */
  meta?: ReactNode;
  className?: string;
};

/**
 * The editorial section header used across every console page.
 * Produces the same visual language as the get-started "manifest":
 * eyebrow rule, serif italic display title, hairline divider beneath.
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
      className={cn("relative pb-7", className)}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="editorial-eyebrow">
              <span>{eyebrow}</span>
            </p>
          )}

          <h1
            className={cn(
              "editorial-title mt-3 max-w-[22ch]",
              !eyebrow && "mt-0",
            )}
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
              <span className="editorial-meta text-right">{meta}</span>
            )}
            {actions && (
              <div className="flex flex-wrap items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="editorial-rule mt-7" aria-hidden />
    </motion.section>
  );
}

/**
 * Small mono uppercase pill used in PageHeader actions or list rows.
 * Editorial counterpart to shadcn's <Badge>.
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
    default:
      "border-foreground/15 text-foreground/75",
    primary:
      "border-[color:var(--purple)]/35 bg-[color:var(--purple)]/8 text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]",
    success:
      "border-emerald-500/35 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300",
    warning:
      "border-amber-500/35 bg-amber-500/8 text-amber-700 dark:text-amber-300",
    danger:
      "border-rose-500/35 bg-rose-500/8 text-rose-700 dark:text-rose-300",
    muted:
      "border-foreground/10 text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "font-mono-d inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] uppercase leading-none tracking-[0.18em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Editorial button variant — sharp, mono uppercase, with hairline arrow.
 * Use for primary actions in headers and empty states.
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
      ? "bg-foreground text-background hover:bg-[color:var(--purple-deep)] hover:text-white"
      : "border border-foreground/15 text-foreground hover:border-foreground/40 hover:bg-foreground/5";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-mono-d group inline-flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] transition-all duration-300 disabled:opacity-50",
        styles,
        className,
      )}
    >
      {children}
    </button>
  );
}
