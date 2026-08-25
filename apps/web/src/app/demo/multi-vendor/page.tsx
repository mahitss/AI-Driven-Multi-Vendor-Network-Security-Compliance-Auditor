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
  Play,
  RotateCcw,
  Sparkles,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MultiVendorProofPage() {
  const [activeTab, setActiveTab] = useState<"compare" | "cisco" | "juniper" | "fortinet" | "unsupported">("compare");
  const [pipelineAnimating, setPipelineAnimating] = useState(false);

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
    onMutate: () => {
      setPipelineAnimating(true);
    },
    onSettled: () => {
      setTimeout(() => setPipelineAnimating(false), 800);
    },
  });

  const handleRerun = () => {
    mutation.mutate();
    refetch();
  };

  const ciscoData = proofState?.vendors?.cisco;
  const juniperData = proofState?.vendors?.juniper;
  const fortinetData = proofState?.vendors?.fortinet;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-[#111111] text-[#00D9FF] border border-[#00D9FF]/30">
              ENTERPRISE SECURITY INTELLIGENCE
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] bg-[#111111] text-[#22C55E] border border-[#22C55E]/30 font-semibold">
              DETERMINISTIC MULTI-VENDOR ENGINE
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#F5F5F5] flex items-center gap-2.5 font-mono">
            <Layers className="w-7 h-7 text-[#00D9FF]" />
            <span>MULTI-VENDOR SECURITY PROOF</span>
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1 max-w-2xl font-sans leading-relaxed">
            Three vendor dialects. One Universal Security Model. One shared deterministic compliance engine.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto font-mono text-xs">
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E0E0E] hover:bg-[#141414] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#1A1A1A] transition-colors"
          >
            <span>← Pipeline Inspector</span>
          </Link>

          <button
            onClick={handleRerun}
            disabled={isLoading || mutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isLoading || mutation.isPending) && "animate-spin")} />
            <span>Re-evaluate Multi-Vendor Pipeline</span>
          </button>
        </div>
      </div>

      {/* Loading / Error States */}
      {isError && (
        <div className="p-8 rounded-xl bg-[#0A0A0A] border border-[#EF4444]/30 text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mx-auto">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">DATA SOURCE UNAVAILABLE</div>
            <div className="text-[11px] text-[#EF4444] mt-1">
              {error instanceof Error ? error.message : "Failed to execute multi-vendor verification pipeline."}
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0D0D0D] hover:bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/40 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Request</span>
          </button>
        </div>
      )}

      {isLoading && (
        <div className="p-16 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center space-y-3 font-mono">
          <RefreshCw className="w-6 h-6 animate-spin text-[#00D9FF] mx-auto" />
          <div className="text-sm font-bold text-[#F5F5F5]">Executing Multi-Vendor Normalization Pipeline...</div>
          <p className="text-xs text-[#666666]">
            Parsing Cisco IOS, Juniper JunOS, and Fortinet FortiOS configs through AST parsers and evaluating shared compliance.
          </p>
        </div>
      )}

      {proofState && (
        <>
          {/* Animated Pipeline Diagram */}
          <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#F5F5F5] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00D9FF]" />
                <span>CROSS-VENDOR ARCHITECTURAL FLOW PIPELINE</span>
              </span>
              <span className="text-[10px] text-[#22C55E] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping" />
                <span>SHARED DETERMINISTIC CORE</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {/* Stage 1: Vendor Dialects */}
              <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] space-y-2">
                <div className="text-[10px] text-[#666666] uppercase font-bold">Stage 1: Raw Dialects</div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between p-1.5 rounded bg-[#141414] border border-[#222222]">
                    <span className="text-[#00D9FF] font-semibold">Cisco IOS</span>
                    <span className="text-[9px] text-[#888888]">cisco-core-router.cfg</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-[#141414] border border-[#222222]">
                    <span className="text-[#8B5CF6] font-semibold">Juniper JunOS</span>
                    <span className="text-[9px] text-[#888888]">insecure-srx.conf</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-[#141414] border border-[#222222]">
                    <span className="text-[#F59E0B] font-semibold">Fortinet FortiOS</span>
                    <span className="text-[9px] text-[#888888]">insecure-firewall.conf</span>
                  </div>
                </div>
              </div>

              {/* Stage 2: AST Parsers */}
              <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] space-y-2">
                <div className="text-[10px] text-[#666666] uppercase font-bold">Stage 2: Deterministic Parsers</div>
                <div className="space-y-1 text-[11px]">
                  <div className="p-1.5 rounded bg-[#141414] border border-[#222222] text-[#A3A3A3]">
                    <span className="text-white font-semibold">Cisco AST:</span> Block & Context Scanner
                  </div>
                  <div className="p-1.5 rounded bg-[#141414] border border-[#222222] text-[#A3A3A3]">
                    <span className="text-white font-semibold">Junos AST:</span> Hierarchical & Set-Syntax
                  </div>
                  <div className="p-1.5 rounded bg-[#141414] border border-[#222222] text-[#A3A3A3]">
                    <span className="text-white font-semibold">FortiOS AST:</span> Config-Block State Machine
                  </div>
                </div>
              </div>

              {/* Stage 3: Universal Security Model */}
              <div className="p-3 rounded-lg bg-[#00D9FF]/5 border border-[#00D9FF]/30 space-y-2">
                <div className="text-[10px] text-[#00D9FF] uppercase font-bold">Stage 3: Universal Model</div>
                <div className="p-2 rounded bg-[#0A0A0A] border border-[#00D9FF]/20 text-[10px] text-[#D4D4D4] space-y-1">
                  <div className="font-semibold text-white">8 Standardized Security Domains:</div>
                  <div className="text-[#A3A3A3]">
                    • Identity • Remote Access<br />
                    • Authentication • Authorization<br />
                    • Logging • Time Sync<br />
                    • Access Control • Network Sec
                  </div>
                </div>
              </div>

              {/* Stage 4: Shared Compliance Engine */}
              <div className="p-3 rounded-lg bg-[#22C55E]/5 border border-[#22C55E]/30 space-y-2">
                <div className="text-[10px] text-[#22C55E] uppercase font-bold">Stage 4: Unified Outputs</div>
                <div className="space-y-1 text-[11px]">
                  <div className="p-1.5 rounded bg-[#141414] border border-[#222222] flex items-center justify-between">
                    <span className="text-white font-semibold">Compliance:</span>
                    <span className="text-[#22C55E]">CIS / NIST / STIG / ISO</span>
                  </div>
                  <div className="p-1.5 rounded bg-[#141414] border border-[#222222] flex items-center justify-between">
                    <span className="text-white font-semibold">Risk Engine:</span>
                    <span className="text-[#F59E0B]">P0 - P3 Correlation</span>
                  </div>
                  <div className="p-1.5 rounded bg-[#141414] border border-[#222222] flex items-center justify-between">
                    <span className="text-white font-semibold">Remediation:</span>
                    <span className="text-[#00D9FF]">Allowlisted Diffs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-2 font-mono text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab("compare")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "compare"
                  ? "bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/40"
                  : "text-[#A3A3A3] hover:text-[#F5F5F5]"
              )}
            >
              <Sparkles className="w-4 h-4 text-[#00D9FF]" />
              <span>COMPARE ALL (Side-by-Side Matrix)</span>
            </button>

            <button
              onClick={() => setActiveTab("cisco")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "cisco"
                  ? "bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/40"
                  : "text-[#A3A3A3] hover:text-[#F5F5F5]"
              )}
            >
              <Server className="w-4 h-4" />
              <span>Cisco IOS ({ciscoData?.device_name || "CORE-RTR-01"})</span>
            </button>

            <button
              onClick={() => setActiveTab("juniper")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "juniper"
                  ? "bg-[#141414] text-[#8B5CF6] border border-[#8B5CF6]/40"
                  : "text-[#A3A3A3] hover:text-[#F5F5F5]"
              )}
            >
              <Server className="w-4 h-4" />
              <span>Juniper JunOS ({juniperData?.device_name || "LAB-JUNIPER-SRX-02"})</span>
            </button>

            <button
              onClick={() => setActiveTab("fortinet")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "fortinet"
                  ? "bg-[#141414] text-[#F59E0B] border border-[#F59E0B]/40"
                  : "text-[#A3A3A3] hover:text-[#F5F5F5]"
              )}
            >
              <Server className="w-4 h-4" />
              <span>Fortinet FortiOS ({fortinetData?.device_name || "LAB-FORTIGATE-02"})</span>
            </button>

            <button
              onClick={() => setActiveTab("unsupported")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap",
                activeTab === "unsupported"
                  ? "bg-[#141414] text-[#EF4444] border border-[#EF4444]/40"
                  : "text-[#A3A3A3] hover:text-[#F5F5F5]"
              )}
            >
              <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
              <span>Unsupported Vendor Scenario</span>
            </button>
          </div>

          {/* TAB 1: COMPARE ALL (Side-by-Side Matrix) */}
          {activeTab === "compare" && (
            <div className="space-y-6 font-mono text-xs">
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: "cisco", data: ciscoData, color: "#00D9FF", label: "Cisco IOS-XE" },
                  { key: "juniper", data: juniperData, color: "#8B5CF6", label: "Juniper JunOS" },
                  { key: "fortinet", data: fortinetData, color: "#F59E0B", label: "Fortinet FortiOS" },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4" style={{ color: item.color }} />
                        <span className="font-bold text-[#F5F5F5]">{item.label}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#141414] border border-[#242424] text-[#A3A3A3]">
                        {item.data?.device_name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
                        <div className="text-[9px] text-[#666666] uppercase">Compliance Score</div>
                        <div className="text-base font-bold text-[#EF4444] mt-0.5">
                          {item.data?.compliance_score?.toFixed(0) ?? 0}%
                        </div>
                      </div>

                      <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
                        <div className="text-[9px] text-[#666666] uppercase">Facts Extracted</div>
                        <div className="text-base font-bold text-[#F5F5F5] mt-0.5">
                          {item.data?.facts_extracted_count ?? 0}
                        </div>
                      </div>

                      <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
                        <div className="text-[9px] text-[#666666] uppercase">Open Findings</div>
                        <div className="text-base font-bold text-[#F59E0B] mt-0.5">
                          {item.data?.total_findings ?? 0}
                        </div>
                      </div>

                      <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
                        <div className="text-[9px] text-[#666666] uppercase">Total Latency</div>
                        <div className="text-base font-bold text-[#00D9FF] mt-0.5">
                          {item.data?.latency?.total_ms ?? 0}ms
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Side-by-Side Normalization Comparison Matrix */}
              <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-[#F5F5F5] text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#00D9FF]" />
                      <span>UNIVERSAL SECURITY MODEL NORMALIZATION MATRIX</span>
                    </h3>
                    <p className="text-[11px] text-[#888888] font-sans mt-0.5">
                      Empirical evidence demonstrating semantic convergence across disparate CLI syntax structures.
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/20 self-start sm:self-auto">
                    LIVE DETERMINISTIC AST OUTPUT
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-[#1A1A1A]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#1A1A1A] bg-[#0E0E0E] text-[#888888] text-[10px] uppercase font-semibold">
                        <th className="p-3 w-1/4">Security Property & Standard</th>
                        <th className="p-3 w-1/4 text-[#00D9FF]">Cisco IOS Syntax</th>
                        <th className="p-3 w-1/4 text-[#8B5CF6]">Juniper JunOS Syntax</th>
                        <th className="p-3 w-1/4 text-[#F59E0B]">Fortinet FortiOS Syntax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]">
                      {proofState.comparison_matrix.map((row) => (
                        <tr key={row.property_key} className="hover:bg-[#0D0D0D] transition-colors">
                          <td className="p-3 align-top">
                            <div className="font-bold text-[#F5F5F5]">{row.display_name}</div>
                            <div className="text-[10px] text-[#666666] font-mono mt-0.5">{row.property_key}</div>
                            <div className="text-[10px] text-[#00D9FF]/80 mt-1">{row.target_standard}</div>
                            <div className="mt-2 text-[9px] px-1.5 py-0.5 rounded bg-[#141414] text-[#A3A3A3] border border-[#242424] inline-block">
                              {row.equivalence_verdict}
                            </div>
                          </td>

                          {/* Cisco Column */}
                          <td className="p-3 align-top bg-[#050505]/40">
                            <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A] space-y-1.5">
                              <div className="font-mono text-[#F5F5F5] text-[11px] bg-[#050505] p-1.5 rounded border border-[#1A1A1A]">
                                {row.cisco.syntax}
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-[#666666]">
                                  {row.cisco.line ? `Line ${row.cisco.line}` : "Global"}
                                </span>
                                <span className={cn(
                                  "font-bold px-1.5 py-0.2 rounded text-[9px]",
                                  row.cisco.status.includes("FAIL") ? "text-[#EF4444] bg-[#EF4444]/10" : "text-[#22C55E] bg-[#22C55E]/10"
                                )}>
                                  {row.cisco.status}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Juniper Column */}
                          <td className="p-3 align-top bg-[#050505]/40">
                            <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A] space-y-1.5">
                              <div className="font-mono text-[#F5F5F5] text-[11px] bg-[#050505] p-1.5 rounded border border-[#1A1A1A]">
                                {row.juniper.syntax}
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-[#666666]">
                                  {row.juniper.line ? `Line ${row.juniper.line}` : "Global"}
                                </span>
                                <span className={cn(
                                  "font-bold px-1.5 py-0.2 rounded text-[9px]",
                                  row.juniper.status.includes("FAIL") ? "text-[#EF4444] bg-[#EF4444]/10" : "text-[#22C55E] bg-[#22C55E]/10"
                                )}>
                                  {row.juniper.status}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Fortinet Column */}
                          <td className="p-3 align-top bg-[#050505]/40">
                            <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A] space-y-1.5">
                              <div className="font-mono text-[#F5F5F5] text-[11px] bg-[#050505] p-1.5 rounded border border-[#1A1A1A]">
                                {row.fortinet.syntax}
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-[#666666]">
                                  {row.fortinet.line ? `Line ${row.fortinet.line}` : "Global"}
                                </span>
                                <span className={cn(
                                  "font-bold px-1.5 py-0.2 rounded text-[9px]",
                                  row.fortinet.status.includes("FAIL") ? "text-[#EF4444] bg-[#EF4444]/10" : "text-[#22C55E] bg-[#22C55E]/10"
                                )}>
                                  {row.fortinet.status}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Semantic Explanation Card */}
              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#8B5CF6]/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#F5F5F5]">
                  <Bot className="w-4 h-4 text-[#8B5CF6]" />
                  <span>AI ADVISORY • CROSS-VENDOR SEMANTIC REASONING</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#141414] text-[#8B5CF6] border border-[#8B5CF6]/20">
                    READ-ONLY
                  </span>
                </div>
                <p className="text-xs text-[#A3A3A3] font-sans leading-relaxed">
                  NetVigil's architecture solves the multi-vendor challenge by decoupling <strong>syntax ingestion</strong> from <strong>security semantics</strong>. Cisco expresses remote access via global <code className="text-[#00D9FF]">ip ssh version 1</code> and line transports; Juniper uses hierarchical <code className="text-[#8B5CF6]">system services telnet</code>; and Fortinet configures <code className="text-[#F59E0B]">set admin-sport 80</code>. Regardless of dialect syntax, NetVigil normalizes all 3 configurations into the exact same canonical property slots in the Universal Security Model, allowing the shared compliance and risk engines to calculate identical, mathematically sound audit verdicts.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2, 3, 4: Individual Vendor Deep-Dive */}
          {(activeTab === "cisco" || activeTab === "juniper" || activeTab === "fortinet") && (
            <SingleVendorDetailView
              vendorResult={
                activeTab === "cisco" ? ciscoData : activeTab === "juniper" ? juniperData : fortinetData
              }
            />
          )}

          {/* TAB 5: Unsupported Vendor Handling */}
          {activeTab === "unsupported" && (
            <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#EF4444]/30 space-y-5 font-mono text-xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F5F5F5]">
                    {proofState.unsupported_vendor_example.status}: {proofState.unsupported_vendor_example.vendor_name}
                  </h3>
                  <p className="text-xs text-[#A3A3A3] font-sans mt-1">
                    {proofState.unsupported_vendor_example.message}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] space-y-2">
                  <div className="text-[10px] text-[#EF4444] font-bold uppercase">Zero Fake AST Guarantee</div>
                  <p className="text-[11px] text-[#888888] font-sans leading-relaxed">
                    NetVigil strictly guarantees that native parsers are NEVER faked. If an enterprise presents an Arista EOS or Huawei VRP configuration, the engine will never hallucinate parser confidence.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#0D0D0D] border border-[#8B5CF6]/30 space-y-2">
                  <div className="text-[10px] text-[#8B5CF6] font-bold uppercase">Adaptive Training Fallback</div>
                  <p className="text-[11px] text-[#888888] font-sans leading-relaxed">
                    Instead of failing silently, unfamiliar vendor commands are passed to the <strong>Human-in-the-Loop Adaptive Training</strong> workflow. AI suggests a candidate mapping, the schema allowlist enforces strict safety, and an administrator signs off to expand the live knowledge base.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-[#242424] flex items-center justify-between">
                <span className="text-[#A3A3A3]">Explore the real Adaptive Training engine:</span>
                <Link
                  href="/adaptive-training"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00D9FF]/10 text-[#00D9FF] hover:bg-[#00D9FF]/20 font-semibold"
                >
                  <span>Open Adaptive Training Workflow →</span>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SingleVendorDetailView({ vendorResult }: { vendorResult?: MultiVendorDeviceResult }) {
  if (!vendorResult) {
    return <div className="p-8 text-center text-[#666666] font-mono">No data available for selected vendor.</div>;
  }

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Vendor Top Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Device Hostname</div>
          <div className="text-sm font-bold text-[#F5F5F5] mt-1">{vendorResult.device_name}</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Vendor / OS Platform</div>
          <div className="text-sm font-bold text-[#00D9FF] mt-1 uppercase">{vendorResult.platform}</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Parser Name</div>
          <div className="text-xs font-semibold text-[#D4D4D4] mt-1 truncate">{vendorResult.parser_name}</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Compliance Score</div>
          <div className="text-sm font-bold text-[#EF4444] mt-1">{vendorResult.compliance_score?.toFixed(0)}%</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Pipeline Latency</div>
          <div className="text-sm font-bold text-[#22C55E] mt-1">{vendorResult.latency.total_ms}ms</div>
        </div>
      </div>

      {/* Main 2-Column: Raw Config on Left, Universal Model Facts on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Raw Config Preview */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#F5F5F5] flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-[#00D9FF]" />
              <span>Raw Vendor Configuration Dialect</span>
            </span>
            <span className="text-[10px] text-[#666666]">Preview</span>
          </div>

          <pre className="flex-1 p-3 rounded-lg bg-[#050505] border border-[#1A1A1A] text-[11px] text-[#A3A3A3] overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed">
            {vendorResult.raw_content_preview}
          </pre>
        </div>

        {/* Right Column: Normalized Facts & Remediations */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-3">
            <h4 className="font-bold text-[#F5F5F5] text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00D9FF]" />
              <span>Normalized Universal Security Facts Extracted</span>
            </h4>

            <div className="overflow-x-auto rounded-lg border border-[#1A1A1A]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1A1A1A] bg-[#0E0E0E] text-[#666666] text-[9px] uppercase">
                    <th className="p-2.5">Security Property</th>
                    <th className="p-2.5">Normalized Value</th>
                    <th className="p-2.5">Verbatim CLI Evidence Citation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {Object.entries(vendorResult.normalized_facts).map(([key, fact]) => (
                    <tr key={key} className="hover:bg-[#0D0D0D]">
                      <td className="p-2.5 font-semibold text-[#D4D4D4]">{key}</td>
                      <td className="p-2.5">
                        <span className={cn(
                          "px-1.5 py-0.2 rounded text-[10px] font-bold",
                          fact.value === true ? "text-[#22C55E] bg-[#22C55E]/10" :
                          fact.value === false ? "text-[#EF4444] bg-[#EF4444]/10" :
                          "text-[#00D9FF] bg-[#00D9FF]/10"
                        )}>
                          {String(fact.value)}
                        </span>
                      </td>
                      <td className="p-2.5 text-[#888888] font-mono text-[10px]">
                        {fact.evidence && fact.evidence.length > 0 ? (
                          <div className="space-y-0.5">
                            {fact.evidence.map((ev, i) => (
                              <div key={i} className="text-[#A3A3A3]">
                                <span className="text-[#00D9FF]">[{fact.source_lines[i] ? `L${fact.source_lines[i]}` : "Ref"}]</span> {ev}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#555555]">Default inferred</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sample Allowlisted Remediation */}
          {vendorResult.sample_remediations.length > 0 && (
            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00D9FF]/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[#F5F5F5]">
                  <Wrench className="w-4 h-4 text-[#00D9FF]" />
                  <span>Allowlisted Native Remediation Template</span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/20">
                  REMEDIATION_CATALOG
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#050505] border border-[#1A1A1A] space-y-2">
                <div className="text-[11px] font-semibold text-white">
                  {vendorResult.sample_remediations[0].title}
                </div>
                <pre className="p-2 rounded bg-[#0A0A0A] border border-[#222222] text-[10px] text-[#22C55E] font-mono overflow-x-auto whitespace-pre-wrap">
                  {vendorResult.sample_remediations[0].commands}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
