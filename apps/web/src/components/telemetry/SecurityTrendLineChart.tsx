"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { AuditTrendPoint } from "@/lib/api-client";
import {
  TrendingUp,
  ShieldCheck,
  Flame,
  AlertTriangle,
  AlertOctagon,
  ExternalLink,
  Info,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityTrendLineChartProps {
  trends: AuditTrendPoint[];
  hasSufficientHistory: boolean;
  isLoading?: boolean;
}

export type SeriesKey = "compliance_score" | "risk_score" | "open_findings" | "critical_findings";

interface SeriesDef {
  key: SeriesKey;
  label: string;
  unit: string;
  color: string;
  fillGradient: [string, string];
  fillOpacity: number;
  strokeWidth: number;
  isPercentage: boolean;
}

const SERIES_DEFINITIONS: Record<SeriesKey, SeriesDef> = {
  compliance_score: {
    key: "compliance_score",
    label: "Fleet Compliance",
    unit: "%",
    color: "#10B981", // Emerald
    fillGradient: ["rgba(16, 185, 129, 0.28)", "rgba(16, 185, 129, 0.02)"],
    fillOpacity: 0.22,
    strokeWidth: 2.5,
    isPercentage: true,
  },
  risk_score: {
    key: "risk_score",
    label: "Risk Score",
    unit: "/100",
    color: "#F59E0B", // Amber
    fillGradient: ["rgba(245, 158, 11, 0.22)", "rgba(245, 158, 11, 0.02)"],
    fillOpacity: 0.18,
    strokeWidth: 2.2,
    isPercentage: true,
  },
  open_findings: {
    key: "open_findings",
    label: "Open Findings",
    unit: " items",
    color: "#3B82F6", // Electric Blue
    fillGradient: ["rgba(59, 130, 246, 0.20)", "rgba(59, 130, 246, 0.02)"],
    fillOpacity: 0.16,
    strokeWidth: 2.2,
    isPercentage: false,
  },
  critical_findings: {
    key: "critical_findings",
    label: "Critical (P0)",
    unit: " P0s",
    color: "#EF4444", // Crimson
    fillGradient: ["rgba(239, 68, 68, 0.24)", "rgba(239, 68, 68, 0.02)"],
    fillOpacity: 0.20,
    strokeWidth: 2.2,
    isPercentage: false,
  },
};

/**
 * Calculates a smooth Catmull-Rom to Cubic Bezier curve path from data points.
 * Preserves exact mathematical coordinate values while providing organic streamgraph curvature.
 */
function createSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

    // Catmull-Rom to Cubic Bezier tension conversion (factor = 6)
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

/**
 * Creates a closed SVG area polygon beneath the smooth curve down to the baseline.
 */
function createClosedAreaPath(pts: { x: number; y: number }[], bottomY: number): string {
  if (pts.length < 2) return "";
  const linePath = createSmoothPath(pts);
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${linePath} L ${last.x.toFixed(2)} ${bottomY} L ${first.x.toFixed(2)} ${bottomY} Z`;
}

export default function SecurityTrendLineChart({
  trends,
  hasSufficientHistory,
  isLoading = false,
}: SecurityTrendLineChartProps) {
  // Visible Series State (all enabled by default)
  const [activeSeries, setActiveSeries] = useState<Record<SeriesKey, boolean>>({
    compliance_score: true,
    risk_score: true,
    open_findings: true,
    critical_findings: true,
  });

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mouseCoord, setMouseCoord] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Toggle single series
  const toggleSeries = (key: SeriesKey) => {
    setActiveSeries((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Ensure at least one series remains active
      if (!Object.values(next).some(Boolean)) {
        return prev;
      }
      return next;
    });
  };

  // Solo series on double-click
  const soloSeries = (key: SeriesKey) => {
    setActiveSeries({
      compliance_score: key === "compliance_score",
      risk_score: key === "risk_score",
      open_findings: key === "open_findings",
      critical_findings: key === "critical_findings",
    });
  };

  // Reset to all series
  const showAllSeries = () => {
    setActiveSeries({
      compliance_score: true,
      risk_score: true,
      open_findings: true,
      critical_findings: true,
    });
  };

  // SVG Canvas Dimensions
  const width = 860;
  const height = 280;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 45;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const bottomY = padTop + chartH;

  // Calculate dynamic scales based on active database records
  const { maxPercentage, maxCount, sortedTrends } = useMemo(() => {
    if (!trends || trends.length === 0) {
      return { maxPercentage: 100, maxCount: 10, sortedTrends: [] };
    }

    // Sort chronologically ascending
    const sorted = [...trends].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const counts = sorted.flatMap((t) => [
      Number(t.open_findings) || 0,
      Number(t.critical_findings) || 0,
    ]);
    const highestCount = Math.max(...counts, 10);
    // Round to nearest neat number (e.g. 10, 20, 50, 100, 250)
    const roundedMaxCount = highestCount <= 10 ? 10 : Math.ceil(highestCount / 5) * 5;

    return {
      maxPercentage: 100,
      maxCount: roundedMaxCount,
      sortedTrends: sorted,
    };
  }, [trends]);

  // Map each data point to canvas pixel coordinates
  const seriesPlotData: Record<SeriesKey, { x: number; y: number; val: number }[]> = useMemo(() => {
    const result: Record<SeriesKey, { x: number; y: number; val: number }[]> = {
      compliance_score: [],
      risk_score: [],
      open_findings: [],
      critical_findings: [],
    };
    if (sortedTrends.length === 0) return result;

    sortedTrends.forEach((t, idx) => {
      const x =
        sortedTrends.length === 1
          ? padLeft + chartW / 2
          : padLeft + (idx / (sortedTrends.length - 1)) * chartW;

      // Percentage metrics (0-100 scale)
      const compVal = Number(t.compliance_score) || 0;
      const compY = padTop + chartH - (compVal / maxPercentage) * chartH;
      result.compliance_score.push({ x, y: compY, val: compVal });

      const riskVal = Number(t.risk_score) || 0;
      const riskY = padTop + chartH - (riskVal / maxPercentage) * chartH;
      result.risk_score.push({ x, y: riskY, val: riskVal });

      // Count metrics (0-maxCount scale)
      const openVal = Number(t.open_findings) || 0;
      const openY = padTop + chartH - (openVal / maxCount) * chartH;
      result.open_findings.push({ x, y: openY, val: openVal });

      const critVal = Number(t.critical_findings) || 0;
      const critY = padTop + chartH - (critVal / maxCount) * chartH;
      result.critical_findings.push({ x, y: critY, val: critVal });
    });

    return result;
  }, [sortedTrends, chartW, chartH, maxPercentage, maxCount, padLeft, padTop]);

  // Intelligent X-Axis Tick Selection (Fixes the overlapping labels bug)
  const xAxisTicks = useMemo(() => {
    if (sortedTrends.length === 0) return [];
    if (sortedTrends.length <= 5) {
      return sortedTrends.map((t, idx) => {
        const x =
          sortedTrends.length === 1
            ? padLeft + chartW / 2
            : padLeft + (idx / (sortedTrends.length - 1)) * chartW;
        return { x, timestamp: t.timestamp, rawIdx: idx };
      });
    }

    // Pick 5-6 evenly spaced representative tick timestamps
    const targetCount = 5;
    const step = (sortedTrends.length - 1) / (targetCount - 1);
    const ticks = [];

    for (let i = 0; i < targetCount; i++) {
      const idx = Math.round(i * step);
      const t = sortedTrends[idx];
      const x = padLeft + (idx / (sortedTrends.length - 1)) * chartW;
      ticks.push({ x, timestamp: t.timestamp, rawIdx: idx });
    }

    return ticks;
  }, [sortedTrends, chartW, padLeft]);

  // Format tick labels based on full date range span
  const formatTickDate = (tsString: string) => {
    try {
      const dt = new Date(tsString);
      if (sortedTrends.length >= 2) {
        const first = new Date(sortedTrends[0].timestamp).getTime();
        const last = new Date(sortedTrends[sortedTrends.length - 1].timestamp).getTime();
        const spanDays = (last - first) / (1000 * 60 * 60 * 24);

        if (spanDays > 180) {
          return dt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        }
        if (spanDays > 2) {
          return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
      }
      return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return tsString;
    }
  };

  // Mouse Move Event for nearest point detection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (sortedTrends.length === 0 || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Scale from DOM rect coordinates to SVG viewBox coordinates
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const svgX = clientX * scaleX;
    const svgY = clientY * scaleY;

    if (svgX < padLeft - 10 || svgX > width - padRight + 10) {
      setHoveredIdx(null);
      setMouseCoord(null);
      return;
    }

    // Find nearest point index along the X-axis
    let closestIdx = 0;
    let minDistance = Infinity;

    sortedTrends.forEach((_, idx) => {
      const ptX =
        sortedTrends.length === 1
          ? padLeft + chartW / 2
          : padLeft + (idx / (sortedTrends.length - 1)) * chartW;
      const dist = Math.abs(svgX - ptX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoveredIdx(closestIdx);
    setMouseCoord({ x: svgX, y: svgY });
  };

  // Active Point under cursor
  const activeHoverPoint = hoveredIdx !== null ? sortedTrends[hoveredIdx] : null;
  const activeHoverX =
    hoveredIdx !== null && sortedTrends.length > 0
      ? sortedTrends.length === 1
        ? padLeft + chartW / 2
        : padLeft + (hoveredIdx / (sortedTrends.length - 1)) * chartW
      : null;

  // 1. LOADING STATE
  if (isLoading) {
    return (
      <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center font-mono text-xs text-[#A7B0C0] space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] animate-ping" />
          <span className="font-semibold text-[#F3F4F6]">SYNCHRONIZING DETERMINISTIC TELEMETRY...</span>
        </div>
        <p className="text-[11px] text-[#667085] max-w-sm mx-auto font-sans">
          Extracting execution timestamps and evaluating compliance trajectories across active configurations.
        </p>
      </div>
    );
  }

  // 2. EMPTY STATE
  if (!trends || trends.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center font-mono text-xs text-[#A7B0C0] space-y-2.5">
        <Info className="w-6 h-6 text-[#667085] mx-auto" />
        <div className="text-sm font-bold text-[#F3F4F6]">NO TELEMETRY DATA</div>
        <p className="text-[11px] text-[#667085] max-w-sm mx-auto font-sans">
          No audit execution records found in database. Ingest configurations and execute compliance audits to generate time-series streamgraph telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-all space-y-4 font-mono select-none">
      {/* 1. Header Row & Live Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1D2939] pb-3.5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-[#3B82F6]">
              <Layers className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider">
                TIME-SERIES SECURITY STREAMGRAPH
              </span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] tactical-pulse-green" />
              <span>LIVE DATABASE</span>
            </span>
          </div>
          <p className="text-[11px] text-[#A7B0C0] font-sans mt-1">
            Layered area progression across <strong className="text-[#F3F4F6]">{trends.length}</strong> execution points • Exact database timestamps.
          </p>
        </div>

        {/* 2. Interactive Multi-Series Legend Bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(Object.keys(SERIES_DEFINITIONS) as SeriesKey[]).map((key) => {
            const def = SERIES_DEFINITIONS[key];
            const isEnabled = activeSeries[key];

            return (
              <button
                key={key}
                onClick={() => toggleSeries(key)}
                onDoubleClick={() => soloSeries(key)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-semibold transition-all border",
                  isEnabled
                    ? "bg-[#111827] text-[#F3F4F6] border-[#263B55] shadow-sm"
                    : "bg-[#080B12] text-[#667085] border-[#1D2939] opacity-60 hover:opacity-100"
                )}
                title={`Click to toggle ${def.label}. Double click to solo.`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: isEnabled ? def.color : "#4B5563",
                    boxShadow: isEnabled ? `0 0 6px ${def.color}40` : "none",
                  }}
                />
                <span>{def.label}</span>
                {isEnabled ? (
                  <Eye className="w-2.5 h-2.5 text-[#667085] ml-0.5" />
                ) : (
                  <EyeOff className="w-2.5 h-2.5 text-[#667085] ml-0.5" />
                )}
              </button>
            );
          })}

          <button
            onClick={showAllSeries}
            className="text-[9px] text-[#3B82F6] hover:underline px-1 py-0.5 font-mono ml-1"
          >
            All
          </button>
        </div>
      </div>

      {/* Single Audit Point Notice */}
      {!hasSufficientHistory && trends.length === 1 && (
        <div className="p-2.5 rounded-lg bg-[#080B12] border border-[#1D2939] flex items-center gap-2 text-[11px] text-[#A7B0C0]">
          <Info className="w-4 h-4 text-[#3B82F6] shrink-0" />
          <span>
            <strong className="text-[#F3F4F6]">Single Audit Point:</strong> Historical trend slope unavailable — additional audit runs will plot continuous stream waves.
          </span>
        </div>
      )}

      {/* 3. Main Streamgraph Canvas */}
      <div className="relative w-full overflow-hidden rounded-lg bg-[#080B12]/80 border border-[#1D2939]/80 p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-h-[220px] max-h-[340px] cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setHoveredIdx(null);
            setMouseCoord(null);
          }}
        >
          <defs>
            {/* Smooth Layer Gradients */}
            {(Object.keys(SERIES_DEFINITIONS) as SeriesKey[]).map((key) => {
              const def = SERIES_DEFINITIONS[key];
              return (
                <linearGradient
                  key={`grad-${key}`}
                  id={`stream-grad-${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={def.color} stopOpacity={def.fillOpacity * 1.5} />
                  <stop offset="70%" stopColor={def.color} stopOpacity={def.fillOpacity * 0.4} />
                  <stop offset="100%" stopColor={def.color} stopOpacity="0.0" />
                </linearGradient>
              );
            })}

            {/* Subtle Grid Pattern */}
            <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.75" fill="#172131" />
            </pattern>
          </defs>

          {/* Background Grid Pattern */}
          <rect
            x={padLeft}
            y={padTop}
            width={chartW}
            height={chartH}
            fill="url(#grid-dots)"
            opacity="0.6"
          />

          {/* Horizontal Reference Grid Lines (Y-Axis) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padTop + chartH - ratio * chartH;
            const pctLabel = Math.round(ratio * 100);
            const countLabel = Math.round(ratio * maxCount);

            return (
              <g key={`y-grid-${ratio}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#172131"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                {/* Left Y-Axis: Percentage (0-100%) */}
                <text
                  x={padLeft - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#667085"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {pctLabel}%
                </text>
                {/* Right Y-Axis: Finding Counts */}
                <text
                  x={width - padRight + 6}
                  y={y + 3.5}
                  textAnchor="start"
                  fill="#667085"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {countLabel}
                </text>
              </g>
            );
          })}

          {/* Vertical Time Grid Lines (Non-Overlapping X Ticks) */}
          {xAxisTicks.map((tick, i) => (
            <g key={`x-grid-${tick.timestamp}-${i}`}>
              <line
                x1={tick.x}
                y1={padTop}
                x2={tick.x}
                y2={bottomY}
                stroke="#172131"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={tick.x}
                y={bottomY + 18}
                textAnchor="middle"
                fill="#667085"
                fontSize="9"
                fontFamily="monospace"
              >
                {formatTickDate(tick.timestamp)}
              </text>
            </g>
          ))}

          {/* Baseline X-Axis Bar */}
          <line
            x1={padLeft}
            y1={bottomY}
            x2={width - padRight}
            y2={bottomY}
            stroke="#1D2939"
            strokeWidth="1.5"
          />

          {/* 4. Streamgraph Layered Filled Areas (Rendered Bottom to Top) */}
          {(["open_findings", "critical_findings", "risk_score", "compliance_score"] as SeriesKey[]).map(
            (key) => {
              if (!activeSeries[key]) return null;
              const pts = seriesPlotData[key] || [];
              if (pts.length < 2) return null;

              const areaD = createClosedAreaPath(pts, bottomY);
              return (
                <path
                  key={`area-${key}`}
                  d={areaD}
                  fill={`url(#stream-grad-${key})`}
                  className="transition-all duration-300 pointer-events-none"
                />
              );
            }
          )}

          {/* 5. Smooth Boundary Splines */}
          {(Object.keys(SERIES_DEFINITIONS) as SeriesKey[]).map((key) => {
            if (!activeSeries[key]) return null;
            const def = SERIES_DEFINITIONS[key];
            const pts = seriesPlotData[key] || [];
            if (pts.length === 0) return null;

            const lineD = createSmoothPath(pts);

            return (
              <g key={`line-group-${key}`}>
                <path
                  d={lineD}
                  fill="none"
                  stroke={def.color}
                  strokeWidth={def.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {/* 6. Hover Guide Line & Highlight Circles */}
          {activeHoverPoint && activeHoverX !== null && (
            <g className="pointer-events-none">
              {/* Vertical Crosshair Guide */}
              <line
                x1={activeHoverX}
                y1={padTop}
                x2={activeHoverX}
                y2={bottomY}
                stroke="#3B82F6"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.85"
              />

              {/* Point Glyphs on each active curve */}
              {(Object.keys(SERIES_DEFINITIONS) as SeriesKey[]).map((key) => {
                if (!activeSeries[key] || hoveredIdx === null) return null;
                const def = SERIES_DEFINITIONS[key];
                const pt = seriesPlotData[key]?.[hoveredIdx];
                if (!pt) return null;

                return (
                  <g key={`hover-pt-${key}`}>
                    {/* Glowing outer halo */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={7}
                      fill={def.color}
                      opacity="0.3"
                    />
                    {/* Solid center dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={4}
                      fill="#FFFFFF"
                      stroke={def.color}
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* 7. Premium Enterprise Telemetry HUD Tooltip */}
        {activeHoverPoint && activeHoverX !== null && mouseCoord && (
          <div
            className="absolute z-30 pointer-events-none p-3.5 rounded-xl bg-[#080B12]/95 border border-[#263B55] shadow-2xl backdrop-blur-md text-xs space-y-2 font-mono min-w-[260px] max-w-[320px] transition-transform duration-75"
            style={{
              left: `${Math.min(Math.max((activeHoverX / width) * 100, 15), 82)}%`,
              top: "16px",
              transform: "translateX(-50%)",
            }}
          >
            {/* Tooltip Header: Target Config & Timestamp */}
            <div className="border-b border-[#1D2939] pb-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#F3F4F6] text-xs truncate max-w-[170px]">
                  {activeHoverPoint.device_name}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#3B82F6]/10 text-[#3B82F6] font-bold uppercase border border-[#3B82F6]/20">
                  {activeHoverPoint.vendor}
                </span>
              </div>
              <div className="text-[10px] text-[#A7B0C0] mt-0.5">
                {new Date(activeHoverPoint.timestamp).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>

            {/* Telemetry Metric Values */}
            <div className="space-y-1.5 text-[11px]">
              {activeSeries.compliance_score && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#A7B0C0]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span>Fleet Compliance:</span>
                  </span>
                  <span className="font-bold text-[#10B981]">
                    {Number(activeHoverPoint.compliance_score).toFixed(1)}%
                  </span>
                </div>
              )}

              {activeSeries.risk_score && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#A7B0C0]">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    <span>Risk Score:</span>
                  </span>
                  <span className="font-bold text-[#F59E0B]">
                    {Math.round(Number(activeHoverPoint.risk_score))} / 100
                  </span>
                </div>
              )}

              {activeSeries.open_findings && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#A7B0C0]">
                    <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                    <span>Open Findings:</span>
                  </span>
                  <span className="font-bold text-[#F3F4F6]">
                    {activeHoverPoint.open_findings} items
                  </span>
                </div>
              )}

              {activeSeries.critical_findings && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#A7B0C0]">
                    <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                    <span>Critical (P0):</span>
                  </span>
                  <span className="font-bold text-[#EF4444]">
                    {activeHoverPoint.critical_findings} P0s
                  </span>
                </div>
              )}
            </div>

            {/* Source & Traceability Footer */}
            <div className="pt-2 border-t border-[#1D2939] text-[9px] text-[#667085] flex items-center justify-between">
              <span>Source: Database audit #{activeHoverPoint.audit_id ? activeHoverPoint.audit_id.slice(0, 8) : "LOG"}</span>
              <span className="text-[#3B82F6] flex items-center gap-0.5">
                <span>View</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 8. Bottom Information Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#667085] pt-2 border-t border-[#1D2939]">
        <div className="flex items-center gap-3">
          <span>Y-Axis (Left): 0–100% (Compliance & Risk)</span>
          <span>•</span>
          <span>Y-Axis (Right): 0–{maxCount} (Finding Counts)</span>
        </div>
        <Link
          href="/audits"
          className="text-[#3B82F6] hover:underline flex items-center gap-1 font-semibold"
        >
          <span>Open Full Audit Log</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
