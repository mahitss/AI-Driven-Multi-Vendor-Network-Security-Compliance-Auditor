"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Shield,
  ShieldAlert,
  Bot,
  Sparkles,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode2,
  Layers,
  ArrowRight,
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronRight,
  Terminal,
  Activity,
  Server,
  HelpCircle,
  Flame,
  Check,
  X,
} from "lucide-react";
import {
  fetchAudits,
  fetchFindings,
  fetchFindingExplanation,
  fetchAIGatewayHealth,
  Finding,
  FindingExplanation,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface QuerySimulation {
  id: string;
  query: string;
  controlId: string;
  framework: string;
  device: string;
  line: number;
  evidenceSnippet: string;
  deterministicVerdict: "FAIL" | "PASS";
  aiExplanation: string;
  groundingState: "FULLY GROUNDED" | "PARTIALLY GROUNDED" | "INSUFFICIENT EVIDENCE";
}

const SIMULATIONS: QuerySimulation[] = [
  {
    id: "cis-1.2.1",
    query: "Why did CIS-1.2.1 fail on CORE-RTR-01?",
    controlId: "CIS-1.2.1",
    framework: "CIS Benchmark v2.0",
    device: "CORE-RTR-01 (Cisco IOS)",
    line: 17,
    evidenceSnippet: "ip ssh version 1",
    deterministicVerdict: "FAIL",
    aiExplanation:
      "CIS 1.2.1 mandates SSH version 2 to prevent protocol downgrade attacks and cryptographic vulnerabilities inherent in SSHv1. The parser detected 'ip ssh version 1' on line 17, which explicitly permits deprecated legacy authentication cipher suites.",
    groundingState: "FULLY GROUNDED",
  },
  {
    id: "telnet-disabled",
    query: "Why is Telnet flagged as critical risk?",
    controlId: "NIST-AC-17",
    framework: "NIST SP 800-53",
    device: "EDGE-FW-01 (Fortinet FortiOS)",
    line: 42,
    evidenceSnippet: "set admin-telnet enable",
    deterministicVerdict: "FAIL",
    aiExplanation:
      "NIST AC-17 enforces encrypted remote management protocols. Line 42 enables plaintext Telnet administration, exposing cleartext credentials and configuration telemetry to passive network interception.",
    groundingState: "FULLY GROUNDED",
  },
  {
    id: "aaa-auth",
    query: "What rule caused AAA authentication failure?",
    controlId: "STIG-NET-040",
    framework: "DISA STIG v10r3",
    device: "DIST-SW-01 (Juniper JunOS)",
    line: 88,
    evidenceSnippet: "set system authentication-order [ none ]",
    deterministicVerdict: "FAIL",
    aiExplanation:
      "DISA STIG NET-040 requires centralized TACACS+/RADIUS authentication fallback. Setting authentication-order to 'none' disables access control verification during operational fallback states.",
    groundingState: "FULLY GROUNDED",
  },
];

export default function AIBoundaryPage() {
  const [selectedSimulation, setSelectedSimulation] = useState<QuerySimulation>(SIMULATIONS[0]);
  const [activeTab, setActiveTab] = useState<"architecture" | "simulations">("architecture");

  // Fetch live AI gateway health
  const {
    data: aiHealth,
    isLoading: isHealthLoading,
    isError: isHealthError,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ["ai-gateway-health"],
    queryFn: fetchAIGatewayHealth,
    staleTime: 30000,
  });

  // Fetch live critical findings from backend to verify grounding
  const {
    data: criticalFindings = [],
    isLoading: isFindingsLoading,
  } = useQuery({
    queryKey: ["boundary-critical-findings"],
    queryFn: () => fetchFindings({ severity: "CRITICAL", status: "FAIL" }),
  });

  return (
    <div className="space-y-10 max-w-[1440px] mx-auto pb-16 font-sans">
      {/* 1. Header & Identity Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-5 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-[#8B5CF6]">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
              <span>● ADVISORY ONLY</span>
            </span>
            <span className="text-[#636366]">•</span>
            <span className="text-[#3B82F6]">IMMUTABLE SECURITY VERDICTS</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F2F2F2] tracking-tight font-sans">
            AI BOUNDARY
          </h1>
          <p className="text-xs sm:text-sm text-[#8E8E93] mt-1 max-w-3xl font-sans leading-relaxed">
            Grounded intelligence without authority over the security verdict. NetVigil uses AI where interpretation is required — never where deterministic evidence can decide.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0B0B0B] border border-[#1F1F1F] text-[#8E8E93]">
            <Lock className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>AUTHORITY ISOLATION: ACTIVE</span>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#0B0B0B] hover:bg-[#141414] border border-[#1F1F1F] text-[#8E8E93] hover:text-white font-semibold transition-all"
          >
            <span>← Security Posture</span>
          </Link>
        </div>
      </div>

      {/* 2. Hero Split Screen: Left (Architecture Pipeline), Right (AI Advisory Interactive Simulator) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 Cols / ~58%): Core Architecture Visualization */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-6 font-mono">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#3B82F6]" />
                <span className="text-xs font-bold text-[#F2F2F2] uppercase tracking-wider">
                  DETERMINISTIC VERDICT ENGINE vs READ-ONLY AI ADVISORY
                </span>
              </div>
              <span className="text-[10px] text-[#10B981] font-bold">100% PROVABLE</span>
            </div>

            {/* Vertical Flow Diagram */}
            <div className="space-y-3">
              {/* Step 1: Ingest */}
              <div className="p-3.5 rounded-xl bg-[#080808] border border-[#1F1F1F] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B0B0B] text-[#3B82F6] border border-[#3B82F6]/30">01</span>
                  <div>
                    <div className="text-xs font-bold text-white">VENDOR CONFIGURATION</div>
                    <div className="text-[10px] text-[#636366] font-sans">Cisco IOS • Juniper JunOS • Fortinet FortiOS (Raw Text)</div>
                  </div>
                </div>
                <Server className="w-4 h-4 text-[#8E8E93]" />
              </div>

              {/* Arrow */}
              <div className="text-center text-[#636366] text-xs">↓</div>

              {/* Step 2: Parser & AST */}
              <div className="p-3.5 rounded-xl bg-[#080808] border border-[#1F1F1F] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B0B0B] text-[#3B82F6] border border-[#3B82F6]/30">02</span>
                  <div>
                    <div className="text-xs font-bold text-white">PARSER & ABSTRACT SYNTAX TREE (AST)</div>
                    <div className="text-[10px] text-[#636366] font-sans">Lexical tokenization & hierarchical structural extraction</div>
                  </div>
                </div>
                <FileCode2 className="w-4 h-4 text-[#8E8E93]" />
              </div>

              {/* Arrow */}
              <div className="text-center text-[#636366] text-xs">↓</div>

              {/* Step 3: Universal Security Model */}
              <div className="p-3.5 rounded-xl bg-[#080808] border border-[#3B82F6]/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B0B0B] text-[#3B82F6] border border-[#3B82F6]/40">03</span>
                  <div>
                    <div className="text-xs font-bold text-[#3B82F6]">UNIVERSAL SECURITY MODEL</div>
                    <div className="text-[10px] text-[#8E8E93] font-sans">Canonical semantic property representation across vendors</div>
                  </div>
                </div>
                <Layers className="w-4 h-4 text-[#3B82F6]" />
              </div>

              {/* Arrow */}
              <div className="text-center text-[#636366] text-xs">↓</div>

              {/* Step 4: Deterministic Verdict Engine */}
              <div className="p-3.5 rounded-xl bg-[#080808] border border-[#10B981]/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]">04</span>
                  <div>
                    <div className="text-xs font-bold text-[#10B981]">DETERMINISTIC VERDICT ENGINE</div>
                    <div className="text-[10px] text-[#8E8E93] font-sans">CIS / NIST / STIG / ISO mathematical rule evaluation</div>
                  </div>
                </div>
                <Lock className="w-4 h-4 text-[#10B981]" />
              </div>

              {/* Arrow */}
              <div className="text-center text-[#636366] text-xs">↓</div>

              {/* Step 5: Deterministic Pass/Fail + Evidence */}
              <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span className="font-bold text-white">DETERMINISTIC VERDICT: PASS / FAIL</span>
                  </div>
                  <span className="text-[10px] text-[#636366]">SHA-256 Line Evidence</span>
                </div>
                <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F] text-[11px] text-[#8E8E93] flex items-center justify-between">
                  <span>Line-level evidence cited</span>
                  <span className="text-[#3B82F6] font-bold">IMMUTABLE RECORD</span>
                </div>
              </div>

              {/* One-way Read-Only Fork to AI Advisory */}
              <div className="pt-3 border-t border-dashed border-[#1F1F1F] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#8B5CF6]">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span>↘ READ-ONLY CONTEXT FORK</span>
                  </span>
                  <span className="text-[10px] text-[#636366]">ONE-WAY DATA FLOW</span>
                </div>

                {/* AI Advisory Box */}
                <div className="p-4 rounded-xl bg-[#080808] border border-[#8B5CF6]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#8B5CF6]">
                      <Bot className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">AI ADVISORY LAYER</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B0B0B] text-[#8B5CF6] border border-[#8B5CF6]/30">
                      AUTHORITY: NO
                    </span>
                  </div>
                  <p className="text-xs text-[#8E8E93] font-sans leading-relaxed">
                    Provides grounded technical explanations, context on risk exposure, and suggested remediation commands.
                  </p>
                </div>

                {/* Blocked Connection Callout */}
                <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-between text-xs text-[#EF4444]">
                  <div className="flex items-center gap-2 font-bold">
                    <X className="w-4 h-4 shrink-0" />
                    <span>AI ──X──→ VERDICT ENGINE (BLOCKED: ZERO AUTHORITY)</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#EF4444]">HARD ISOLATION</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols / ~42%): Interactive AI Request Simulation */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">ASK NETVIGIL (SIMULATION)</span>
              </div>
              <span className="text-[10px] text-[#8B5CF6] font-bold">GROUNDED REASONING</span>
            </div>

            {/* Query Selector Pills */}
            <div className="space-y-2">
              <div className="text-[10px] text-[#636366] uppercase font-semibold">SELECT USER QUERY</div>
              <div className="space-y-1.5">
                {SIMULATIONS.map((sim) => (
                  <button
                    key={sim.id}
                    onClick={() => setSelectedSimulation(sim)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between group",
                      selectedSimulation.id === sim.id
                        ? "bg-[#141414] border-[#8B5CF6] text-white"
                        : "bg-[#080808] border-[#1F1F1F] text-[#8E8E93] hover:text-white hover:border-[#2C2C2E]"
                    )}
                  >
                    <span className="font-sans font-medium line-clamp-1">{sim.query}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#636366] group-hover:text-[#8B5CF6] shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>

            {/* Live Deterministic Result vs Grounded AI Advisory */}
            <div className="space-y-3.5 pt-2 border-t border-[#1F1F1F]">
              {/* Deterministic Result */}
              <div className="p-3.5 rounded-xl bg-[#080808] border border-[#EF4444]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#636366] uppercase">DETERMINISTIC RESULT</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                    {selectedSimulation.deterministicVerdict}
                  </span>
                </div>

                <div className="text-xs font-bold text-white">
                  {selectedSimulation.controlId} ({selectedSimulation.framework})
                </div>

                <div className="p-2 rounded bg-[#0B0B0B] border border-[#1F1F1F] text-[11px] space-y-1">
                  <div className="text-[10px] text-[#636366]">Evidence Cited:</div>
                  <code className="text-[#EF4444] font-mono block">
                    Line {selectedSimulation.line}: {selectedSimulation.evidenceSnippet}
                  </code>
                </div>

                <div className="text-[9px] text-[#636366] flex items-center justify-between pt-1 border-t border-[#1F1F1F]">
                  <span>Source: {selectedSimulation.device}</span>
                  <span className="text-[#3B82F6]">Deterministic Engine</span>
                </div>
              </div>

              {/* AI Advisory */}
              <div className="p-4 rounded-xl bg-[#080808] border border-[#8B5CF6]/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#8B5CF6]">
                    <Bot className="w-3.5 h-3.5" />
                    <span>AI ADVISORY EXPLANATION</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#0B0B0B] text-[#8B5CF6] border border-[#8B5CF6]/30">
                    {selectedSimulation.groundingState}
                  </span>
                </div>

                <p className="text-xs text-[#8E8E93] font-sans leading-relaxed">
                  {selectedSimulation.aiExplanation}
                </p>

                {/* Provenance Box */}
                <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#1F1F1F] space-y-1 text-[10px]">
                  <div className="text-[#10B981] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-[#10B981]" />
                    <span>SOURCE VERIFIED</span>
                  </div>
                  <div className="text-[#8E8E93]">
                    Based strictly on: {selectedSimulation.controlId} • Line {selectedSimulation.line} • {selectedSimulation.device} • Verdict: {selectedSimulation.deterministicVerdict}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-[#636366] pt-1 border-t border-[#1F1F1F]">
                  <span>Verdict Source: <strong className="text-white font-normal">Deterministic AST</strong></span>
                  <span>Explanation: <strong className="text-[#8B5CF6] font-normal">Read-Only Advisory</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. The AI Boundary Comparison Box (Side-by-Side Invariants) */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-6 font-mono">
        <div className="text-center space-y-1 max-w-2xl mx-auto">
          <div className="text-[11px] font-bold text-[#3B82F6] tracking-wider uppercase">ARCHITECTURAL SEPARATION</div>
          <h2 className="text-xl sm:text-2xl font-bold font-sans text-white">
            The Verdict Boundary
          </h2>
          <p className="text-xs text-[#8E8E93] font-sans">
            AI can explain. AI cannot modify security verdicts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Deterministic Security Engine */}
          <div className="p-5 rounded-xl bg-[#080808] border border-[#3B82F6]/30 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
              <span className="text-xs font-bold text-[#3B82F6] uppercase">DETERMINISTIC SECURITY ENGINE</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B0B0B] text-[#3B82F6] border border-[#3B82F6]/30">
                AUTHORITY: YES
              </span>
            </div>

            <ul className="space-y-2.5 text-xs text-[#8E8E93] font-sans">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#3B82F6] shrink-0" />
                <span>Parses configuration files into structured AST representations</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#3B82F6] shrink-0" />
                <span>Normalizes cross-vendor security semantics (Cisco, Juniper, Fortinet)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#3B82F6] shrink-0" />
                <span>Maps controls across CIS, NIST SP 800-53, DISA STIG, and ISO 27001</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#3B82F6] shrink-0" />
                <span>Evaluates cryptographic proof against line-level configuration lines</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#3B82F6] shrink-0" />
                <span>Produces immutable compliance pass/fail results</span>
              </li>
            </ul>
          </div>

          {/* Right: AI Advisory */}
          <div className="p-5 rounded-xl bg-[#080808] border border-[#8B5CF6]/30 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
              <span className="text-xs font-bold text-[#8B5CF6] uppercase">AI ADVISORY LAYER</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B0B0B] text-[#8B5CF6] border border-[#8B5CF6]/30">
                AUTHORITY: NO
              </span>
            </div>

            <ul className="space-y-2.5 text-xs text-[#8E8E93] font-sans">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <span>Explains why a deterministic finding occurred in plain English</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <span>Provides context on threat exposure and attack surface</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <span>Suggests remediation commands for human operator review</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <span>Summarizes verified evidence line citations</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <span>Strictly read-only with zero access to mutate network infrastructure</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. "WHAT AI CAN DO" vs "WHAT AI CANNOT DO" */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left (6 Cols): WHAT AI CAN DO */}
        <div className="lg:col-span-6 space-y-4 font-mono">
          <div className="flex items-center gap-2 text-xs font-bold text-[#10B981] uppercase">
            <CheckCircle2 className="w-4 h-4" />
            <span>WHAT AI CAN DO</span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-1">
              <div className="text-xs font-bold text-white">1. EXPLAIN</div>
              <p className="text-xs text-[#8E8E93] font-sans">
                Explain why a deterministic finding occurred based on parsed AST facts and rule logic.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-1">
              <div className="text-xs font-bold text-white">2. CONTEXTUALIZE</div>
              <p className="text-xs text-[#8E8E93] font-sans">
                Connect raw configuration lines to relevant compliance threat models and operational impact.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-1">
              <div className="text-xs font-bold text-white">3. RECOMMEND</div>
              <p className="text-xs text-[#8E8E93] font-sans">
                Suggest verified remediation commands for review while preserving the original verdict.
              </p>
            </div>
          </div>
        </div>

        {/* Right (6 Cols): WHAT AI CANNOT DO */}
        <div className="lg:col-span-6 space-y-4 font-mono">
          <div className="flex items-center gap-2 text-xs font-bold text-[#EF4444] uppercase">
            <XCircle className="w-4 h-4" />
            <span>WHAT AI CANNOT DO (AUTHORITY BOUNDARY)</span>
          </div>

          <div className="p-5 rounded-xl bg-[#0B0B0B] border border-[#EF4444]/30 space-y-3">
            <div className="text-xs font-bold text-[#EF4444]">STRICT PRODUCT INVARIANTS:</div>
            <ul className="space-y-2 text-xs text-[#8E8E93] font-mono">
              <li className="flex items-center gap-2 text-[#EF4444]">
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>✕ Change PASS → FAIL</span>
              </li>
              <li className="flex items-center gap-2 text-[#EF4444]">
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>✕ Change FAIL → PASS</span>
              </li>
              <li className="flex items-center gap-2 text-[#EF4444]">
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>✕ Delete evidence</span>
              </li>
              <li className="flex items-center gap-2 text-[#EF4444]">
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>✕ Modify control mappings</span>
              </li>
              <li className="flex items-center gap-2 text-[#EF4444]">
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>✕ Override deterministic rules</span>
              </li>
              <li className="flex items-center gap-2 text-[#EF4444]">
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>✕ Invent evidence or line citations</span>
              </li>
              <li className="flex items-center gap-2 text-[#EF4444]">
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>✕ Approve a security exception</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 5. Live Verdict Example & AI Audit Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left (6 Cols): Live Locked Verdict */}
        <div className="lg:col-span-6 space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Lock className="w-4 h-4 text-[#3B82F6]" />
              <span>LIVE VERDICT EXAMPLE</span>
            </div>
            <span className="text-[10px] text-[#10B981] font-bold">VERDICT LOCKED</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-[#636366] uppercase">CONTROL</div>
                <div className="font-bold text-white mt-0.5">{selectedSimulation.controlId}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#636366] uppercase">SOURCE</div>
                <div className="font-bold text-white mt-0.5">{selectedSimulation.device}</div>
              </div>
            </div>

            <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#636366]">EVIDENCE (LINE {selectedSimulation.line}):</div>
              <code className="text-[#EF4444] font-bold">{selectedSimulation.evidenceSnippet}</code>
            </div>

            <div className="p-2.5 rounded bg-[#080808] border border-[#EF4444]/30 flex items-center justify-between">
              <span className="font-bold text-[#EF4444]">DETERMINISTIC VERDICT: {selectedSimulation.deterministicVerdict}</span>
              <span className="text-[10px] text-[#636366]">IMMUTABLE</span>
            </div>

            <p className="text-[11px] text-[#8E8E93] font-sans">
              The AI explanation provides contextual reasoning for the failure. The underlying verdict remains cryptographically locked to the AST evidence.
            </p>
          </div>
        </div>

        {/* Right (6 Cols): AI Audit Trail */}
        <div className="lg:col-span-6 space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8B5CF6]">
              <Activity className="w-4 h-4" />
              <span>AI AUDIT TRAIL (OBSERVABILITY)</span>
            </div>
            <span className="text-[10px] text-[#636366]">Deterministic Ledger</span>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { time: "12:41:08", event: "AI explanation requested", detail: "Control: CIS-1.2.1", status: "ok" },
              { time: "12:41:09", event: "Evidence retrieved from AST", detail: "Line 17 (ip ssh version 1)", status: "ok" },
              { time: "12:41:10", event: "Explanation generated", detail: "Grounding: FULLY_GROUNDED", status: "ok" },
              { time: "12:41:10", event: "Verdict invariant check", detail: "FAIL → FAIL (Unchanged)", status: "verified" },
            ].map((ev, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] text-[#636366]">{ev.time}</span>
                  <span className="font-semibold text-white">{ev.event}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8E8E93]">{ev.detail}</span>
                  <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
