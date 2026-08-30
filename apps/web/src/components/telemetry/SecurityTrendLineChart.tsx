"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AuditTrendPoint } from "@/lib/api-client";
import { TrendingUp, ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityTrendLineChartProps {
  trends: AuditTrendPoint[];
  hasSufficientHistory: boolean;
  isLoading?: boolean;
}

type MetricKey = "compliance_score" | "open_findings" | "critical_findings" | "risk_score";

export default function SecurityTrendLineChart({
  trends,
  hasSufficientHistory,
  isLoading = false,
}: SecurityTrendLineChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("compliance_score");
  const [hoveredPoint, setHoveredPoint] = useState<AuditTrendPoint | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  if (isLoading) {
    return (
      <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center font-mono text-xs text-[#A7B0C0] space-y-2">
        <div className="animate-pulse flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-ping" />
          <span>LOADING SECURITY TELEMETRY TRENDS...</span>
        </div>
      </div>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center font-mono text-xs text-[#A7B0C0] space-y-2">
        <Info className="w-6 h-6 text-[#667085] mx-auto" />
        <div className="text-sm font-bold text-[#F3F4F6]">No audit history available</div>
        <p className="text-[11px] text-[#667085] max-w-sm mx-auto font-sans">
          Execute compliance audits on ingested device configurations to begin recording deterministic security telemetry.
        </p>
      </div>
    );
  }

  const metricConfigs: Record<MetricKey, { label: string; unit: string; color: string; maxVal?: number }> = {
    compliance_score: { label: "Fleet Compliance", unit: "%", color: "#10B981", maxVal: 100 },
    risk_score: { label: "Risk Score", unit: "/100", color: "#F59E0B", maxVal: 100 },
    open_findings: { label: "Open Findings", unit: " items", color: "#3B82F6" },
    critical_findings: { label: "Critical (P0)", unit: " P0s", color: "#EF4444" },
  };

  const currentConfig = metricConfigs[selectedMetric];

  // SVG Chart Geometry
  const width = 760;
  const height = 240;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 40;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Compute values range
  const values = trends.map((t) => Number(t[selectedMetric]) || 0);
  const minVal = 0;
  const computedMax = Math.max(...values, currentConfig.maxVal || 10);
  const maxVal = computedMax === 0 ? 10 : computedMax;

  // Calculate coordinates for points
  const points = trends.map((t, idx) => {
    const x = trends.length === 1
      ? padLeft + chartW / 2
      : padLeft + (idx / (trends.length - 1)) * chartW;
    const val = Number(t[selectedMetric]) || 0;
    const y = padTop + chartH - (val / maxVal) * chartH;
    return { x, y, point: t, val };
  });

  const pathD = points.length === 1
    ? ""
    : points.reduce((acc, curr, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${curr.x} ${curr.y}`, "");

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-colors space-y-4 font-mono">
      {/* Header & Metric Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1D2939] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider">
              DETERMINISTIC TIME-SERIES TELEMETRY
            </span>
          </div>
          <p className="text-[11px] text-[#A7B0C0] font-sans mt-0.5">
            Audit progression recorded across {trends.length} execution point(s) using exact database timestamps.
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center gap-1 bg-[#080B12] p-1 rounded-lg border border-[#1D2939]">
          {(Object.keys(metricConfigs) as MetricKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key)}
              className={cn(
                "px-2.5 py-1 rounded text-[10px] font-semibold transition-all",
                selectedMetric === key
                  ? "bg-[#111827] text-white border border-[#263B55] shadow-sm"
                  : "text-[#A7B0C0] hover:text-white"
              )}
            >
              {metricConfigs[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Historical Trend notice if only 1 point */}
      {!hasSufficientHistory && trends.length === 1 && (
        <div className="p-2.5 rounded-lg bg-[#080B12] border border-[#1D2939] flex items-center gap-2 text-[11px] text-[#A7B0C0]">
          <Info className="w-4 h-4 text-[#3B82F6] shrink-0" />
          <span>
            <strong className="text-[#F3F4F6]">Single Audit Point:</strong> Historical trend unavailable — additional audits required to plot slope.
          </span>
        </div>
      )}

      {/* Interactive Chart Container */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px]"
          onMouseLeave={() => {
            setHoveredPoint(null);
            setHoverPos(null);
          }}
        >
          {/* Y Gridlines & Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padTop + chartH - ratio * chartH;
            const labelVal = Math.round(minVal + ratio * (maxVal - minVal));
            return (
              <g key={`grid-y-${ratio}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#172131"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#667085"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {labelVal}
                </text>
              </g>
            );
          })}

          {/* X Axis Line */}
          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={width - padRight}
            y2={padTop + chartH}
            stroke="#1D2939"
          />

          {/* Line Path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={currentConfig.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((p, idx) => {
            const isHovered = hoveredPoint?.audit_id === p.point.audit_id;
            const dateStr = new Date(p.point.timestamp).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <g key={`pt-${p.point.audit_id}-${idx}`}>
                {/* Vertical Cursor on hover */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={padTop}
                    x2={p.x}
                    y2={padTop + chartH}
                    stroke="#263B55"
                    strokeDasharray="2 2"
                  />
                )}

                {/* X Axis Timestamp Label */}
                <text
                  x={p.x}
                  y={padTop + chartH + 18}
                  textAnchor="middle"
                  fill="#667085"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {dateStr}
                </text>

                {/* Point Circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? "#FFFFFF" : currentConfig.color}
                  stroke="#080B12"
                  strokeWidth="2"
                  className="cursor-pointer transition-all"
                  onMouseEnter={(e) => {
                    setHoveredPoint(p.point);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoverPos({ x: p.x, y: p.y });
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && hoverPos && (
          <div
            className="absolute z-20 pointer-events-none p-3 rounded-lg bg-[#080B12] border border-[#263B55] shadow-xl text-xs space-y-1.5 font-mono min-w-[220px]"
            style={{
              left: `${Math.min(Math.max(hoverPos.x - 110, 10), width - 230)}px`,
              top: `${Math.max(hoverPos.y - 100, 10)}px`,
            }}
          >
            <div className="flex items-center justify-between border-b border-[#1D2939] pb-1">
              <span className="font-bold text-[#F3F4F6] truncate max-w-[140px]">
                {hoveredPoint.device_name}
              </span>
              <span className="text-[10px] text-[#A7B0C0] uppercase font-bold">
                {hoveredPoint.vendor}
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#A7B0C0]">{currentConfig.label}:</span>
                <span className="font-bold" style={{ color: currentConfig.color }}>
                  {hoveredPoint[selectedMetric]}
                  {currentConfig.unit}
                </span>
              </div>
              <div className="flex justify-between text-[#667085]">
                <span>Total Open:</span>
                <span className="text-[#F3F4F6] font-bold">{hoveredPoint.open_findings}</span>
              </div>
              <div className="flex justify-between text-[#667085]">
                <span>Timestamp:</span>
                <span className="text-[#A7B0C0] text-[10px]">
                  {new Date(hoveredPoint.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-[#3B82F6] pt-1 border-t border-[#1D2939] flex items-center justify-between">
              <span>Click to view audit</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Link */}
      <div className="flex items-center justify-between text-[11px] text-[#667085] pt-2 border-t border-[#1D2939]">
        <span>Showing {trends.length} recorded audit event(s)</span>
        <Link
          href="/audits"
          className="text-[#3B82F6] hover:underline flex items-center gap-1 font-semibold"
        >
          <span>Open Full Audit History</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
