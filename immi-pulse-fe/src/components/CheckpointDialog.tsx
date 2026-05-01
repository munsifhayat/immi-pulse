"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { checkpointsApi, type Checkpoint } from "@/lib/api/services";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId?: string;
  preCaseId?: string;
  onCreated?: (cp: Checkpoint) => void;
}

export function CheckpointDialog({ open, onOpenChange, caseId, preCaseId, onCreated }: Props) {
  const [type, setType] = useState("consultation_fee");
  const [title, setTitle] = useState("Initial consultation");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("500");
  const [blocking, setBlocking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const cp = await checkpointsApi.create({
        case_id: caseId,
        pre_case_id: preCaseId,
        type,
        title,
        description: description || undefined,
        amount_aud: amount,
        blocking,
      });
      const sent = await checkpointsApi.send(cp.id);
      onCreated?.(sent);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to create checkpoint";
      setError(typeof detail === "string" ? detail : "Failed to create checkpoint");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a payment checkpoint</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consultation_fee">Consultation fee</SelectItem>
                <SelectItem value="retainer">Retainer / deposit</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
                <SelectItem value="lodgement_fee">Lodgement fee</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cp-title">Title</Label>
            <Input id="cp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cp-amount">Amount (AUD)</Label>
            <Input
              id="cp-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cp-desc">Notes (optional)</Label>
            <Textarea
              id="cp-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={blocking} onCheckedChange={setBlocking} id="cp-block" />
            <Label htmlFor="cp-block" className="cursor-pointer">
              Block next stage until paid
            </Label>
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <p>
              <span className="font-medium">Note:</span> Stripe Connect is deferred — for the
              pilot, &quot;send&quot; creates a mock payment link. You can mark the checkpoint paid
              manually after the client confirms payment.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !title.trim()}>
            {busy ? "Creating…" : "Create & send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
