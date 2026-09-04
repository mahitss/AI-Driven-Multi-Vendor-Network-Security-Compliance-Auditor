"use client";

import React from "react";
import Link from "next/link";
import { AuditTrendPoint } from "@/lib/api-client";
import { Clock, ShieldCheck, ShieldAlert, ChevronRight, CheckCircle2, AlertTriangle, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditExecutionTimelineProps {
  trends: AuditTrendPoint[];
  isLoading?: boolean;
}

export default function AuditExecutionTimeline({
  trends,
  isLoading = false,
}: AuditExecutionTimelineProps) {
  if (isLoading) {
    return (
      <div className="p-8 rounded-xl bg-[#0B0B0B] border border-[#141414] text-center font-mono text-xs text-[#8E8E93] space-y-2">
        <div className="animate-pulse flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-ping" />
          <span>LOADING AUDIT TIMELINE...</span>
        </div>
      </div>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-[#0B0B0B] border border-[#141414] text-center font-mono text-xs text-[#8E8E93] space-y-2">
        <Info className="w-6 h-6 text-[#636366] mx-auto" />
        <div className="text-sm font-bold text-[#F2F2F2]">No audit executions recorded</div>
        <p className="text-[11px] text-[#636366] max-w-sm mx-auto font-sans">
          Audit sessions will be chronologically logged here as configurations are evaluated against compliance baselines.
        </p>
      </div>
    );
  }

  // Display in descending order for timeline (newest first)
  const timelineEvents = [...trends].reverse();

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#0B0B0B] border border-[#141414] hover:border-[#2C2C2E] transition-colors space-y-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#141414] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8E8E93]" />
            <span className="text-xs font-bold text-[#F2F2F2] uppercase tracking-wider">
              REAL-TIME AUDIT EXECUTION TIMELINE
            </span>
          </div>
          <p className="text-[11px] text-[#8E8E93] font-sans mt-0.5">
            Chronological audit execution record with line-level deterministic proof verification.
          </p>
        </div>

        <span className="text-[10px] text-[#636366]">
          {trends.length} total run(s)
        </span>
      </div>

      {/* Timeline List */}
      <div className="relative pl-6 space-y-3.5 border-l border-[#141414] ml-2">
        {timelineEvents.map((evt, idx) => {
          const dateStr = new Date(evt.timestamp).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          const isHardened = evt.compliance_score >= 80;
          const isWarning = evt.compliance_score >= 60 && evt.compliance_score < 80;

          return (
            <div key={`tl-${evt.audit_id}-${idx}`} className="relative group">
              {/* Timeline Dot */}
              <span
                className={cn(
                  "absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-[#0B0B0B]",
                  isHardened
                    ? "bg-[#10B981]"
                    : isWarning
                    ? "bg-[#F59E0B]"
                    : "bg-[#EF4444]"
                )}
              />

              {/* Event Card */}
              <Link
                href={`/audits?audit_id=${evt.audit_id}`}
                className="block p-3 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#141414] hover:border-[#2C2C2E] transition-all space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F2F2F2] text-xs group-hover:text-white">
                      Audit #{evt.audit_id.slice(0, 8)} — {evt.device_name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#111620] text-[#38BDF8] border border-[#38BDF8]/25 font-bold text-[10px] uppercase">
                      {evt.vendor}
                    </span>
                  </div>

                  <span className="text-[10px] text-[#636366]">{dateStr}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-[#141414]/60">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-[#F2F2F2]">
                      <strong
                        className={
                          isHardened
                            ? "text-[#10B981]"
                            : isWarning
                            ? "text-[#F59E0B]"
                            : "text-[#EF4444]"
                        }
                      >
                        {evt.compliance_score}%
                      </strong>{" "}
                      Compliance
                    </span>

                    <span className="text-[#8E8E93]">
                      <strong className="text-white">{evt.open_findings}</strong> Open Violations
                    </span>

                    {evt.critical_findings > 0 && (
                      <span className="text-[#EF4444] font-bold">
                        {evt.critical_findings} Critical (P0)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-[#93C5FD] font-semibold">
                    <span>Inspect Results</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
