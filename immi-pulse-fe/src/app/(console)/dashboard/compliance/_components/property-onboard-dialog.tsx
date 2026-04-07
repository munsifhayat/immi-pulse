"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  complianceService,
  type ComplianceRuleOut,
} from "@/lib/api/compliance.service";
import {
  AUSTRALIAN_STATES,
  PROPERTY_TYPES,
  PROPERTY_AGE_RANGES,
  TYPE_LABELS,
  ACCENT,
} from "../_lib/constants";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Building2,
  Settings2,
  ClipboardCheck,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  FileCheck,
  Scale,
  AlertTriangle,
} from "lucide-react";

// ── Fallback rules for demo mode ───────────────────────────
const RULES_PREVIEW: Record<string, ComplianceRuleOut[]> = {
  QLD: [
    { compliance_type: "smoke_alarm", state: "QLD", required: true, frequency_months: 12, requires_certificate: true, penalty_range: "$2,669 per alarm", legislation_ref: "Fire and Emergency Services Act 1990", description: "Interconnected photoelectric smoke alarms required in all bedrooms and hallways since 1 Jan 2022." },
    { compliance_type: "electrical_safety", state: "QLD", required: true, frequency_months: 24, requires_certificate: true, penalty_range: "$1,000 - $10,000", legislation_ref: "Electrical Safety Act 2002", description: "Safety switch (RCD) testing required every 2 years for rental properties." },
    { compliance_type: "pool_barrier", state: "QLD", required: true, frequency_months: 12, requires_certificate: true, penalty_range: "$2,669 per offence", legislation_ref: "Building Act 1975 s.246B", description: "Pool safety certificate required before every new lease or renewal." },
    { compliance_type: "gas_safety", state: "QLD", required: false, frequency_months: 24, requires_certificate: false, penalty_range: "N/A", legislation_ref: "Best practice", description: "Not mandated in QLD but recommended every 2 years for gas appliances." },
    { compliance_type: "insurance", state: "QLD", required: true, frequency_months: 12, requires_certificate: false, penalty_range: "Full liability exposure", legislation_ref: "RTRA Act 2008", description: "Landlord insurance renewal tracking — coverage lapse voids protection." },
    { compliance_type: "minimum_standards", state: "QLD", required: true, frequency_months: undefined, requires_certificate: false, penalty_range: "$2,669+", legislation_ref: "RTRA Act 2008 s.185", description: "Locks, weatherproofing, ventilation, and structural standards." },
  ],
  NSW: [
    { compliance_type: "smoke_alarm", state: "NSW", required: true, frequency_months: 12, requires_certificate: false, penalty_range: "$550 - $2,200", legislation_ref: "EP&A Regulation 2021", description: "Working smoke alarms on every level. Landlord must replace before new tenancy." },
    { compliance_type: "electrical_safety", state: "NSW", required: true, frequency_months: 24, requires_certificate: true, penalty_range: "$1,100 - $11,000", legislation_ref: "Residential Tenancies Act 2010", description: "Mandatory electrical safety check every 2 years including RCD testing." },
    { compliance_type: "pool_barrier", state: "NSW", required: true, frequency_months: 36, requires_certificate: true, penalty_range: "$5,500 - $22,000", legislation_ref: "Swimming Pools Act 1992", description: "Pool barrier compliance certificate required — registered on NSW Swimming Pools Register." },
    { compliance_type: "gas_safety", state: "NSW", required: false, frequency_months: 24, requires_certificate: false, penalty_range: "N/A", legislation_ref: "Best practice", description: "Recommended 2-yearly gas safety check. Not yet mandated in NSW." },
    { compliance_type: "insurance", state: "NSW", required: true, frequency_months: 12, requires_certificate: false, penalty_range: "Full liability exposure", legislation_ref: "RT Act 2010", description: "Landlord insurance renewal tracking — coverage lapse voids protection." },
    { compliance_type: "minimum_standards", state: "NSW", required: true, frequency_months: undefined, requires_certificate: false, penalty_range: "$2,200+", legislation_ref: "RT Act 2010 s.52", description: "Premises must be reasonably clean, fit for habitation, in reasonable repair." },
  ],
  VIC: [
    { compliance_type: "smoke_alarm", state: "VIC", required: true, frequency_months: 12, requires_certificate: false, penalty_range: "$1,817", legislation_ref: "Building Regulations 2018", description: "Hardwired smoke alarms in all bedrooms and hallways. Annual check by landlord." },
    { compliance_type: "electrical_safety", state: "VIC", required: true, frequency_months: 24, requires_certificate: true, penalty_range: "$1,817 - $9,087", legislation_ref: "RT Act 1997 s.68", description: "Mandatory 2-yearly electrical safety check including RCD testing." },
    { compliance_type: "gas_safety", state: "VIC", required: true, frequency_months: 24, requires_certificate: true, penalty_range: "$1,817 - $9,087", legislation_ref: "Gas Safety Act 1997", description: "VIC is the only state mandating gas safety checks — every 2 years by licensed gasfitter." },
    { compliance_type: "insurance", state: "VIC", required: true, frequency_months: 12, requires_certificate: false, penalty_range: "Full liability exposure", legislation_ref: "RT Act 1997", description: "Landlord insurance renewal tracking." },
    { compliance_type: "minimum_standards", state: "VIC", required: true, frequency_months: undefined, requires_certificate: false, penalty_range: "$1,817+", legislation_ref: "RT Act 1997 s.68", description: "Minimum standards including locks, heating, ventilation, mould-free." },
  ],
};

const STEPS = [
  { label: "State", icon: MapPin },
  { label: "Details", icon: Building2 },
  { label: "Features", icon: Settings2 },
  { label: "Review", icon: ClipboardCheck },
  { label: "Done", icon: CheckCircle2 },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PropertyOnboardDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  // Form state
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [hasPool, setHasPool] = useState(false);
  const [hasGas, setHasGas] = useState(false);
  const [propertyAge, setPropertyAge] = useState("");
  const [mailbox, setMailbox] = useState("");

  // Success state
  const [onboardResult, setOnboardResult] = useState<{
    obligations_created: number;
    score: number;
  } | null>(null);

  // Preview query — only runs on step 4
  const previewQuery = useQuery({
    queryKey: [
      "compliance-rules-preview",
      state,
      hasPool,
      hasGas,
      propertyAge,
      propertyType,
    ],
    queryFn: () =>
      complianceService.previewObligations(
        state,
        hasPool,
        hasGas,
        propertyAge || "0-5",
        propertyType || "house"
      ),
    enabled: step === 3 && !!state,
    retry: false,
  });

  // Use API data or fallback to local rules
  const previewRules: ComplianceRuleOut[] =
    previewQuery.data ??
    (step === 3 && state ? RULES_PREVIEW[state] ?? [] : []);

  // Filter rules by property features
  const filteredRules = previewRules.filter((r) => {
    if (r.compliance_type === "pool_barrier" && !hasPool) return false;
    if (r.compliance_type === "gas_safety" && !hasGas && !r.required)
      return false;
    return true;
  });

  // Onboard mutation
  const onboardMutation = useMutation({
    mutationFn: () =>
      complianceService.onboardProperty({
        mailbox: mailbox || `${address.toLowerCase().replace(/[^a-z0-9]/g, "-")}@property.local`,
        state,
        has_pool: hasPool,
        has_gas: hasGas,
        property_age: propertyAge || "0-5",
        property_type: propertyType || "house",
        display_name: displayName || undefined,
        address: address || undefined,
      }),
    onSuccess: (data) => {
      setOnboardResult({
        obligations_created: data.obligations_created,
        score: data.score,
      });
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ["compliance-properties"] });
      queryClient.invalidateQueries({ queryKey: ["compliance-summary"] });
    },
  });

  const reset = useCallback(() => {
    setStep(0);
    setState("");
    setAddress("");
    setDisplayName("");
    setPropertyType("");
    setHasPool(false);
    setHasGas(false);
    setPropertyAge("");
    setMailbox("");
    setOnboardResult(null);
    onboardMutation.reset();
  }, [onboardMutation]);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const canNext = () => {
    switch (step) {
      case 0:
        return !!state;
      case 1:
        return true; // address/name are optional
      case 2:
        return true;
      case 3:
        return filteredRules.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 3) {
      // Confirm — trigger onboard
      onboardMutation.mutate();
      return;
    }
    if (step < 4) setStep(step + 1);
  };

  const stateLabel =
    AUSTRALIAN_STATES.find((s) => s.value === state)?.label ?? state;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-base">Add Property</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Tell us about your property and we&apos;ll set up compliance
            tracking automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 px-6 py-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                  i < step
                    ? "border-[oklch(0.65_0.15_180)] bg-[oklch(0.65_0.15_180)] text-white"
                    : i === step
                      ? "border-[oklch(0.65_0.15_180)] bg-[oklch(0.65_0.15_180)]/10 text-[oklch(0.65_0.15_180)]"
                      : "border-muted bg-muted/30 text-muted-foreground/40"
                )}
              >
                {i < step ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <s.icon className="h-3.5 w-3.5" />
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-8 mx-1 rounded-full transition-colors",
                    i < step ? "bg-[oklch(0.65_0.15_180)]" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step content */}
        <div className="px-6 py-5 min-h-[280px]">
          {/* Step 1: Select State */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Where is the property located?
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Compliance rules vary significantly between Australian states
                  and territories.
                </p>
              </div>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select state or territory" />
                </SelectTrigger>
                <SelectContent>
                  {AUSTRALIAN_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label} ({s.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 2: Property Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Property details
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Optional — helps identify the property in your portfolio.
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Property address
                  </label>
                  <Input
                    placeholder="e.g. 42 Ocean Crest Dr, Surfers Paradise"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Display name
                  </label>
                  <Input
                    placeholder="e.g. Ocean Crest Unit"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Mailbox (email)
                  </label>
                  <Input
                    placeholder="e.g. 42-oceancrest@pm.com.au"
                    value={mailbox}
                    onChange={(e) => setMailbox(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Property type
                  </label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Features */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Property features
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  These determine which compliance obligations apply.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
                  <div>
                    <p className="text-sm font-medium">Swimming pool</p>
                    <p className="text-xs text-muted-foreground">
                      Pool barrier inspection required in QLD, NSW, VIC, WA
                    </p>
                  </div>
                  <Switch checked={hasPool} onCheckedChange={setHasPool} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
                  <div>
                    <p className="text-sm font-medium">Gas appliances</p>
                    <p className="text-xs text-muted-foreground">
                      Gas safety check mandatory in VIC, recommended elsewhere
                    </p>
                  </div>
                  <Switch checked={hasGas} onCheckedChange={setHasGas} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Property age
                  </label>
                  <Select value={propertyAge} onValueChange={setPropertyAge}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select age range" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_AGE_RANGES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Compliance obligations preview
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredRules.length > 0 ? (
                    <>
                      <span className="font-semibold text-foreground">
                        {filteredRules.length} obligations
                      </span>{" "}
                      identified for your {stateLabel} property
                    </>
                  ) : previewQuery.isLoading ? (
                    "Loading rules..."
                  ) : (
                    "No obligations found for this configuration."
                  )}
                </p>
              </div>

              {previewQuery.isLoading && filteredRules.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[240px]">
                  <div className="space-y-2 pr-3">
                    {filteredRules.map((rule) => (
                      <div
                        key={rule.compliance_type}
                        className="rounded-lg border border-border/50 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-[12px] font-semibold text-foreground">
                              {TYPE_LABELS[rule.compliance_type] ??
                                rule.compliance_type}
                            </p>
                            {rule.requires_certificate && (
                              <Badge
                                variant="outline"
                                className="text-[9px] gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                              >
                                <FileCheck className="h-2.5 w-2.5" />
                                Certificate
                              </Badge>
                            )}
                          </div>
                          {rule.frequency_months && (
                            <span className="text-[10px] text-muted-foreground">
                              Every {rule.frequency_months}mo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {rule.description}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Scale className="h-2.5 w-2.5" />
                            {rule.legislation_ref}
                          </span>
                          {rule.penalty_range !== "N/A" && (
                            <span className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {rule.penalty_range}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {onboardMutation.isError && (
                <p className="text-xs text-destructive">
                  Failed to onboard property. The property has been previewed
                  but could not be saved — the backend may not be running.
                </p>
              )}
            </div>
          )}

          {/* Step 5: Success */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 mb-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="text-base font-semibold text-foreground">
                Property onboarded
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                {onboardResult ? (
                  <>
                    <span className="font-semibold text-foreground">
                      {onboardResult.obligations_created} obligations
                    </span>{" "}
                    created with an initial compliance score of{" "}
                    <span className="font-semibold text-foreground">
                      {onboardResult.score}%
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Your {stateLabel} property has been added. Compliance
                    obligations will be tracked automatically.
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-3 max-w-xs">
                As emails arrive for this property, the AI will automatically
                detect compliance signals and update obligation statuses.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-4">
          {step > 0 && step < 4 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(step - 1)}
              className="gap-1.5 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              size="sm"
              onClick={handleNext}
              disabled={!canNext() || onboardMutation.isPending}
              className={cn("gap-1.5 text-xs", ACCENT.bar, "hover:opacity-90 text-white")}
            >
              {onboardMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : step === 3 ? (
                "Confirm & Create"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => handleClose(false)}
              className="text-xs"
            >
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
