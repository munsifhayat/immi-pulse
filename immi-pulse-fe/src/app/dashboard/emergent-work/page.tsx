"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmergentWorkRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/inbox?tab=scope");
  }, [router]);
  return null;
}
