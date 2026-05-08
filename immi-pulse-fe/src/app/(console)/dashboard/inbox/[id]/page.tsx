"use client";

import { useParams } from "next/navigation";
import { PreCaseDetail } from "@/components/precase-detail";

export default function InboxItemPage() {
  const params = useParams<{ id: string }>();
  return <PreCaseDetail precaseId={params.id} />;
}
