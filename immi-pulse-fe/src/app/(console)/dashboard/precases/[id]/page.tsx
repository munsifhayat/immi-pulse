"use client";

import { useParams } from "next/navigation";
import { PreCaseDetail } from "@/components/precase-detail";

export default function PreCaseItemPage() {
  const params = useParams<{ id: string }>();
  return <PreCaseDetail precaseId={params.id} />;
}
