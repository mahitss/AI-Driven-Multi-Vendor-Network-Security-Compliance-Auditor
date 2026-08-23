"use client";

import React from "react";
import { FileCode, Search, Terminal, Cpu, ShieldCheck, AlertOctagon, Wrench, Bot, FileText } from "lucide-react";

const PIPELINE_STAGES = [
  {
    step: "01",
    title: "Ingestion & SHA-256",
    desc: "Isolated disk storage with cryptographic digest computation.",
    icon: FileCode,
    color: "text-[#00D9FF]",
  },
  {
    step: "02",
    title: "Vendor Detection",
    desc: "Signature-based confidence identification of Cisco, Juniper, Fortinet.",
    icon: Search,
    color: "text-[#00D9FF]",
  },
  {
    step: "03",
    title: "AST Parsing & Lexing",
    desc: "Hierarchical fact extraction while preserving unknown directives.",
    icon: Cpu,
    color: "text-[#8B5CF6]",
  },
  {
    step: "04",
    title: "Universal Normalizer",
    desc: "Standardizes facts across 8 canonical security domains.",
    icon: Terminal,
    color: "text-[#8B5CF6]",
  },
  {
    step: "05",
    title: "Compliance Engine",
    desc: "Deterministic evaluation of 60+ rules across CIS, NIST, STIG, ISO.",
    icon: ShieldCheck,
    color: "text-[#22C55E]",
  },
  {
    step: "06",
    title: "Risk Intelligence",
    desc: "Topological blast-radius correlation with P0-P3 priority scoring.",
    icon: AlertOctagon,
    color: "text-[#F59E0B]",
  },
  {
    step: "07",
    title: "Allowlisted Remediation",
    desc: "Visual REMOVE/ADD diff synthesis with Zero Automated Execution.",
    icon: Wrench,
    color: "text-[#8B5CF6]",
  },
  {
    step: "08",
    title: "Grounded AI Advisory",
    desc: "Context-grounded natural language finding and syntax explanations.",
    icon: Bot,
    color: "text-[#8B5CF6]",
  },
  {
    step: "09",
    title: "Executive Report",
    desc: "Official printable audit report generation with verifiable lineage.",
    icon: FileText,
    color: "text-[#00D9FF]",
  },
];

export default function PipelineFlowSection() {
  return (
    <section id="pipeline" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#141414] font-sans">
      <div className="space-y-3 text-center max-w-2xl mx-auto mb-16">
        <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#00D9FF]">
          END-TO-END EXECUTION
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F5F5F5] tracking-tight font-sans">
          HOW NETVIGIL WORKS
        </h2>
        <p className="text-xs sm:text-sm text-[#8A8A8A]">
          Every configuration passes through 9 deterministic stages in under 200 milliseconds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        {PIPELINE_STAGES.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.step}
              className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#333333] transition-all space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#111111] border border-[#1F1F1F] flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${stage.color}`} />
                </div>
                <span className="text-[11px] font-bold text-[#444444] group-hover:text-[#888888] transition-colors">
                  STAGE {stage.step}
                </span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wide">
                  {stage.title}
                </h3>
                <p className="text-[11px] text-[#8A8A8A] mt-1 font-sans leading-relaxed">
                  {stage.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
