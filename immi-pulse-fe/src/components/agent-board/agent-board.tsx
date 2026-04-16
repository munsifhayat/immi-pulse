"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";

import type { AgentMetadata } from "./board-data";
import { DetailPanel } from "./detail-panel";

import EmailInputNode from "./nodes/email-input-node";
import UnifiedClassifierNode from "./nodes/unified-classifier-node";
import ConflictResolverNode from "./nodes/conflict-resolver-node";
import AgentNode from "./nodes/agent-node";
import DatabaseNode from "./nodes/database-node";
import SchedulerNode from "./nodes/scheduler-node";
import SharedServicesNode from "./nodes/shared-services-node";

// Defined outside component to avoid re-renders (React Flow best practice)
const nodeTypes: NodeTypes = {
  emailInput: EmailInputNode,
  unifiedClassifier: UnifiedClassifierNode,
  conflictResolver: ConflictResolverNode,
  agentNode: AgentNode,
  database: DatabaseNode,
  scheduler: SchedulerNode,
  sharedServices: SharedServicesNode,
};

const miniMapNodeColor = (node: { data: Record<string, unknown> }) => {
  const colorMap: Record<string, string> = {
    sky: "#38bdf8",
    violet: "#8b5cf6",
    orange: "#f97316",
    blue: "#3b82f6",
    red: "#ef4444",
    amber: "#f59e0b",
    teal: "#14b8a6",
    emerald: "#10b981",
    pink: "#ec4899",
    indigo: "#6366f1",
    gray: "#9ca3af",
  };
  const color = (node.data as Record<string, unknown>).color as string;
  return colorMap[color] || "#9ca3af";
};

export interface LegendEntry {
  /** CSS stroke color (or use dashStyle for patterns) */
  color?: string;
  /** Optional inline CSS backgroundImage string for dashed/dotted patterns */
  dashStyle?: string;
  label: string;
}

export interface AgentBoardProps {
  /** React Flow nodes for this board */
  nodes: Node<AgentMetadata>[];
  /** React Flow edges for this board */
  edges: Edge[];
  /** Legend entries rendered in the top-left panel */
  legend?: LegendEntry[];
  /** Legend title, e.g. "Marketplace Flow" */
  legendTitle?: string;
}

export function AgentBoard({
  nodes: initialNodes,
  edges: initialEdges,
  legend,
  legendTitle = "Pipeline Legend",
}: AgentBoardProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [selectedMeta, setSelectedMeta] = useState<AgentMetadata | null>(null);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedMeta(node.data as AgentMetadata);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedMeta(null);
  }, []);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor="rgba(0,0,0,0.08)"
          className="!bg-card !border !border-border !rounded-lg !shadow-sm"
        />

        {/* Legend */}
        {legend && legend.length > 0 && (
          <Panel position="top-left">
            <div className="rounded-lg border bg-card/95 backdrop-blur-sm p-3 shadow-sm space-y-2 text-xs">
              <p className="font-semibold text-sm mb-2">{legendTitle}</p>
              {legend.map((entry) => (
                <div key={entry.label} className="flex items-center gap-2">
                  <div
                    className="h-0.5 w-6 rounded"
                    style={
                      entry.dashStyle
                        ? { backgroundImage: entry.dashStyle }
                        : { backgroundColor: entry.color ?? "#94a3b8" }
                    }
                  />
                  <span className="text-muted-foreground">{entry.label}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </ReactFlow>

      <DetailPanel
        metadata={selectedMeta}
        onClose={() => setSelectedMeta(null)}
      />
    </div>
  );
}
