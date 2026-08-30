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
      <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center font-mono text-xs text-[#A7B0C0] space-y-2">
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
      <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center font-mono text-xs text-[#A7B0C0] space-y-3">
        <Network className="w-8 h-8 text-[#667085] mx-auto" />
        <div className="text-sm font-bold text-[#F3F4F6]">Topology data unavailable</div>
        <p className="text-[11px] text-[#667085] max-w-md mx-auto font-sans">
          Network relationships have not been ingested for the current fleet. Ingest device configurations with interface/routing telemetry to generate live topology maps.
        </p>
        <Link
          href="/configurations"
          className="inline-block px-3 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition-colors shadow-sm"
        >
          Ingest Configurations →
        </Link>
      </div>
    );
  }

  // Calculate layout positions for nodes
  // Central hub layout: Hub in center, fleet nodes arranged in an arc / star around it
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
    <div className="p-4 sm:p-5 rounded-xl bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-colors space-y-4 font-mono">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1D2939] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider">
              FLEET ASSET TOPOLOGY & ADJACENCY
            </span>
          </div>
          <p className="text-[11px] text-[#A7B0C0] font-sans mt-0.5">
            Deterministic network topology generated from {nodes.length} evaluated fleet node(s) and active configuration bindings.
          </p>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-[#080B12] p-1 rounded-lg border border-[#1D2939]">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 1.8))}
            className="p-1 rounded text-[#A7B0C0] hover:text-white hover:bg-[#111827]"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.6))}
            className="p-1 rounded text-[#A7B0C0] hover:text-white hover:bg-[#111827]"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1 rounded text-[#A7B0C0] hover:text-white hover:bg-[#111827]"
            title="Reset view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Split: Topology SVG + Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Topology Viewport (8 Cols) */}
        <div className="lg:col-span-8 relative rounded-xl bg-[#080B12] border border-[#1D2939] overflow-hidden min-h-[360px] flex items-center justify-center">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#3B82F6 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Edges */}
            {edges.map((edge) => {
              const srcPos = nodePositions[edge.source];
              const tgtPos = nodePositions[edge.target];
              if (!srcPos || !tgtPos) return null;

              return (
                <g key={`edge-${edge.id}`}>
                  <line
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke="#1D2939"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const pos = nodePositions[node.id] || { x: centerX, y: centerY };
              const isSelected = selectedNode?.id === node.id;
              const nodeColor = getNodeColor(node.status, node.compliance_score);

              return (
                <g
                  key={`node-${node.id}`}
                  className="cursor-pointer group"
                  onClick={() => setSelectedNode(node)}
                >
                  {/* Outer Ring */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isSelected ? 26 : 20}
                    fill="#0D121C"
                    stroke={isSelected ? "#3B82F6" : nodeColor}
                    strokeWidth={isSelected ? "3" : "2"}
                    className="transition-all"
                  />

                  {/* Inner Status Indicator */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isSelected ? 10 : 8}
                    fill={nodeColor}
                    opacity="0.8"
                  />

                  {/* Node Label Text */}
                  <text
                    x={pos.x}
                    y={pos.y + 34}
                    textAnchor="middle"
                    fill={isSelected ? "#FFFFFF" : "#F3F4F6"}
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {node.hostname}
                  </text>

                  {/* Vendor & Score Subtext */}
                  <text
                    x={pos.x}
                    y={pos.y + 47}
                    textAnchor="middle"
                    fill="#667085"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {node.vendor.toUpperCase()} • {node.compliance_score}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Node Inspector Sidebar (4 Cols) */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-[#080B12] border border-[#1D2939] space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-[#1D2939] pb-2">
            <span className="font-bold text-[#F3F4F6] uppercase tracking-wider text-[11px]">
              NODE TELEMETRY INSPECTOR
            </span>
            {selectedNode && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold border"
                style={{
                  color: getNodeColor(selectedNode.status, selectedNode.compliance_score),
                  borderColor: `${getNodeColor(selectedNode.status, selectedNode.compliance_score)}40`,
                  backgroundColor: `${getNodeColor(selectedNode.status, selectedNode.compliance_score)}15`,
                }}
              >
                {selectedNode.status}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-bold text-[#F3F4F6]">{selectedNode.hostname}</div>
                <div className="text-[11px] text-[#A7B0C0]">{selectedNode.platform}</div>
              </div>

              <div className="space-y-2 text-[11px] bg-[#0D121C] p-3 rounded-lg border border-[#1D2939]">
                <div className="flex justify-between">
                  <span className="text-[#667085]">Vendor:</span>
                  <span className="text-[#22D3EE] font-bold uppercase">{selectedNode.vendor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Device Class:</span>
                  <span className="text-[#F3F4F6]">{selectedNode.device_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Compliance Score:</span>
                  <span
                    className="font-bold"
                    style={{ color: getNodeColor(selectedNode.status, selectedNode.compliance_score) }}
                  >
                    {selectedNode.compliance_score}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Risk Score:</span>
                  <span className="text-[#F59E0B] font-bold">{selectedNode.risk_score} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Open Violations:</span>
                  <span className="text-[#EF4444] font-bold">{selectedNode.open_findings} items</span>
                </div>
              </div>

              <Link
                href={`/configurations?id=${selectedNode.id}`}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition-colors shadow-sm"
              >
                <span>Inspect Device Configuration</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="py-8 text-center text-[#667085] space-y-1">
              <Server className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
              <div>Click any topology node to inspect live device telemetry and configuration state.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
