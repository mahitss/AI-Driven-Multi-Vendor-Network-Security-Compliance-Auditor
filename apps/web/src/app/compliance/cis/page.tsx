"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Layers, Play, BookOpen, RefreshCw, AlertTriangle } from "lucide-react";
import { fetchFrameworkControls } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function CISCompliancePage() {
  const {
    data: controls = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["framework-controls", "CIS"],
    queryFn: () => fetchFrameworkControls("CIS"),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2.5 font-mono">
            <Layers className="w-5 h-5 text-[#00D9FF]" />
            <span>CIS Benchmarks Compliance Catalog</span>
          </h1>
          <p className="text-xs text-[#8A8A8A] mt-1">
            Center for Internet Security (CIS) hardened device configuration controls evaluated deterministically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] text-[#8A8A8A] hover:text-[#F5F5F5] text-xs font-mono transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <Link
            href="/audits"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#0B0B0B] border border-[#00D9FF]/50 hover:border-[#00D9FF] hover:bg-[#141414] text-[#00D9FF] text-xs font-semibold font-mono transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Execute CIS Audit</span>
          </Link>
        </div>
      </div>

      {isError ? (
        <div className="p-8 rounded-xl bg-[#0A0A0A] border border-[#EF4444]/30 text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mx-auto">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">DATA SOURCE UNAVAILABLE</div>
          <div className="text-[11px] text-[#EF4444]">
            {error instanceof Error ? error.message : "Failed to load CIS controls."}
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0D0D0D] text-[#00D9FF] border border-[#00D9FF]/40 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Request</span>
          </button>
        </div>
      ) : isLoading ? (
        <div className="py-16 text-center text-[#8A8A8A] font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#00D9FF]" />
          <span>Loading CIS control catalog...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
          {controls.map((ctrl) => (
            <div key={ctrl.rule_id} className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#111111] text-[#00D9FF] border border-[#00D9FF]/30 font-bold">
                    {ctrl.control_id}
                  </span>
                  <h3 className="text-xs font-bold text-[#F5F5F5] mt-1.5">{ctrl.title}</h3>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase",
                    ctrl.severity === "CRITICAL" && "text-[#EF4444]",
                    ctrl.severity === "HIGH" && "text-[#F59E0B]",
                    ctrl.severity === "MEDIUM" && "text-[#00D9FF]",
                    ctrl.severity === "LOW" && "text-[#8A8A8A]"
                  )}
                >
                  {ctrl.severity}
                </span>
              </div>

              <p className="text-[11px] text-[#8A8A8A] leading-relaxed font-sans">{ctrl.description}</p>

              <div className="pt-2 border-t border-[#1A1A1A] flex items-center justify-between text-[10px] text-[#666666]">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-[#00D9FF]" />
                  <span>{ctrl.source?.document || "CIS Benchmark"}</span>
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
