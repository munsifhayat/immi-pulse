"use client";

/**
 * Flow Preview — visualises the conditional-logic graph of a form using
 * React Flow (@xyflow/react). Read-only at v1; useful for sanity-checking
 * that every branch leads somewhere and no field is orphaned.
 *
 * Layout: pure topological — fields are stacked top-to-bottom in form order.
 * Edges are drawn from each field to any field that controls its visibility.
 * Nodes carrying outcome flags (urgent, disqualified) get coloured borders.
 */

import { useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertTriangle, GitBranch, Eye, type LucideIcon } from "lucide-react";
import type { QuestionField, OutcomeFlag } from "@/lib/api/services";

interface Props {
  fields: QuestionField[];
  highlightedKey?: string | null;
  onNodeClick?: (key: string) => void;
}

type NodeStyle = {
  borderColor: string;
  background: string;
  textColor: string;
  badge?: { label: string; Icon: LucideIcon; color: string };
};

const FLAG_STYLES: Record<OutcomeFlag, NodeStyle> = {
  urgent: {
    borderColor: "#BE123C",
    background: "#FFEEF2",
    textColor: "#7F1D1D",
    badge: { label: "URGENT", Icon: AlertTriangle, color: "#BE123C" },
  },
  disqualified: {
    borderColor: "#94A3B8",
    background: "#F1F5F9",
    textColor: "#475569",
  },
  qualified: {
    borderColor: "#0F766E",
    background: "#E5F6F2",
    textColor: "#0F766E",
  },
  more_info: {
    borderColor: "#B45309",
    background: "#FEF4E2",
    textColor: "#78350F",
  },
};

const DEFAULT_STYLE: NodeStyle = {
  borderColor: "#CDC4F8",
  background: "#FFFFFF",
  textColor: "#0F1117",
};

const CONDITIONAL_STYLE: NodeStyle = {
  borderColor: "#7C5CFC",
  background: "#F8F5FF",
  textColor: "#3E1C96",
  badge: { label: "CONDITIONAL", Icon: GitBranch, color: "#7C5CFC" },
};

function pickStyle(field: QuestionField): NodeStyle {
  const flag = field.flags?.[0];
  if (flag && FLAG_STYLES[flag]) return FLAG_STYLES[flag];
  if (field.logic?.visibility?.mode && field.logic.visibility.mode !== "always")
    return CONDITIONAL_STYLE;
  return DEFAULT_STYLE;
}

function describeRules(field: QuestionField): string | null {
  const mode = field.logic?.visibility?.mode;
  const rules = field.logic?.visibility?.rules ?? [];
  if (!mode || mode === "always" || rules.length === 0) return null;
  const parts = rules.map((r) => {
    const valLabel = Array.isArray(r.value)
      ? r.value.join(" / ")
      : r.value === undefined || r.value === null
        ? ""
        : String(r.value);
    const op = r.operator.replace(/_/g, " ");
    return `${r.field_key} ${op}${valLabel ? ` "${valLabel}"` : ""}`;
  });
  return `${mode === "hide_if" ? "Hide if" : "Show if"}: ${parts.join(" AND ")}`;
}

export function FlowPreview({ fields, highlightedKey, onNodeClick }: Props) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Start node
    nodes.push({
      id: "__start__",
      type: "input",
      data: { label: "Form opens" },
      position: { x: 80, y: 0 },
      sourcePosition: "bottom" as never,
      targetPosition: "top" as never,
      style: {
        background: "#0F1117",
        color: "white",
        border: "none",
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: 12,
        fontWeight: 600,
      },
    });

    fields.forEach((f, i) => {
      const style = pickStyle(f);
      const ruleDesc = describeRules(f);
      const isHighlighted = highlightedKey === f.key;
      const label = (
        <div style={{ minWidth: 200, maxWidth: 260, textAlign: "left" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.2,
              color: style.textColor,
              opacity: 0.6,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            #{String(i + 1).padStart(2, "0")} · {f.type.replace(/_/g, " ")}
            {f.required ? " · req" : ""}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: style.textColor,
              lineHeight: 1.3,
            }}
          >
            {f.label}
          </div>
          {ruleDesc && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: style.textColor,
                opacity: 0.8,
                fontFamily: "ui-monospace, SF Mono, Monaco, monospace",
                lineHeight: 1.4,
              }}
            >
              {ruleDesc}
            </div>
          )}
          {style.badge && (
            <div
              style={{
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: style.borderColor,
                color: "white",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.8,
                padding: "2px 7px",
                borderRadius: 999,
              }}
            >
              {style.badge.label}
            </div>
          )}
        </div>
      );

      nodes.push({
        id: f.key,
        data: { label },
        position: { x: 80, y: 90 + i * 130 },
        sourcePosition: "bottom" as never,
        targetPosition: "top" as never,
        style: {
          background: style.background,
          border: `1.5px solid ${isHighlighted ? "#7C5CFC" : style.borderColor}`,
          borderRadius: 12,
          padding: "12px 14px",
          width: 280,
          boxShadow: isHighlighted
            ? "0 0 0 4px rgba(124,92,252,0.18)"
            : "0 1px 3px rgba(15,17,23,0.06)",
        },
      });

      // Edges: sequential (start -> first, prev -> current)
      const prevId = i === 0 ? "__start__" : fields[i - 1]!.key;
      edges.push({
        id: `seq-${prevId}-${f.key}`,
        source: prevId,
        target: f.key,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#CFC9E0", strokeWidth: 1.5 },
      });

      // Rule edges: from any field referenced by this field's logic
      const rules = [
        ...(f.logic?.visibility?.rules ?? []),
        ...(f.logic?.required_if ?? []),
      ];
      const seenRefs = new Set<string>();
      rules.forEach((r) => {
        if (seenRefs.has(r.field_key)) return;
        seenRefs.add(r.field_key);
        if (r.field_key === f.key) return;
        if (!fields.some((other) => other.key === r.field_key)) return;
        edges.push({
          id: `rule-${r.field_key}-${f.key}`,
          source: r.field_key,
          target: f.key,
          type: "smoothstep",
          animated: true,
          label: "rule",
          labelStyle: {
            fill: "#7C5CFC",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.5,
          },
          labelBgStyle: { fill: "#F2EEFF" },
          labelBgPadding: [4, 6],
          labelBgBorderRadius: 4,
          style: { stroke: "#7C5CFC", strokeWidth: 1.5, strokeDasharray: "6 4" },
        });
      });
    });

    // End node
    nodes.push({
      id: "__end__",
      type: "output",
      data: { label: "Submission lands in Pre-Cases" },
      position: { x: 80, y: 90 + fields.length * 130 },
      sourcePosition: "bottom" as never,
      targetPosition: "top" as never,
      style: {
        background: "#E5F6F2",
        color: "#0F766E",
        border: "1.5px solid #0F766E",
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: 12,
        fontWeight: 600,
      },
    });
    if (fields.length > 0) {
      edges.push({
        id: `seq-${fields[fields.length - 1]!.key}-__end__`,
        source: fields[fields.length - 1]!.key,
        target: "__end__",
        type: "smoothstep",
        style: { stroke: "#CFC9E0", strokeWidth: 1.5 },
      });
    } else {
      edges.push({
        id: "seq-empty",
        source: "__start__",
        target: "__end__",
        type: "smoothstep",
        style: { stroke: "#CFC9E0", strokeWidth: 1.5 },
      });
    }

    return { nodes, edges };
  }, [fields, highlightedKey]);

  if (fields.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
        <Eye className="h-5 w-5 text-muted-foreground/70" />
        <p className="mt-3 text-[13px] text-foreground">No fields yet.</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Add a few fields, then come back to see the flow.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border bg-[#FBFAFF]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={!!onNodeClick}
        onNodeClick={(_, node) => {
          if (onNodeClick && node.id !== "__start__" && node.id !== "__end__") {
            onNodeClick(node.id);
          }
        }}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={18} color="#E4E2EE" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
