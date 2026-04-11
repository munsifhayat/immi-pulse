"use client";

import { useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Ban,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StageHeader } from "@/components/journey/shared/stage-header";
import { AiInsightPanel } from "@/components/journey/shared/ai-insight-panel";
import { cn } from "@/lib/utils";
import { generateChecklist, VISA_REQUIREMENTS } from "@/lib/mock-data/visa-requirements";
import type { StageProps, ChecklistRequirement } from "@/lib/types/journey-wizard";

function StatusIcon({ status }: { status: ChecklistRequirement["status"] }) {
  switch (status) {
    case "validated":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "uploaded":
      return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    case "flagged":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "not_applicable":
      return <Ban className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

export function ChecklistStage({ wizardContext }: StageProps) {
  const { state, updateStageData } = wizardContext;
  const checklist = state.checklist;
  const selectedVisa = state.visaPathway.selectedVisa;
  const visaConfig = VISA_REQUIREMENTS[selectedVisa];

  // Auto-generate checklist if empty and visa is selected
  useEffect(() => {
    if (checklist.length === 0 && selectedVisa) {
      const generated = generateChecklist(selectedVisa);
      updateStageData("checklist", generated);
    }
  }, [selectedVisa, checklist.length, updateStageData]);

  const categories = [...new Set(checklist.map((item) => item.category))];
  const totalRequired = checklist.filter((i) => i.required && i.status !== "not_applicable").length;
  const totalOptional = checklist.filter((i) => !i.required && i.status !== "not_applicable").length;

  const toggleNotApplicable = (id: string) => {
    updateStageData(
      "checklist",
      checklist.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "not_applicable" ? "pending" : "not_applicable",
            }
          : item
      )
    );
  };

  const updateItemNotes = (id: string, notes: string) => {
    updateStageData(
      "checklist",
      checklist.map((item) => (item.id === id ? { ...item, notes } : item))
    );
  };

  const removeItem = (id: string) => {
    updateStageData(
      "checklist",
      checklist.filter((item) => item.id !== id)
    );
  };

  const addCustomItem = () => {
    const newItem: ChecklistRequirement = {
      id: `custom_${Date.now()}`,
      category: "Custom",
      documentType: "Custom Document",
      description: "",
      required: false,
      deadline: "",
      status: "pending",
      notes: "",
    };
    updateStageData("checklist", [...checklist, newItem]);
  };

  return (
    <div className="space-y-6">
      <StageHeader
        stageIndex={3}
        subtitle={
          visaConfig
            ? `Document requirements for Subclass ${visaConfig.subclass} — ${visaConfig.name}`
            : "AI-generated document checklist"
        }
      />

      <AiInsightPanel title="Checklist Auto-Generated">
        <p>
          This checklist was generated based on the <strong>Subclass {selectedVisa}</strong> requirements.
          You can mark items as not applicable, add custom requirements, or add notes for
          the client. The checklist will guide document collection in the next stage.
        </p>
      </AiInsightPanel>

      {/* Summary stats */}
      <div className="flex gap-4 flex-wrap">
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
          <FileText className="h-3.5 w-3.5" />
          {totalRequired} Required
        </Badge>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-muted-foreground">
          {totalOptional} Optional
        </Badge>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-muted-foreground">
          {checklist.filter((i) => i.status === "not_applicable").length} N/A
        </Badge>
      </div>

      {/* Checklist by category */}
      {categories.map((category) => {
        const items = checklist.filter((i) => i.category === category);
        return (
          <Card key={category} className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {category}
                <span className="text-xs font-normal text-muted-foreground">
                  ({items.length} items)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3">
              {items.map((item, idx) => (
                <div key={item.id}>
                  {idx > 0 && <Separator className="my-2" />}
                  <div
                    className={cn(
                      "rounded-lg p-3 transition-colors",
                      item.status === "not_applicable" && "opacity-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <StatusIcon status={item.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium">{item.documentType}</p>
                          {item.required && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 text-red-600 border-red-200 dark:text-red-400 dark:border-red-800"
                            >
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.description}</p>

                        {/* Notes input */}
                        {item.status !== "not_applicable" && (
                          <Input
                            className="mt-2 text-xs h-8"
                            placeholder="Add a note for the client..."
                            value={item.notes}
                            onChange={(e) => updateItemNotes(item.id, e.target.value)}
                          />
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleNotApplicable(item.id)}
                          title={
                            item.status === "not_applicable"
                              ? "Mark as applicable"
                              : "Mark as not applicable"
                          }
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                        {item.id.startsWith("custom_") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Add custom */}
      <Button variant="outline" size="sm" className="gap-2" onClick={addCustomItem}>
        <Plus className="h-4 w-4" />
        Add Custom Requirement
      </Button>

      <AiInsightPanel variant="success" title="What Happens Next">
        <p>
          When you continue, the client (or you on their behalf) can start uploading documents
          against this checklist. Each uploaded document will be linked to its requirement
          and tracked through to AI validation.
        </p>
      </AiInsightPanel>
    </div>
  );
}
