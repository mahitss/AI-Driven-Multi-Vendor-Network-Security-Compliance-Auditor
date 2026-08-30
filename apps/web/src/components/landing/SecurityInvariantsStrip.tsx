"use client";

import React from "react";
import { Lock, Shield, CheckCircle, FileText, UserCheck } from "lucide-react";

export default function SecurityInvariantsStrip() {
  const invariants = [
    { label: "AI BOUNDARY", value: "ADVISORY ONLY", icon: Shield, color: "text-[#8B5CF6]" },
    { label: "REMOTE EXECUTION", value: "DISABLED", icon: Lock, color: "text-[#EF4444]" },
    { label: "EVIDENCE CITATION", value: "LINE VERIFIED", icon: FileText, color: "text-[#10B981]" },
    { label: "REMEDIATION", value: "ALLOWLISTED", icon: CheckCircle, color: "text-[#10B981]" },
    { label: "UNKNOWN SYNTAX", value: "HUMAN APPROVAL", icon: UserCheck, color: "text-[#F59E0B]" },
  ];

  return (
    <section className="border-y border-[#1D2939] bg-[#080B12] font-mono text-xs py-5">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {invariants.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="p-3 rounded-lg bg-[#0D121C] border border-[#1D2939] flex items-center justify-between"
              >
                <div>
                  <div className="text-[9px] text-[#667085] tracking-wider uppercase font-semibold">
                    {item.label}
                  </div>
                  <div className={`text-xs font-bold ${item.color}`}>
                    {item.value}
                  </div>
                </div>
                <Icon className={`w-4 h-4 ${item.color} opacity-80`} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
