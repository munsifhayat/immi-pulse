import { ReactNode } from "react";
import Link from "next/link";
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
  /** Optional mono uppercase eyebrow above the title. */
  eyebrow?: string;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

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
    <section
      className={cn(
        "relative overflow-hidden border border-border/60 bg-card/40 px-6 py-14 sm:px-10 sm:py-20",
        className,
      )}
    >
      {/* Soft atmospheric backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 0%, color-mix(in srgb, var(--purple) 10%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        {Icon && (
          <div className="mb-6 flex h-14 w-14 items-center justify-center border border-[color:var(--purple)]/25 bg-[color:var(--purple)]/8">
            <Icon className="h-5 w-5 text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]" />
          </div>
        )}

        {eyebrow && (
          <p className="editorial-eyebrow mb-4">
            <span>{eyebrow}</span>
          </p>
        )}

        <h3 className="editorial-title max-w-[18ch] text-[clamp(1.9rem,2.6vw,2.4rem)]">
          {title}
        </h3>

        {description && (
          <p className="mt-4 max-w-[52ch] text-[14.5px] leading-[1.65] text-muted-foreground">
            {description}
          </p>
        )}

        {(primaryAction || secondaryAction) && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            {primaryAction && <ActionButton {...primaryAction} variant="primary" />}
            {secondaryAction && <ActionButton {...secondaryAction} variant="ghost" />}
          </div>
        )}

        {children && <div className="mt-6 w-full">{children}</div>}
      </div>

      {steps && steps.length > 0 && (
        <div className="relative mx-auto mt-12 grid max-w-4xl gap-px border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 bg-background p-5 text-left"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-serif-d text-[22px] italic leading-none text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">
                  {ROMAN[i] ?? i + 1}
                </span>
                <span className="font-mono-d text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                  Step {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="text-[13.5px] font-semibold leading-snug text-foreground">
                {step.title}
              </p>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
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
    "font-mono-d inline-flex items-center gap-2.5 px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.22em] transition-all duration-300",
    variant === "primary"
      ? "bg-foreground text-background hover:bg-[color:var(--purple-deep)] hover:text-white"
      : "border border-foreground/15 text-foreground hover:border-foreground/40 hover:bg-foreground/5",
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {label}
    </button>
  );
}
