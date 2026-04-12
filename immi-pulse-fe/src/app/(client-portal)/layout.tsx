// Minimal layout for the client document portal. No navbar, no sidebar —
// just a centered brand header and the page content. This route group is
// authenticated via the backend `/api/v1/client-portal/*` token+PIN flow,
// not the console AuthProvider.

import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <rect width="32" height="32" rx="7" fill="url(#portal-logo)" />
              <path
                d="M9 22V10h2.5v12H9zm5 0V10h2.5v12H14zm5 0V10h2.5v5L24 10h3l-3.5 5.5L27 22h-3l-2.5-5-2 3v2h-0.5z"
                fill="white"
              />
              <defs>
                <linearGradient
                  id="portal-logo"
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
            <div>
              <p className="text-sm font-bold tracking-tight">IMMI-PULSE</p>
              <p className="text-[11px] text-muted-foreground">
                Secure document portal
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Encrypted upload
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
    </div>
  );
}
