"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HeatmapAssetRow } from "@/lib/api-client";
import { Grid, ShieldCheck, ShieldAlert, Server, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityPostureHeatMapProps {
  matrix: HeatmapAssetRow[];
  isLoading?: boolean;
}

type HeatmapMode = "severity" | "framework";

export default function SecurityPostureHeatMap({
  matrix,
  isLoading = false,
}: SecurityPostureHeatMapProps) {
  const [mode, setMode] = useState<HeatmapMode>("severity");
  const [hoveredCell, setHoveredCell] = useState<{
    asset: HeatmapAssetRow;
    colKey: string;
    label: string;
    value: string | number;
    details?: string;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center font-mono text-xs text-[#A7B0C0] space-y-2">
        <div className="animate-pulse flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-ping" />
          <span>LOADING SECURITY HEAT MAP MATRIX...</span>
        </div>
      </div>
    );
  }

  if (!matrix || matrix.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center font-mono text-xs text-[#A7B0C0] space-y-2">
        <Info className="w-6 h-6 text-[#667085] mx-auto" />
        <div className="text-sm font-bold text-[#F3F4F6]">Security Heat Map Unavailable</div>
        <p className="text-[11px] text-[#667085] max-w-sm mx-auto font-sans">
          No active network configurations evaluated yet. Upload configurations to generate the multi-vendor heat map.
        </p>
      </div>
    );
  }

  const severityCols = [
    { key: "CRITICAL", label: "Critical (P0)", color: "#EF4444" },
    { key: "HIGH", label: "High (P1)", color: "#F59E0B" },
    { key: "MEDIUM", label: "Medium (P2)", color: "#60A5FA" },
    { key: "LOW", label: "Low (P3)", color: "#10B981" },
    { key: "INFO", label: "Info", color: "#A7B0C0" },
  ] as const;

  const frameworkCols = [
    { key: "CIS", label: "CIS Benchmarks" },
    { key: "NIST", label: "NIST SP 800-53" },
    { key: "STIG", label: "DISA STIG" },
    { key: "ISO", label: "ISO 27001" },
  ] as const;

  const getSeverityCellBg = (count: number, tier: string) => {
    if (count === 0) return "bg-[#080B12] text-[#667085] border-[#1D2939]";
    if (tier === "CRITICAL") return "bg-[#EF4444]/25 text-[#EF4444] border-[#EF4444]/50 font-bold";
    if (tier === "HIGH") return "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 font-bold";
    if (tier === "MEDIUM") return "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30 font-semibold";
    if (tier === "LOW") return "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30";
    return "bg-[#111827] text-[#A7B0C0] border-[#1D2939]";
  };

  const getFrameworkCellBg = (score: number, failed: number) => {
    if (failed === 0 && score >= 80) return "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40 font-bold";
    if (score >= 60) return "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 font-bold";
    return "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40 font-bold";
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-colors space-y-4 font-mono">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1D2939] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider">
              ENTERPRISE SECURITY POSTURE HEAT MAP
            </span>
          </div>
          <p className="text-[11px] text-[#A7B0C0] font-sans mt-0.5">
            Two-dimensional risk matrix mapping evaluated fleet assets against severity tiers and governance baselines.
          </p>
        </div>

        {/* Matrix Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#080B12] p-1 rounded-lg border border-[#1D2939]">
          <button
            onClick={() => setMode("severity")}
            className={cn(
              "px-3 py-1 rounded text-[10px] font-semibold transition-all",
              mode === "severity"
                ? "bg-[#111827] text-white border border-[#263B55] shadow-sm"
                : "text-[#A7B0C0] hover:text-white"
            )}
          >
            Asset × Severity Matrix
          </button>
          <button
            onClick={() => setMode("framework")}
            className={cn(
              "px-3 py-1 rounded text-[10px] font-semibold transition-all",
              mode === "framework"
                ? "bg-[#111827] text-white border border-[#263B55] shadow-sm"
                : "text-[#A7B0C0] hover:text-white"
            )}
          >
            Asset × Framework Matrix
          </button>
        </div>
      </div>

      {/* Heat Map Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#1D2939] text-[#667085] text-[10px] uppercase">
              <th className="py-2.5 px-3">Target Asset</th>
              <th className="py-2.5 px-2">Vendor</th>
              {mode === "severity"
                ? severityCols.map((c) => (
                    <th key={`th-${c.key}`} className="py-2.5 px-2 text-center">
                      <span style={{ color: c.color }}>{c.label}</span>
                    </th>
                  ))
                : frameworkCols.map((f) => (
                    <th key={`th-${f.key}`} className="py-2.5 px-2 text-center text-[#F3F4F6]">
                      {f.label}
                    </th>
                  ))}
              <th className="py-2.5 px-3 text-right">Score</th>
              <th className="py-2.5 px-2 text-right">Drilldown</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1D2939]">
            {matrix.map((row) => (
              <tr
                key={`row-${row.configuration_id}`}
                className="hover:bg-[#111827]/60 transition-colors group"
              >
                {/* Asset Name */}
                <td className="py-3 px-3">
                  <div className="font-bold text-[#F3F4F6] truncate max-w-[200px]" title={row.hostname}>
                    {row.hostname}
                  </div>
                  <div className="text-[10px] text-[#667085] truncate max-w-[200px]">
                    {row.platform}
                  </div>
                </td>

                {/* Vendor Badge */}
                <td className="py-3 px-2">
                  <span className="px-2 py-0.5 rounded bg-[#080B12] text-[#22D3EE] border border-[#22D3EE]/25 text-[10px] font-bold uppercase">
                    {row.vendor}
                  </span>
                </td>

                {/* MODE A: SEVERITY MATRIX */}
                {mode === "severity" &&
                  severityCols.map((col) => {
                    const count = row.severities[col.key] || 0;
                    const bgClass = getSeverityCellBg(count, col.key);
                    return (
                      <td key={`cell-${row.configuration_id}-${col.key}`} className="py-2.5 px-2 text-center">
                        <span
                          className={cn(
                            "inline-block px-2.5 py-1 rounded text-xs border transition-all cursor-default",
                            bgClass
                          )}
                          title={`${row.hostname} — ${col.label}: ${count} finding(s)`}
                          onMouseEnter={() =>
                            setHoveredCell({
                              asset: row,
                              colKey: col.key,
                              label: col.label,
                              value: count,
                              details: `${count} non-compliant check(s) in this severity tier`,
                            })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {count}
                        </span>
                      </td>
                    );
                  })}

                {/* MODE B: FRAMEWORK MATRIX */}
                {mode === "framework" &&
                  frameworkCols.map((col) => {
                    const fwData = row.frameworks[col.key] || { failed: 0, passed: 0, score: row.overall_score };
                    const bgClass = getFrameworkCellBg(fwData.score, fwData.failed);
                    return (
                      <td key={`cell-fw-${row.configuration_id}-${col.key}`} className="py-2.5 px-2 text-center">
                        <span
                          className={cn(
                            "inline-block px-2 py-1 rounded text-xs border transition-all cursor-default",
                            bgClass
                          )}
                          title={`${row.hostname} — ${col.label}: ${fwData.score}% (${fwData.failed} failed)`}
                          onMouseEnter={() =>
                            setHoveredCell({
                              asset: row,
                              colKey: col.key,
                              label: col.label,
                              value: `${fwData.score}%`,
                              details: `${fwData.failed} failed, ${fwData.passed} passed`,
                            })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {fwData.score}%
                        </span>
                      </td>
                    );
                  })}

                {/* Overall Score */}
                <td className="py-3 px-3 text-right">
                  <span
                    className={cn(
                      "font-bold text-xs",
                      row.overall_score >= 80
                        ? "text-[#10B981]"
                        : row.overall_score >= 60
                        ? "text-[#F59E0B]"
                        : "text-[#EF4444]"
                    )}
                  >
                    {row.overall_score}%
                  </span>
                </td>

                {/* Action Link */}
                <td className="py-3 px-2 text-right">
                  <Link
                    href={`/findings?audit_id=${row.audit_id}`}
                    className="p-1.5 rounded hover:bg-[#151E2D] text-[#3B82F6] inline-flex items-center"
                    title="View Asset Findings"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1D2939] text-[10px] text-[#667085]">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-[#A7B0C0]">HEAT MAP INTENSITY:</span>
          {mode === "severity" ? (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#080B12] border border-[#1D2939]" /> 0 Findings (Clean)
              </span>
              <span className="flex items-center gap-1 text-[#60A5FA]">
                <span className="w-2 h-2 rounded-full bg-[#60A5FA]" /> Medium
              </span>
              <span className="flex items-center gap-1 text-[#F59E0B]">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> High
              </span>
              <span className="flex items-center gap-1 text-[#EF4444]">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Critical (P0)
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 text-[#10B981]">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" /> ≥80% Hardened
              </span>
              <span className="flex items-center gap-1 text-[#F59E0B]">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> 60-79% Needs Attention
              </span>
              <span className="flex items-center gap-1 text-[#EF4444]">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> &lt;60% High Risk
              </span>
            </>
          )}
        </div>

        <span>{matrix.length} managed asset(s) rendered</span>
      </div>
    </div>
  );
}
