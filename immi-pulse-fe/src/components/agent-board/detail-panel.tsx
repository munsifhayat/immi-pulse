import {
  X,
  Mail,
  Sparkles,
  GitMerge,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  Database,
  Layers,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Info,
  ShieldCheck,
  Zap,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AgentMetadata } from "./board-data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  Sparkles,
  GitMerge,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  Database,
  Layers,
};

const typeLabels: Record<string, { label: string; className: string }> = {
  input: {
    label: "Input",
    className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20",
  },
  classifier: {
    label: "AI Classifier",
    className:
      "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20",
  },
  resolver: {
    label: "Logic Engine",
    className:
      "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20",
  },
  agent: {
    label: "Agent",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
  },
  database: {
    label: "Storage",
    className:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  scheduler: {
    label: "Scheduler",
    className: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/20",
  },
  shared: {
    label: "Shared",
    className: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/20",
  },
};

interface DetailPanelProps {
  metadata: AgentMetadata | null;
  onClose: () => void;
}

export function DetailPanel({ metadata, onClose }: DetailPanelProps) {
  if (!metadata) return null;

  const Icon = iconMap[metadata.icon] || Layers;
  const typeInfo = typeLabels[metadata.type] || typeLabels.shared;

  return (
    <div className="absolute right-0 top-0 bottom-0 z-10 w-[420px] border-l bg-card overflow-y-auto shadow-xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur-sm p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted">
            <Icon className="h-5 w-5 shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold truncate">{metadata.label}</h2>
          </div>
          <Badge variant="outline" className={`text-[11px] ${typeInfo.className}`}>
            {typeInfo.label}
          </Badge>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-5 p-4 pb-8">
        {/* Plain Description — the lead section */}
        <section>
          <p className="text-sm leading-relaxed">
            {metadata.plainDescription}
          </p>
        </section>

        {/* When Does This Run */}
        {metadata.whenRuns && (
          <>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
              <Timer className="h-4 w-4 shrink-0 text-teal-500" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {metadata.whenRuns}
              </p>
            </div>
          </>
        )}

        <Separator />

        {/* How It Works */}
        {metadata.howItWorks && metadata.howItWorks.length > 0 && (
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <Zap className="h-3.5 w-3.5" />
              How It Works
            </h3>
            <ol className="space-y-2.5">
              {metadata.howItWorks.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Business Rules */}
        {metadata.businessRules && metadata.businessRules.length > 0 && (
          <>
            <Separator />
            <section>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <ShieldCheck className="h-3.5 w-3.5" />
                Business Rules
              </h3>
              <div className="space-y-3">
                {metadata.businessRules.map((br, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-muted/30 p-3"
                  >
                    <p className="text-sm font-medium mb-1">{br.rule}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {br.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Conflict Rules (special for resolver) */}
        {metadata.conflictRules && metadata.conflictRules.length > 0 && (
          <>
            <Separator />
            <section>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <GitMerge className="h-3.5 w-3.5" />
                Conflict Resolution Rules
              </h3>
              <ol className="space-y-2.5">
                {metadata.conflictRules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-orange-500/15 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground leading-relaxed">{rule}</span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        {/* AI Model */}
        {metadata.aiModel && (
          <>
            <Separator />
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                AI Model
              </h3>
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {metadata.aiModel.name}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {metadata.aiModel.operation}
                  </Badge>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground break-all">
                  {metadata.aiModel.id}
                </p>
                <p className="text-xs text-muted-foreground">
                  Max output: {metadata.aiModel.maxTokens.toLocaleString()} tokens
                </p>
              </div>
            </section>
          </>
        )}

        {/* Confidence Threshold */}
        {metadata.confidenceThreshold !== undefined && (
          <>
            <Separator />
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Confidence Threshold
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${metadata.confidenceThreshold * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {(metadata.confidenceThreshold * 100).toFixed(0)}%
                </span>
              </div>
              {metadata.thresholdExplanation && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {metadata.thresholdExplanation}
                </p>
              )}
            </section>
          </>
        )}

        {/* Inputs & Outputs side by side */}
        {((metadata.inputs && metadata.inputs.length > 0) ||
          (metadata.outputs && metadata.outputs.length > 0)) && (
          <>
            <Separator />
            <div className="grid gap-4">
              {/* Inputs */}
              {metadata.inputs && metadata.inputs.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    <ArrowRight className="h-3.5 w-3.5 text-sky-500" />
                    Inputs
                  </h3>
                  <ul className="space-y-1.5">
                    {metadata.inputs.map((input, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-sky-500/60" />
                        <span className="leading-relaxed">{input}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Outputs */}
              {metadata.outputs && metadata.outputs.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    <ArrowLeft className="h-3.5 w-3.5 text-emerald-500" />
                    Outputs
                  </h3>
                  <ul className="space-y-1.5">
                    {metadata.outputs.map((output, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500/60" />
                        <span className="leading-relaxed">{output}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </>
        )}

        {/* Roles */}
        {metadata.roles.length > 0 && (
          <>
            <Separator />
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Responsibilities
              </h3>
              <ul className="space-y-1.5">
                {metadata.roles.map((role, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                    <span className="text-muted-foreground">{role}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* Actions */}
        {metadata.actions && metadata.actions.length > 0 && (
          <>
            <Separator />
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Actions
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {metadata.actions.map((action) => (
                  <Badge key={action} variant="secondary" className="text-xs">
                    {action}
                  </Badge>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Scheduled Tasks */}
        {metadata.scheduledTasks && metadata.scheduledTasks.length > 0 && (
          <>
            <Separator />
            <section>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                <Clock className="h-3.5 w-3.5" />
                Scheduled Tasks
              </h3>
              <div className="space-y-2">
                {metadata.scheduledTasks.map((task) => (
                  <div
                    key={task.name}
                    className="rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{task.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {task.interval}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Database Tables */}
        {metadata.dbTables && metadata.dbTables.length > 0 && (
          <>
            <Separator />
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Database Tables
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {metadata.dbTables.map((table) => (
                  <span
                    key={table}
                    className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground"
                  >
                    {table}
                  </span>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Connected To */}
        {metadata.connectedTo && metadata.connectedTo.length > 0 && (
          <>
            <Separator />
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Connects To
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {metadata.connectedTo.map((target) => (
                  <Badge key={target} variant="outline" className="text-xs">
                    {target}
                  </Badge>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
