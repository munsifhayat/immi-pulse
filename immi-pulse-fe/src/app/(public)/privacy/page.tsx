import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy · IMMI-PULSE",
  description:
    "How IMMI-PULSE collects, holds, uses, and discloses personal information — written to comply with the Privacy Act 1988 (Cth) and the Australian Privacy Principles.",
};

const SECTIONS: { id: string; title: string }[] = [
  { id: "about", title: "1. About this policy" },
  { id: "audience", title: "2. Who this policy applies to" },
  { id: "what-we-collect", title: "3. What we collect" },
  { id: "how-we-collect", title: "4. How we collect it" },
  { id: "why-we-use", title: "5. Why we use it" },
  { id: "disclosure", title: "6. Disclosure of personal information" },
  { id: "where-stored", title: "7. Where your data is stored" },
  { id: "security", title: "8. Security and breach notification" },
  { id: "providers", title: "9. Sub-processors and AI providers" },
  { id: "retention", title: "10. Retention" },
  { id: "cookies", title: "11. Cookies and analytics" },
  { id: "marketing", title: "12. Direct marketing" },
  { id: "rights", title: "13. Your rights" },
  { id: "complaints", title: "14. Complaints" },
  { id: "children", title: "15. Children" },
  { id: "changes", title: "16. Changes to this policy" },
  { id: "contact", title: "17. Contact our Privacy Officer" },
];

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-gray-text/70">
            Effective date · 8 May 2026 &middot; Version 1.0
          </p>
          <p className="mt-7 max-w-2xl text-[17px] leading-[1.6] text-gray-text">
            We handle some of the most sensitive information a person can share — visa
            histories, identity documents, family details. This policy describes how we
            collect, hold, use, and disclose personal information, and the standards we
            hold ourselves to under the Privacy Act 1988 (Cth) and the Australian
            Privacy Principles.
          </p>

          {/* Trust strip */}
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { k: "Data residency", v: "Hosted in Australia (Sydney region)" },
              { k: "Encryption", v: "End-to-end, in transit and at rest" },
              { k: "Regulatory", v: "Privacy Act 1988 (Cth) aligned" },
            ].map((it) => (
              <div
                key={it.k}
                className="rounded-xl border border-border/60 bg-white/70 px-4 py-3.5 backdrop-blur-sm"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-navy/50">
                  {it.k}
                </p>
                <p className="mt-1.5 text-[13.5px] leading-snug text-navy">{it.v}</p>
              </div>
            ))}
          </div>
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
          <Section id="about" title="1. About this policy">
            <p>
              This policy describes how IMMI-PULSE, operated by The Apps Company Pty
              Ltd (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), collects,
              holds, uses, and discloses personal information. It is written to comply
              with the Privacy Act 1988 (Cth) (the &ldquo;Privacy Act&rdquo;) and the
              Australian Privacy Principles set out in Schedule 1 of that Act
              (the &ldquo;APPs&rdquo;).
            </p>
            <p>
              For any question about this policy, or about how we have handled your
              personal information, please contact our Privacy Officer at{" "}
              <a href="mailto:privacy@immi-pulse.com.au" className="font-medium text-purple underline underline-offset-2 hover:text-purple-deep">
                privacy@immi-pulse.com.au
              </a>
              .
            </p>
          </Section>

          <Section id="audience" title="2. Who this policy applies to">
            <p>This policy applies to:</p>
            <ul>
              <li>
                <strong>Consultants</strong> — Australian-registered migration agents
                and legal practitioners who use the Consultant Workspace;
              </li>
              <li>
                <strong>Applicants</strong> — visa applicants who interact with the
                Platform directly or whose information is uploaded by a Consultant; and
              </li>
              <li>
                <strong>Visitors</strong> — anyone who browses the public website,
                subscribes to the newsletter, or contacts us.
              </li>
            </ul>
            <p>
              Where a Consultant uploads a client&apos;s personal information to the
              Platform, the Consultant remains the principal handler of that
              information under their professional obligations. We process it on the
              Consultant&apos;s behalf, in line with these terms and our agreement with
              them.
            </p>
          </Section>

          <Section id="what-we-collect" title="3. What we collect">
            <p>
              We collect only the personal information that is reasonably necessary to
              provide the Platform.
            </p>
            <p>
              <strong>Account information.</strong> Name, business name, email, phone
              number, OMARA registration number or legal practising-certificate number,
              hashed password, and preferred timezone.
            </p>
            <p>
              <strong>Client and case information (uploaded by Consultants).</strong>{" "}
              Identity details, contact details, immigration history, qualifications,
              employment history, family composition, identity documents, supporting
              evidence, correspondence, file notes, and any other information necessary
              to assess or progress a visa matter.
            </p>
            <p>
              <strong>Email and document content.</strong> Where you connect a
              Microsoft 365 mailbox by OAuth, or upload a document, the Platform
              processes the content of those emails and documents to classify,
              summarise, and extract structured information.
            </p>
            <p>
              <strong>Sensitive information.</strong> The Platform may handle sensitive
              information within the meaning of section 6 of the Privacy Act, including
              health information, biometric information contained in identity documents,
              criminal history, and information about a person&apos;s race, religion,
              or political opinion where this is relevant to a visa matter. We collect
              sensitive information only with consent and only where it is reasonably
              necessary for the migration matter at hand.
            </p>
            <p>
              <strong>Usage and technical data.</strong> IP address, device and browser
              information, log data, and aggregated usage analytics. We do not sell
              this data.
            </p>
            <p>
              <strong>Newsletter and contact information.</strong> If you subscribe to
              our newsletter or contact us, we collect your email address and the
              content of your message.
            </p>
          </Section>

          <Section id="how-we-collect" title="4. How we collect it">
            <p>
              We collect personal information directly from you when you create an
              account, subscribe to the newsletter, contact us, or upload data. We
              collect information about clients indirectly through the Consultants who
              use the Platform, and we rely on the Consultant to have obtained any
              necessary consents.
            </p>
            <p>
              We also collect technical information automatically through cookies and
              analytics — see <a href="#cookies" className="font-medium text-purple underline underline-offset-2 hover:text-purple-deep">section 11</a>.
            </p>
          </Section>

          <Section id="why-we-use" title="5. Why we use it">
            <p>We use personal information to:</p>
            <ul>
              <li>provide, secure, and improve the Platform;</li>
              <li>authenticate users and prevent fraud or abuse;</li>
              <li>
                run the AI-assisted features (classification, drafting, document
                analysis, checklist generation);
              </li>
              <li>
                communicate with you about your account, support requests, or service
                changes;
              </li>
              <li>send marketing communications you have asked to receive; and</li>
              <li>meet legal, regulatory, and audit obligations.</li>
            </ul>
            <p>
              We do not use your data, or your clients&apos; data, to train
              general-purpose AI models. The AI providers we use are contracted not to
              retain or train on the inputs we send them.
            </p>
          </Section>

          <Section id="disclosure" title="6. Disclosure of personal information">
            <p>We disclose personal information only to:</p>
            <ul>
              <li>
                service providers and sub-processors that help us run the Platform —
                see <a href="#providers" className="font-medium text-purple underline underline-offset-2 hover:text-purple-deep">section 9</a>;
              </li>
              <li>
                a Consultant&apos;s authorised team members where they share access to
                the Workspace;
              </li>
              <li>
                a regulator, court, or law-enforcement body where we are legally
                required to do so; and
              </li>
              <li>
                a successor entity in connection with a sale, merger, or restructure,
                subject to equivalent privacy obligations.
              </li>
            </ul>
            <p>We do not sell personal information.</p>
          </Section>

          <Section id="where-stored" title="7. Where your data is stored">
            <p>
              Customer Data is hosted in Australia, in the Amazon Web Services Sydney
              region (ap-southeast-2). Backups are kept in the same Australian region.
              We do not routinely transfer Customer Data overseas.
            </p>
            <p>
              The AI models that power some of our features run within the same Sydney
              region. Where a future feature requires processing in another region we
              will tell you before that feature is enabled, and seek your consent in
              accordance with APP 8.
            </p>
          </Section>

          <Section id="security" title="8. Security and breach notification">
            <p>
              We protect personal information with administrative, technical, and
              physical safeguards, including:
            </p>
            <ul>
              <li>encryption in transit (TLS 1.2 or higher) and encryption at rest;</li>
              <li>least-privilege access controls and audit logging for staff access;</li>
              <li>multi-factor authentication for administrative access;</li>
              <li>regular security reviews, dependency monitoring, and patching;</li>
              <li>a documented incident-response plan; and</li>
              <li>staff confidentiality agreements and privacy training.</li>
            </ul>
            <p>
              No system is perfectly secure. If a data breach is likely to result in
              serious harm to an affected individual, we will notify the Office of the
              Australian Information Commissioner (OAIC) and affected individuals as
              required by the Notifiable Data Breaches scheme (Part IIIC of the
              Privacy Act).
            </p>
          </Section>

          <Section id="providers" title="9. Sub-processors and AI providers">
            <p>We use a limited number of trusted service providers:</p>
            <ul>
              <li>
                <strong>Amazon Web Services (Sydney region)</strong> — application
                hosting, database, file storage, and AI inference via Amazon Bedrock.
              </li>
              <li>
                <strong>Anthropic, via Amazon Bedrock</strong> — large-language-model
                inference for classification, drafting, and document analysis. Bedrock
                does not retain prompts or use them for model training.
              </li>
              <li>
                <strong>Microsoft (Azure / Microsoft 365)</strong> — only where a
                Consultant connects their own Microsoft 365 mailbox by OAuth.
              </li>
              <li>
                <strong>A payment provider</strong> — engaged once paid plans go live,
                for processing subscription payments.
              </li>
              <li>
                <strong>Email and analytics providers</strong> — for transactional email
                and product analytics.
              </li>
            </ul>
            <p>
              A current list of sub-processors is available on request from{" "}
              <a href="mailto:privacy@immi-pulse.com.au" className="font-medium text-purple underline underline-offset-2 hover:text-purple-deep">
                privacy@immi-pulse.com.au
              </a>
              .
            </p>
          </Section>

          <Section id="retention" title="10. Retention">
            <p>
              We retain personal information for as long as your account is active and
              for as long as we need it to provide the Platform. After termination we
              will make Customer Data available for export for thirty (30) days. After
              that period it is deleted from active systems and retained only:
            </p>
            <ul>
              <li>
                in encrypted backups for up to ninety (90) days, after which it is
                overwritten in the ordinary course; and
              </li>
              <li>
                where law requires longer retention (for example, financial or tax
                records).
              </li>
            </ul>
            <p>
              You may ask us to delete personal information sooner. We will do so unless
              we are required to keep it.
            </p>
          </Section>

          <Section id="cookies" title="11. Cookies and analytics">
            <p>
              The Platform uses essential cookies for authentication and session
              management, and a small number of analytics cookies to understand usage
              patterns. You can disable non-essential cookies in your browser. We do
              not use cross-site advertising trackers.
            </p>
          </Section>

          <Section id="marketing" title="12. Direct marketing">
            <p>
              We will only send you marketing communications if you have asked us to —
              for example, by subscribing to our newsletter or opting in during
              sign-up. Every marketing email contains a one-click unsubscribe; you can
              also opt out by emailing us. We will never market to a Consultant&apos;s
              clients without the Consultant&apos;s instruction.
            </p>
          </Section>

          <Section id="rights" title="13. Your rights">
            <p>Under the Privacy Act you have the right to:</p>
            <ul>
              <li>access the personal information we hold about you (APP 12);</li>
              <li>
                ask us to correct information that is inaccurate, out-of-date,
                incomplete, irrelevant, or misleading (APP 13);
              </li>
              <li>withdraw consent for processing that depends on consent;</li>
              <li>complain about how we have handled your information.</li>
            </ul>
            <p>
              To exercise any of these rights, email{" "}
              <a href="mailto:privacy@immi-pulse.com.au" className="font-medium text-purple underline underline-offset-2 hover:text-purple-deep">
                privacy@immi-pulse.com.au
              </a>
              . We will respond within thirty (30) days. We may need to verify your
              identity before acting.
            </p>
            <p>
              If a request relates to information held in a Consultant&apos;s Workspace,
              we will refer the request to the Consultant, who is the appropriate first
              point of contact.
            </p>
          </Section>

          <Section id="complaints" title="14. Complaints">
            <p>
              If you are unhappy with how we have handled your personal information,
              please contact our Privacy Officer at{" "}
              <a href="mailto:privacy@immi-pulse.com.au" className="font-medium text-purple underline underline-offset-2 hover:text-purple-deep">
                privacy@immi-pulse.com.au
              </a>
              . We will acknowledge your complaint within five (5) business days and
              aim to resolve it within thirty (30) days.
            </p>
            <p>
              If you are not satisfied with our response, you can lodge a complaint
              with the Office of the Australian Information Commissioner:
            </p>
            <ul>
              <li>web — oaic.gov.au</li>
              <li>phone — 1300 363 992</li>
              <li>post — GPO Box 5288, Sydney NSW 2001</li>
            </ul>
          </Section>

          <Section id="children" title="15. Children">
            <p>
              The Platform is not directed to children. A Consultant may upload
              information about a minor where the minor is the subject of a visa matter;
              in that case the Consultant is responsible for obtaining any required
              consents from a parent or guardian.
            </p>
          </Section>

          <Section id="changes" title="16. Changes to this policy">
            <p>
              We may update this policy from time to time. Material changes will be
              notified to account holders by email or in-product at least thirty (30)
              days before they take effect. The version date at the top of this page
              will always show the current effective date.
            </p>
          </Section>

          <Section id="contact" title="17. Contact our Privacy Officer">
            <p>
              The Apps Company Pty Ltd — IMMI-PULSE
              <br />
              Attn: Privacy Officer
              <br />
              Perth, Western Australia
              <br />
              Email:{" "}
              <a href="mailto:privacy@immi-pulse.com.au" className="font-medium text-purple underline underline-offset-2 hover:text-purple-deep">
                privacy@immi-pulse.com.au
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
              A privacy question we haven&apos;t answered?
            </p>
            <p className="mt-1 text-[14px] text-gray-text">
              Our Privacy Officer reads every email and aims to reply within two
              business days.
            </p>
          </div>
          <Link
            href="mailto:privacy@immi-pulse.com.au"
            className="inline-flex items-center gap-2 rounded-xl border border-navy/15 bg-white px-5 py-3 text-[14px] font-medium text-navy transition-colors hover:border-purple hover:text-purple"
          >
            Email the Privacy Officer
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
