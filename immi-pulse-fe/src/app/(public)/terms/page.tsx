import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service · IMMI-PULSE",
  description:
    "Terms of Service for IMMI-PULSE — the AI-assisted workspace for Australian-registered migration agents and their clients.",
};

const SECTIONS: { id: string; title: string }[] = [
  { id: "who-we-are", title: "1. Who we are and what these Terms cover" },
  { id: "software-not-agent", title: "2. The Platform is software, not a registered migration agent" },
  { id: "eligibility", title: "3. Eligibility for the Consultant Workspace" },
  { id: "your-responsibilities", title: "4. Your responsibilities" },
  { id: "acceptable-use", title: "5. Acceptable use" },
  { id: "your-data", title: "6. Your data and your clients' data" },
  { id: "ai-features", title: "7. AI-assisted features" },
  { id: "subscriptions", title: "8. Subscriptions and fees" },
  { id: "suspension", title: "9. Suspension and termination" },
  { id: "confidentiality", title: "10. Confidentiality" },
  { id: "ip", title: "11. Intellectual property" },
  { id: "warranties", title: "12. Warranties and disclaimers" },
  { id: "liability", title: "13. Limitation of liability" },
  { id: "indemnity", title: "14. Indemnity" },
  { id: "notices", title: "15. Notices" },
  { id: "law", title: "16. Governing law" },
  { id: "changes", title: "17. Changes to these Terms" },
  { id: "contact", title: "18. Contact" },
];

export default function TermsPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative border-b border-border/60 bg-gradient-to-b from-purple-muted/20 via-white to-white">
        <div className="mx-auto max-w-5xl px-6 pt-20 pb-14 lg:px-8 lg:pt-28">
          <div className="editorial-eyebrow">
            <span>Legal</span>
          </div>
          <h1
            className="mt-6 font-heading font-normal leading-[1.04] tracking-[-1.4px] text-navy"
            style={{ fontSize: "clamp(2.4rem, 4.6vw, 3.6rem)" }}
          >
            Terms of Service
          </h1>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-gray-text/70">
            Effective date · 8 May 2026 &middot; Version 1.0
          </p>
          <p className="mt-7 max-w-2xl text-[17px] leading-[1.6] text-gray-text">
            These Terms govern your use of IMMI-PULSE — the AI-assisted workspace for
            Australian-registered migration agents and the applicants they serve. They
            are written to sit alongside, not replace, the professional obligations you
            already hold under the Migration Act 1958 (Cth) and the Migration Agents
            Code of Conduct.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 lg:grid lg:grid-cols-[14rem_1fr] lg:gap-12 lg:px-8">
        {/* TOC */}
        <aside className="mb-10 lg:mb-0">
          <div className="lg:sticky lg:top-28">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-navy/50">
              On this page
            </p>
            <nav className="mt-4 space-y-2 text-[13px]">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block leading-snug text-gray-text transition-colors hover:text-purple"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Body */}
        <article className="prose-classy">
          <Section id="who-we-are" title="1. Who we are and what these Terms cover">
            <p>
              IMMI-PULSE (the &ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;,
              &ldquo;our&rdquo;) is a software service operated by The Apps Company Pty
              Ltd, trading as theappscompany.ai, of Perth, Western Australia. These
              Terms govern your access to and use of the Platform, including the public
              website, the Consultant Workspace, applicant-facing tools, and any
              related APIs or integrations.
            </p>
            <p>
              By creating an account or using the Platform you agree to these Terms. If
              you are entering into them on behalf of an organisation or migration
              agency, you confirm you have authority to bind that entity.
            </p>
          </Section>

          <Section id="software-not-agent" title="2. The Platform is software, not a registered migration agent">
            <p>
              IMMI-PULSE is a software-as-a-service product. We are not registered with
              the Office of the Migration Agents Registration Authority (OMARA), and we
              do not provide &ldquo;immigration assistance&rdquo; within the meaning of
              section 276 of the Migration Act 1958 (Cth).
            </p>
            <p>
              Where the Platform produces classifications, draft letters, document
              analyses, suggested checklists, or any other AI-generated output, those
              outputs are <strong>decision support only</strong>. They are not legal
              advice and do not constitute migration assistance. A registered migration
              agent or qualified Australian legal practitioner remains responsible for
              the advice given to any client and for the lodgement of any application.
            </p>
          </Section>

          <Section id="eligibility" title="3. Eligibility for the Consultant Workspace">
            <p>The Consultant Workspace is intended for use by:</p>
            <ul>
              <li>Australian-registered migration agents (OMARA);</li>
              <li>
                Australian legal practitioners who hold a current practising
                certificate; or
              </li>
              <li>staff acting under the direction and supervision of the above.</li>
            </ul>
            <p>
              If you use the Consultant Workspace you confirm your registration is
              current, and you undertake to notify us promptly if it is suspended,
              cancelled, or surrendered.
            </p>
          </Section>

          <Section id="your-responsibilities" title="4. Your responsibilities">
            <p>You agree to:</p>
            <ul>
              <li>
                comply with the Migration Agents Code of Conduct, the Migration Act
                1958 (Cth), and any other professional obligation that applies to you;
              </li>
              <li>
                maintain the confidentiality of your account credentials and any client
                data you upload;
              </li>
              <li>
                obtain all consents required from your clients before submitting their
                personal information to the Platform;
              </li>
              <li>
                review every AI-generated output before relying on it or sharing it
                with a client; and
              </li>
              <li>
                use the Platform only for lawful purposes and in accordance with these
                Terms.
              </li>
            </ul>
            <p>
              The Platform offers a manual override at every automated step. For any
              material decision — submission to government, communication to a client,
              or change of case status — you are expected to use that manual review
              path.
            </p>
          </Section>

          <Section id="acceptable-use" title="5. Acceptable use">
            <p>You must not:</p>
            <ul>
              <li>
                attempt to circumvent access controls, scrape the Platform, or
                reverse-engineer its components;
              </li>
              <li>
                upload material that is unlawful, infringes a third party&apos;s rights,
                or contains malicious code;
              </li>
              <li>
                use the Platform to provide migration assistance you are not
                authorised to provide under the Migration Act 1958 (Cth);
              </li>
              <li>
                resell, sublicense, or white-label the Platform without our written
                permission; or
              </li>
              <li>use the Platform to train a competing model.</li>
            </ul>
            <p>We may suspend access to investigate suspected breaches.</p>
          </Section>

          <Section id="your-data" title="6. Your data and your clients' data">
            <p>
              You retain ownership of all content you upload to the Platform, including
              client records, correspondence, and document uploads
              (&ldquo;Customer Data&rdquo;). We process Customer Data only to provide
              the Platform and as described in our{" "}
              <Link href="/privacy" className="font-medium text-purple underline underline-offset-2 hover:text-purple-deep">
                Privacy Policy
              </Link>
              .
            </p>
            <p>
              You grant us a limited, non-exclusive licence to host, transmit, process,
              and display Customer Data for the purpose of operating the Platform,
              providing support, and maintaining security. We do not use Customer Data
              to train general-purpose AI models, and our AI providers are contracted
              not to retain or train on the inputs we send them.
            </p>
          </Section>

          <Section id="ai-features" title="7. AI-assisted features">
            <p>
              The Platform uses third-party large-language-model providers — currently
              Anthropic&apos;s Claude family via Amazon Bedrock, hosted in the
              ap-southeast-2 (Sydney) region — to power features such as classification,
              drafting, and document analysis.
            </p>
            <p>
              AI outputs may contain errors, omissions, or fabrications. They must be
              verified before they are relied on or sent to a client. Responsibility
              for any decision, draft, or filing rests with you, not with the Platform
              or its providers.
            </p>
          </Section>

          <Section id="subscriptions" title="8. Subscriptions and fees">
            <p>
              Subscription fees, billing periods, and any free-tier limits are set out
              in your subscription order or on the Platform&apos;s pricing page at the
              time of purchase. During an early-access or beta period, fees may be
              invoiced manually.
            </p>
            <p>
              We may change pricing on at least thirty (30) days&apos; written notice.
              New pricing applies from the start of your next billing period; you may
              cancel before that date if you do not wish to continue.
            </p>
          </Section>

          <Section id="suspension" title="9. Suspension and termination">
            <p>
              You may cancel your subscription at any time. Cancellation takes effect at
              the end of your current billing period.
            </p>
            <p>We may suspend or terminate access immediately if:</p>
            <ul>
              <li>you breach these Terms or fail to pay fees when due;</li>
              <li>
                your OMARA registration or legal practising certificate is cancelled,
                suspended, or surrendered; or
              </li>
              <li>
                continued service would expose us or a third party to legal or security
                risk.
              </li>
            </ul>
            <p>
              On termination we will make Customer Data available for export for
              thirty (30) days, after which it may be deleted from active systems and
              retained only to the extent required by law or as set out in our Privacy
              Policy.
            </p>
          </Section>

          <Section id="confidentiality" title="10. Confidentiality">
            <p>
              Each party will keep the other&apos;s confidential information in
              confidence and will use it only for the purposes contemplated by these
              Terms. Customer Data is treated as your confidential information and is
              handled in line with our Privacy Policy.
            </p>
          </Section>

          <Section id="ip" title="11. Intellectual property">
            <p>
              The Platform — including its software, design, branding, documentation,
              and associated know-how — is owned by us or our licensors. Nothing in
              these Terms transfers any of our intellectual property to you. You retain
              all intellectual property rights in your Customer Data.
            </p>
          </Section>

          <Section id="warranties" title="12. Warranties and disclaimers">
            <p>
              We provide the Platform on a commercially reasonable basis and aim for
              high availability, but we do not warrant that the Platform will be
              error-free, that AI outputs will be accurate or complete, or that the
              service will be uninterrupted. To the extent permitted by law, all
              implied terms and conditions are excluded.
            </p>
            <p>
              Nothing in these Terms excludes, restricts, or modifies any right or
              remedy that you have under the Australian Consumer Law (Schedule 2 of the
              Competition and Consumer Act 2010 (Cth)) where it cannot lawfully be
              excluded.
            </p>
          </Section>

          <Section id="liability" title="13. Limitation of liability">
            <p>
              To the maximum extent permitted by law, our total aggregate liability
              arising out of or in connection with these Terms is limited to the fees
              you paid for the Platform in the twelve (12) months preceding the event
              giving rise to the claim.
            </p>
            <p>
              We will not be liable for any indirect, consequential, or special loss,
              including loss of profits, loss of business, loss of goodwill, or
              reputational harm. Liability for personal injury caused by negligence,
              for fraud, or for any other liability that cannot be limited at law, is
              not limited by this clause.
            </p>
          </Section>

          <Section id="indemnity" title="14. Indemnity">
            <p>
              You will indemnify us, on a continuing basis, from any third-party claim
              arising from (a) your use of the Platform in breach of these Terms;
              (b) your breach of professional obligations under the Migration Act,
              the Migration Agents Code of Conduct, or any applicable legal-profession
              rules; or (c) the content you upload to the Platform.
            </p>
          </Section>

          <Section id="notices" title="15. Notices">
            <p>
              Notices to us should be sent to{" "}
              <a href="mailto:legal@immi-pulse.com.au" className="font-medium text-purple underline underline-offset-2 hover:text-purple-deep">
                legal@immi-pulse.com.au
              </a>
              . Notices to you will be sent to the email address registered to your
              account or shown in-product.
            </p>
          </Section>

          <Section id="law" title="16. Governing law">
            <p>
              These Terms are governed by the laws of Western Australia and the
              Commonwealth of Australia. Each party submits to the non-exclusive
              jurisdiction of the courts of Western Australia.
            </p>
          </Section>

          <Section id="changes" title="17. Changes to these Terms">
            <p>
              We may update these Terms from time to time. If a change is material we
              will notify you by email or in-product at least thirty (30) days before
              it takes effect. Continued use of the Platform after the change takes
              effect constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section id="contact" title="18. Contact">
            <p>
              The Apps Company Pty Ltd — IMMI-PULSE
              <br />
              Perth, Western Australia
              <br />
              Email:{" "}
              <a href="mailto:legal@immi-pulse.com.au" className="font-medium text-purple underline underline-offset-2 hover:text-purple-deep">
                legal@immi-pulse.com.au
              </a>
            </p>
          </Section>
        </article>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-border/60 bg-gray-light/50">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-6 py-12 sm:flex-row sm:items-center lg:px-8">
          <div>
            <p className="font-heading text-[20px] tracking-tight text-navy">
              Questions about these Terms?
            </p>
            <p className="mt-1 text-[14px] text-gray-text">
              Our team is happy to walk through the detail before you sign up.
            </p>
          </div>
          <Link
            href="/about#contact"
            className="inline-flex items-center gap-2 rounded-xl border border-navy/15 bg-white px-5 py-3 text-[14px] font-medium text-navy transition-colors hover:border-purple hover:text-purple"
          >
            Get in touch
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-border/40 py-8 first:pt-0 last:border-b-0">
      <h2 className="font-heading text-[22px] font-medium tracking-[-0.4px] text-navy">
        {title}
      </h2>
      <div className="prose-body mt-4 space-y-4 text-[15.5px] leading-[1.7] text-gray-text">
        {children}
      </div>
    </section>
  );
}
