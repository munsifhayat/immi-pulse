"use client";

import { useState } from "react";
import { GitBranch, Smartphone } from "lucide-react";
import type { OutcomeFlag, QuestionField } from "@/lib/api/services";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { LivePreview, useActiveOutcomeFlags } from "@/components/questionnaires/preview/LivePreview";
import { FlowPreview } from "@/components/questionnaires/preview/FlowPreview";

const FLAG_STYLES: Record<OutcomeFlag, string> = {
  urgent: "border-rose-400 bg-rose-50 text-rose-700",
  qualified: "border-emerald-400 bg-emerald-50 text-emerald-700",
  disqualified: "border-slate-400 bg-slate-50 text-slate-700",
  more_info: "border-amber-400 bg-amber-50 text-amber-800",
};

interface Props {
  fields: QuestionField[];
  formName: string;
  formDescription?: string;
  highlightedKey?: string | null;
  selectedKey?: string | null;
  onFlowNodeClick?: (key: string) => void;
  showFlowTab?: boolean;
  className?: string;
}

export function PreviewPanel({
  fields,
  formName,
  formDescription,
  highlightedKey,
  selectedKey,
  onFlowNodeClick,
  showFlowTab = true,
  className = "",
}: Props) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const activeFlags = useActiveOutcomeFlags(fields, answers);
  const previewHighlight = highlightedKey ?? selectedKey;

  return (
    <aside
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-[#F4F2FB] shadow-[0_1px_0_rgba(15,17,23,0.02)] ${className}`}
    >
      <header className="shrink-0 border-b border-border/60 bg-white/80 px-5 py-4 backdrop-blur-sm">
        <div className="flex items-baseline gap-2">
          <span className="font-mono-d text-[10px] uppercase tracking-[0.28em] text-purple">
            Client preview
          </span>
        </div>
        <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
          Live view of what your applicant sees while you edit.
        </p>
      </header>

      {activeFlags.length > 0 && (
        <OutcomeStrip flags={activeFlags} />
      )}

      <Tabs defaultValue="live" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border/60 bg-white/60 px-5 py-2.5">
          <TabsList className="h-9">
            <TabsTrigger value="live" className="gap-1.5 text-[12px]">
              <Smartphone className="h-3.5 w-3.5" />
              Live
            </TabsTrigger>
            {showFlowTab && (
              <TabsTrigger value="flow" className="gap-1.5 text-[12px]">
                <GitBranch className="h-3.5 w-3.5" />
                Flow
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent
          value="live"
          className="mt-0 min-h-0 flex-1 overflow-y-auto p-4 data-[state=inactive]:hidden"
        >
          <LivePreview
            fields={fields}
            formName={formName}
            highlightedKey={previewHighlight}
            onAnswersChange={setAnswers}
          />
        </TabsContent>

        {showFlowTab && (
          <TabsContent
            value="flow"
            className="mt-0 min-h-0 flex-1 overflow-hidden p-4 data-[state=inactive]:hidden"
          >
            <div className="h-[min(520px,50vh)] min-h-[320px]">
              <FlowPreview
                fields={fields}
                highlightedKey={previewHighlight}
                onNodeClick={onFlowNodeClick}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {formDescription && (
        <div className="shrink-0 border-t border-border/40 bg-white/50 px-5 py-2">
          <p className="truncate text-[11px] text-muted-foreground">{formDescription}</p>
        </div>
      )}
    </aside>
  );
}

function OutcomeStrip({ flags }: { flags: OutcomeFlag[] }) {
  return (
    <div className="shrink-0 border-b border-amber-200/60 bg-amber-50/80 px-5 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono-d text-[9.5px] uppercase tracking-[0.22em] text-amber-800/80">
          Outcomes
        </span>
        {flags.map((f) => (
          <span
            key={f}
            className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium capitalize ${FLAG_STYLES[f]}`}
          >
            {f.replace("_", " ")}
          </span>
        ))}
      </div>
    </div>
  );
}
