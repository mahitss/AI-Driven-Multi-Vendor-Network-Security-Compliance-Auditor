"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Layers, Play, BookOpen, RefreshCw } from "lucide-react";
import { fetchFrameworkControls } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function NISTCompliancePage() {
  const { data: controls = [], isLoading } = useQuery({
    queryKey: ["framework-controls", "NIST"],
    queryFn: () => fetchFrameworkControls("NIST"),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2.5 font-mono">
            <Layers className="w-5 h-5 text-[#00D9FF]" />
            <span>NIST SP 800-53 Rev 5 Control Catalog</span>
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            National Institute of Standards and Technology (NIST) federal network security baseline controls.
          </p>
        </div>

        <Link
          href="/audits"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#0B0B0B] border border-[#00D9FF]/50 hover:border-[#00D9FF] hover:bg-[#141414] text-[#00D9FF] text-xs font-semibold font-mono self-start sm:self-auto transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Execute NIST Audit</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-[#666666] font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#00D9FF]" />
          <span>Loading NIST control catalog...</span>
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
                    ctrl.severity === "LOW" && "text-[#A3A3A3]"
                  )}
                >
                  {ctrl.severity}
                </span>
              </div>

              <p className="text-[11px] text-[#A3A3A3] leading-relaxed font-sans">{ctrl.description}</p>

              <div className="pt-2 border-t border-[#1A1A1A] flex items-center justify-between text-[10px] text-[#666666]">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-[#00D9FF]" />
                  <span>{ctrl.source?.document || "NIST SP 800-53"}</span>
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
