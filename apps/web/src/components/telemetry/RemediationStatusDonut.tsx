"use client";

import React from "react";
import Link from "next/link";
import { Wrench, CheckCircle2, ShieldCheck, Clock, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface RemediationStatusDonutProps {
  distribution: {
    available: number;
    reviewed: number;
    applied: number;
    verified: number;
    total: number;
  };
  isLoading?: boolean;
}

export default function RemediationStatusDonut({
  distribution,
  isLoading = false,
}: RemediationStatusDonutProps) {
  if (isLoading) {
    return (
      <div className="p-6 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center font-mono text-xs text-[#A7B0C0] space-y-2">
        <div className="animate-pulse flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-ping" />
          <span>LOADING REMEDIATION TELEMETRY...</span>
        </div>
      </div>
    );
  }

  const { available = 0, reviewed = 0, applied = 0, verified = 0, total = 0 } = distribution || {};

  if (total === 0 && applied === 0) {
    return (
      <div className="p-6 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center font-mono text-xs text-[#A7B0C0] space-y-2">
        <Info className="w-6 h-6 text-[#667085] mx-auto" />
        <div className="text-sm font-bold text-[#F3F4F6]">No remediation activity recorded</div>
        <p className="text-[11px] text-[#667085] max-w-xs mx-auto font-sans">
          Remediation proposals and autonomous agent patch workflows will be tracked here once generated.
        </p>
      </div>
    );
  }

  const segments = [
    { label: "Verified Safe", count: verified, color: "#10B981" },
    { label: "Applied Patches", count: applied, color: "#3B82F6" },
    { label: "Reviewed & Approved", count: reviewed, color: "#8B5CF6" },
    { label: "Available Templates", count: available, color: "#F59E0B" },
  ];

  const totalActionable = Math.max(total, applied, 1);

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-colors space-y-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1D2939] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider">
              REMEDIATION & PATCH LIFECYCLE
            </span>
          </div>
          <p className="text-[11px] text-[#A7B0C0] font-sans mt-0.5">
            Allowlisted CLI hardening proposals and human-in-the-loop agent verification status.
          </p>
        </div>

        <Link
          href="/remediation"
          className="text-[#3B82F6] hover:underline text-xs flex items-center gap-1 font-semibold"
        >
          <span>Remediation Center</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Progress Bars Breakdown */}
      <div className="space-y-2.5">
        {segments.map((seg) => {
          const pct = Math.round((seg.count / totalActionable) * 100);
          return (
            <div key={seg.label} className="p-2.5 rounded-lg bg-[#080B12] border border-[#1D2939] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="font-bold text-[#F3F4F6]">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{seg.count}</span>
                  <span className="text-[10px] text-[#667085]">({pct}%)</span>
                </div>
              </div>

              <div className="w-full h-1.5 rounded-full bg-[#151E2D] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: seg.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
