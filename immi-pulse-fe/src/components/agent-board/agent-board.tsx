"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
  type NodeTypes,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";

import { initialNodes, initialEdges, type AgentMetadata } from "./board-data";
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
    gray: "#9ca3af",
  };
  const color = (node.data as Record<string, unknown>).color as string;
  return colorMap[color] || "#9ca3af";
};

export function AgentBoard() {
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
        <Panel position="top-left">
          <div className="rounded-lg border bg-card/95 backdrop-blur-sm p-3 shadow-sm space-y-2 text-xs">
            <p className="font-semibold text-sm mb-2">Pipeline Legend</p>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-6 bg-violet-500 rounded" />
              <span className="text-muted-foreground">
                Unified pipeline (animated)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-0.5 w-6 rounded"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, #94a3b8 0, #94a3b8 4px, transparent 4px, transparent 8px)",
                }}
              />
              <span className="text-muted-foreground">Legacy fallback</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-0.5 w-6 rounded"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, #14b8a6 0, #14b8a6 3px, transparent 3px, transparent 6px)",
                }}
              />
              <span className="text-muted-foreground">Scheduler trigger</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-6 bg-emerald-500 rounded" />
              <span className="text-muted-foreground">Database write</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      <DetailPanel metadata={selectedMeta} onClose={() => setSelectedMeta(null)} />
    </div>
  );
}
