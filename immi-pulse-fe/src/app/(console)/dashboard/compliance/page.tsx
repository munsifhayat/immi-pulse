"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ComplianceRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/clients");
  }, [router]);
  return null;
}
