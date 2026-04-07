"use client";

import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Platform", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Support", href: "/about#contact" },
    { label: "Get Started", href: "/get-started" },
  ],
  Explore: [
    { label: "Find Consultants", href: "/find-consultants" },
    { label: "Community", href: "/community" },
    { label: "News", href: "/news" },
    { label: "Blog", href: "/blog" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Contact Us", href: "/about#contact" },
    { label: "For Consultants", href: "/for-consultants" },
    { label: "For Applicants", href: "/for-applicants" },
  ],
  Legal: [
    { label: "Terms of Service", href: "#" },
    { label: "Privacy Policy", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-5">
          {/* Brand column */}
          <div className="sm:col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                className="shrink-0"
                aria-hidden="true"
              >
                <rect width="32" height="32" rx="7" fill="url(#footer-logo-grad)" />
                <path
                  d="M9 22V10h2.5v12H9zm5 0V10h2.5v12H14zm5 0V10h2.5v5L24 10h3l-3.5 5.5L27 22h-3l-2.5-5-2 3v2h-0.5z"
                  fill="white"
                />
                <defs>
                  <linearGradient
                    id="footer-logo-grad"
                    x1="0"
                    y1="0"
                    x2="32"
                    y2="32"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#7C5CFC" />
                    <stop offset="1" stopColor="#5B3ADB" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="font-heading text-[19px] font-semibold tracking-tight text-navy">
                IMMI-PULSE
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-gray-text">
              Subscribe below to receive tips for using AI in immigration
              consulting, product updates, and relevant news in immigration.
            </p>
            {/* Newsletter */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-5 flex gap-2"
              aria-label="Subscribe to newsletter"
            >
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                name="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="you@email.com\u2026"
                className="h-10 flex-1 rounded-lg border border-border bg-gray-light px-3 text-[13px] text-navy placeholder:text-gray-text/50 focus-visible:border-purple focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple"
              />
              <button
                type="submit"
                className="h-10 rounded-lg bg-purple px-4 text-[13px] font-medium text-white transition-colors hover:bg-purple-deep focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Submit
              </button>
            </form>
            <p className="mt-3 text-[13px] text-gray-text/60">
              Sydney, Australia
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-[13px] font-semibold uppercase tracking-wider text-navy/40">
                {title}
              </h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[15px] text-gray-text transition-colors hover:text-purple focus-visible:text-purple focus-visible:outline-none"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-[13px] text-gray-text">
            &copy; 2026 IMMI-PULSE. All rights reserved.
          </p>
          <p className="text-[13px] text-gray-text/60">
            Made in Australia
          </p>
        </div>
      </div>
    </footer>
  );
}
