"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuestionnaireBuilder } from "@/components/QuestionnaireBuilder";
import { questionnairesApi, type Questionnaire } from "@/lib/api/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ExternalLink } from "lucide-react";

export default function EditQuestionnairePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [q, setQ] = useState<Questionnaire | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    questionnairesApi.get(params.id).then(setQ);
  }, [params.id]);

  if (!q) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}/q/${q.slug}` : `/q/${q.slug}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{q.name}</h1>
        <p className="text-sm text-muted-foreground">
          Edit the form below. Saving creates a new version — past responses keep their original schema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Public link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input readOnly value={publicUrl} />
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(publicUrl)}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" /> Open
              </Button>
            </a>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Share this link anywhere — email, WhatsApp, your website. Submissions land in your Pre-Cases inbox.
          </p>
        </CardContent>
      </Card>

      <QuestionnaireBuilder
        initialName={q.name}
        initialDescription={q.description || ""}
        initialAudience={q.audience}
        initialFields={q.fields}
        saving={saving}
        saveLabel="Save changes"
        onSave={async (payload) => {
          setSaving(true);
          try {
            await questionnairesApi.update(q.id, payload);
            router.push("/dashboard/questionnaires");
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
