"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { complianceService } from "@/lib/api/compliance.service";
import { configService } from "@/lib/api/config.service";
import {
  ShieldCheck,
  Lightbulb,
  Info,
  Plus,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Local modules
import {
  ACCENT,
  statCards,
  chartConfig,
  TYPE_LABELS,
  URGENCY_COLORS,
  STATUS_COLORS,
} from "./_lib/constants";
import {
  formatRelativeTime,
  daysUntil,
  getScoreColor,
  getScoreBarColor,
  ObligationStatusIcon,
} from "./_lib/helpers";
import {
  MOCK_SUMMARY,
  MOCK_PROPERTIES,
  MOCK_DETECTIONS,
  MOCK_OBLIGATIONS_UPCOMING,
} from "./_lib/mock-data";
import { PropertyOnboardDialog } from "./_components/property-onboard-dialog";
import { ObligationRow } from "./_components/obligation-row";
import { HowItWorks } from "./_components/how-it-works";
import { ComplianceCalendar } from "./_components/compliance-calendar";

const PROPERTY_COLS = [
  "smoke_alarm",
  "electrical_safety",
  "pool_barrier",
  "gas_safety",
  "insurance",
] as const;

// ── Page ───────────────────────────────────────────────────
export default function CompliancePage() {
  const queryClient = useQueryClient();
  const [selectedMailbox, setSelectedMailbox] = useState<string>("all");
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const mailboxParam = selectedMailbox === "all" ? undefined : selectedMailbox;

  // Try real data first, fall back to mock
  const { data: realSummary } = useQuery({
    queryKey: ["compliance-summary"],
    queryFn: () => complianceService.getSummary(),
    retry: false,
  });
  const { data: realProperties } = useQuery({
    queryKey: ["compliance-properties"],
    queryFn: () => complianceService.getProperties(),
    retry: false,
  });
  const { data: realDetections } = useQuery({
    queryKey: ["compliance-detections-recent", mailboxParam],
    queryFn: () =>
      complianceService.getDetections({ mailbox: mailboxParam, limit: 10 }),
    retry: false,
  });
  const { data: realObligations } = useQuery({
    queryKey: ["compliance-obligations-upcoming"],
    queryFn: () =>
      complianceService.getObligations({ status: "expiring", limit: 10 }),
    retry: false,
  });
  const { data: mailboxes } = useQuery({
    queryKey: ["active-mailboxes"],
    queryFn: () => configService.getActiveMailboxes(),
  });

  // Use real data if available, else mock
  const hasRealData = realSummary && realSummary.total_properties > 0;
  const summary = hasRealData ? realSummary : MOCK_SUMMARY;
  const properties = hasRealData ? realProperties! : MOCK_PROPERTIES;
  const detections = hasRealData ? realDetections! : MOCK_DETECTIONS;
  const obligations = hasRealData
    ? realObligations!
    : MOCK_OBLIGATIONS_UPCOMING;
  const isDemo = !hasRealData;

  // All obligations for calendar fallback
  const allObligations = useMemo(() => {
    return properties.flatMap((p) => p.obligations);
  }, [properties]);

  // Stat values
  const getStatValue = (key: string) => {
    switch (key) {
      case "score":
        return {
          value: `${summary.portfolio_score.toFixed(0)}%`,
          description: `${summary.total_properties} properties tracked`,
        };
      case "atRisk":
        return {
          value: summary.properties_at_risk,
          description: "Non-compliant or score below 70%",
        };
      case "deadlines":
        return {
          value: summary.upcoming_deadlines,
          description: "Due within 30 days",
        };
      case "detections":
        return {
          value: summary.detections_this_week,
          description: "Compliance emails detected",
        };
      default:
        return { value: "--", description: "" };
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    if (!summary?.by_type_status) return [];
    return Object.entries(summary.by_type_status)
      .map(([type, statuses]) => ({
        type: TYPE_LABELS[type] || type,
        compliant: statuses["compliant"] || 0,
        non_compliant:
          (statuses["non_compliant"] || 0) + (statuses["expired"] || 0),
        expiring: statuses["expiring"] || 0,
        unknown: statuses["unknown"] || 0,
      }))
      .sort(
        (a, b) =>
          b.non_compliant + b.expiring - (a.non_compliant + a.expiring)
      );
  }, [summary]);

  const togglePropertyExpand = (mailbox: string) => {
    setExpandedProperty(expandedProperty === mailbox ? null : mailbox);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Compliance Shield
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time compliance tracking across your portfolio
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDemo && (
            <Badge
              variant="outline"
              className="gap-1.5 border-amber-200/60 bg-amber-50/50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400"
            >
              <Lightbulb className="h-3 w-3" />
              Demo Data
            </Badge>
          )}
          <Button
            size="sm"
            onClick={() => setOnboardOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Property
          </Button>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedMailbox} onValueChange={setSelectedMailbox}>
              <SelectTrigger className="w-[220px] h-9 text-[13px]">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {mailboxes?.map((mb) => (
                  <SelectItem key={mb.id} value={mb.email}>
                    {mb.display_name || mb.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="dashboard" className="text-[13px]">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-[13px]">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="how-it-works" className="text-[13px]">
            <Info className="mr-1.5 h-3.5 w-3.5" />
            How It Works
          </TabsTrigger>
        </TabsList>

        {/* ── Dashboard Tab ─────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* Stats Cards — matching dashboard pattern */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => {
              const { value, description } = getStatValue(card.key);
              return (
                <div
                  key={card.key}
                  className="group relative rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-[13px] font-medium text-muted-foreground">
                      {card.title}
                    </p>
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset",
                        card.accentBg,
                        card.ringColor
                      )}
                    >
                      <card.icon
                        className={cn("h-4.5 w-4.5", card.accentColor)}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-bold tracking-tight text-foreground">
                      {value}
                    </p>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Chart + Deadlines */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Compliance by Category
                </CardTitle>
                <CardDescription className="text-xs">
                  Status breakdown across compliance types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={chartConfig}
                  className="h-[280px] w-full"
                >
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid
                      horizontal={false}
                      strokeDasharray="3 3"
                      className="stroke-border/40"
                    />
                    <YAxis
                      dataKey="type"
                      type="category"
                      width={100}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="compliant"
                      stackId="a"
                      fill="oklch(0.62 0.14 175)"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="expiring"
                      stackId="a"
                      fill="oklch(0.72 0.12 75)"
                    />
                    <Bar
                      dataKey="non_compliant"
                      stackId="a"
                      fill="oklch(0.70 0.12 25)"
                    />
                    <Bar
                      dataKey="unknown"
                      stackId="a"
                      fill="oklch(0.55 0.02 250)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Upcoming Deadlines
                </CardTitle>
                <CardDescription className="text-xs">
                  Obligations due within 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {obligations.map((ob) => {
                    const days = ob.next_due ? daysUntil(ob.next_due) : null;
                    return (
                      <div
                        key={ob.id}
                        className="flex items-start gap-3 rounded-lg border border-border/40 p-3 transition-colors hover:bg-muted/30"
                      >
                        <ObligationStatusIcon status={ob.status} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-foreground truncate">
                            {TYPE_LABELS[ob.compliance_type] ||
                              ob.compliance_type}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {ob.mailbox}
                          </p>
                        </div>
                        {days !== null && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 text-[10px] font-medium",
                              days <= 7
                                ? "border-red-200/60 bg-red-50/50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                                : days <= 14
                                  ? "border-amber-200/60 bg-amber-50/50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400"
                                  : ""
                            )}
                          >
                            {days <= 0 ? "Overdue" : `${days}d`}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Properties Table */}
          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold tracking-tight">
                Property Compliance Scores
              </CardTitle>
              <CardDescription className="text-xs">
                Click a property to view and manage its obligations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] w-[30px]" />
                    <TableHead className="text-[11px]">Property</TableHead>
                    <TableHead className="text-[11px] w-[120px]">
                      Score
                    </TableHead>
                    {PROPERTY_COLS.map((col) => (
                      <TableHead
                        key={col}
                        className="text-[11px] text-center w-[80px]"
                      >
                        {TYPE_LABELS[col]?.split(" ")[0] || col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((prop) => {
                    const obByType: Record<string, string> = {};
                    prop.obligations.forEach((ob) => {
                      obByType[ob.compliance_type] = ob.status;
                    });
                    const isExpanded = expandedProperty === prop.mailbox;

                    return (
                      <TableRow key={prop.mailbox} className="group">
                        <TableCell
                          className="p-0"
                          colSpan={2 + PROPERTY_COLS.length + 1}
                        >
                          <div>
                            {/* Main row */}
                            <div
                              className="flex items-center cursor-pointer hover:bg-muted/30 transition-colors rounded-md"
                              onClick={() =>
                                togglePropertyExpand(prop.mailbox)
                              }
                            >
                              <div className="w-[30px] flex items-center justify-center px-2 py-3">
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 text-[12px] font-medium max-w-[220px] truncate py-3">
                                {prop.display_name || prop.mailbox}
                              </div>
                              <div className="w-[120px] py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-16 rounded-full bg-muted/60 overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        getScoreBarColor(prop.score)
                                      )}
                                      style={{ width: `${prop.score}%` }}
                                    />
                                  </div>
                                  <span
                                    className={cn(
                                      "text-[12px] font-semibold",
                                      getScoreColor(prop.score)
                                    )}
                                  >
                                    {prop.score}%
                                  </span>
                                </div>
                              </div>
                              {PROPERTY_COLS.map((col) => (
                                <div
                                  key={col}
                                  className="w-[80px] text-center py-3"
                                >
                                  <ObligationStatusIcon
                                    status={obByType[col] || "unknown"}
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Expanded obligations */}
                            {isExpanded && (
                              <div className="border-t border-border/30 bg-muted/5 px-4 pb-3">
                                <ObligationRow
                                  obligations={prop.obligations}
                                  onUpdate={() => {
                                    queryClient.invalidateQueries({
                                      queryKey: ["compliance-properties"],
                                    });
                                    queryClient.invalidateQueries({
                                      queryKey: ["compliance-summary"],
                                    });
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Detections */}
          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold tracking-tight">
                Recent Compliance Detections
              </CardTitle>
              <CardDescription className="text-xs">
                Latest compliance signals detected from incoming emails
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="divide-y divide-border/40">
                {detections.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/30"
                  >
                    <ShieldCheck
                      className={cn("h-4 w-4 shrink-0", ACCENT.text)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                            ACCENT.badge
                          )}
                        >
                          {TYPE_LABELS[d.compliance_type] || d.compliance_type}
                        </span>
                        {d.jurisdiction && d.jurisdiction !== "unknown" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-border/60"
                          >
                            {d.jurisdiction}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            URGENCY_COLORS[d.urgency] || ""
                          )}
                        >
                          {d.urgency}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-[13px] font-medium text-foreground">
                        {d.subject}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {d.from_email}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={cn(
                          "text-[11px] font-medium",
                          STATUS_COLORS[d.status] || ""
                        )}
                      >
                        {d.status.replace("_", " ")}
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(d.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Calendar Tab ──────────────────────────── */}
        <TabsContent value="calendar" className="mt-4">
          <ComplianceCalendar fallbackObligations={allObligations} />
        </TabsContent>

        {/* ── How It Works Tab ──────────────────────── */}
        <TabsContent value="how-it-works" className="space-y-6 mt-4">
          <HowItWorks />
        </TabsContent>
      </Tabs>

      {/* Onboard dialog */}
      <PropertyOnboardDialog
        open={onboardOpen}
        onOpenChange={setOnboardOpen}
      />
    </div>
  );
}
