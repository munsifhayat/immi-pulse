"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  complianceService,
  type ComplianceObligation,
} from "@/lib/api/compliance.service";
import { TYPE_LABELS } from "../_lib/constants";
import { ObligationStatusIcon, daysUntil } from "../_lib/helpers";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ── Date helpers ───────────────────────────────────────────
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0=Sun, adjust to Mon=0
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// ── Color for dot based on obligation ──────────────────────
function getDotColor(obligation: ComplianceObligation): string {
  const days = obligation.next_due ? daysUntil(obligation.next_due) : null;
  if (
    obligation.status === "non_compliant" ||
    obligation.status === "expired" ||
    (days !== null && days < 0)
  ) {
    return "bg-red-500";
  }
  if (days !== null && days <= 7) {
    return "bg-amber-500";
  }
  if (obligation.status === "compliant") {
    return "bg-emerald-500";
  }
  return "bg-[oklch(0.65_0.15_180)]"; // teal for scheduled/other
}

interface Props {
  fallbackObligations?: ComplianceObligation[];
}

export function ComplianceCalendar({ fallbackObligations }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const { data: apiObligations } = useQuery({
    queryKey: ["compliance-obligations-all"],
    queryFn: () => complianceService.getObligations({ limit: 200 }),
    retry: false,
  });

  const obligations = apiObligations ?? fallbackObligations ?? [];

  // Group obligations by date string (YYYY-MM-DD)
  const obligationsByDate = useMemo(() => {
    const map: Record<string, ComplianceObligation[]> = {};
    obligations.forEach((ob) => {
      if (!ob.next_due) return;
      const dateKey = ob.next_due.slice(0, 10);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(ob);
    });
    return map;
  }, [obligations]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Build calendar grid cells
  const cells: Array<{ day: number | null; dateKey: string | null }> = [];
  // Leading empty cells
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, dateKey: null });
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateKey });
  }

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Compliance Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isCurrentMonth && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="h-7 px-2 text-[11px]"
              >
                Today
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={prevMonth}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextMonth}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            Overdue / Expired
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            Expiring (7d)
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-[oklch(0.65_0.15_180)]" />
            Scheduled
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            Compliant
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-medium text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px">
          {cells.map((cell, i) => {
            if (cell.day === null) {
              return <div key={`empty-${i}`} className="h-16" />;
            }

            const dateObligations = cell.dateKey
              ? obligationsByDate[cell.dateKey] ?? []
              : [];
            const isToday = isSameDay(
              new Date(viewYear, viewMonth, cell.day),
              today
            );

            const dayContent = (
              <div
                className={cn(
                  "relative h-16 rounded-md border border-transparent p-1 transition-colors",
                  isToday
                    ? "border-[oklch(0.65_0.15_180)]/40 bg-[oklch(0.65_0.15_180)]/5"
                    : "hover:bg-muted/30",
                  dateObligations.length > 0 && "cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    isToday
                      ? "text-[oklch(0.65_0.15_180)] font-bold"
                      : "text-foreground"
                  )}
                >
                  {cell.day}
                </span>
                {dateObligations.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {dateObligations.slice(0, 4).map((ob) => (
                      <div
                        key={ob.id}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          getDotColor(ob)
                        )}
                      />
                    ))}
                    {dateObligations.length > 4 && (
                      <span className="text-[8px] text-muted-foreground ml-0.5">
                        +{dateObligations.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );

            if (dateObligations.length === 0) {
              return <div key={cell.dateKey}>{dayContent}</div>;
            }

            return (
              <Popover key={cell.dateKey}>
                <PopoverTrigger asChild>{dayContent}</PopoverTrigger>
                <PopoverContent
                  className="w-72 p-3"
                  align="start"
                  side="bottom"
                >
                  <p className="text-xs font-semibold text-foreground mb-2">
                    {cell.day} {MONTH_NAMES[viewMonth]} {viewYear}
                  </p>
                  <div className="space-y-2">
                    {dateObligations.map((ob) => (
                      <div
                        key={ob.id}
                        className="flex items-center gap-2 rounded-md border border-border/40 p-2"
                      >
                        <ObligationStatusIcon status={ob.status} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-foreground truncate">
                            {TYPE_LABELS[ob.compliance_type] ||
                              ob.compliance_type}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {ob.mailbox}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] capitalize",
                            ob.status === "compliant"
                              ? "text-emerald-600"
                              : ob.status === "non_compliant" ||
                                  ob.status === "expired"
                                ? "text-red-600"
                                : "text-amber-600"
                          )}
                        >
                          {ob.status.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
