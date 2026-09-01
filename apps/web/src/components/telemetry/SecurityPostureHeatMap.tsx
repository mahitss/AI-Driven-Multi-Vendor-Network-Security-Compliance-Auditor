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

  if (isLoading) {
    return (
      <div className="p-8 rounded-xl bg-[#0D1117] border border-[#1E2638] text-center font-mono text-xs text-[#94A3B8] space-y-2">
        <div className="animate-pulse flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-ping" />
          <span>LOADING SECURITY HEAT MAP MATRIX...</span>
        </div>
      </div>
    );
  }

  if (!matrix || matrix.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-[#0D1117] border border-[#1E2638] text-center font-mono text-xs text-[#94A3B8] space-y-2">
        <Info className="w-6 h-6 text-[#64748B] mx-auto" />
        <div className="text-sm font-bold text-[#F3F4F6]">Security Heat Map Unavailable</div>
        <p className="text-[11px] text-[#64748B] max-w-sm mx-auto font-sans">
          No active network configurations evaluated yet. Upload configurations to generate the multi-vendor heat map.
        </p>
      </div>
    );
  }

  const severityCols = [
    { key: "CRITICAL", label: "Critical (P0)", color: "#EF4444" },
    { key: "HIGH", label: "High (P1)", color: "#F59E0B" },
    { key: "MEDIUM", label: "Medium (P2)", color: "#38BDF8" },
    { key: "LOW", label: "Low (P3)", color: "#10B981" },
    { key: "INFO", label: "Info", color: "#94A3B8" },
  ] as const;

  const frameworkCols = [
    { key: "CIS", label: "CIS Benchmarks" },
    { key: "NIST", label: "NIST SP 800-53" },
    { key: "STIG", label: "DISA STIG" },
    { key: "ISO", label: "ISO 27001" },
  ] as const;

  const getSeverityCellBg = (count: number, tier: string) => {
    if (count === 0) return "bg-[#090B0F] text-[#64748B] border-[#1E2638]";
    if (tier === "CRITICAL") return "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40 font-bold";
    if (tier === "HIGH") return "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 font-bold";
    if (tier === "MEDIUM") return "bg-[#141A24] text-[#93C5FD] border-[#28354A] font-semibold";
    if (tier === "LOW") return "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30";
    return "bg-[#111620] text-[#94A3B8] border-[#1E2638]";
  };

  const getFrameworkCellBg = (score: number, failed: number) => {
    if (failed === 0 && score >= 80) return "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40 font-bold";
    if (score >= 60) return "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40 font-bold";
    return "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40 font-bold";
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] transition-colors space-y-4 font-mono">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2638] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-[#94A3B8]" />
            <span className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider">
              ENTERPRISE SECURITY POSTURE HEAT MAP
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8] font-sans mt-0.5">
            Two-dimensional risk matrix mapping evaluated fleet assets against severity tiers and governance baselines.
          </p>
        </div>

        {/* Matrix Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#090B0F] p-1 rounded-lg border border-[#1E2638]">
          <button
            onClick={() => setMode("severity")}
            className={cn(
              "px-2.5 py-1 rounded text-[10px] font-semibold transition-all",
              mode === "severity"
                ? "bg-[#141A24] text-[#F3F4F6] border border-[#28354A]"
                : "text-[#94A3B8] hover:text-[#F3F4F6]"
            )}
          >
            By Severity Tier
          </button>
          <button
            onClick={() => setMode("framework")}
            className={cn(
              "px-2.5 py-1 rounded text-[10px] font-semibold transition-all",
              mode === "framework"
                ? "bg-[#141A24] text-[#F3F4F6] border border-[#28354A]"
                : "text-[#94A3B8] hover:text-[#F3F4F6]"
            )}
          >
            By Framework Compliance
          </button>
        </div>
      </div>

      {/* Heat Map Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#1E2638] text-[10px] text-[#64748B]">
              <th className="py-2 px-3 font-semibold uppercase tracking-wider min-w-[200px]">Asset &amp; Vendor</th>
              <th className="py-2 px-3 font-semibold uppercase tracking-wider text-center">Score</th>
              {mode === "severity"
                ? severityCols.map((c) => (
                    <th key={c.key} className="py-2 px-3 font-semibold uppercase tracking-wider text-center">
                      {c.label}
                    </th>
                  ))
                : frameworkCols.map((c) => (
                    <th key={c.key} className="py-2 px-3 font-semibold uppercase tracking-wider text-center">
                      {c.label}
                    </th>
                  ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2638]">
            {matrix.map((row) => (
              <tr key={row.configuration_id || row.hostname} className="hover:bg-[#090B0F]/50 transition-colors">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-[#64748B]" />
                    <div>
                      <div className="font-bold text-[#F3F4F6]">{row.hostname}</div>
                      <div className="text-[10px] text-[#64748B] uppercase">{row.vendor}</div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center">
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
                    {row.overall_score.toFixed(1)}%
                  </span>
                </td>

                {mode === "severity"
                  ? severityCols.map((c) => {
                      const count = row.severities?.[c.key] ?? 0;
                      return (
                        <td key={c.key} className="py-2.5 px-3 text-center">
                          <span
                            className={cn(
                              "inline-block px-2.5 py-1 rounded text-[11px] border transition-colors",
                              getSeverityCellBg(count, c.key)
                            )}
                          >
                            {count}
                          </span>
                        </td>
                      );
                    })
                  : frameworkCols.map((c) => {
                      const fwData = row.frameworks?.[c.key];
                      const score = fwData?.score ?? 0;
                      const failed = fwData?.failed ?? 0;
                      return (
                        <td key={c.key} className="py-2.5 px-3 text-center">
                          <span
                            className={cn(
                              "inline-block px-2.5 py-1 rounded text-[11px] border transition-colors",
                              getFrameworkCellBg(score, failed)
                            )}
                          >
                            {score}% ({failed} fail)
                          </span>
                        </td>
                      );
                    })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
