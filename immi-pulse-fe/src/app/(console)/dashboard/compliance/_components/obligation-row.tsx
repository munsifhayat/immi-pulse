"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  complianceService,
  type ComplianceObligation,
} from "@/lib/api/compliance.service";
import { TYPE_LABELS, STATUS_COLORS } from "../_lib/constants";
import { ObligationStatusIcon, daysUntil } from "../_lib/helpers";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  CalendarClock,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";

interface Props {
  obligations: ComplianceObligation[];
  onUpdate: () => void;
}

export function ObligationRow({ obligations, onUpdate }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"complete" | "schedule" | null>(
    null
  );

  // Form state
  const [certRef, setCertRef] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [notes, setNotes] = useState("");

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      complianceService.completeObligation(id, {
        certificate_reference: certRef || undefined,
        next_due: nextDue || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      resetForm();
      onUpdate();
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (id: string) =>
      complianceService.scheduleObligation(id, {
        next_due: nextDue,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      resetForm();
      onUpdate();
    },
  });

  const resetForm = () => {
    setExpandedId(null);
    setActionType(null);
    setCertRef("");
    setNextDue("");
    setNotes("");
  };

  const toggleExpand = (id: string, type: "complete" | "schedule") => {
    if (expandedId === id && actionType === type) {
      resetForm();
    } else {
      setExpandedId(id);
      setActionType(type);
      setCertRef("");
      setNextDue("");
      setNotes("");
    }
  };

  return (
    <div className="space-y-1.5 py-2">
      {obligations.map((ob) => {
        const days = ob.next_due ? daysUntil(ob.next_due) : null;
        const isExpanded = expandedId === ob.id;

        return (
          <div key={ob.id} className="rounded-lg border border-border/40 bg-card/30 transition-colors hover:bg-card/50">
            <div className="flex items-center gap-3 px-4 py-3">
              <ObligationStatusIcon status={ob.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-medium text-foreground">
                    {TYPE_LABELS[ob.compliance_type] || ob.compliance_type}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] capitalize",
                      STATUS_COLORS[ob.status] || ""
                    )}
                  >
                    {ob.status.replace("_", " ")}
                  </Badge>
                </div>
                {ob.certificate_reference && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <FileText className="h-2.5 w-2.5" />
                    {ob.certificate_reference}
                  </p>
                )}
              </div>

              {days !== null && (
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-[10px]",
                    days <= 0
                      ? "border-red-200/60 bg-red-50/50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                      : days <= 7
                        ? "border-amber-200/60 bg-amber-50/50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400"
                        : ""
                  )}
                >
                  {days <= 0 ? "Overdue" : `${days}d`}
                </Badge>
              )}

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                  onClick={() => toggleExpand(ob.id, "complete")}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Complete
                  {isExpanded && actionType === "complete" ? (
                    <ChevronUp className="h-3 w-3 ml-0.5" />
                  ) : (
                    <ChevronDown className="h-3 w-3 ml-0.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                  onClick={() => toggleExpand(ob.id, "schedule")}
                >
                  <CalendarClock className="h-3 w-3 mr-1" />
                  Schedule
                  {isExpanded && actionType === "schedule" ? (
                    <ChevronUp className="h-3 w-3 ml-0.5" />
                  ) : (
                    <ChevronDown className="h-3 w-3 ml-0.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Inline form */}
            {isExpanded && (
              <div className="border-t border-border/30 px-4 py-3 bg-muted/10">
                <div className="space-y-2">
                  {actionType === "complete" && (
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                        Certificate reference
                      </label>
                      <Input
                        placeholder="e.g. SA-2026-1234"
                        value={certRef}
                        onChange={(e) => setCertRef(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                      Next due date
                    </label>
                    <Input
                      type="date"
                      value={nextDue}
                      onChange={(e) => setNextDue(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                      Notes
                    </label>
                    <Input
                      placeholder="Optional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-7 px-3 text-[11px]"
                      disabled={
                        (actionType === "schedule" && !nextDue) ||
                        completeMutation.isPending ||
                        scheduleMutation.isPending
                      }
                      onClick={() => {
                        if (actionType === "complete") {
                          completeMutation.mutate(ob.id);
                        } else {
                          scheduleMutation.mutate(ob.id);
                        }
                      }}
                    >
                      {completeMutation.isPending ||
                      scheduleMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-3 text-[11px]"
                      onClick={resetForm}
                    >
                      Cancel
                    </Button>
                    {(completeMutation.isError || scheduleMutation.isError) && (
                      <span className="text-[10px] text-destructive">
                        Failed to save — backend may not be running.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
