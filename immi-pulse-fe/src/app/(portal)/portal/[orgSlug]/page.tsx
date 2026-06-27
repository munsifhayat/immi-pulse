"use client";

import { use } from "react";

import { ClientPortalApp } from "@/components/portal/ClientPortalApp";

export default function PortalPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  return <ClientPortalApp orgSlug={orgSlug} />;
}
