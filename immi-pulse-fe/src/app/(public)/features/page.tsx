"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Mail,
  MessageCircle,
  Globe,
  UserPlus,
  Phone,
  Inbox,
  Sparkles,
  FileSignature,
  Wallet,
  Briefcase,
  Check,
  ShieldCheck,
  Paperclip,
  Building2,
  CreditCard,
  Banknote,
} from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";

/* ──────────────────────────────────────────────────────────────────────
   Brand glyph components — lucide doesn't ship brand marks, so we inline
   minimal logos for the channels the page references.
   ────────────────────────────────────────────────────────────────────── */

type GlyphProps = { className?: string; style?: React.CSSProperties };

const InstagramGlyph = ({ className, style }: GlyphProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
  </svg>
);

const WhatsAppGlyph = ({ className, style }: GlyphProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.74.46 3.43 1.32 4.92L2 22l5.32-1.4a9.86 9.86 0 0 0 4.72 1.2h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 19 4.96 9.78 9.78 0 0 0 12.04 2zm5.43 14.06c-.23.65-1.34 1.24-1.87 1.32-.48.07-1.08.1-1.74-.11-.4-.13-.92-.3-1.58-.59-2.78-1.2-4.6-3.99-4.74-4.18-.14-.18-1.13-1.5-1.13-2.86 0-1.36.71-2.03.97-2.31.25-.28.55-.35.74-.35l.53.01c.17.01.4-.07.62.47.23.55.78 1.91.85 2.05.07.14.11.3.02.49-.09.18-.14.3-.27.46-.14.15-.29.34-.41.46-.14.14-.28.29-.12.56.16.28.71 1.18 1.53 1.91 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.16-.18.69-.8.87-1.07.18-.28.37-.23.62-.14.25.09 1.6.76 1.87.9.27.14.46.21.53.32.07.12.07.69-.16 1.34z" />
  </svg>
);

const LinkedInGlyph = ({ className, style }: GlyphProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
  </svg>
);

const FacebookGlyph = ({ className, style }: GlyphProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
    <path d="M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07c0 4.96 3.66 9.07 8.44 9.84v-6.96H7.9v-2.88h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.19 2.24.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.77l-.44 2.88h-2.33V22c4.78-.77 8.44-4.88 8.44-9.93z" />
  </svg>
);

const GmailGlyph = ({ className, style }: GlyphProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
    <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h.78L12 9.39 18.72 4h.78A1.5 1.5 0 0 1 21 5.5V18.5a1.5 1.5 0 0 1-1.5 1.5H17V9.83l-5 4-5-4V20H4.5A1.5 1.5 0 0 1 3 18.5V5.5z" />
  </svg>
);

/* ──────────────────────────────────────────────────────────────────────
   1. HERO — chaos converging into a single pipeline
   ────────────────────────────────────────────────────────────────────── */

/**
 * Channels positioned on a circle around the central inbox.
 * Each chip lives inside a non-animated wrapper (absolute positioning)
 * so Framer Motion's transform animations don't fight our translate.
 */
// Adapters: lucide icons accept className but not style; wrap them so we can
// pass a colour through `style` consistently with our brand glyphs.
const GlobeAdapter = ({ className, style }: GlyphProps) => (
  <span className={`inline-flex ${className ?? ""}`} style={style}>
    <Globe className="h-full w-full" />
  </span>
);
const UserPlusAdapter = ({ className, style }: GlyphProps) => (
  <span className={`inline-flex ${className ?? ""}`} style={style}>
    <UserPlus className="h-full w-full" />
  </span>
);
const PhoneAdapter = ({ className, style }: GlyphProps) => (
  <span className={`inline-flex ${className ?? ""}`} style={style}>
    <Phone className="h-full w-full" />
  </span>
);

type Channel = {
  label: string;
  sub: string;
  icon: React.ComponentType<GlyphProps>;
  x: number;        // px offset from centre
  y: number;        // px offset from centre
  tone: string;     // background colour for the icon tile
  iconColor: string;
  delay: number;
};

const channels: Channel[] = [
  { label: "Gmail",     sub: "inbound email",   icon: GmailGlyph,      x: -300, y: -120, tone: "#FCE8E6", iconColor: "#EA4335", delay: 0.05 },
  { label: "WhatsApp",  sub: "client chat",      icon: WhatsAppGlyph,   x: -340, y:   60, tone: "#E1F8E8", iconColor: "#25D366", delay: 0.15 },
  { label: "Instagram", sub: "DMs",              icon: InstagramGlyph,  x: -200, y:  200, tone: "#FCE7F3", iconColor: "#E1306C", delay: 0.25 },
  { label: "Web form",  sub: "/q/[slug]",        icon: GlobeAdapter,    x:  -40, y: -220, tone: "#EDE9FE", iconColor: "#7C5CFC", delay: 0.10 },
  { label: "Referral",  sub: "agent partner",    icon: UserPlusAdapter, x:  280, y: -150, tone: "#FFF1DC", iconColor: "#D97706", delay: 0.20 },
  { label: "LinkedIn",  sub: "inbound message",  icon: LinkedInGlyph,   x:  330, y:   50, tone: "#E0F2FE", iconColor: "#0A66C2", delay: 0.30 },
  { label: "Facebook",  sub: "page enquiry",     icon: FacebookGlyph,   x:  220, y:  210, tone: "#E0EFFF", iconColor: "#1877F2", delay: 0.35 },
  { label: "Phone",     sub: "voicemail",        icon: PhoneAdapter,    x:  -80, y:  240, tone: "#E6F4F1", iconColor: "#1B7B6F", delay: 0.40 },
];

function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-12 lg:pt-32 lg:pb-20">
      {/* Soft radial halo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[55%] h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(124,92,252,0.10),transparent_62%)]" />
        <div className="absolute left-1/2 top-[55%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(189,180,254,0.18),transparent_60%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          <motion.span
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-purple"
          >
            <span className="h-px w-6 bg-purple/45" />
            How IMMI-PULSE works
          </motion.span>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="mt-6 font-heading text-[clamp(2.25rem,5vw,3.75rem)] font-normal leading-[1.05] tracking-[-1.6px] text-navy"
          >
            Every lead. One pipeline.
            <br />
            <span className="text-purple">Zero chaos.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-gray-text"
          >
            Gmail, WhatsApp, Instagram, referrals, web forms — every conversation
            funnels into one IMMI-PULSE inbox, ready for triage.
          </motion.p>
        </motion.div>

        {/* The convergence visual ─────────────────────────────────── */}
        <div className="relative mx-auto mt-16 h-[560px] w-full max-w-[820px] sm:mt-20">
          {/* SVG layer — connector lines + flowing particles */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="-420 -280 840 560"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="particle-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#7C5CFC" stopOpacity="0" />
              </radialGradient>
            </defs>

            {channels.map((c, i) => (
              <g key={c.label}>
                {/* connector line */}
                <motion.line
                  x1={c.x}
                  y1={c.y}
                  x2={0}
                  y2={0}
                  stroke="#7C5CFC"
                  strokeWidth={1}
                  strokeDasharray="3 7"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.45 }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.9, ease: "easeOut" }}
                />
                {/* flowing particle along the line */}
                <motion.circle
                  r={4}
                  fill="url(#particle-glow)"
                  initial={{ cx: c.x, cy: c.y, opacity: 0 }}
                  animate={{
                    cx: [c.x, 0],
                    cy: [c.y, 0],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    delay: 1.4 + i * 0.25,
                    duration: 2.2,
                    repeat: Infinity,
                    repeatDelay: 1.2,
                    ease: "easeIn",
                    times: [0, 0.1, 0.85, 1],
                  }}
                />
              </g>
            ))}
          </svg>

          {/* Channel chips — positioning wrapper is static, motion lives inside */}
          {channels.map((c) => (
            <div
              key={c.label}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ marginLeft: c.x, marginTop: c.y }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.4 + c.delay,
                  duration: 0.55,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 3.6 + c.delay * 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: c.delay,
                  }}
                  className="flex items-center gap-2.5 rounded-full border border-border bg-white py-2 pl-2 pr-4 shadow-[0_10px_30px_-12px_rgba(15,17,23,0.18)]"
                >
                  <span
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: c.tone }}
                  >
                    <c.icon className="h-3.5 w-3.5" style={{ color: c.iconColor }} />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[12.5px] font-semibold text-navy">{c.label}</span>
                    <span className="text-[9px] uppercase tracking-[0.16em] text-gray-text">
                      {c.sub}
                    </span>
                  </span>
                </motion.div>
              </motion.div>
            </div>
          ))}

          {/* The centre — consolidated inbox card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.0, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative">
              {/* Pulse rings */}
              <motion.div
                className="absolute inset-0 rounded-[28px] border border-purple/40"
                animate={{ scale: [1, 1.4, 1.7], opacity: [0.5, 0.15, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-[28px] border border-purple/40"
                animate={{ scale: [1, 1.4, 1.7], opacity: [0.5, 0.15, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut", delay: 1.3 }}
              />

              {/* Main card */}
              <div className="relative flex h-[148px] w-[208px] flex-col items-center justify-center rounded-[28px] bg-gradient-to-br from-navy via-[#15192B] to-[#1F2342] text-white shadow-[0_40px_80px_-20px_rgba(15,17,23,0.55)]">
                {/* Subtle grid texture */}
                <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden="true">
                  <defs>
                    <pattern id="hero-grid" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                      <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#fff" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#hero-grid)" />
                </svg>

                <div className="relative flex flex-col items-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple/20 backdrop-blur-sm">
                    <Inbox className="h-5 w-5 text-purple-light" aria-hidden="true" />
                  </span>
                  <p className="mt-3 font-heading text-[17px] tracking-tight">One inbox</p>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
                    IMMI-PULSE
                  </p>

                  {/* Live counter pill */}
                  <motion.div
                    className="mt-3 flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 backdrop-blur"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-light" />
                    <span className="text-[10px] font-medium text-white/80">8 new</span>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   2. PIPELINE OVERVIEW — six stages on a hairline
   ────────────────────────────────────────────────────────────────────── */

const stageList = [
  { num: "01", label: "Capture",   icon: Inbox },
  { num: "02", label: "Triage",    icon: Sparkles },
  { num: "03", label: "Engage",    icon: FileSignature },
  { num: "04", label: "Collect",   icon: Wallet },
  { num: "05", label: "Run case",  icon: Briefcase },
];

function PipelineOverview() {
  return (
    <section className="border-y border-border/60 bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-[12px] font-semibold uppercase tracking-[0.16em] text-purple"
          >
            The journey of one lead
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-4 font-heading text-[clamp(1.75rem,3.2vw,2.5rem)] font-normal tracking-[-0.6px] text-navy"
          >
            Six stages. One screen.
          </motion.h2>
        </motion.div>

        {/* Horizontal pipeline */}
        <div className="relative mt-16">
          {/* Animated baseline */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px origin-left bg-gradient-to-r from-transparent via-purple/40 to-transparent md:block"
          />

          <motion.ol
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="relative grid grid-cols-2 gap-y-10 sm:grid-cols-3 md:grid-cols-6 md:gap-y-0"
          >
            {stageList.map((s, i) => (
              <motion.li
                key={s.num}
                variants={fadeUp}
                custom={i}
                className="flex flex-col items-center text-center"
              >
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-purple/15 bg-white shadow-[0_6px_20px_-10px_rgba(124,92,252,0.4)]">
                  <s.icon className="h-5 w-5 text-purple" aria-hidden="true" />
                </div>
                <span className="mt-4 text-[10px] tracking-[0.22em] text-purple-deep">
                  {s.num}
                </span>
                <span className="mt-1 font-heading text-[15px] tracking-tight text-navy">
                  {s.label}
                </span>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   3. STAGE — alternating layout with mock product preview
   ────────────────────────────────────────────────────────────────────── */

type StageProps = {
  num: string;
  eyebrow: string;
  title: string;
  body: string;
  side: "left" | "right";
  muted?: boolean;
  children: React.ReactNode;
};

function Stage({ num, eyebrow, title, body, side, muted, children }: StageProps) {
  return (
    <section className={`${muted ? "bg-gray-light/60" : "bg-white"} py-24 lg:py-32`}>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-20 ${
            side === "right" ? "lg:[&>div:first-child]:order-2" : ""
          }`}
        >
          {/* Copy */}
          <motion.div variants={fadeUp} custom={0}>
            <div className="flex items-baseline gap-4">
              <span className="text-[11px] tracking-[0.28em] text-purple-deep">
                STAGE {num}
              </span>
              <span className="h-px flex-1 max-w-[80px] bg-purple/25" />
              <span className="text-[11px] uppercase tracking-[0.22em] text-gray-text">
                {eyebrow}
              </span>
            </div>
            <h3 className="mt-6 font-heading text-[clamp(1.75rem,3.4vw,2.5rem)] font-normal leading-[1.1] tracking-[-0.6px] text-navy">
              {title}
            </h3>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-gray-text">
              {body}
            </p>
          </motion.div>

          {/* Mock UI */}
          <motion.div variants={fadeUp} custom={1} className="relative">
            <div className="relative">
              {/* Decorative offset card */}
              <div className="absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-br from-purple/5 to-purple-deep/5 blur-2xl" />
              {children}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   4. MOCK UI CARDS — one per stage
   ────────────────────────────────────────────────────────────────────── */

function MockShell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_30px_60px_-30px_rgba(15,17,23,0.18)]">
      <div className="flex items-center justify-between border-b border-border/70 bg-gray-light/60 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
          <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
          <span className="h-2 w-2 rounded-full bg-[#28C840]" />
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-gray-text">
          {label}
        </span>
        <span className="w-10" />
      </div>
      {children}
    </div>
  );
}

/* ── Stage 1 — Capture ─────────────────────────────────────────────── */

function CaptureMock() {
  const items = [
    { name: "Priya Sharma",   subj: "Need help with subclass 482 visa",     src: "Email",    icon: Mail,          time: "2m" },
    { name: "Wei Liu",        subj: "Hi, I saw your post on LinkedIn…",     src: "Referral", icon: UserPlus,      time: "11m" },
    { name: "Anonymous",      subj: "Submitted: 189 Skilled Independent",   src: "Web form", icon: Globe,         time: "27m" },
    { name: "Ahmed Bello",    subj: "Quick question about partner visa",    src: "WhatsApp", icon: MessageCircle, time: "1h" },
  ];
  return (
    <MockShell label="Inbox · pending">
      <div className="divide-y divide-border/70">
        {items.map((it, i) => (
          <motion.div
            key={it.name}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
            className="flex items-center gap-4 px-5 py-4 hover:bg-gray-light/40"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-muted text-purple-deep font-heading text-[13px]">
              {it.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[14px] font-medium text-navy">{it.name}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple/8 px-2 py-0.5 text-[10px] font-medium text-purple">
                  <it.icon className="h-2.5 w-2.5" /> {it.src}
                </span>
              </div>
              <p className="truncate text-[13px] text-gray-text">{it.subj}</p>
            </div>
            <span className="flex-shrink-0 text-[10px] uppercase tracking-wider text-gray-text">
              {it.time}
            </span>
          </motion.div>
        ))}
      </div>
    </MockShell>
  );
}

/* ── Stage 2 — Triage ─────────────────────────────────────────────── */

function TriageMock() {
  return (
    <MockShell label="AI Triage · Priya Sharma">
      <div className="space-y-5 p-6">
        <div className="flex items-center gap-2 text-[11px] font-medium text-purple">
          <Sparkles className="h-3.5 w-3.5" />
          Suggested visa pathway
        </div>

        <div className="rounded-xl border border-purple/15 bg-gradient-to-br from-purple/5 to-transparent p-5">
          <div className="flex items-center justify-between">
            <p className="font-heading text-[20px] tracking-tight text-navy">
              Subclass 482
            </p>
            <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-medium text-teal">
              94% confidence
            </span>
          </div>
          <p className="mt-1 text-[13px] text-gray-text">
            Temporary Skill Shortage — Medium-term stream
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-purple-muted/60">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "94%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: 0.4, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-purple to-purple-deep"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { k: "Occupation", v: "Software Engineer" },
            { k: "ANZSCO",     v: "261313" },
            { k: "Sponsor",    v: "Standard accredited" },
            { k: "Risk flags", v: "None" },
          ].map((row) => (
            <div key={row.k} className="rounded-lg bg-gray-light/70 px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.18em] text-gray-text">
                {row.k}
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-navy">{row.v}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border/70 pt-4">
          <span className="text-[12px] text-gray-text">Confirm to qualify →</span>
          <button className="rounded-md bg-navy px-3 py-1.5 text-[12px] font-medium text-white">
            Qualify lead
          </button>
        </div>
      </div>
    </MockShell>
  );
}

/* ── Stage 3 — Engagement letter ──────────────────────────────────── */

function LetterMock() {
  return (
    <div className="relative">
      <MockShell label="Engagement letter">
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-text">
                Letter · LTR-0042
              </p>
              <p className="mt-1 font-heading text-[18px] tracking-tight text-navy">
                Migration services agreement
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-medium text-teal">
              <ShieldCheck className="h-3 w-3" /> Sent
            </span>
          </div>

          <div className="rounded-lg bg-gray-light/60 p-4 text-[11px] leading-relaxed text-gray-text">
            <p>This agreement sets out the scope of services for</p>
            <p className="mt-1 text-navy">Priya Sharma — Subclass 482 application…</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded bg-white px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wider">Fee</p>
                <p className="text-[12px] font-medium text-navy">A$4,800</p>
              </div>
              <div className="rounded bg-white px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wider">Stage</p>
                <p className="text-[12px] font-medium text-navy">Lodgement</p>
              </div>
              <div className="rounded bg-white px-2 py-1.5">
                <p className="text-[9px] uppercase tracking-wider">Sent</p>
                <p className="text-[12px] font-medium text-navy">Today</p>
              </div>
            </div>
          </div>

          {/* Signature block */}
          <div className="rounded-lg border border-dashed border-purple/30 bg-purple/3 p-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-purple-deep">
              Signed by client
            </p>
            <motion.svg
              viewBox="0 0 200 40"
              className="mt-1 h-9 w-40"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <motion.path
                d="M 4 28 C 18 8, 30 8, 44 24 S 70 36, 88 18 S 122 6, 138 26 S 170 30, 196 14"
                fill="none"
                stroke="#5B3ADB"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 1.2, ease: "easeInOut" }}
              />
            </motion.svg>
            <p className="mt-1 text-[11px] text-gray-text">Priya Sharma · Today, 14:22</p>
          </div>
        </div>
      </MockShell>
    </div>
  );
}

/* ── Stage 4 — Payment ────────────────────────────────────────────── */

function PaymentMock() {
  const methods = [
    { icon: Building2, label: "Bank transfer", active: true },
    { icon: CreditCard, label: "Card",          active: false },
    { icon: Banknote,   label: "Cash",          active: false },
  ];
  return (
    <MockShell label="Record payment">
      <div className="space-y-5 p-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-text">
            Invoice INV-0042 · Priya Sharma
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-heading text-[36px] tracking-[-1px] text-navy">A$4,800</span>
            <span className="text-[13px] text-gray-text">due today</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {methods.map((m) => (
            <div
              key={m.label}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-[11px] transition-colors ${
                m.active
                  ? "border-purple bg-purple/5 text-navy"
                  : "border-border bg-white text-gray-text"
              }`}
            >
              <m.icon className={`h-4 w-4 ${m.active ? "text-purple" : ""}`} />
              {m.label}
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-teal/8 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </div>
            <p className="text-[13px] font-medium text-navy">Payment recorded</p>
          </div>
          <p className="mt-1.5 pl-8 text-[12px] text-gray-text">
            Case advances to <span className="font-medium text-navy">Active</span> automatically.
          </p>
        </div>

        <div className="flex items-center justify-between text-[12px]">
          <span className="text-gray-text">Need flexibility?</span>
          <span className="font-medium text-purple">Skip payment · Schedule milestones</span>
        </div>
      </div>
    </MockShell>
  );
}

/* ── Stage 5 — Active case ────────────────────────────────────────── */

function CaseMock() {
  const timeline = [
    { label: "Engagement signed",   time: "May 02", done: true },
    { label: "Payment received",    time: "May 02", done: true },
    { label: "Documents collected", time: "May 06", done: true },
    { label: "Sponsor nomination",  time: "May 09", done: false, active: true },
    { label: "Application lodged",  time: "—",      done: false },
    { label: "Decision",            time: "—",      done: false },
  ];
  return (
    <MockShell label="Case · CSE-0042 · Priya Sharma">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-text">
              Subclass 482 · Active
            </p>
            <p className="mt-1 font-heading text-[18px] tracking-tight text-navy">
              Sponsor nomination in progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5 text-gray-text" />
            <span className="text-[12px] text-gray-text">12 docs</span>
          </div>
        </div>

        {/* Timeline */}
        <ol className="mt-6 space-y-3">
          {timeline.map((t, i) => (
            <motion.li
              key={t.label}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className="flex items-center gap-3"
            >
              <div className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
                {t.done ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-teal">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </div>
                ) : t.active ? (
                  <div className="relative flex h-5 w-5 items-center justify-center">
                    <span className="absolute h-5 w-5 animate-ping rounded-full bg-purple/40" />
                    <span className="relative h-2.5 w-2.5 rounded-full bg-purple" />
                  </div>
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full border border-border bg-white" />
                )}
              </div>
              <p
                className={`flex-1 text-[13px] ${
                  t.active ? "font-medium text-navy" : t.done ? "text-navy" : "text-gray-text"
                }`}
              >
                {t.label}
              </p>
              <span className="text-[10px] uppercase tracking-wider text-gray-text">
                {t.time}
              </span>
            </motion.li>
          ))}
        </ol>
      </div>
    </MockShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   5. CTA
   ────────────────────────────────────────────────────────────────────── */

function CTA() {
  return (
    <section className="pb-28 pt-12 lg:pb-36">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[28px] bg-navy px-8 py-20 text-center sm:px-16"
        >
          {/* Soft purple bloom */}
          <div className="pointer-events-none absolute -left-32 -top-24 h-72 w-72 rounded-full bg-purple/30 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-purple-deep/30 blur-[120px]" />

          {/* Subtle dotted grid */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" aria-hidden="true">
            <defs>
              <pattern id="cta-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#fff" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cta-dots)" />
          </svg>

          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.32em] text-purple-light">
              Ready to consolidate?
            </span>
            <h2 className="mt-5 font-heading text-[clamp(2rem,4vw,3rem)] font-normal leading-[1.05] tracking-[-1px] text-white">
              Run your whole practice
              <br />
              <span className="text-purple-light">on one screen.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[16px] leading-relaxed text-white/70">
              Free for the first 14 days. No card. Bring your own inbox.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/get-started"
                className="inline-flex items-center gap-2.5 rounded-lg bg-white px-7 py-3.5 text-[15px] font-semibold text-navy transition-all duration-200 hover:translate-y-[-1px] hover:shadow-xl"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/for-consultants"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3.5 text-[15px] font-medium text-white/90 transition-colors hover:bg-white/5"
              >
                See it for consultants
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   6. PAGE
   ────────────────────────────────────────────────────────────────────── */

export default function FeaturesPage() {
  return (
    <div className="overflow-hidden">
      <Hero />
      <PipelineOverview />

      <Stage
        num="01"
        eyebrow="Capture"
        title="Every lead lands in one inbox."
        body="Stop hunting through email, WhatsApp, referrals and forms. IMMI-PULSE pulls every conversation into one place — already tagged with where it came from."
        side="left"
      >
        <CaptureMock />
      </Stage>

      <Stage
        num="02"
        eyebrow="AI triage"
        title="Visa subclass suggested in seconds."
        body="The moment a query arrives, IMMI-PULSE reads it and proposes the most likely visa pathway with a confidence score. You confirm or override — never start from scratch."
        side="right"
        muted
      >
        <TriageMock />
      </Stage>

      <Stage
        num="03"
        eyebrow="Engage"
        title="Send a signable letter in two clicks."
        body="Compose from your firm's template, tap send. Your client signs digitally on a secure link. No printing, no scanning, no chasing."
        side="left"
      >
        <LetterMock />
      </Stage>

      <Stage
        num="04"
        eyebrow="Collect"
        title="Record payments any way they land."
        body="Bank transfer, invoice, cash, card — record once and the case advances. Skip, override or schedule milestones at any time."
        side="right"
        muted
      >
        <PaymentMock />
      </Stage>

      <Stage
        num="05"
        eyebrow="Run case"
        title="A clear path from lodged to granted."
        body="Documents, deadlines, notes and government correspondence — all on one timeline. Every action stamped, every file checked, nothing slips."
        side="left"
      >
        <CaseMock />
      </Stage>

      <CTA />
    </div>
  );
}
