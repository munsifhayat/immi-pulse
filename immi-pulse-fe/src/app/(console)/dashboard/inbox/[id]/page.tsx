"use client";

import { useParams } from "next/navigation";
import { PreCaseWorkspace } from "@/components/precase/PreCaseWorkspace";

export default function InboxItemPage() {
  const params = useParams<{ id: string }>();
  return <PreCaseWorkspace precaseId={params.id} />;
}
