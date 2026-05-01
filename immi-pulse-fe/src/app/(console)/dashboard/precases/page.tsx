"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { preCasesApi, type PreCaseListItem } from "@/lib/api/services";
import { Sparkles } from "lucide-react";

const OUTCOME_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  likely_fit: { label: "Likely fit", variant: "default" },
  needs_info: { label: "Needs info", variant: "secondary" },
  paid_consult: { label: "Paid consult", variant: "secondary" },
  unlikely_fit: { label: "Unlikely fit", variant: "destructive" },
};

export default function PreCasesInboxPage() {
  const [items, setItems] = useState<PreCaseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    preCasesApi.list().then((r) => {
      setItems(r);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pre-Cases</h1>
        <p className="text-sm text-muted-foreground">
          New questionnaire submissions. Review, then promote to a Case or archive.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inbox ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No pre-cases yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Share your{" "}
                <Link href="/dashboard/questionnaires" className="text-primary underline">
                  questionnaire
                </Link>{" "}
                link to start receiving submissions.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((p) => {
                const outcome = p.ai_suggested_outcome
                  ? OUTCOME_LABEL[p.ai_suggested_outcome]
                  : null;
                const unread = !p.read_at;
                return (
                  <Link
                    key={p.id}
                    href={`/dashboard/precases/${p.id}`}
                    className="flex items-start gap-3 py-4 hover:bg-muted/50 px-2 -mx-2 rounded"
                  >
                    <div className={`mt-1 h-2 w-2 rounded-full ${unread ? "bg-primary" : "bg-transparent"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {p.client_name || p.client_email || "Anonymous"}
                        </p>
                        {p.questionnaire_name && (
                          <Badge variant="outline" className="text-xs">
                            {p.questionnaire_name}
                          </Badge>
                        )}
                        {outcome && (
                          <Badge variant={outcome.variant} className="text-xs">
                            <Sparkles className="mr-1 h-3 w-3" /> {outcome.label}
                          </Badge>
                        )}
                        {p.status === "promoted" && (
                          <Badge variant="default" className="text-xs">
                            Promoted
                          </Badge>
                        )}
                        {p.status === "archived" && (
                          <Badge variant="outline" className="text-xs">
                            Archived
                          </Badge>
                        )}
                      </div>
                      {p.ai_summary && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{p.ai_summary}</p>
                      )}
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {p.client_email} · {new Date(p.submitted_at || p.created_at).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
