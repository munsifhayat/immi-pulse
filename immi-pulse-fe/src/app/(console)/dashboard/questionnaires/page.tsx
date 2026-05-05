"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { questionnairesApi, type QuestionnaireListItem } from "@/lib/api/services";
import { Copy, ExternalLink, ClipboardList, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader, EditorialButton } from "@/components/layout/page-header";

export default function QuestionnairesListPage() {
  const [items, setItems] = useState<QuestionnaireListItem[] | null>(null);

  useEffect(() => {
    questionnairesApi
      .list()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const publicUrl = (slug: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/q/${slug}`
      : `/q/${slug}`;

  const copy = (s: string) => navigator.clipboard.writeText(s);

  const isLoading = items === null;
  const isEmpty = !isLoading && items.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Folio Nº 006 — Forms"
        title={
          <>
            <em>Intake</em> questionnaires.
          </>
        }
        description="Build a public intake form. Each submission becomes a pre-case."
        actions={
          !isEmpty ? (
            <Link href="/dashboard/questionnaires/new">
              <EditorialButton variant="solid">
                <Plus className="h-3 w-3" />
                New questionnaire
              </EditorialButton>
            </Link>
          ) : undefined
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-sm text-muted-foreground">
              Loading…
            </p>
          </CardContent>
        </Card>
      ) : isEmpty ? (
        <EmptyState
          icon={ClipboardList}
          title="Create your first questionnaire"
          description="Decide which questions you want every prospect to answer before booking a consult. We'll handle the rest — public form, branded landing page, and a structured pre-case in your inbox."
          primaryAction={{
            label: "Build a questionnaire",
            href: "/dashboard/questionnaires/new",
          }}
          steps={[
            {
              title: "Drag & drop fields",
              description:
                "Text, email, select, radio, and checkbox — mark required, reorder, preview live.",
            },
            {
              title: "Publish a public link",
              description:
                "We generate a shareable URL like immipulse.com/q/your-slug. Add it anywhere.",
            },
            {
              title: "Receive submissions",
              description:
                "Each fill-in lands in your Pre-Cases inbox with a structured summary.",
            },
            {
              title: "Promote to a case",
              description:
                "One click converts a strong lead into a paying case with documents and checkpoints.",
            },
          ]}
        />
      ) : (
        <Card>
          <CardContent className="px-0">
            <div className="divide-y divide-border/60">
              {items.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/questionnaires/${q.id}`}
                      className="text-sm font-semibold text-foreground hover:underline"
                    >
                      {q.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {q.field_count} {q.field_count === 1 ? "field" : "fields"}
                      {" · "}
                      {q.response_count}{" "}
                      {q.response_count === 1 ? "response" : "responses"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
                    <a
                      href={publicUrl(q.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Open public form"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
