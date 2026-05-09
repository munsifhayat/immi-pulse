"use client";

/**
 * /dashboard/how-it-works
 *
 * A magazine-style atelier guide to how IMMI-PULSE works. Designed to be the
 * first piece of content a new consultant reads after signup, and the place
 * they return to from Settings when they want to refresh their understanding.
 *
 * Aesthetic intent: an atelier journal — generous whitespace, hairline rules,
 * roman numerals for chapter markers, drop caps to anchor each chapter, a
 * sticky chapter index on the right, and a single animated SVG of "the loop".
 */

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Inbox,
  Mail,
  PenTool,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

type Chapter = {
  id: string;
  numeral: string;
  number: number;
  eyebrow: string;
  title: string;
};

const CHAPTERS: Chapter[] = [
  { id: "loop", numeral: "I", number: 1, eyebrow: "Chapter I", title: "The loop" },
  { id: "intake", numeral: "II", number: 2, eyebrow: "Chapter II", title: "Intake — your questionnaire" },
  { id: "precases", numeral: "III", number: 3, eyebrow: "Chapter III", title: "Pre-cases — the inbox lifecycle" },
  { id: "engagement", numeral: "IV", number: 4, eyebrow: "Chapter IV", title: "The engagement letter" },
  { id: "cases", numeral: "V", number: 5, eyebrow: "Chapter V", title: "Cases — your file room" },
  { id: "overrides", numeral: "VI", number: 6, eyebrow: "Chapter VI", title: "Manual overrides" },
  { id: "trust", numeral: "VII", number: 7, eyebrow: "Coda", title: "Privacy, residency, trust" },
];

export default function HowItWorksPage() {
  const [activeId, setActiveId] = useState<string>(CHAPTERS[0].id);

  // Observe chapter sections to update the sticky index.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId((visible[0].target as HTMLElement).id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    CHAPTERS.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative">
      {/* Page-local atmosphere — quiet wash so the article feels like paper. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px]">
        <div className="absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[color:var(--purple)]/[0.07] blur-3xl" />
        <div className="absolute -right-24 top-32 h-[420px] w-[420px] rounded-full bg-[color:var(--purple-deep)]/[0.06] blur-3xl" />
      </div>

      <article className="grid grid-cols-1 gap-x-10 lg:grid-cols-[minmax(0,1fr)_220px]">
        {/* ────── Body ────── */}
        <div className="min-w-0">
          <Cover />

          <Loop />

          <Intake />

          <PreCases />

          <Engagement />

          <Cases />

          <Overrides />

          <Trust />

          <Coda />
        </div>

        {/* ────── Chapter index (sticky on desktop) ────── */}
        <aside className="hidden lg:block">
          <div className="sticky top-8 pt-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              Index
            </p>
            <ol className="mt-5 space-y-3.5">
              {CHAPTERS.map((c) => {
                const active = c.id === activeId;
                return (
                  <li key={c.id}>
                    <a
                      href={`#${c.id}`}
                      className={
                        "group block leading-tight transition-colors " +
                        (active
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground")
                      }
                    >
                      <div className="flex items-baseline gap-3">
                        <span
                          className={
                            "font-mono text-[10px] tabular-nums tracking-[0.16em] transition-colors " +
                            (active
                              ? "text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]"
                              : "text-muted-foreground/60")
                          }
                        >
                          {c.numeral}
                        </span>
                        <span className="font-heading text-[13.5px] font-normal leading-snug">
                          {c.title}
                        </span>
                      </div>
                      {active && (
                        <span
                          aria-hidden
                          className="ml-[18px] mt-1 block h-px w-8 bg-[color:var(--purple)]/60"
                        />
                      )}
                    </a>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </article>
    </div>
  );
}

// =============================================================================
// SECTIONS
// =============================================================================

function Cover() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className="pt-2"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="editorial-eyebrow">
          <span>The Atelier · Vol. 01 — Onboarding</span>
        </p>
        <p className="editorial-meta hidden sm:block">A six-minute read</p>
      </div>

      <h1
        className="font-heading mt-7 max-w-[16ch] font-normal leading-[0.98] tracking-[-1.6px] text-foreground"
        style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}
      >
        How <em className="not-italic bg-gradient-to-r from-[color:var(--purple)] to-[color:var(--purple-deep)] bg-clip-text text-transparent">IMMI-PULSE</em>
        <br />
        works.
      </h1>

      <p className="mt-7 max-w-[60ch] text-[16.5px] leading-[1.7] text-muted-foreground">
        A small migration practice has four moving parts: a way to receive
        prospects, a place to triage them, a way to engage them with a signed
        agreement, and a workspace to run the case once they&apos;ve paid. This
        guide is a tour of that loop, exactly as it lives inside your console.
      </p>

      <div className="editorial-rule mt-14" />
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// I · The loop — animated SVG diagram
// ─────────────────────────────────────────────────────────────────────────────

function Loop() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 40%"],
  });
  // Draw the path as the user scrolls past — pathLength 0 → 1 fills the line.
  const drawn = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <ChapterSection id="loop" chapter={CHAPTERS[0]}>
      <DropCap>The intake-to-case loop is what most other software gets wrong.</DropCap>{" "}
      Either the prospect is a row in a CRM, or the case is a folder in
      Dropbox, but rarely the same record from first contact to final lodgement.
      In IMMI-PULSE one piece of paper threads the whole way through.

      <div ref={ref} className="relative mt-12">
        {/* Diagram */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-12">
          {/* atmospheric grid */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]" aria-hidden>
            <defs>
              <pattern id="loop-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#7C5CFC" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#loop-grid)" />
          </svg>

          {/* path + stations */}
          <svg viewBox="0 0 720 220" className="relative w-full">
            <defs>
              <linearGradient id="loop-line" x1="0" x2="1">
                <stop offset="0%" stopColor="var(--purple)" />
                <stop offset="100%" stopColor="var(--purple-deep)" />
              </linearGradient>
            </defs>

            {/* faint guide */}
            <path
              d="M 50 130 C 160 60, 260 60, 360 130 S 560 200, 670 130"
              fill="none"
              stroke="color-mix(in srgb, var(--purple) 18%, transparent)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeDasharray="3 6"
            />

            {/* animated foreground line — drawn via Framer Motion's pathLength */}
            <motion.path
              d="M 50 130 C 160 60, 260 60, 360 130 S 560 200, 670 130"
              fill="none"
              stroke="url(#loop-line)"
              strokeWidth="2.2"
              strokeLinecap="round"
              style={{ pathLength: drawn }}
            />

            {/* stations */}
            {LOOP_STATIONS.map((s) => (
              <g key={s.label}>
                <circle cx={s.x} cy={s.y} r="14" fill="white" stroke="var(--purple)" strokeWidth="1.5" />
                <circle cx={s.x} cy={s.y} r="4" fill="var(--purple)" />
                <text
                  x={s.x}
                  y={s.labelY}
                  textAnchor="middle"
                  className="font-heading"
                  fill="var(--foreground)"
                  fontSize="14"
                  fontWeight="500"
                >
                  {s.label}
                </text>
                <text
                  x={s.x}
                  y={s.subY}
                  textAnchor="middle"
                  fill="var(--muted-foreground)"
                  fontSize="9.5"
                  letterSpacing="2"
                  style={{ textTransform: "uppercase" }}
                >
                  {s.eyebrow}
                </text>
              </g>
            ))}
          </svg>

          <p className="mt-6 max-w-[60ch] font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/80">
            Intake → Triage → Engage → Convert → Run
          </p>
        </div>

        <p className="mt-10 max-w-[62ch] text-[15px] leading-[1.75] text-muted-foreground">
          The same record (your <span className="font-medium text-foreground">pre-case</span>)
          travels along that line. As gates clear — qualified, letter signed,
          payment received — the record advances. Once it reaches the end it
          becomes a <span className="font-medium text-foreground">case</span>,
          and a separate workspace opens around it for documents, checkpoints,
          and lodgement.
        </p>
      </div>
    </ChapterSection>
  );
}

const LOOP_STATIONS = [
  { x: 50, y: 130, label: "Form", eyebrow: "Intake", labelY: 165, subY: 180 },
  { x: 200, y: 88, label: "Inbox", eyebrow: "Triage", labelY: 60, subY: 46 },
  { x: 360, y: 130, label: "Letter", eyebrow: "Engage", labelY: 165, subY: 180 },
  { x: 520, y: 178, label: "Payment", eyebrow: "Convert", labelY: 38, subY: 24 },
  { x: 670, y: 130, label: "Case", eyebrow: "Run", labelY: 165, subY: 180 },
];

// ─────────────────────────────────────────────────────────────────────────────
// II · Intake
// ─────────────────────────────────────────────────────────────────────────────

function Intake() {
  return (
    <ChapterSection id="intake" chapter={CHAPTERS[1]}>
      <DropCap>Every intake starts with a public link.</DropCap>{" "}
      We seed your account with four ready-to-use questionnaires — General,
      Onshore Individual, Offshore Individual, Employer-Sponsored — and you
      can edit, clone, or replace them. Each form has a public URL like
      <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 mx-1 font-mono text-[12px] text-foreground/85">
        /q/your-firm-general-intake
      </span>
      that anyone can fill in without an account.

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Tile
          icon={<PenTool className="h-4 w-4" />}
          eyebrow="What you control"
          title="The questions, the audience, the look."
          body="Drag, drop, mark required. Your firm name and contact details brand the public page automatically."
        />
        <Tile
          icon={<Inbox className="h-4 w-4" />}
          eyebrow="What we do"
          title="Land each submission as a structured record."
          body="An AI summary, a suggested outcome (Likely fit, Needs info, Paid consult, Unlikely), and a confidence score — alongside the raw answers."
        />
      </div>

      <PullQuote>
        Every intake form is a contract with your future self: ask the
        questions you wish prospects had answered before the first call.
      </PullQuote>
    </ChapterSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// III · Pre-cases
// ─────────────────────────────────────────────────────────────────────────────

function PreCases() {
  return (
    <ChapterSection id="precases" chapter={CHAPTERS[2]}>
      <DropCap>A pre-case is a prospect&apos;s life in five fields.</DropCap>{" "}
      It begins as an Inbox row and walks through four states — pending,
      qualified, letter sent, signed, paid — before being promoted into a
      proper case. You see the same record at every step; the right column
      grows new sections as gates clear.

      <div className="mt-10">
        <PreCaseRail />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <MiniCard label="Inbox" value="Pending" body="Triage what's new." />
        <MiniCard label="Pre-cases" value="In flight" body="Letter, sign, payment." />
        <MiniCard label="Cases" value="Open" body="Promoted from a paid pre-case." />
      </div>
    </ChapterSection>
  );
}

function PreCaseRail() {
  const stops = [
    { label: "Submission lands", caption: "Inbox · Pending" },
    { label: "Mark qualified", caption: "→ Pre-cases" },
    { label: "Send engagement letter", caption: "Letter sent" },
    { label: "Client signs (PIN)", caption: "Letter signed" },
    { label: "Record payment", caption: "Paid" },
    { label: "Convert", caption: "→ Case" },
  ];
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-stretch gap-0">
        {stops.map((s, i) => (
          <li key={s.label} className="flex items-stretch">
            <div className="flex w-[180px] flex-col items-start gap-2 px-4 py-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="font-heading text-[14.5px] font-normal leading-snug tracking-[-0.01em] text-foreground">
                {s.label}
              </p>
              <p className="text-[12px] leading-snug text-muted-foreground">
                {s.caption}
              </p>
            </div>
            {i < stops.length - 1 && (
              <div aria-hidden className="relative w-10 self-stretch">
                <span className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[color:var(--purple)]/35 to-[color:var(--purple)]/10" />
                <span className="absolute right-1/2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-[color:var(--purple)]" />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IV · Engagement letter
// ─────────────────────────────────────────────────────────────────────────────

function Engagement() {
  return (
    <ChapterSection id="engagement" chapter={CHAPTERS[3]}>
      <DropCap>The engagement letter is where the platform pays for itself.</DropCap>{" "}
      You compose it from the pre-case detail — visa, scope, fees — and we
      mint a signed link plus a 6-digit PIN. Both go to the client; only
      together can they sign. Every event (sent, opened, signed, voided)
      is timestamped on the same pre-case.

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Tile
          icon={<Mail className="h-4 w-4" />}
          eyebrow="What lands in their inbox"
          title="A real email from your firm."
          body="Sent via Resend on a verified domain. The body is a short note; the agreement renders on a public page they open from the link."
        />
        <Tile
          icon={<ShieldCheck className="h-4 w-4" />}
          eyebrow="How signing works"
          title="PIN + typed or drawn signature."
          body="Electronic signature under the Electronic Transactions Act 1999 (Cth). The signed letter is archived against the pre-case for life."
        />
      </div>
    </ChapterSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V · Cases
// ─────────────────────────────────────────────────────────────────────────────

function Cases() {
  return (
    <ChapterSection id="cases" chapter={CHAPTERS[4]}>
      <DropCap>Once a pre-case is paid, you promote it to a case.</DropCap>{" "}
      That&apos;s when the file room opens — checkpoints, document requests on a
      secure portal, AI-suggested checklists by visa subclass, and a billing
      ledger that runs alongside the work. The Cases tab is your engine
      room; the dashboard is the lobby.

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <MiniCard label="Stages" value="6" body="Triage → Lodgement → Decision." />
        <MiniCard label="Checkpoints" value="Billing" body="Charge per milestone, not in advance." />
        <MiniCard label="Portal" value="Client-facing" body="Documents and updates without email back-and-forth." />
      </div>
    </ChapterSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VI · Manual overrides
// ─────────────────────────────────────────────────────────────────────────────

function Overrides() {
  return (
    <ChapterSection id="overrides" chapter={CHAPTERS[5]}>
      <DropCap>Every automated step has a manual fallback.</DropCap>{" "}
      Real practice is messier than software. A family member doesn&apos;t pay.
      A client signs on paper and emails it back. Email bounces. The kebab
      menu on every pre-case carries a small set of overrides for exactly
      these cases — and each override is recorded in the audit trail with
      the reason you typed.

      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {[
          { t: "Mark letter signed manually", b: "When a client signs offline." },
          { t: "Skip payment", b: "Pro-bono or a relative — write the reason." },
          { t: "Force convert to case", b: "Skip remaining gates with an audit reason." },
          { t: "Re-trigger AI", b: "If the summary or outcome looks off." },
        ].map((o) => (
          <li
            key={o.t}
            className="flex items-start gap-3 rounded-2xl border border-border bg-card/70 p-5"
          >
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--purple)]/8 text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">
              <Wrench className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="font-heading text-[14.5px] font-normal leading-tight text-foreground">
                {o.t}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {o.b}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <PullQuote>
        Software pretends real life is linear. Practice software has to leave
        a door open at every step.
      </PullQuote>
    </ChapterSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VII · Privacy & residency
// ─────────────────────────────────────────────────────────────────────────────

function Trust() {
  const items = [
    {
      label: "Australian data residency",
      body: "Hosted in Sydney. All records, all the time — including engagement letters, pre-cases, and uploaded documents.",
    },
    {
      label: "Privacy Act 1988",
      body: "Aligned with APP 1–13. Client data is never used to train external models.",
    },
    {
      label: "Encryption at rest & in transit",
      body: "Per-client encryption keys. TLS 1.3 over the wire. Nothing leaves the platform unencrypted.",
    },
    {
      label: "OMARA-aligned record-keeping",
      body: "Audit trail on every state change with the actor, time, and reason where applicable.",
    },
  ];
  return (
    <ChapterSection id="trust" chapter={CHAPTERS[6]}>
      <DropCap>Your client trusts you. We try to deserve that.</DropCap>{" "}
      A migration consultancy carries some of the most sensitive paperwork
      a person owns — passports, biometrics, medicals, employment
      contracts. The least we can do is keep that paperwork under
      Australian jurisdiction and out of the way of training corpora.

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {items.map((i) => (
          <div
            key={i.label}
            className="flex items-start gap-3 rounded-2xl border border-border bg-card/70 p-5"
          >
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--purple)]/8 text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="font-heading text-[14.5px] font-normal leading-tight text-foreground">
                {i.label}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {i.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ChapterSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coda — close-out CTA
// ─────────────────────────────────────────────────────────────────────────────

function Coda() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease }}
      className="relative my-24 overflow-hidden rounded-3xl border border-[color:var(--purple)]/25 bg-gradient-to-br from-[color:var(--purple-muted)]/30 via-card to-card p-10 sm:p-14 dark:from-[color:var(--purple)]/10"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-16 -top-16 h-[280px] w-[280px] rounded-full bg-[color:var(--purple)]/[0.12] blur-3xl" />
      </div>
      <p className="editorial-eyebrow">
        <span>Coda</span>
      </p>
      <h2
        className="font-heading mt-5 max-w-[18ch] font-normal leading-[1.05] tracking-[-0.025em] text-foreground"
        style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
      >
        Now: <em className="not-italic bg-gradient-to-r from-[color:var(--purple)] to-[color:var(--purple-deep)] bg-clip-text text-transparent">share your link</em>.
      </h2>
      <p className="mt-5 max-w-[58ch] text-[15px] leading-[1.7] text-muted-foreground">
        The first move is yours. Open your inbox, copy the public form URL,
        and put it where prospects already are — your website, your
        Instagram bio, the signature on your replies.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/dashboard/inbox"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-[color:var(--purple)] bg-[color:var(--purple)] px-5 py-3 text-[13.5px] font-medium text-white shadow-[0_14px_30px_-10px_rgba(124,92,252,0.55)] transition-all hover:border-[color:var(--purple-deep)] hover:bg-[color:var(--purple-deep)]"
        >
          Open inbox
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard/questionnaires"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-[13.5px] font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-foreground/[0.03]"
        >
          See my questionnaires
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.section>
  );
}

// =============================================================================
// PRIMITIVES
// =============================================================================

function ChapterSection({
  id,
  chapter,
  children,
}: {
  id: string;
  chapter: Chapter;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, ease }}
      className="scroll-mt-24 py-20 first:pt-0"
    >
      <header>
        <p className="editorial-eyebrow">
          <span>
            {chapter.eyebrow} · Nº {String(chapter.number).padStart(2, "0")}
          </span>
        </p>
        <h2
          className="font-heading mt-6 max-w-[20ch] font-normal leading-[1.04] tracking-[-1px] text-foreground"
          style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.7rem)" }}
        >
          {chapter.title}
        </h2>
        <div className="editorial-rule mt-8" />
      </header>

      <div className="mt-9 max-w-[64ch] text-[15.5px] leading-[1.78] text-foreground/85">
        {children}
      </div>
    </motion.section>
  );
}

/** Drop cap — the first letter is wrapped in a typographic flourish. */
function DropCap({ children }: { children: React.ReactNode }) {
  // Pull the first character out for the cap, keep the rest inline.
  const text = typeof children === "string" ? children : "";
  if (!text) return <>{children}</>;
  const first = text.charAt(0);
  const rest = text.slice(1);
  return (
    <>
      <span
        aria-hidden
        className="float-left mr-3 mt-1 select-none bg-gradient-to-br from-[color:var(--purple)] to-[color:var(--purple-deep)] bg-clip-text font-heading text-[64px] font-medium leading-[0.85] tracking-[-0.04em] text-transparent"
      >
        {first}
      </span>
      <span className="sr-only">{first}</span>
      {rest}
    </>
  );
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="relative my-10 border-l-2 border-[color:var(--purple)]/40 pl-6">
      <p className="font-heading text-[20px] font-normal leading-[1.4] tracking-[-0.01em] text-foreground/90">
        “{children}”
      </p>
    </blockquote>
  );
}

function Tile({
  icon,
  eyebrow,
  title,
  body,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--purple)]/8 text-[color:var(--purple-deep)] dark:text-[color:var(--purple-light)]">
          {icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
          {eyebrow}
        </span>
      </div>
      <p className="font-heading mt-4 text-[16px] font-normal leading-tight tracking-[-0.01em] text-foreground">
        {title}
      </p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

function MiniCard({ label, value, body }: { label: string; value: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
        {label}
      </p>
      <p className="font-heading mt-3 text-[24px] font-medium leading-none tracking-[-0.01em] text-foreground">
        {value}
      </p>
      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

// keep these icons referenced for future surfaces
void [Receipt, Sparkles];
