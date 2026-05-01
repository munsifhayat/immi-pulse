"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionnaireBuilder } from "@/components/QuestionnaireBuilder";
import { questionnairesApi } from "@/lib/api/services";

export default function NewQuestionnairePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New questionnaire</h1>
        <p className="text-sm text-muted-foreground">
          Build a form for prospects. They&apos;ll fill it on mobile or desktop — no login.
        </p>
      </div>
      <QuestionnaireBuilder
        saving={saving}
        onSave={async (payload) => {
          setSaving(true);
          try {
            const result = await questionnairesApi.create(payload);
            router.push(`/dashboard/questionnaires/${result.id}`);
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
