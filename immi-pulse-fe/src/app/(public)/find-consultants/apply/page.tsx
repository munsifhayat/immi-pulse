"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useApplyAsAgent, type ListingType } from "@/lib/api/hooks/marketplace";
import { VISA_TYPES, LANGUAGES, CITIES } from "../_lib/constants";
import { fadeUp, stagger } from "@/lib/motion";

const ROLES = [
  "Principal Agent",
  "Senior Consultant",
  "Migration Lawyer",
  "Registered Agent",
  "Immigration Advisor",
] as const;

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  omara_number: string;
  listing_type: ListingType;
  firm_name: string;
  role: string;
  website: string;
  phone: string;
  city: string;
  state: string;
  years_experience: string;
  consultation_fee: string;
  response_time_hours: string;
  bio: string;
  specializations: string[];
  languages: string[];
}

const initialForm: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  omara_number: "",
  listing_type: "individual",
  firm_name: "",
  role: "",
  website: "",
  phone: "",
  city: "",
  state: "",
  years_experience: "",
  consultation_fee: "",
  response_time_hours: "",
  bio: "",
  specializations: [],
  languages: [],
};

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export default function AgentApplyPage() {
  const apply = useApplyAsAgent();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !form.first_name ||
      !form.last_name ||
      !form.email ||
      !form.omara_number
    ) {
      setError("Name, email, and OMARA number are required.");
      return;
    }

    try {
      await apply.mutateAsync({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        omara_number: form.omara_number,
        listing_type: form.listing_type,
        firm_name: form.firm_name || undefined,
        role: form.role || undefined,
        website: form.website || undefined,
        phone: form.phone || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        bio: form.bio || undefined,
        specializations: form.specializations.length
          ? form.specializations
          : undefined,
        languages: form.languages.length ? form.languages : undefined,
        years_experience: form.years_experience
          ? Number(form.years_experience)
          : undefined,
        consultation_fee: form.consultation_fee
          ? Number(form.consultation_fee)
          : undefined,
        response_time_hours: form.response_time_hours
          ? Number(form.response_time_hours)
          : undefined,
      });
      setSubmitted(true);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.detail ?? "Submission failed.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  if (submitted) {
    return (
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-2xl px-6 py-24 text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight text-navy">
          Application Received
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-gray-text">
          Thanks, {form.first_name}. Your application is now in our review
          queue. We&apos;ll verify your OMARA number against the official
          register, review your credentials, and validate your practice
          details. You&apos;ll hear from us within 2 business days.
        </p>
        <Link
          href="/find-consultants"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-purple hover:text-purple-deep"
        >
          <ArrowLeft className="h-4 w-4" /> Back to the directory
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-3xl px-6 py-16"
    >
      <motion.div variants={fadeUp} custom={0}>
        <Link
          href="/find-consultants"
          className="inline-flex items-center gap-1.5 text-sm text-purple hover:text-purple-deep"
        >
          <ArrowLeft className="h-4 w-4" /> Back to directory
        </Link>
      </motion.div>

      <motion.div variants={fadeUp} custom={1} className="mt-6">
        <h1 className="font-heading text-4xl font-normal tracking-tight text-navy">
          List your practice
        </h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-gray-text">
          Join IMMI-PULSE and reach visa applicants across Australia. Every
          listing goes through OMARA verification, credential review, and
          practice validation before going live.
        </p>
      </motion.div>

      <motion.form
        variants={fadeUp}
        custom={2}
        onSubmit={handleSubmit}
        className="mt-10 space-y-8 rounded-3xl border border-border bg-white p-8 shadow-sm"
      >
        {/* Listing type toggle */}
        <Section title="Listing type">
          <div className="flex gap-3">
            {(["individual", "company"] as const).map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => update("listing_type", type)}
                className={
                  form.listing_type === type
                    ? "flex-1 rounded-lg border-2 border-purple bg-purple/5 px-4 py-3 text-[14px] font-medium text-purple"
                    : "flex-1 rounded-lg border-2 border-border bg-white px-4 py-3 text-[14px] font-medium text-navy hover:border-purple/30"
                }
              >
                {type === "individual" ? "Individual Consultant" : "Company / Firm"}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name *">
              <input
                required
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Last name *">
              <input
                required
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Email *">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="OMARA number *">
              <input
                required
                placeholder="e.g. 0741256"
                value={form.omara_number}
                onChange={(e) => update("omara_number", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                placeholder="e.g. +61 400 123 456"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Website">
              <input
                type="url"
                placeholder="e.g. https://yourfirm.com.au"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        <Section title="Practice">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Firm / company name">
              <input
                value={form.firm_name}
                onChange={(e) => update("firm_name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
                className={inputClass}
              >
                <option value="">Select your role</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Years of experience">
              <input
                type="number"
                min="0"
                max="60"
                value={form.years_experience}
                onChange={(e) => update("years_experience", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="City">
              <select
                value={form.city}
                onChange={(e) => {
                  const city = CITIES.find((c) => c.name === e.target.value);
                  update("city", e.target.value);
                  if (city) update("state", city.state);
                }}
                className={inputClass}
              >
                <option value="">Select a city</option>
                {CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}, {c.state}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Consultation fee (AUD)">
              <input
                type="number"
                min="0"
                placeholder="0 for free consultation"
                value={form.consultation_fee}
                onChange={(e) => update("consultation_fee", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Response time (hours)">
              <input
                type="number"
                min="0"
                max="720"
                value={form.response_time_hours}
                onChange={(e) => update("response_time_hours", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        <Section title="Bio">
          <Field label="Tell clients about your practice">
            <textarea
              rows={5}
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              className={`${inputClass} resize-y`}
              placeholder="e.g. Specialist in skilled migration pathways with 10+ years of experience..."
            />
          </Field>
        </Section>

        <Section title="Specializations" hint="Pick every visa type you handle.">
          <div className="flex flex-wrap gap-2">
            {VISA_TYPES.map((v) => {
              const on = form.specializations.includes(v);
              return (
                <button
                  type="button"
                  key={v}
                  onClick={() =>
                    update("specializations", toggle(form.specializations, v))
                  }
                  className={
                    on
                      ? "rounded-full border border-purple bg-purple px-3 py-1 text-[12px] font-medium text-white"
                      : "rounded-full border border-border bg-white px-3 py-1 text-[12px] font-medium text-navy hover:border-purple/40"
                  }
                >
                  {v}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Languages">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const on = form.languages.includes(l);
              return (
                <button
                  type="button"
                  key={l}
                  onClick={() => update("languages", toggle(form.languages, l))}
                  className={
                    on
                      ? "rounded-full border border-purple bg-purple px-3 py-1 text-[12px] font-medium text-white"
                      : "rounded-full border border-border bg-white px-3 py-1 text-[12px] font-medium text-navy hover:border-purple/40"
                  }
                >
                  {l}
                </button>
              );
            })}
          </div>
        </Section>

        {error && (
          <p className="text-[13px] font-medium text-red-600">{error}</p>
        )}

        <div className="flex items-center justify-between border-t border-border/60 pt-6">
          <p className="flex items-center gap-1.5 text-[11px] text-gray-text">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Every application is verified against the OMARA register before listing.
          </p>
          <button
            type="submit"
            disabled={apply.isPending}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-purple bg-purple px-6 py-3 text-[15px] font-medium text-white shadow-lg shadow-purple/20 transition-all hover:border-purple-deep hover:bg-purple-deep disabled:opacity-60"
          >
            {apply.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit application
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-gray-light px-3 text-[14px] text-navy outline-none focus:border-purple";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-purple">
          {title}
        </h2>
        {hint && <p className="mt-1 text-[12px] text-gray-text">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-medium text-gray-text">{label}</span>
      {children}
    </label>
  );
}
