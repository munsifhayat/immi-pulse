"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { JourneyStepper } from "./journey-stepper";
import { JourneyActionsBar } from "./journey-actions-bar";
import { InquiryStage } from "./stages/inquiry-stage";
import { ConsultationStage } from "./stages/consultation-stage";
import { VisaPathwayStage } from "./stages/visa-pathway-stage";
import { ChecklistStage } from "./stages/checklist-stage";
import { DocumentCollectionStage } from "./stages/document-collection-stage";
import { DocumentReviewStage } from "./stages/document-review-stage";
import { ApplicationPrepStage } from "./stages/application-prep-stage";
import { LodgementStage } from "./stages/lodgement-stage";
import { PostLodgementStage } from "./stages/post-lodgement-stage";
import { DecisionStage } from "./stages/decision-stage";
import type { Client } from "@/lib/types/immigration";
import type {
  WizardState,
  JourneyWizardContextType,
} from "@/lib/types/journey-wizard";
import { createInitialWizardState } from "@/lib/types/journey-wizard";

const STAGE_COMPONENTS = [
  InquiryStage,
  ConsultationStage,
  VisaPathwayStage,
  ChecklistStage,
  DocumentCollectionStage,
  DocumentReviewStage,
  ApplicationPrepStage,
  LodgementStage,
  PostLodgementStage,
  DecisionStage,
];

interface JourneyWizardShellProps {
  client: Client;
}

export function JourneyWizardShell({ client }: JourneyWizardShellProps) {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState(0);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [state, setState] = useState<WizardState>(createInitialWizardState);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const updateStageData = useCallback(
    <K extends keyof WizardState>(key: K, data: WizardState[K]) => {
      setState((prev) => ({ ...prev, [key]: data }));
    },
    []
  );

  const goToStage = useCallback(
    (stage: number) => {
      setDirection(stage > currentStage ? 1 : -1);
      setCurrentStage(stage);
    },
    [currentStage]
  );

  const completeCurrentStage = useCallback(() => {
    setCompletedStages((prev) =>
      prev.includes(currentStage) ? prev : [...prev, currentStage]
    );
  }, [currentStage]);

  const nextStage = useCallback(() => {
    completeCurrentStage();
    if (currentStage < STAGE_COMPONENTS.length - 1) {
      setDirection(1);
      setCurrentStage((prev) => prev + 1);
    }
  }, [currentStage, completeCurrentStage]);

  const prevStage = useCallback(() => {
    if (currentStage > 0) {
      setDirection(-1);
      setCurrentStage((prev) => prev - 1);
    }
  }, [currentStage]);

  // Determine if current stage can progress
  const canProgress = useMemo(() => {
    switch (currentStage) {
      case 0: // Inquiry — need a source
        return state.inquiry.source !== "";
      case 1: // Consultation — need at least occupation and goals
        return (
          state.consultation.currentOccupation !== "" &&
          state.consultation.clientGoals !== ""
        );
      case 2: // Visa Pathway — need selection
        return state.visaPathway.selectedVisa !== "";
      case 3: // Checklist — auto-generated
        return state.checklist.length > 0;
      case 4: // Document Collection — at least one doc
        return state.documents.length > 0;
      case 5: // Document Review — review triggered
        return state.documentReview.length > 0;
      case 6: // App Prep — all items checked
        return (
          state.applicationPrep.formCompleted &&
          state.applicationPrep.complianceChecked &&
          state.applicationPrep.consultantSignoff
        );
      case 7: // Lodgement — date and receipt
        return (
          state.lodgement.lodgementDate !== "" &&
          state.lodgement.receiptNumber !== ""
        );
      case 8: // Post-lodgement — always can progress
        return true;
      case 9: // Decision — need outcome
        return state.decision.outcome !== "";
      default:
        return true;
    }
  }, [currentStage, state]);

  const wizardContext: JourneyWizardContextType = {
    client,
    state,
    currentStage,
    completedStages,
    updateStageData,
    goToStage,
    nextStage,
    prevStage,
    completeCurrentStage,
    canProgress,
  };

  const StageComponent = STAGE_COMPONENTS[currentStage];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-3">
          {/* Client info bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.push(`/dashboard/clients/${client.id}`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {client.first_name.charAt(0)}
                  {client.last_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold leading-tight">
                  {client.first_name} {client.last_name}
                </p>
                <p className="text-xs text-muted-foreground">New Journey</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              Draft
            </Badge>
          </div>

          {/* Stepper */}
          <JourneyStepper
            currentStage={currentStage}
            completedStages={completedStages}
            onStageClick={goToStage}
          />
        </div>
      </div>

      {/* Stage content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStage}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <StageComponent wizardContext={wizardContext} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom actions */}
      <JourneyActionsBar
        currentStage={currentStage}
        canProgress={canProgress}
        onBack={prevStage}
        onNext={nextStage}
      />
    </div>
  );
}
