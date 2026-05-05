"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Users,
  HelpCircle,
} from "lucide-react";
import { useState } from "react";
import { fadeUp, stagger } from "@/lib/motion";

const plans = [
  {
    name: "Starter",
    desc: "Lean essentials for solo agents and small firms running their first cases on AI",
    price: "$29",
    period: "/seat/month",
    cta: "Get Started",
    ctaStyle: "border border-border text-navy hover:bg-gray-light",
    features: [
      "Up to 20 active cases",
      "Email intake & classification",
      "Basic visa checklists",
      "Client portal (read-only)",
      "Community support",
    ],
    highlighted: false,
  },
  {
    name: "Professional",
    desc: "The full AI platform for established practices that want to scale",
    price: "$99",
    period: "/seat/month",
    cta: "Start Free Trial",
    ctaStyle: "bg-purple text-white hover:bg-purple-deep",
    features: [
      "Unlimited active cases",
      "AI document validation & OCR",
      "Smart checklists with progress tracking",
      "Predictive case analytics & insights",
      "Marketplace listing for new client leads",
      "Client communication tools",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    desc: "For multi-office firms with custom requirements and contracted volume",
    price: "Custom",
    period: "contact us",
    cta: "Contact Sales",
    ctaStyle: "border border-border text-navy hover:bg-gray-light",
    features: [
      "Everything in Professional",
      "SSO (SAML / OIDC)",
      "Custom AI model training",
      "On-premise deployment option",
      "Dedicated account manager",
      "SLA & uptime guarantee",
      "Custom integrations",
    ],
    highlighted: false,
  },
];

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes \u2014 every new account starts on a 14-day Professional trial automatically. Full feature set, no credit card required. After the trial you can stay on Professional, switch to Starter, or talk to us about Enterprise.",
  },
  {
    q: "How are seats priced?",
    a: "Every seat is billed at the plan\u2019s per-seat price \u2014 Starter $29, Professional $99, Enterprise custom. There are no seat caps and no role-based pricing differences; pay for the people you have, add or remove anytime.",
  },
  {
    q: "What\u2019s the difference between Consultant, Staff, and Admin roles?",
    a: "Roles are permission levels, not pricing tiers. Consultants are OMARA agents who can own and lodge cases. Staff (paralegals) can assist on cases \u2014 upload documents, draft, comment \u2014 but can\u2019t lodge or sign off. Admins can manage the team and billing. Owners are admins who also created the workspace. Every role costs the same on a given plan.",
  },
  {
    q: "What counts as an \u201cactive case\u201d?",
    a: "A case that hasn\u2019t been marked as granted, refused, or archived. Completed cases don\u2019t count towards your limit on Starter.",
  },
  {
    q: "Can I switch plans later?",
    a: "Absolutely. Upgrade or downgrade at any time from Settings \u2192 Plan & Billing. When upgrading, you get immediate access to new features. When downgrading, changes take effect at the next billing cycle. Your seats are preserved either way.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted at rest and in transit. We use SOC 2 compliant infrastructure hosted in Australia. Your client data never leaves Australian data centres.",
  },
  {
    q: "Do you support visa subclasses not listed?",
    a: "We\u2019re launching with the 8 highest-volume subclasses. Additional subclasses are added regularly based on user demand. Enterprise customers can request priority additions.",
  },
  {
    q: "How does the AI work?",
    a: "We use advanced language models (Claude by Anthropic) for classification and analysis, and OCR for document processing. Every AI decision is presented as a recommendation \u2014 you always make the final call.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
              Simple, Transparent Pricing
            </motion.h1>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-gray-text"
            >
              Start free during early access. Scale as your practice grows.
              No hidden fees, no long-term contracts.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ═══ PLANS ═══ */}
      <section className="pb-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-8 lg:grid-cols-3"
          >
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                custom={i}
                className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 lg:p-10 ${
                  plan.highlighted
                    ? "border-purple/30 bg-white shadow-xl shadow-purple/5"
                    : "border-border bg-white hover:shadow-lg"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-purple px-4 py-1 text-[12px] font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="font-heading text-lg font-semibold text-navy">{plan.name}</h3>
                  <p className="mt-1 text-[16px] text-gray-text">{plan.desc}</p>
                </div>

                <div className="mt-6">
                  <span className="font-heading text-5xl font-light tracking-[-2px] text-navy">
                    {plan.price}
                  </span>
                  <span className="ml-2 text-[16px] text-gray-text">{plan.period}</span>
                </div>
                <p className="mt-2 text-[13px] text-gray-text/80">
                  Add as many seats as you need · No seat caps
                </p>

                <Link
                  href={plan.name === "Enterprise" ? "/contact" : "/get-started"}
                  className={`mt-8 flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-[15px] font-medium transition-all ${plan.ctaStyle}`}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <ul className="mt-8 flex-1 space-y-3 border-t border-border pt-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-[16px] text-gray-text">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-purple" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ APPLICANTS ═══ */}
      <section className="border-y border-border bg-gray-light/50 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple/10 text-purple">
              <Users className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-xl font-semibold text-navy">Free for applicants</h3>
              <p className="mt-1 text-[16px] text-gray-text">
                The applicant experience &mdash; visa tracker, community, processing times &mdash; will always be free.
                We believe everyone deserves access to information about their immigration journey.
              </p>
            </div>
            <Link
              href="/for-applicants"
              className="flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-[16px] font-medium text-navy transition-all hover:bg-gray-light"
            >
              Learn more
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-28 lg:py-36">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
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
              className="text-[13px] font-semibold uppercase tracking-wider text-purple"
            >
              FAQ
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-3 font-heading text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-1px] text-navy"
            >
              Common questions
            </motion.h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-12 divide-y divide-border"
          >
            {faqs.map((faq, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full cursor-pointer items-start justify-between py-5 text-left"
                >
                  <span className="pr-4 text-[16px] font-medium text-navy">
                    {faq.q}
                  </span>
                  <HelpCircle
                    className={`mt-0.5 h-5 w-5 shrink-0 transition-colors ${
                      openFaq === i ? "text-purple" : "text-navy/25"
                    }`}
                  />
                </button>
                <motion.div
                  initial={false}
                  animate={{
                    height: openFaq === i ? "auto" : 0,
                    opacity: openFaq === i ? 1 : 0,
                  }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="pb-5 text-[16px] leading-relaxed text-gray-text">
                    {faq.a}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
