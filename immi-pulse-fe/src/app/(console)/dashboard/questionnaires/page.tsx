"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { questionnairesApi, type QuestionnaireListItem } from "@/lib/api/services";
import { Copy, ExternalLink } from "lucide-react";

export default function QuestionnairesListPage() {
  const [items, setItems] = useState<QuestionnaireListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    questionnairesApi.list().then((r) => {
      setItems(r);
      setLoading(false);
    });
  }, []);

  const publicUrl = (slug: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/q/${slug}` : `/q/${slug}`;

  const copy = (s: string) => navigator.clipboard.writeText(s);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Questionnaires</h1>
          <p className="text-sm text-muted-foreground">
            Build a form. Share the public link with prospects. Each submission becomes a Pre-Case.
          </p>
        </div>
        <Link href="/dashboard/questionnaires/new">
          <Button>+ New questionnaire</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All questionnaires</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No questionnaires yet. Click &quot;New questionnaire&quot; to start.
            </p>
          ) : (
            <div className="divide-y">
              {items.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/questionnaires/${q.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {q.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {q.field_count} fields · {q.response_count} responses
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{q.audience}</Badge>
                    <Badge variant={q.is_active ? "default" : "outline"}>
                      {q.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(publicUrl(q.slug))}
                      title="Copy public link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <a href={publicUrl(q.slug)} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" title="Open public form">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
