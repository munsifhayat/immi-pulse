"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageHeader } from "@/components/journey/shared/stage-header";
import { AiInsightPanel } from "@/components/journey/shared/ai-insight-panel";
import type { StageProps, ConsultationData } from "@/lib/types/journey-wizard";

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function ConsultationStage({ wizardContext }: StageProps) {
  const { state, updateStageData, client } = wizardContext;
  const data = state.consultation;

  const update = <K extends keyof ConsultationData>(key: K, value: ConsultationData[K]) => {
    updateStageData("consultation", { ...data, [key]: value });
  };

  return (
    <div className="space-y-6">
      <StageHeader
        stageIndex={1}
        subtitle="Capture the client's background, qualifications, and immigration goals"
      />

      {/* Personal Background */}
      <FieldGroup title="Personal Background">
        <FormRow>
          <Field label="Date of Birth" id="dob">
            <Input
              id="dob"
              type="date"
              value={data.dateOfBirth || client.date_of_birth?.split("T")[0] || ""}
              onChange={(e) => update("dateOfBirth", e.target.value)}
            />
          </Field>
          <Field label="Country of Birth" id="cob">
            <Input
              id="cob"
              placeholder="e.g. India"
              value={data.countryOfBirth}
              onChange={(e) => update("countryOfBirth", e.target.value)}
            />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Current Location" id="location">
            <Input
              id="location"
              placeholder="e.g. Sydney, Australia"
              value={data.currentLocation}
              onChange={(e) => update("currentLocation", e.target.value)}
            />
          </Field>
          <Field label="Marital Status" id="marital">
            <Select
              value={data.maritalStatus || undefined}
              onValueChange={(v) => update("maritalStatus", v as ConsultationData["maritalStatus"])}
            >
              <SelectTrigger id="marital">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="de_facto">De Facto</SelectItem>
                <SelectItem value="divorced">Divorced</SelectItem>
                <SelectItem value="widowed">Widowed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FormRow>
        <Field label="Number of Dependents" id="dependents">
          <Input
            id="dependents"
            type="number"
            min={0}
            className="w-32"
            value={data.dependents}
            onChange={(e) => update("dependents", parseInt(e.target.value) || 0)}
          />
        </Field>
      </FieldGroup>

      {/* Education */}
      <FieldGroup title="Education">
        <FormRow>
          <Field label="Highest Qualification" id="qualification">
            <Select
              value={data.highestQualification || undefined}
              onValueChange={(v) => update("highestQualification", v)}
            >
              <SelectTrigger id="qualification">
                <SelectValue placeholder="Select qualification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phd">PhD / Doctorate</SelectItem>
                <SelectItem value="masters">Master&apos;s Degree</SelectItem>
                <SelectItem value="bachelors">Bachelor&apos;s Degree</SelectItem>
                <SelectItem value="diploma">Diploma / Advanced Diploma</SelectItem>
                <SelectItem value="certificate">Certificate III/IV</SelectItem>
                <SelectItem value="trade">Trade Qualification</SelectItem>
                <SelectItem value="high_school">High School / Year 12</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Field of Study" id="field">
            <Input
              id="field"
              placeholder="e.g. Computer Science"
              value={data.fieldOfStudy}
              onChange={(e) => update("fieldOfStudy", e.target.value)}
            />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Institution" id="institution">
            <Input
              id="institution"
              placeholder="e.g. University of Delhi"
              value={data.institution}
              onChange={(e) => update("institution", e.target.value)}
            />
          </Field>
          <Field label="Completion Year" id="completionYear">
            <Input
              id="completionYear"
              placeholder="e.g. 2019"
              value={data.completionYear}
              onChange={(e) => update("completionYear", e.target.value)}
            />
          </Field>
        </FormRow>
      </FieldGroup>

      {/* Work Experience */}
      <FieldGroup title="Work Experience">
        <FormRow>
          <Field label="Current Occupation" id="occupation">
            <Input
              id="occupation"
              placeholder="e.g. Software Engineer"
              value={data.currentOccupation}
              onChange={(e) => update("currentOccupation", e.target.value)}
            />
          </Field>
          <Field label="Years of Experience" id="experience">
            <Input
              id="experience"
              placeholder="e.g. 5"
              value={data.yearsExperience}
              onChange={(e) => update("yearsExperience", e.target.value)}
            />
          </Field>
        </FormRow>
        <Field label="Current/Recent Employer" id="employer">
          <Input
            id="employer"
            placeholder="e.g. Infosys Ltd"
            value={data.employer}
            onChange={(e) => update("employer", e.target.value)}
          />
        </Field>
        <div className="flex items-center gap-2">
          <Checkbox
            id="skillsAssessment"
            checked={data.skillsAssessment}
            onCheckedChange={(v) => update("skillsAssessment", v === true)}
          />
          <Label htmlFor="skillsAssessment" className="text-sm cursor-pointer">
            Client already has a skills assessment
          </Label>
        </div>
      </FieldGroup>

      {/* English Proficiency */}
      <FieldGroup title="English Proficiency">
        <FormRow>
          <Field label="Test Type" id="englishTest">
            <Select
              value={data.englishTestType || undefined}
              onValueChange={(v) => update("englishTestType", v as ConsultationData["englishTestType"])}
            >
              <SelectTrigger id="englishTest">
                <SelectValue placeholder="Select test" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ielts">IELTS</SelectItem>
                <SelectItem value="pte">PTE Academic</SelectItem>
                <SelectItem value="toefl">TOEFL iBT</SelectItem>
                <SelectItem value="cambridge">Cambridge</SelectItem>
                <SelectItem value="oet">OET</SelectItem>
                <SelectItem value="none">No test taken</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Overall Score" id="englishScore">
            <Input
              id="englishScore"
              placeholder="e.g. 7.0"
              value={data.englishScore}
              onChange={(e) => update("englishScore", e.target.value)}
            />
          </Field>
        </FormRow>
      </FieldGroup>

      {/* Immigration History */}
      <FieldGroup title="Immigration History">
        <Field label="Previous Australian Visas" id="previousVisas">
          <Input
            id="previousVisas"
            placeholder="e.g. Student Visa (500), 2017-2020"
            value={data.previousVisas}
            onChange={(e) => update("previousVisas", e.target.value)}
          />
        </Field>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="visaRefusals"
              checked={data.visaRefusals}
              onCheckedChange={(v) => update("visaRefusals", v === true)}
            />
            <Label htmlFor="visaRefusals" className="text-sm cursor-pointer">
              Previous visa refusals or cancellations
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="healthIssues"
              checked={data.healthIssues}
              onCheckedChange={(v) => update("healthIssues", v === true)}
            />
            <Label htmlFor="healthIssues" className="text-sm cursor-pointer">
              Known health issues that may affect visa eligibility
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="characterIssues"
              checked={data.characterIssues}
              onCheckedChange={(v) => update("characterIssues", v === true)}
            />
            <Label htmlFor="characterIssues" className="text-sm cursor-pointer">
              Character concerns (criminal history, overstays, etc.)
            </Label>
          </div>
        </div>
        {(data.visaRefusals || data.healthIssues || data.characterIssues) && (
          <AiInsightPanel variant="warning" title="Heads Up">
            <p>
              Flagged items may affect visa eligibility. Make sure to capture full details
              in the consultation notes below — these will be reviewed during application preparation.
            </p>
          </AiInsightPanel>
        )}
      </FieldGroup>

      {/* Goals & Preferences */}
      <FieldGroup title="Client Goals & Preferences">
        <Field label="Immigration Goals" id="goals">
          <Textarea
            id="goals"
            placeholder="What does the client want to achieve? Permanent residency? Work rights? Study? Family reunion?"
            rows={3}
            value={data.clientGoals}
            onChange={(e) => update("clientGoals", e.target.value)}
          />
        </Field>
        <FormRow>
          <Field label="Preferred Timeline" id="timeline">
            <Input
              id="timeline"
              placeholder="e.g. Within 6 months"
              value={data.preferredTimeline}
              onChange={(e) => update("preferredTimeline", e.target.value)}
            />
          </Field>
          <Field label="Budget (AUD)" id="budget">
            <Input
              id="budget"
              placeholder="e.g. $5,000 - $10,000"
              value={data.budget}
              onChange={(e) => update("budget", e.target.value)}
            />
          </Field>
        </FormRow>
      </FieldGroup>

      {/* Consultation Notes */}
      <FieldGroup title="Consultation Notes">
        <Field label="Consultation Date" id="consultDate">
          <Input
            id="consultDate"
            type="date"
            className="w-48"
            value={data.consultationDate}
            onChange={(e) => update("consultationDate", e.target.value)}
          />
        </Field>
        <Field label="Notes" id="consultNotes">
          <Textarea
            id="consultNotes"
            placeholder="Detailed consultation notes — key discussion points, observations, recommendations discussed with the client..."
            rows={5}
            value={data.consultationNotes}
            onChange={(e) => update("consultationNotes", e.target.value)}
          />
        </Field>
      </FieldGroup>

      {/* AI summary */}
      <AiInsightPanel variant="success" title="Ready for AI Assessment">
        <p>
          Once you save and continue, our AI will analyze this profile and recommend
          the best visa pathways for {wizardContext.client.first_name}. The more detail
          you provide here, the more accurate the recommendations will be.
        </p>
      </AiInsightPanel>
    </div>
  );
}
