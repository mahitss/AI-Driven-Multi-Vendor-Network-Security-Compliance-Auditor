"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TopologyNode, TopologyEdge } from "@/lib/api-client";
import { Network, Server, ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink, ZoomIn, ZoomOut, RotateCcw, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkTopologyGraphProps {
  topology: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
    has_topology_data: boolean;
  };
  isLoading?: boolean;
}

export default function NetworkTopologyGraph({
  topology,
  isLoading = false,
}: NetworkTopologyGraphProps) {
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  if (isLoading) {
    return (
      <div className="p-8 rounded-xl bg-[#0B0B0B] border border-[#141414] text-center font-mono text-xs text-[#8E8E93] space-y-2">
        <div className="animate-pulse flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-ping" />
          <span>INITIALIZING FLEET TOPOLOGY GRAPH...</span>
        </div>
      </div>
    );
  }

  const { nodes = [], edges = [], has_topology_data = false } = topology || {};

  if (!has_topology_data || nodes.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-[#0B0B0B] border border-[#141414] text-center font-mono text-xs text-[#8E8E93] space-y-3">
        <Network className="w-8 h-8 text-[#636366] mx-auto" />
        <div className="text-sm font-bold text-[#F2F2F2]">Topology data unavailable</div>
        <p className="text-[11px] text-[#636366] max-w-md mx-auto font-sans">
          Network relationships have not been ingested for the current fleet. Ingest device configurations with interface/routing telemetry to generate live topology maps.
        </p>
        <Link
          href="/configurations?mode=ingest"
          className="inline-block px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1A2230] text-[#F2F2F2] border border-[#141414] hover:border-[#2C2C2E] text-xs font-semibold transition-colors"
        >
          Ingest Configurations →
        </Link>
      </div>
    );
  }

  // Calculate layout positions for nodes
  const svgWidth = 720;
  const svgHeight = 360;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  const nodePositions: Record<string, { x: number; y: number }> = {};

  if (nodes.length === 1) {
    nodePositions[nodes[0].id] = { x: centerX, y: centerY };
  } else {
    // Multi-node distribution
    const radius = Math.min(centerX - 80, centerY - 60);
    nodes.forEach((node, idx) => {
      const angle = (idx / nodes.length) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      nodePositions[node.id] = { x, y };
    });
  }

  const getNodeColor = (status: string, score: number) => {
    if (status === "HARDENED" || score >= 80) return "#10B981";
    if (status === "NEEDS_ATTENTION" || score >= 60) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#0B0B0B] border border-[#141414] hover:border-[#2C2C2E] transition-colors space-y-4 font-mono">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#141414] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-[#8E8E93]" />
            <span className="text-xs font-bold text-[#F2F2F2] uppercase tracking-wider">
              FLEET TOPOLOGY &amp; RELATIONSHIP GRAPH
            </span>
          </div>
          <p className="text-[11px] text-[#8E8E93] font-sans mt-0.5">
            Inter-device interfaces, BGP peering, and deterministic attack path connectivity.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2))}
            className="p-1 rounded bg-[#080808] border border-[#141414] text-[#8E8E93] hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.6))}
            className="p-1 rounded bg-[#080808] border border-[#141414] text-[#8E8E93] hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1 rounded bg-[#080808] border border-[#141414] text-[#8E8E93] hover:text-white"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div className="relative w-full overflow-hidden rounded-lg bg-[#080808]/90 border border-[#141414] p-2 min-h-[360px] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[380px] cursor-grab select-none"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center", transition: "transform 0.2s ease" }}
        >
          {/* Edge Connectors */}
          {edges.map((edge, idx) => {
            const src = nodePositions[edge.source];
            const tgt = nodePositions[edge.target];
            if (!src || !tgt) return null;

            return (
              <g key={`edge-${idx}`}>
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="#141414"
                  strokeWidth="2"
                  strokeDasharray={edge.relationship === "vpn" ? "4 4" : "none"}
                />
              </g>
            );
          })}

          {/* Node Elements */}
          {nodes.map((node) => {
            const pos = nodePositions[node.id];
            if (!pos) return null;
            const nodeColor = getNodeColor(node.status, node.compliance_score);
            const isSelected = selectedNode?.id === node.id;

            return (
              <g
                key={`node-${node.id}`}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer group"
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected ? 22 : 18}
                  fill="#0B0B0B"
                  stroke={isSelected ? "#93C5FD" : nodeColor}
                  strokeWidth={isSelected ? "3" : "2"}
                  className="transition-all duration-200"
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected ? 14 : 11}
                  fill={nodeColor}
                  opacity="0.25"
                />
                <text
                  x={pos.x}
                  y={pos.y + 32}
                  textAnchor="middle"
                  fill="#F2F2F2"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {node.hostname}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 44}
                  textAnchor="middle"
                  fill="#636366"
                  fontSize="8"
                  fontFamily="monospace"
                  style={{ textTransform: "uppercase" }}
                >
                  {node.vendor.toUpperCase()} • {node.compliance_score}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
