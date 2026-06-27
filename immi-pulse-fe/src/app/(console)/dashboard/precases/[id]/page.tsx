"use client";

import { useParams } from "next/navigation";
import { PreCaseWorkspace } from "@/components/precase/PreCaseWorkspace";

export default function PreCaseItemPage() {
  const params = useParams<{ id: string }>();
  return <PreCaseWorkspace precaseId={params.id} />;
}
