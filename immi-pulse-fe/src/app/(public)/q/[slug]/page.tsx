"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Phone,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Globe,
  Clock,
  UserRound,
} from "lucide-react";
import { publicQuestionnairesApi, type QuestionField } from "@/lib/api/services";

type FormData = {
  id: string;
  name: string;
  description: string | null;
  org_name: string;
  org_omara_number: string | null;
  org_website: string | null;
  org_business_phone: string | null;
  org_contact_person: string | null;
  org_business_hours: string | null;
  org_social_links: Record<string, string> | null;
  fields: QuestionField[];
};

/* ────── Brand glyphs (lucide v1 dropped these) ────── */
const InstagramGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
  </svg>
);
const LinkedinGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
  </svg>
);
const FacebookGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07c0 4.96 3.66 9.07 8.44 9.84v-6.96H7.9v-2.88h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.19 2.24.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.77l-.44 2.88h-2.33V22c4.78-.77 8.44-4.88 8.44-9.93z" />
  </svg>
);

const SOCIAL_META: Record<
  string,
  { label: string; prefix: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  instagram: { label: "Instagram", prefix: "https://instagram.com/", Icon: InstagramGlyph },
  linkedin: { label: "LinkedIn", prefix: "https://linkedin.com/company/", Icon: LinkedinGlyph },
  facebook: { label: "Facebook", prefix: "https://facebook.com/", Icon: FacebookGlyph },
};

const normaliseUrl = (raw: string) => {
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
};

const stripUrlForDisplay = (raw: string) =>
  raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");

export default function PublicQuestionnairePage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitterPhone, setSubmitterPhone] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    publicQuestionnairesApi
      .get(params.slug)
      .then((r) => setData(r))
      .catch((e) => setError(e?.response?.data?.detail || "Form not found"))
      .finally(() => setLoading(false));
  }, [params.slug]);

  const setAnswer = (key: string, val: unknown) =>
    setAnswers((a) => ({ ...a, [key]: val }));

  const validate = (): string | null => {
    if (!submitterName.trim()) return "Please enter your full name";
    if (!submitterEmail.trim()) return "Please enter your email";
    if (!data) return null;
    for (const f of data.fields) {
      if (f.required) {
        const v = answers[f.key];
        if (
          v === undefined ||
          v === null ||
          v === "" ||
          (Array.isArray(v) && v.length === 0)
        ) {
          return `Please answer: ${f.label}`;
        }
      }
    }
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await publicQuestionnairesApi.submit(params.slug, {
        submitter_email: submitterEmail.trim(),
        submitter_name: submitterName.trim(),
        submitter_phone: submitterPhone.trim() || undefined,
        answers,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Submission failed";
      setError(typeof detail === "string" ? detail : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageShell><LoadingState /></PageShell>;
  if (!data)
    return (
      <PageShell>
        <NotFoundState message={error} />
      </PageShell>
    );
  if (submitted)
    return (
      <PageShell>
        <SuccessState orgName={data.org_name} submitterName={submitterName} />
      </PageShell>
    );

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-6xl px-5 pt-10 pb-16 sm:px-8 sm:pt-16 lg:pt-20 lg:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="grid gap-10 lg:grid-cols-12 lg:gap-14"
        >
          <aside className="lg:col-span-5">
            <ConsultantPanel data={data} />
          </aside>

          <div className="lg:col-span-7">
            <FormPanel
              data={data}
              submitterName={submitterName}
              setSubmitterName={setSubmitterName}
              submitterEmail={submitterEmail}
              setSubmitterEmail={setSubmitterEmail}
              submitterPhone={submitterPhone}
              setSubmitterPhone={setSubmitterPhone}
              answers={answers}
              setAnswer={setAnswer}
              error={error}
              submitting={submitting}
              onSubmit={onSubmit}
            />
          </div>
        </motion.div>

        <Footer />
      </div>
    </PageShell>
  );
}

/* ──────────────────────────  Page shell  ────────────────────────── */

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAF9FF] text-[#0F1117]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 85% 0%, rgba(124,92,252,0.16) 0%, rgba(124,92,252,0) 60%), radial-gradient(50% 40% at 0% 100%, rgba(189,180,254,0.18) 0%, rgba(189,180,254,0) 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #0F1117 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      {children}
    </div>
  );
}

/* ──────────────────────────  Consultant panel  ────────────────────────── */

function ConsultantPanel({ data }: { data: FormData }) {
  const initials = useMemo(() => {
    const parts = data.org_name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join("") || "I";
  }, [data.org_name]);

  const websiteHref = data.org_website ? normaliseUrl(data.org_website) : null;
  const websiteDisplay = data.org_website ? stripUrlForDisplay(data.org_website) : null;
  const phoneHref = data.org_business_phone
    ? `tel:${data.org_business_phone.replace(/\s+/g, "")}`
    : null;

  const socials = data.org_social_links
    ? (Object.entries(data.org_social_links)
        .filter(([, v]) => !!v)
        .map(([k, handle]) => {
          const meta = SOCIAL_META[k];
          if (!meta) return null;
          const href = /^https?:\/\//i.test(handle)
            ? handle
            : `${meta.prefix}${handle.replace(/^\/+/, "")}`;
          return { key: k, label: meta.label, Icon: meta.Icon, href };
        })
        .filter(Boolean) as {
        key: string;
        label: string;
        Icon: React.ComponentType<{ className?: string }>;
        href: string;
      }[])
    : [];

  return (
    <div className="lg:sticky lg:top-12">
      <div className="editorial-eyebrow">Australian Immigration · Intake</div>

      {/* Identity seal + name */}
      <div className="mt-7 flex items-start gap-5">
        <div className="relative h-16 w-16 shrink-0">
          <div className="pulse-mark__ring pulse-mark__ring--1" />
          <div className="pulse-mark__ring pulse-mark__ring--2" />
          <div className="pulse-mark__ring pulse-mark__ring--3" />
          <div
            className="relative flex h-full w-full items-center justify-center rounded-[28%] text-white shadow-[0_10px_30px_-12px_rgba(124,92,252,0.55)]"
            style={{
              background:
                "linear-gradient(135deg, #7C5CFC 0%, #5B3ADB 60%, #3E1C96 100%)",
            }}
          >
            <span className="font-heading text-xl font-medium tracking-tight">
              {initials}
            </span>
          </div>
        </div>

        <div className="min-w-0 pt-1">
          <h1 className="font-heading text-[28px] leading-[1.05] tracking-tight text-[#0F1117] sm:text-[32px]">
            {data.org_name}
          </h1>
          <p className="mt-2 text-[13px] text-[#475367]">
            Registered Australian immigration practice
          </p>
        </div>
      </div>

      {/* OMARA credential */}
      {data.org_omara_number && (
        <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-[#E4DEFF] bg-white/70 px-3.5 py-1.5 backdrop-blur-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-[#5B3ADB]" />
          <span className="font-mono-d text-[10.5px] uppercase tracking-[0.22em] text-[#0F1117]">
            MARA Registered · MARN {data.org_omara_number}
          </span>
        </div>
      )}

      {/* Contact-person card — leads with the human */}
      {data.org_contact_person && (
        <div className="mt-7 rounded-2xl border border-[#EAE6FA] bg-white/80 p-5 shadow-[0_20px_50px_-30px_rgba(15,17,23,0.2)] backdrop-blur-sm">
          <div className="font-mono-d text-[10px] uppercase tracking-[0.28em] text-[#5B3ADB]">
            Speak with
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2EEFF] text-[#5B3ADB]">
              <UserRound className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate font-heading text-[17px] font-medium tracking-tight text-[#0F1117]">
                {data.org_contact_person}
              </div>
              <div className="text-[12px] text-[#475367]">Your point of contact</div>
            </div>
          </div>
          {phoneHref && (
            <a
              href={phoneHref}
              className="group mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#1B7B6F]/20 bg-[#E5F6F2]/70 px-3.5 py-2.5 transition-colors hover:bg-[#E5F6F2]"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 text-[#0F766E]" />
                <span className="truncate font-mono text-[13px] text-[#0F766E]">
                  {data.org_business_phone}
                </span>
              </span>
              <span className="font-mono-d text-[9.5px] uppercase tracking-[0.22em] text-[#0F766E] transition-transform group-hover:translate-x-0.5">
                Tap to call
              </span>
            </a>
          )}
        </div>
      )}

      {/* No contact person but has phone — surface compactly */}
      {!data.org_contact_person && phoneHref && (
        <a
          href={phoneHref}
          className="group mt-6 inline-flex items-center gap-2.5 rounded-full border border-[#1B7B6F]/20 bg-[#E5F6F2]/70 px-3.5 py-1.5 transition-colors hover:bg-[#E5F6F2]"
        >
          <Phone className="h-3.5 w-3.5 text-[#0F766E]" />
          <span className="font-mono text-[12.5px] text-[#0F766E]">
            {data.org_business_phone}
          </span>
        </a>
      )}

      {/* Editorial pull-quote */}
      <p className="mt-9 max-w-[28ch] font-serif-d text-[24px] italic leading-[1.25] text-[#0F1117]">
        “Tell us your story.{" "}
        <span className="text-[#5B3ADB]">We&apos;ll tell you what&apos;s possible.</span>”
      </p>
      <p className="mt-5 max-w-[44ch] text-[14px] leading-[1.65] text-[#475367]">
        Share a few details about your situation and a member of our team will be
        in touch — usually within one business day.
      </p>

      {/* Practice details */}
      {(websiteHref || data.org_business_hours) && (
        <>
          <div className="editorial-rule mt-9" />
          <ul className="mt-6 grid gap-2.5 text-[13px] text-[#1E293B]">
            {websiteHref && (
              <li>
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 transition-colors hover:text-[#5B3ADB]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFEBFF] text-[#5B3ADB]">
                    <Globe className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{websiteDisplay}</span>
                  <ArrowUpRight className="h-3 w-3 text-[#94A3B8] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </li>
            )}
            {data.org_business_hours && (
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFEBFF] text-[#5B3ADB]">
                  <Clock className="h-3.5 w-3.5" />
                </span>
                <span>{data.org_business_hours}</span>
              </li>
            )}
          </ul>
        </>
      )}

      {/* Social row */}
      {socials.length > 0 && (
        <div className="mt-6 flex items-center gap-3">
          <span className="font-mono-d text-[9.5px] uppercase tracking-[0.28em] text-[#94A3B8]">
            Follow
          </span>
          <span className="h-px flex-1 bg-[#E4E2EE]" />
          <div className="flex items-center gap-1.5">
            {socials.map(({ key, label, Icon, href }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E4E2EE] bg-white/70 text-[#475367] transition-all hover:-translate-y-0.5 hover:border-[#5B3ADB]/40 hover:text-[#5B3ADB]"
              >
                <Icon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Trust strip */}
      <div className="editorial-rule mt-9" />
      <ul className="mt-6 grid gap-3 text-[13px] text-[#1E293B]">
        <TrustItem icon={<Phone className="h-3.5 w-3.5" />} label="Reply within 1 business day" />
        <TrustItem icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Confidential & encrypted intake" />
        <TrustItem icon={<Check className="h-3.5 w-3.5" />} label="Sent only to your consultant" />
      </ul>
    </div>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EFEBFF] text-[#5B3ADB]">
        {icon}
      </span>
      <span>{label}</span>
    </li>
  );
}

/* ──────────────────────────  Form panel  ────────────────────────── */

function FormPanel({
  data,
  submitterName,
  setSubmitterName,
  submitterEmail,
  setSubmitterEmail,
  submitterPhone,
  setSubmitterPhone,
  answers,
  setAnswer,
  error,
  submitting,
  onSubmit,
}: {
  data: FormData;
  submitterName: string;
  setSubmitterName: (v: string) => void;
  submitterEmail: string;
  setSubmitterEmail: (v: string) => void;
  submitterPhone: string;
  setSubmitterPhone: (v: string) => void;
  answers: Record<string, unknown>;
  setAnswer: (k: string, v: unknown) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[20px] border border-[#EAE6FA] bg-white/90 shadow-[0_30px_80px_-40px_rgba(15,17,23,0.25)] backdrop-blur-sm">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{
            background:
              "linear-gradient(90deg, #7C5CFC 0%, #5B3ADB 50%, #1B7B6F 100%)",
          }}
        />

        <div className="p-6 sm:p-9 lg:p-10">
          <div className="font-mono-d text-[10.5px] uppercase tracking-[0.32em] text-[#5B3ADB]">
            Intake form
          </div>
          <h2 className="mt-3 font-heading text-[28px] leading-[1.1] tracking-tight text-[#0F1117] sm:text-[32px]">
            {data.name}
          </h2>
          {data.description && (
            <p className="mt-3 max-w-[52ch] text-[14.5px] leading-[1.6] text-[#475367]">
              {data.description}
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-9 space-y-9" noValidate>
            <Section index="01" title="About you">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  id="full-name"
                  label="Full name"
                  required
                  value={submitterName}
                  onChange={setSubmitterName}
                  autoComplete="name"
                  placeholder="Jane Doe"
                />
                <Field
                  id="full-email"
                  label="Email"
                  required
                  type="email"
                  value={submitterEmail}
                  onChange={setSubmitterEmail}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
                <div className="sm:col-span-2">
                  <Field
                    id="full-phone"
                    label="Phone"
                    type="tel"
                    value={submitterPhone}
                    onChange={setSubmitterPhone}
                    autoComplete="tel"
                    placeholder="+61 4XX XXX XXX"
                    optional
                    helper="Best number for a callback. Country code helps."
                  />
                </div>
              </div>
            </Section>

            {data.fields.length > 0 && (
              <Section index="02" title="Your situation">
                <div className="space-y-5">
                  {data.fields.map((f) => (
                    <FieldRenderer
                      key={f.key}
                      field={f}
                      value={answers[f.key]}
                      onChange={(v) => setAnswer(f.key, v)}
                    />
                  ))}
                </div>
              </Section>
            )}

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3.5 py-3 text-[13.5px] text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-[#0F1117] px-6 py-4 text-[14.5px] font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(124,92,252,0.7)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "linear-gradient(120deg, #0F1117 0%, #3E1C96 60%, #7C5CFC 100%)",
                  }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/15 transition-transform duration-700 group-hover:translate-x-[400%]"
                />
                <span className="relative flex items-center gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting your enquiry…
                    </>
                  ) : (
                    <>
                      Send to {data.org_name}
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </>
                  )}
                </span>
              </button>

              <p className="mt-4 text-center font-mono-d text-[10.5px] uppercase tracking-[0.18em] text-[#475367]">
                <ShieldCheck className="-mt-0.5 mr-1.5 inline h-3 w-3 text-[#1B7B6F]" />
                Encrypted intake · sent only to {data.org_name}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────  Form primitives  ────────────────────────── */

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-5 flex items-baseline gap-3">
        <span className="font-mono-d text-[10.5px] tracking-[0.28em] text-[#5B3ADB]">
          {index}
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-[#E4DEFF] to-transparent" />
        <h3 className="font-heading text-[15px] font-medium tracking-tight text-[#0F1117]">
          {title}
        </h3>
      </header>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  required,
  optional,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  helper,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  helper?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-[#0F1117]">
          {label}
          {required && <span className="ml-1 text-[#7C5CFC]">*</span>}
        </label>
        {optional && (
          <span className="font-mono-d text-[9.5px] uppercase tracking-[0.22em] text-[#94A3B8]">
            Optional
          </span>
        )}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="block w-full rounded-lg border border-[#E4E2EE] bg-white px-3.5 py-3 text-[14.5px] text-[#0F1117] placeholder:text-[#A8A2BD] transition-all duration-200 hover:border-[#CDC4F8] focus:border-[#7C5CFC] focus:outline-none focus:ring-4 focus:ring-[#7C5CFC]/12"
      />
      {helper && (
        <p className="mt-1.5 text-[12px] leading-[1.5] text-[#475367]">{helper}</p>
      )}
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: QuestionField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const labelHeader = (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label className="text-[13px] font-medium text-[#0F1117]">
        {field.label}
        {field.required && <span className="ml-1 text-[#7C5CFC]">*</span>}
      </label>
      {!field.required && (
        <span className="font-mono-d text-[9.5px] uppercase tracking-[0.22em] text-[#94A3B8]">
          Optional
        </span>
      )}
    </div>
  );

  switch (field.type) {
    case "long_text":
      return (
        <div>
          {labelHeader}
          <textarea
            rows={4}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            className="block w-full resize-y rounded-lg border border-[#E4E2EE] bg-white px-3.5 py-3 text-[14.5px] leading-[1.55] text-[#0F1117] placeholder:text-[#A8A2BD] transition-all duration-200 hover:border-[#CDC4F8] focus:border-[#7C5CFC] focus:outline-none focus:ring-4 focus:ring-[#7C5CFC]/12"
          />
          {field.helper_text && (
            <p className="mt-1.5 text-[12px] leading-[1.5] text-[#475367]">
              {field.helper_text}
            </p>
          )}
        </div>
      );

    case "yes_no": {
      const v = (value as string) || "";
      return (
        <div>
          {labelHeader}
          <div className="flex gap-2.5 pt-1">
            {[
              { val: "yes", label: "Yes" },
              { val: "no", label: "No" },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => onChange(opt.val)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-[13.5px] font-medium transition-all ${
                  v === opt.val
                    ? "border-[#7C5CFC] bg-[#F2EEFF] text-[#3E1C96] shadow-[0_0_0_3px_rgba(124,92,252,0.10)]"
                    : "border-[#E4E2EE] bg-white text-[#1E293B] hover:border-[#CDC4F8]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "single_select": {
      const v = (value as string) || "";
      return (
        <div>
          {labelHeader}
          <div className="grid gap-2 pt-1">
            {(field.options || []).map((opt) => {
              const active = v === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(opt)}
                  className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-[13.5px] transition-all ${
                    active
                      ? "border-[#7C5CFC] bg-[#F8F5FF] text-[#0F1117]"
                      : "border-[#E4E2EE] bg-white text-[#1E293B] hover:border-[#CDC4F8] hover:bg-[#FBFAFF]"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      active ? "border-[#7C5CFC] bg-[#7C5CFC]" : "border-[#CFC9E0]"
                    }`}
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "multi_select": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div>
          {labelHeader}
          <div className="grid gap-2 pt-1">
            {(field.options || []).map((opt) => {
              const checked = arr.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    const next = checked
                      ? arr.filter((x) => x !== opt)
                      : [...arr, opt];
                    onChange(next);
                  }}
                  className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-[13.5px] transition-all ${
                    checked
                      ? "border-[#7C5CFC] bg-[#F8F5FF] text-[#0F1117]"
                      : "border-[#E4E2EE] bg-white text-[#1E293B] hover:border-[#CDC4F8] hover:bg-[#FBFAFF]"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-[#7C5CFC] bg-[#7C5CFC]"
                        : "border-[#CFC9E0] bg-white"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "number":
    case "date":
    case "email":
    case "phone":
    case "short_text":
    default:
      return (
        <div>
          {labelHeader}
          <input
            type={
              field.type === "number"
                ? "number"
                : field.type === "date"
                ? "date"
                : field.type === "email"
                ? "email"
                : field.type === "phone"
                ? "tel"
                : "text"
            }
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            className="block w-full rounded-lg border border-[#E4E2EE] bg-white px-3.5 py-3 text-[14.5px] text-[#0F1117] placeholder:text-[#A8A2BD] transition-all duration-200 hover:border-[#CDC4F8] focus:border-[#7C5CFC] focus:outline-none focus:ring-4 focus:ring-[#7C5CFC]/12"
          />
          {field.helper_text && (
            <p className="mt-1.5 text-[12px] leading-[1.5] text-[#475367]">
              {field.helper_text}
            </p>
          )}
        </div>
      );
  }
}

/* ──────────────────  States: loading / 404 / success  ────────────────── */

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="flex items-center gap-3 text-[#475367]">
        <Loader2 className="h-4 w-4 animate-spin text-[#7C5CFC]" />
        <span className="font-mono-d text-[11px] uppercase tracking-[0.28em]">
          Preparing your intake form
        </span>
      </div>
    </div>
  );
}

function NotFoundState({ message }: { message: string | null }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="font-mono-d text-[10.5px] uppercase tracking-[0.32em] text-[#5B3ADB]">
        Form unavailable
      </div>
      <h1 className="mt-4 font-heading text-[32px] leading-[1.1] tracking-tight text-[#0F1117]">
        This intake is no longer accepting responses.
      </h1>
      <p className="mt-4 text-[14px] text-[#475367]">
        {message ||
          "The link may have expired, or the consultant has paused new enquiries."}
      </p>
    </div>
  );
}

function SuccessState({
  orgName,
  submitterName,
}: {
  orgName: string;
  submitterName: string;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_20px_50px_-20px_rgba(124,92,252,0.5)]"
      >
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(135deg, rgba(124,92,252,0.10), rgba(27,123,111,0.12))",
          }}
        />
        <Check className="relative h-9 w-9 text-[#1B7B6F]" strokeWidth={2.5} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <div className="mt-9 font-mono-d text-[10.5px] uppercase tracking-[0.32em] text-[#5B3ADB]">
          Received
        </div>
        <h1 className="mt-4 font-heading text-[40px] leading-[1.05] tracking-tight text-[#0F1117] sm:text-[48px]">
          Thank you{submitterName ? `, ${submitterName.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-5 max-w-[40ch] text-[15px] leading-[1.65] text-[#475367]">
          <span className="font-medium text-[#0F1117]">{orgName}</span> has
          received your enquiry and will reach out within one business day.
        </p>
        <p className="mt-3 font-serif-d text-[20px] italic leading-[1.3] text-[#5B3ADB]">
          Keep an eye on your inbox.
        </p>
      </motion.div>
    </div>
  );
}

/* ──────────────────────────  Footer  ────────────────────────── */

function Footer() {
  return (
    <div className="mt-14 flex items-center justify-center">
      <div className="font-mono-d text-[10px] uppercase tracking-[0.28em] text-[#94A3B8]">
        Powered by IMMI-PULSE
      </div>
    </div>
  );
}
