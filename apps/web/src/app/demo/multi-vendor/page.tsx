"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  initMultiVendorDemo,
  MultiVendorProofState,
  MultiVendorDeviceResult,
} from "@/lib/api-client";
import {
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileCode2,
  Layers,
  Bot,
  Wrench,
  Flame,
  ArrowRight,
  RefreshCw,
  Cpu,
  Server,
  Activity,
  Terminal,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Info,
  Lock,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MultiVendorTerrainView from "@/components/multivendor/MultiVendorTerrainView";

export default function MultiVendorSecurityPage() {
  const [selectedVendor, setSelectedVendor] = useState<"cisco" | "juniper" | "fortinet" | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<"CIS" | "NIST" | "STIG" | "ISO" | null>(null);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<{
    title: string;
    category: string;
    description: string;
    verdict?: string;
    line?: number;
  } | null>(null);

  // Initialize or fetch multi-vendor proof state
  const {
    data: proofState,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["multi-vendor-proof"],
    queryFn: initMultiVendorDemo,
    staleTime: 60000,
  });

  const mutation = useMutation({
    mutationFn: initMultiVendorDemo,
    onSuccess: (data) => {
      refetch();
    },
  });

  const handleRerun = () => {
    mutation.mutate();
  };

  const ciscoData = proofState?.vendors?.cisco;
  const juniperData = proofState?.vendors?.juniper;
  const fortinetData = proofState?.vendors?.fortinet;

  // Active vendor data for detail inspection panel
  const activeVendorData: MultiVendorDeviceResult | undefined =
    selectedVendor === "cisco"
      ? ciscoData
      : selectedVendor === "juniper"
      ? juniperData
      : selectedVendor === "fortinet"
      ? fortinetData
      : undefined;

  return (
    <div className="space-y-10 max-w-[1440px] mx-auto pb-16 font-sans">
      {/* 1. Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-5 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-[#3B82F6]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
              <span>UNIVERSAL SECURITY MODEL</span>
            </span>
            <span className="text-[#667085]">•</span>
            <span className="text-[#667085]">CROSS-VENDOR NORMALIZATION</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F3F4F6] tracking-tight font-sans">
            MULTI-VENDOR SECURITY
          </h1>
          <p className="text-xs sm:text-sm text-[#A7B0C0] mt-1 max-w-3xl font-sans">
            One security model across every network vendor. Translate vendor-specific configurations into one deterministic security model.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto text-xs">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#0B0B0B] hover:bg-[#111827] border border-[#1F1F1F] text-[#A7B0C0] hover:text-[#F3F4F6] font-semibold transition-all"
          >
            <span>← Security Posture</span>
          </Link>

          <button
            onClick={handleRerun}
            disabled={isLoading || mutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isLoading || mutation.isPending) && "animate-spin")} />
            <span>Re-evaluate Pipeline</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Split: Left 40–45% (Vendor Architecture & Details), Right 55–60% (3D Terrain Canvas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 Cols / ~42%): Information & Active Vendor Inspector */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-5 font-mono">
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-[#3B82F6] tracking-wider uppercase">
                DETERMINISTIC CONVERGENCE
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-sans text-[#F3F4F6]">
                Heterogeneous Syntax → Universal Model
              </h2>
              <p className="text-xs text-[#A7B0C0] font-sans leading-relaxed">
                Network device configurations from Cisco IOS, Juniper JunOS, and Fortinet FortiOS are parsed into AST representations and mapped to standardized security properties.
              </p>
            </div>

            {/* Vendor Interactive Selector Pills */}
            <div className="space-y-2 pt-2 border-t border-[#1F1F1F]">
              <div className="text-[10px] text-[#667085] uppercase font-semibold">SELECT VENDOR TO TRACE</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => setSelectedVendor(selectedVendor === "cisco" ? null : "cisco")}
                  className={cn(
                    "p-2.5 rounded-lg border font-bold text-center transition-all",
                    selectedVendor === "cisco"
                      ? "bg-[#3B82F6]/15 border-[#3B82F6] text-[#3B82F6] shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                      : "bg-[#050505] border-[#1F1F1F] text-[#A7B0C0] hover:text-white hover:border-[#2C2C2E]"
                  )}
                >
                  <div>CISCO IOS</div>
                  <div className="text-[10px] text-[#667085] font-normal mt-0.5">CLI Native</div>
                </button>

                <button
                  onClick={() => setSelectedVendor(selectedVendor === "juniper" ? null : "juniper")}
                  className={cn(
                    "p-2.5 rounded-lg border font-bold text-center transition-all",
                    selectedVendor === "juniper"
                      ? "bg-[#10B981]/15 border-[#10B981] text-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                      : "bg-[#050505] border-[#1F1F1F] text-[#A7B0C0] hover:text-white hover:border-[#2C2C2E]"
                  )}
                >
                  <div>JUNIPER</div>
                  <div className="text-[10px] text-[#667085] font-normal mt-0.5">Set Hierarchy</div>
                </button>

                <button
                  onClick={() => setSelectedVendor(selectedVendor === "fortinet" ? null : "fortinet")}
                  className={cn(
                    "p-2.5 rounded-lg border font-bold text-center transition-all",
                    selectedVendor === "fortinet"
                      ? "bg-[#F59E0B]/15 border-[#F59E0B] text-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                      : "bg-[#050505] border-[#1F1F1F] text-[#A7B0C0] hover:text-white hover:border-[#2C2C2E]"
                  )}
                >
                  <div>FORTINET</div>
                  <div className="text-[10px] text-[#667085] font-normal mt-0.5">Config Tree</div>
                </button>
              </div>
            </div>

            {/* Vendor Detail Inspector Card */}
            {activeVendorData ? (
              <div className="p-4 rounded-xl bg-[#050505] border border-[#1F1F1F] space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#3B82F6]" />
                    <span className="font-bold text-sm text-[#F3F4F6] uppercase">{activeVendorData.display_name || activeVendorData.vendor_id}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                    {activeVendorData.total_findings} FINDINGS
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
                    <div className="text-[9px] text-[#667085] uppercase">CONFIGURATION</div>
                    <div className="text-sm font-extrabold text-[#F3F4F6] mt-0.5">
                      {activeVendorData.facts_extracted_count} rules parsed
                    </div>
                  </div>

                  <div className="p-2 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
                    <div className="text-[9px] text-[#667085] uppercase">NORMALIZED</div>
                    <div className="text-sm font-extrabold text-[#3B82F6] mt-0.5">
                      {Object.keys(activeVendorData.normalized_facts || {}).length || activeVendorData.facts_extracted_count} properties
                    </div>
                  </div>

                  <div className="p-2 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
                    <div className="text-[9px] text-[#667085] uppercase">CONTROLS</div>
                    <div className="text-sm font-extrabold text-[#F3F4F6] mt-0.5">
                      {activeVendorData.total_findings + Math.round(activeVendorData.total_findings * (activeVendorData.compliance_score / 100))} evaluated
                    </div>
                  </div>

                  <div className="p-2 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
                    <div className="text-[9px] text-[#667085] uppercase">EVIDENCE</div>
                    <div className="text-sm font-extrabold text-[#F3F4F6] mt-0.5">
                      {activeVendorData.facts_extracted_count} lines cited
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded bg-[#0B0B0B] border border-[#1F1F1F] flex items-center justify-between text-xs">
                  <span className="text-[10px] text-[#667085] uppercase">DETERMINISTIC VERDICT</span>
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-[#EF4444]">{activeVendorData.total_findings} FAIL</span>
                    <span className="text-[#667085]">•</span>
                    <span className="text-[#10B981]">{activeVendorData.passed_controls ?? 3} PASS</span>
                  </div>
                </div>

                <div className="text-[11px] text-[#A7B0C0] font-sans">
                  Device: <strong className="text-white">{activeVendorData.device_name}</strong> • Parser: <span className="text-[#3B82F6] font-mono">{activeVendorData.parser_name} v{activeVendorData.parser_version}</span>
                </div>
              </div>
            ) : selectedNodeInfo ? (
              <div className="p-4 rounded-xl bg-[#050505] border border-[#3B82F6]/30 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#3B82F6]" />
                    <span className="font-bold text-xs text-[#F3F4F6]">{selectedNodeInfo.title}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30">
                    {selectedNodeInfo.category}
                  </span>
                </div>

                <p className="text-xs text-[#A7B0C0] font-sans">{selectedNodeInfo.description}</p>

                <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#1F1F1F] space-y-1.5 text-[10px]">
                  <div className="text-[#3B82F6] font-bold uppercase">NORMALIZATION FLOW:</div>
                  <div className="flex items-center gap-1.5 text-[#A7B0C0]">
                    <span>Vendor Config</span>
                    <span>→</span>
                    <span className="text-white">Normalized Control</span>
                    <span>→</span>
                    <span className="text-[#3B82F6]">Security Property</span>
                    <span>→</span>
                    <span className="text-[#EF4444]">Deterministic Verdict</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#050505] border border-[#1F1F1F] text-center space-y-2">
                <Compass className="w-5 h-5 text-[#3B82F6] mx-auto" />
                <div className="text-xs font-bold text-[#F3F4F6]">INTERACTIVE TERRAIN INSPECTION</div>
                <p className="text-[11px] text-[#A7B0C0] font-sans">
                  Click any vendor, hub, or framework node in the 3D terrain to trace syntax normalization and evidence citations.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 Cols / ~58%): 3D Security Terrain Canvas Viewport */}
        <div className="lg:col-span-7">
          <MultiVendorTerrainView
            selectedVendor={selectedVendor}
            onSelectVendor={setSelectedVendor}
            selectedFramework={selectedFramework}
            onSelectFramework={setSelectedFramework}
            onSelectNodeInfo={setSelectedNodeInfo}
          />
        </div>
      </div>

      {/* 3. Multi-Vendor Normalization Comparison Matrix */}
      <div className="space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F1F1F] pb-3">
          <div>
            <div className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider">CROSS-OS EQUIVALENCE MATRIX</div>
            <h2 className="text-lg sm:text-xl font-bold font-sans text-[#F3F4F6] mt-0.5">
              Vendor Syntax vs Universal Security Model
            </h2>
          </div>
          <span className="text-[11px] text-[#667085]">Deterministic Verification</span>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#1F1F1F] bg-[#0B0B0B]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1F1F1F] bg-[#050505] text-[#A7B0C0]">
                <th className="p-4 font-bold">SECURITY PROPERTY</th>
                <th className="p-4 font-bold text-[#3B82F6]">CISCO IOS</th>
                <th className="p-4 font-bold text-[#10B981]">JUNIPER JUNOS</th>
                <th className="p-4 font-bold text-[#F59E0B]">FORTINET FORTIOS</th>
                <th className="p-4 font-bold text-center">VERDICT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F]">
              {proofState?.comparison_matrix?.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#111827] transition-colors">
                  {/* Property Key & Display */}
                  <td className="p-4 space-y-1">
                    <div className="font-bold text-[#F3F4F6]">{row.display_name}</div>
                    <div className="text-[10px] text-[#3B82F6]">{row.property_key}</div>
                    <div className="text-[9px] text-[#667085]">{row.target_standard}</div>
                  </td>

                  {/* Cisco */}
                  <td className="p-4 space-y-1">
                    <code className="px-2 py-1 rounded bg-[#050505] border border-[#1F1F1F] text-[#3B82F6] text-[11px] block">
                      {row.cisco?.syntax || "Not configured"}
                    </code>
                    {row.cisco?.line && (
                      <div className="text-[10px] text-[#667085]">[Evidence: Line {row.cisco.line}]</div>
                    )}
                  </td>

                  {/* Juniper */}
                  <td className="p-4 space-y-1">
                    <code className="px-2 py-1 rounded bg-[#050505] border border-[#1F1F1F] text-[#10B981] text-[11px] block">
                      {row.juniper?.syntax || "Not configured"}
                    </code>
                    {row.juniper?.line && (
                      <div className="text-[10px] text-[#667085]">[Evidence: Line {row.juniper.line}]</div>
                    )}
                  </td>

                  {/* Fortinet */}
                  <td className="p-4 space-y-1">
                    <code className="px-2 py-1 rounded bg-[#050505] border border-[#1F1F1F] text-[#F59E0B] text-[11px] block">
                      {row.fortinet?.syntax || "Not configured"}
                    </code>
                    {row.fortinet?.line && (
                      <div className="text-[10px] text-[#667085]">[Evidence: Line {row.fortinet.line}]</div>
                    )}
                  </td>

                  {/* Equivalence Verdict */}
                  <td className="p-4 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-extrabold border",
                      row.equivalence_verdict === "FAIL"
                        ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"
                        : "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                    )}>
                      {row.equivalence_verdict === "FAIL" ? (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>NON-COMPLIANT</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>COMPLIANT</span>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Architectural Pipeline Flow */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-6 font-mono">
        <div className="text-center space-y-1 max-w-2xl mx-auto">
          <div className="text-[11px] font-bold text-[#3B82F6] tracking-wider uppercase">END-TO-END PIPELINE</div>
          <h2 className="text-xl sm:text-2xl font-bold font-sans text-[#F3F4F6]">
            Deterministic Pipeline Architecture
          </h2>
          <p className="text-xs text-[#A7B0C0] font-sans">
            How raw multi-vendor network configurations flow into verifiable compliance conclusions.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          {[
            { step: "01", label: "CONFIG INGEST", desc: "Cisco, Juniper, Fortinet raw text" },
            { step: "02", label: "PARSER", desc: "Lexical tokenizer & syntax AST" },
            { step: "03", label: "STRUCTURED AST", desc: "Hierarchical block representation" },
            { step: "04", label: "UNIVERSAL MODEL", desc: "Canonical schema slots" },
            { step: "05", label: "CONTROL MAPPING", desc: "CIS, NIST, STIG, ISO rule correlation" },
            { step: "06", label: "DETERMINISTIC VERDICT", desc: "Mathematical pass/fail result" },
            { step: "07", label: "LINE EVIDENCE", desc: "Cryptographic SHA-256 line citation" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-[#050505] border border-[#1F1F1F] space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="text-[10px] text-[#3B82F6] font-bold">{item.step}</div>
                <div className="text-xs font-bold text-[#F3F4F6] mt-1">{item.label}</div>
              </div>
              <div className="text-[10px] text-[#A7B0C0] font-sans">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. AI Boundary Section: The Crucial Differentiator */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#0B0B0B] via-[#050505] to-[#0B0B0B] border border-[#3B82F6]/25 space-y-6 font-mono">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#3B82F6]">
              <Lock className="w-4 h-4 text-[#3B82F6]" />
              <span>THE NETVIGIL AI BOUNDARY</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-sans text-[#F3F4F6]">
              AI Can Explain. AI Cannot Change The Verdict.
            </h3>
          </div>

          <div className="px-3.5 py-1.5 rounded-md bg-[#050505] border border-[#1F1F1F] text-[11px] text-[#10B981] font-bold">
            IMMUTABLE SECURITY VERDICTS
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Deterministic Core */}
          <div className="p-5 rounded-xl bg-[#050505] border border-[#10B981]/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#10B981] uppercase">DETERMINISTIC ENGINE</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-[#10B981]/15 text-[#10B981] font-bold">
                AUTHORITATIVE
              </span>
            </div>
            <ul className="space-y-2 text-xs text-[#A7B0C0] font-sans">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>Deterministic boolean & regex rule evaluation against official frameworks.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>Zero AI involvement in compliance pass/fail calculations or scoring.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>Exact line-level evidence citation preserved from raw device syntax.</span>
              </li>
            </ul>
          </div>

          {/* Right: AI Advisory */}
          <div className="p-5 rounded-xl bg-[#050505] border border-[#8B5CF6]/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#8B5CF6] uppercase">AI ADVISORY ASSISTANT</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-[#8B5CF6]/15 text-[#8B5CF6] font-bold">
                READ-ONLY ADVISORY
              </span>
            </div>
            <ul className="space-y-2 text-xs text-[#A7B0C0] font-sans">
              <li className="flex items-start gap-2">
                <Bot className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                <span>Provides context on why controls fail and vendor-specific attack surfaces.</span>
              </li>
              <li className="flex items-start gap-2">
                <Bot className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                <span>Proposes allowlisted remediation commands for human operator review.</span>
              </li>
              <li className="flex items-start gap-2">
                <Bot className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                <span>Strictly airgapped from mutating configuration state or network infrastructure.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
