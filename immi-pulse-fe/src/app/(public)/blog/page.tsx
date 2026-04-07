"use client";

import { motion } from "framer-motion";
import { BookOpen, Clock, ArrowRight } from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";

const placeholderPosts = [
  {
    tag: "Platform",
    title: "Introducing IMMI-PULSE: AI for Immigration Consultants",
    desc: "Why we\u2019re building the platform Australian immigration professionals deserve \u2014 and what\u2019s coming first.",
    date: "Coming Soon",
  },
  {
    tag: "Visa Guide",
    title: "Understanding Subclass 482: A Complete Guide",
    desc: "Everything OMARA agents need to know about the Temporary Skill Shortage visa \u2014 requirements, streams, and common pitfalls.",
    date: "Coming Soon",
  },
  {
    tag: "AI & Tech",
    title: "How AI Document Validation Works",
    desc: "A deep dive into how our AI validates immigration documents \u2014 from OCR extraction to cross-document name matching.",
    date: "Coming Soon",
  },
  {
    tag: "Industry",
    title: "The State of Australian Immigration Tech in 2026",
    desc: "Why 7,000+ OMARA agents are still using tools from the early 2000s \u2014 and what the future looks like.",
    date: "Coming Soon",
  },
  {
    tag: "Visa Guide",
    title: "Partner Visas 820/801: Navigating Complexity",
    desc: "Partner visa applications are among the most complex. Here\u2019s how AI can help consultants manage the documentation burden.",
    date: "Coming Soon",
  },
  {
    tag: "Product",
    title: "Smart Checklists: Never Miss a Requirement",
    desc: "How IMMI-PULSE auto-generates visa-specific requirement checklists \u2014 and tracks document collection in real-time.",
    date: "Coming Soon",
  },
];

export default function BlogPage() {
  return (
    <div className="overflow-hidden">
      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="font-heading text-[clamp(2.5rem,5vw,3.75rem)] font-normal leading-[1.1] tracking-[-1.5px] text-navy"
            >
              Insights & Updates
            </motion.h1>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-gray-text"
            >
              Immigration industry insights, platform updates, and visa guides.
              We&apos;re building in public &mdash; follow along.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ═══ POSTS GRID ═══ */}
      <section className="pb-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {placeholderPosts.map((post, i) => (
              <motion.div
                key={post.title}
                variants={fadeUp}
                custom={i}
                className="group flex flex-col rounded-2xl border border-border bg-white p-8 transition-all duration-300 hover:border-purple/10 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-border bg-gray-light/50 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-gray-text">
                    {post.tag}
                  </span>
                  <span className="flex items-center gap-1 text-[12px] text-gray-text/50">
                    <Clock className="h-3 w-3" />
                    {post.date}
                  </span>
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold leading-snug text-navy">
                  {post.title}
                </h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-gray-text">
                  {post.desc}
                </p>
                <div className="mt-6 flex items-center gap-1.5 text-[13px] font-medium text-gray-text/40">
                  Read article
                  <ArrowRight className="h-3 w-3" />
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Coming soon note */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <div className="mx-auto inline-flex items-center gap-3 rounded-2xl border border-border bg-gray-light/50 px-8 py-5">
              <BookOpen className="h-5 w-5 text-purple/50" />
              <div className="text-left">
                <p className="text-[15px] font-medium text-navy">Blog launching soon</p>
                <p className="text-[14px] text-gray-text">
                  We&apos;re preparing our first articles. Check back soon.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
