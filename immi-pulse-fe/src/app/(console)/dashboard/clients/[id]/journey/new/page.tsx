"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { clientsService } from "@/lib/api/clients.service";
import { JourneyWizardShell } from "@/components/journey/journey-wizard-shell";
import type { Client } from "@/lib/types/immigration";

export default function NewJourneyPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    clientsService.getClient(clientId).then(setClient);
  }, [clientId]);

  if (!client) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading client...</p>
        </div>
      </div>
    );
  }

  return <JourneyWizardShell client={client} />;
}
