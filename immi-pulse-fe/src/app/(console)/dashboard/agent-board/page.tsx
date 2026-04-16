"use client";

import { useState } from "react";
import { Sparkles, Store, Users } from "lucide-react";
import { AgentBoard, type LegendEntry } from "@/components/agent-board/agent-board";
import { initialNodes, initialEdges } from "@/components/agent-board/board-data";
import {
  marketplaceNodes,
  marketplaceEdges,
} from "@/components/agent-board/marketplace-board-data";
import {
  communityNodes,
  communityEdges,
} from "@/components/agent-board/community-board-data";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

const INPULSE_LEGEND: LegendEntry[] = [
  { color: "#8b5cf6", label: "Unified pipeline (animated)" },
  {
    dashStyle:
      "repeating-linear-gradient(90deg, #94a3b8 0, #94a3b8 4px, transparent 4px, transparent 8px)",
    label: "Legacy fallback",
  },
  {
    dashStyle:
      "repeating-linear-gradient(90deg, #14b8a6 0, #14b8a6 3px, transparent 3px, transparent 6px)",
    label: "Scheduler trigger",
  },
  { color: "#10b981", label: "Database write" },
];

const MARKETPLACE_LEGEND: LegendEntry[] = [
  { color: "#8b5cf6", label: "Application pipeline (animated)" },
  {
    dashStyle:
      "repeating-linear-gradient(90deg, #f97316 0, #f97316 4px, transparent 4px, transparent 8px)",
    label: "Resubmission / edit loop",
  },
  {
    dashStyle:
      "repeating-linear-gradient(90deg, #14b8a6 0, #14b8a6 3px, transparent 3px, transparent 6px)",
    label: "Ranking rules",
  },
  {
    dashStyle:
      "repeating-linear-gradient(90deg, #0ea5e9 0, #0ea5e9 3px, transparent 3px, transparent 6px)",
    label: "Applicant search",
  },
  { color: "#10b981", label: "Database write" },
];

const COMMUNITY_LEGEND: LegendEntry[] = [
  { color: "#8b5cf6", label: "Primary flow (animated)" },
  {
    dashStyle:
      "repeating-linear-gradient(90deg, #f97316 0, #f97316 4px, transparent 4px, transparent 8px)",
    label: "Rate-limited / reported path",
  },
  {
    dashStyle:
      "repeating-linear-gradient(90deg, #14b8a6 0, #14b8a6 3px, transparent 3px, transparent 6px)",
    label: "Admin curation",
  },
  { color: "#10b981", label: "Database write" },
];

type BoardKey = "inpulse" | "marketplace" | "community";

const TAB_BLURBS: Record<BoardKey, string> = {
  inpulse:
    "How incoming email is parsed, classified, resolved, and turned into cases, visa classifications, and document reviews.",
  marketplace:
    "How OMARA-registered consultants apply, get reviewed, and reach visa applicants through the public directory.",
  community:
    "How visitors post anonymous threads, how the rate-limit shield prevents abuse, and how admins moderate reports.",
};

export default function AgentBoardPage() {
  const [activeTab, setActiveTab] = useState<BoardKey>("inpulse");

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as BoardKey)}
        className="flex h-full flex-col"
      >
        <div className="flex items-center justify-between gap-4 border-b bg-card/80 px-6 py-3 backdrop-blur-sm">
          <TabsList className="shrink-0">
            <TabsTrigger value="inpulse" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              InPulse
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="gap-1.5">
              <Store className="h-3.5 w-3.5" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="community" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Community
            </TabsTrigger>
          </TabsList>
          <p className="hidden text-xs text-muted-foreground leading-snug min-w-0 truncate md:block">
            {TAB_BLURBS[activeTab]}
          </p>
        </div>

        <TabsContent value="inpulse" className="m-0 flex-1 overflow-hidden">
          <AgentBoard
            nodes={initialNodes}
            edges={initialEdges}
            legend={INPULSE_LEGEND}
            legendTitle="InPulse Flow"
          />
        </TabsContent>

        <TabsContent value="marketplace" className="m-0 flex-1 overflow-hidden">
          <AgentBoard
            nodes={marketplaceNodes}
            edges={marketplaceEdges}
            legend={MARKETPLACE_LEGEND}
            legendTitle="Marketplace Flow"
          />
        </TabsContent>

        <TabsContent value="community" className="m-0 flex-1 overflow-hidden">
          <AgentBoard
            nodes={communityNodes}
            edges={communityEdges}
            legend={COMMUNITY_LEGEND}
            legendTitle="Community Flow"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
