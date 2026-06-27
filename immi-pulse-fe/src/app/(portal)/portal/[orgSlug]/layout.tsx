"use client";

import { use } from "react";

import { PortalAuthProvider } from "@/lib/portalAuth";

export default function PortalSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  return (
    <PortalAuthProvider orgSlug={orgSlug}>
      <div className="min-h-screen bg-[#F7F8FB] text-[#101928] antialiased">{children}</div>
    </PortalAuthProvider>
  );
}
