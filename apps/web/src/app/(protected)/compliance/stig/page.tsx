"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Layers, Play, BookOpen, RefreshCw, AlertTriangle } from "lucide-react";
import { fetchFrameworkControls } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function STIGCompliancePage() {
  const {
    data: controls = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["framework-controls", "STIG"],
    queryFn: () => fetchFrameworkControls("STIG"),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F3F4F6] tracking-tight flex items-center gap-2.5 font-mono">
            <Layers className="w-5 h-5 text-[#3B82F6]" />
            <span>DISA STIG Network Device Control Catalog</span>
          </h1>
          <p className="text-xs text-[#A7B0C0] mt-1 font-sans">
            Defense Information Systems Agency (DISA) Security Technical Implementation Guides (STIG).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D121C] border border-[#1D2939] text-[#A7B0C0] hover:text-white hover:border-[#263B55] text-xs font-mono transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <Link
            href="/audits"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold font-mono transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Execute STIG Audit</span>
          </Link>
        </div>
      </div>

      {isError ? (
        <div className="p-8 rounded-xl bg-[#0D121C] border border-[#EF4444]/30 text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mx-auto">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider">DATA SOURCE UNAVAILABLE</div>
          <div className="text-[11px] text-[#EF4444]">
            {error instanceof Error ? error.message : "Failed to load STIG controls."}
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#080B12] text-[#3B82F6] border border-[#3B82F6]/40 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Request</span>
          </button>
        </div>
      ) : isLoading ? (
        <div className="py-16 text-center text-[#667085] font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#3B82F6]" />
          <span>Loading STIG control catalog...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
          {controls.map((ctrl) => (
            <div key={ctrl.rule_id} className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#080B12] text-[#3B82F6] border border-[#3B82F6]/30 font-bold">
                    {ctrl.control_id}
                  </span>
                  <h3 className="text-xs font-bold text-[#F3F4F6] mt-1.5 font-sans">{ctrl.title}</h3>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase",
                    ctrl.severity === "CRITICAL" && "text-[#EF4444]",
                    ctrl.severity === "HIGH" && "text-[#F59E0B]",
                    ctrl.severity === "MEDIUM" && "text-[#3B82F6]",
                    ctrl.severity === "LOW" && "text-[#667085]"
                  )}
                >
                  {ctrl.severity}
                </span>
              </div>

              <p className="text-[11px] text-[#A7B0C0] leading-relaxed font-sans">{ctrl.description}</p>

              <div className="pt-2 border-t border-[#1D2939] flex items-center justify-between text-[10px] text-[#667085]">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-[#3B82F6]" />
                  <span>{ctrl.source?.document || "DoD DISA STIG"}</span>
                </span>
                <span>Category: {ctrl.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
