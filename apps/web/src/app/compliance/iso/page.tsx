"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Play, BookOpen, RefreshCw } from "lucide-react";
import { fetchFrameworkControls } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function ISOCompliancePage() {
  const { data: controls = [], isLoading } = useQuery({
    queryKey: ["framework-controls", "ISO"],
    queryFn: () => fetchFrameworkControls("ISO"),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>ISO/IEC 27001:2022 Annex A Control Coverage</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Technical configuration control coverage for Information Security Management Systems (ISMS) ISO 27001 Annex A.
          </p>
        </div>

        <Link
          href="/audits"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold font-mono self-start sm:self-auto transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Execute ISO Audit</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading ISO 27001 Annex A control coverage catalog...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {controls.map((ctrl) => (
            <div key={ctrl.rule_id} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 font-bold">
                    {ctrl.control_id}
                  </span>
                  <h3 className="text-xs font-bold text-white mt-1.5">{ctrl.title}</h3>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold uppercase",
                    ctrl.severity === "CRITICAL" && "text-rose-400",
                    ctrl.severity === "HIGH" && "text-amber-400",
                    ctrl.severity === "MEDIUM" && "text-yellow-400",
                    ctrl.severity === "LOW" && "text-cyan-400"
                  )}
                >
                  {ctrl.severity}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{ctrl.description}</p>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-cyan-400" />
                  <span>{ctrl.source?.document || "ISO/IEC 27001 Annex A"}</span>
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
