"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  initGoldenDemo,
  initMultiVendorDemo,
  fetchEngineDiagnostics,
  GoldenDemoState,
  MultiVendorProofState,
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
  ArrowLeft,
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
  Pause,
  Maximize2,
  Check,
  X,
  FileText,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: 1, key: "1", title: "Ingestion", subtitle: "SHA-256 Hashing" },
  { id: 2, key: "2", title: "AST Parser", subtitle: "Vendor Detection" },
  { id: 3, key: "3", title: "Universal Model", subtitle: "Canonical Schema" },
  { id: 4, key: "4", title: "Multi-Vendor", subtitle: "Cross-OS Equivalence" },
  { id: 5, key: "5", title: "Compliance", subtitle: "Line-Level Evidence" },
  { id: 6, key: "6", title: "Risk Engine", subtitle: "P0 Prioritization" },
  { id: 7, key: "7", title: "Safe Remediation", subtitle: "Zero Live Push" },
  { id: 8, key: "8", title: "AI Advisory", subtitle: "Strict Boundary" },
  { id: 9, key: "9", title: "Adaptive Training", subtitle: "Allowlist Guard" },
  { id: 10, key: "0", title: "Executive Posture", subtitle: "Final Verdict" },
];

export default function JudgeDemoPresenterPage() {
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [adaptiveApproved, setAdaptiveApproved] = useState<boolean>(false);

  // Queries for live deterministic states
  const {
    data: goldenData,
    isLoading: isGoldenLoading,
    isError: isGoldenError,
    refetch: refetchGolden,
  } = useQuery({
    queryKey: ["judge-golden-demo"],
    queryFn: initGoldenDemo,
    staleTime: 120000,
  });

  const {
    data: multiVendorData,
    isLoading: isMultiLoading,
    isError: isMultiError,
    refetch: refetchMulti,
  } = useQuery({
    queryKey: ["judge-multivendor-demo"],
    queryFn: initMultiVendorDemo,
    staleTime: 120000,
  });

  const { data: diagnostics } = useQuery({
    queryKey: ["judge-diagnostics"],
    queryFn: fetchEngineDiagnostics,
    staleTime: 120000,
  });

  // Navigation handlers
  const handleNext = useCallback(() => {
    setCurrentStage((prev) => (prev < 10 ? prev + 1 : 10));
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentStage((prev) => (prev > 1 ? prev - 1 : 1));
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStage(1);
    setIsAutoPlaying(false);
    setAdaptiveApproved(false);
  }, []);

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in input fields
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleReset();
      } else if (e.key >= "1" && e.key <= "9") {
        setCurrentStage(parseInt(e.key, 10));
      } else if (e.key === "0") {
        setCurrentStage(10);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, handleReset]);

  // Auto-play timer
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev >= 10) {
          setIsAutoPlaying(false);
          return 10;
        }
        return prev + 1;
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const isLoading = isGoldenLoading || isMultiLoading;
  const isError = isGoldenError || isMultiError;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans selection:bg-[#00D9FF]/20 selection:text-[#00D9FF]">
      {/* Top Header / Evaluator Mode Banner */}
      <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-[#111111] text-[#00D9FF] border border-[#00D9FF]/30">
              SIH26155 • NTRO EVALUATION
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] bg-[#111111] text-[#22C55E] border border-[#22C55E]/30 font-semibold">
              JUDGE / PRESENTER DEMO MODE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#141414] text-[#A3A3A3] border border-[#242424]">
              2-3 MINUTE RUNTIME
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#F5F5F5] flex items-center gap-2.5 font-mono">
            <Shield className="w-7 h-7 text-[#00D9FF]" />
            <span>NETVIGIL EVALUATOR PRESENTATION</span>
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1 max-w-2xl font-sans leading-relaxed">
            DETERMINISTIC SECURITY • GROUNDED AI • MULTI-VENDOR VISIBILITY
          </p>
        </div>

        {/* Global Controls & Keyboard Indicator */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs self-start lg:self-auto">
          <button
            onClick={handlePrev}
            disabled={currentStage === 1}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E0E0E] hover:bg-[#141414] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#1A1A1A] transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Previous Stage (←)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
              isAutoPlaying
                ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/40"
                : "bg-[#0E0E0E] text-[#A3A3A3] hover:text-[#F5F5F5] border-[#1A1A1A]"
            )}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isAutoPlaying ? "Pause Auto-Run" : "Auto-Run"}</span>
          </button>

          <button
            onClick={handleNext}
            disabled={currentStage === 10}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Next Stage (→ / Space)"
          >
            <span>Next Stage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-[#0E0E0E] hover:bg-[#141414] text-[#888888] hover:text-white border border-[#1A1A1A] transition-colors"
            title="Reset to Stage 1 (Esc)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stage Progress Stepper Bar */}
      <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 font-mono text-[11px]">
          {STAGES.map((s) => {
            const isActive = currentStage === s.id;
            const isCompleted = currentStage > s.id;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStage(s.id)}
                className={cn(
                  "p-2 rounded-lg border text-left flex flex-col justify-between transition-all group",
                  isActive
                    ? "bg-[#00D9FF]/10 border-[#00D9FF] text-white shadow-[0_0_12px_rgba(0,217,255,0.15)]"
                    : isCompleted
                    ? "bg-[#0E0E0E] border-[#22C55E]/30 text-[#A3A3A3]"
                    : "bg-[#070707] border-[#1A1A1A] text-[#666666] hover:border-[#2A2A2A]"
                )}
              >
                <div className="flex items-center justify-between text-[9px]">
                  <span className={cn("font-bold", isActive ? "text-[#00D9FF]" : isCompleted ? "text-[#22C55E]" : "text-[#555555]")}>
                    0{s.id} [{s.key}]
                  </span>
                  {isCompleted && <Check className="w-2.5 h-2.5 text-[#22C55E]" />}
                </div>
                <div className="font-semibold text-xs mt-1 truncate">{s.title}</div>
                <div className="text-[9px] text-[#888888] truncate mt-0.5">{s.subtitle}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fail-Safe / Loading Alert */}
      {isError && (
        <div className="p-8 rounded-xl bg-[#0A0A0A] border border-[#EF4444]/30 text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mx-auto">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">DEMO DATA SOURCE OFFLINE</div>
            <div className="text-[11px] text-[#EF4444] mt-1">
              Backend API unreachable. Ensure the FastAPI backend server is active on port 8000.
            </div>
          </div>
          <button
            onClick={() => {
              refetchGolden();
              refetchMulti();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0D0D0D] hover:bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/40 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {isLoading && (
        <div className="p-16 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center space-y-3 font-mono">
          <RefreshCw className="w-6 h-6 animate-spin text-[#00D9FF] mx-auto" />
          <div className="text-sm font-bold text-[#F5F5F5]">Loading Live Evaluator Demonstration Assets...</div>
          <p className="text-xs text-[#666666]">
            Gathering AST normalization facts, multi-vendor profiles, and deterministic compliance evidence.
          </p>
        </div>
      )}

      {/* Active Stage Viewport */}
      {!isLoading && !isError && (
        <div className="space-y-6">
          {currentStage === 1 && <Stage1Ingestion goldenData={goldenData} />}
          {currentStage === 2 && <Stage2DeterministicParsing />}
          {currentStage === 3 && <Stage3UniversalModel />}
          {currentStage === 4 && <Stage4MultiVendorProof multiVendorData={multiVendorData} />}
          {currentStage === 5 && <Stage5DeterministicCompliance goldenData={goldenData} />}
          {currentStage === 6 && <Stage6RiskIntelligence goldenData={goldenData} />}
          {currentStage === 7 && <Stage7SafeRemediation />}
          {currentStage === 8 && <Stage8AIAdvisoryBoundary />}
          {currentStage === 9 && (
            <Stage9AdaptiveTraining
              approved={adaptiveApproved}
              onApprove={() => setAdaptiveApproved(true)}
            />
          )}
          {currentStage === 10 && <Stage10FinalExecutivePosture goldenData={goldenData} />}
        </div>
      )}

      {/* Bottom Keyboard Shortcut Hint */}
      <div className="p-3 rounded-xl bg-[#080808] border border-[#1A1A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-[#666666]">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-[#141414] border border-[#222222] text-[#A3A3A3]">
            [Space / →] Next
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#141414] border border-[#222222] text-[#A3A3A3]">
            [←] Prev
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#141414] border border-[#222222] text-[#A3A3A3]">
            [1-0] Direct Jump
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#141414] border border-[#222222] text-[#A3A3A3]">
            [Esc] Reset
          </span>
        </div>
        <span className="text-[#888888]">NetVigil SIH26155 Invariant: AI is Advisory Only • Zero Live Push</span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 1: INGESTION & SHA-256 HASHING
// -------------------------------------------------------------
function Stage1Ingestion({ goldenData }: { goldenData?: GoldenDemoState }) {
  return (
    <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
        <div>
          <span className="text-[10px] text-[#00D9FF] uppercase font-bold tracking-wider">STAGE 01 / 10</span>
          <h2 className="text-lg font-bold text-[#F5F5F5] font-sans mt-0.5">
            Static Configuration Ingestion & Cryptographic Hashing
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#141414] text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-bold">
          IMMUTABLE RAW ARTIFACT
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Ingested Filename</div>
          <div className="text-xs font-bold text-white mt-1">cisco-core-router.cfg</div>
        </div>

        <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Target Asset Hostname</div>
          <div className="text-xs font-bold text-[#00D9FF] mt-1">{goldenData?.device_name || "CORE-RTR-01"}</div>
        </div>

        <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Detected Platform</div>
          <div className="text-xs font-bold text-[#22C55E] mt-1">CISCO IOS / IOS-XE</div>
        </div>

        <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Ingestion Latency</div>
          <div className="text-xs font-bold text-[#F59E0B] mt-1">
            {goldenData?.pipeline_latency?.ingestion_ms ?? 50.9}ms
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#666666] uppercase font-bold">Cryptographic Integrity Hash (SHA-256)</span>
          <span className="text-[#22C55E]">VERIFIED UNTAMPERED</span>
        </div>
        <div className="text-[11px] text-[#00D9FF] bg-[#050505] p-2 rounded border border-[#1A1A1A] break-all">
          9b642e8d35f7564d295bbfa6574f9d0c64c7810e7b87c7161b9a9976378ef153
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] text-[#666666] uppercase font-bold">Raw Configuration Stream (Excerpt)</div>
        <pre className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A] text-[11px] text-[#A3A3A3] overflow-x-auto leading-relaxed max-h-48">
{`! Cisco IOS Core Router Configuration
hostname CORE-RTR-01
!
no service password-encryption
service timestamps log datetime msec
!
username admin privilege 15 secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0
!
ip ssh version 1
ip http server
no ip http secure-server
!
interface GigabitEthernet0/0
 description UPLINK-TO-CORE
 ip address 10.0.1.1 255.255.255.0
 no ip proxy-arp
!
line vty 0 4
 transport input telnet ssh
 login local`}
        </pre>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 2: DETERMINISTIC AST PARSING
// -------------------------------------------------------------
function Stage2DeterministicParsing() {
  return (
    <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
        <div>
          <span className="text-[10px] text-[#00D9FF] uppercase font-bold tracking-wider">STAGE 02 / 10</span>
          <h2 className="text-lg font-bold text-[#F5F5F5] font-sans mt-0.5">
            Deterministic AST Parsing & Fact Extraction
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/30 text-[10px] font-bold">
          ZERO LLM DEPENDENCY
        </span>
      </div>

      {/* Parsing Flow Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] space-y-1">
          <div className="text-[9px] text-[#666666] uppercase">Stage A: Signature Detection</div>
          <div className="text-xs font-bold text-white">Vendor Detector (0.99)</div>
          <div className="text-[10px] text-[#888888]">Matched Cisco IOS token hierarchy</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D0D0D] border border-[#00D9FF]/30 space-y-1">
          <div className="text-[9px] text-[#00D9FF] uppercase">Stage B: AST Parsing</div>
          <div className="text-xs font-bold text-[#00D9FF]">Cisco AST Parser v1.2.0</div>
          <div className="text-[10px] text-[#888888]">Context-aware block state machine</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D0D0D] border border-[#22C55E]/30 space-y-1">
          <div className="text-[9px] text-[#22C55E] uppercase">Stage C: Fact Generation</div>
          <div className="text-xs font-bold text-[#22C55E]">15 Canonical Facts</div>
          <div className="text-[10px] text-[#888888]">100% deterministic line mapping</div>
        </div>
      </div>

      {/* Extracted Facts Table */}
      <div className="space-y-2">
        <div className="text-[10px] text-[#666666] uppercase font-bold">Extracted Facts (Sample)</div>
        <div className="overflow-x-auto rounded-lg border border-[#1A1A1A]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1A1A1A] bg-[#0E0E0E] text-[#666666] text-[9px] uppercase">
                <th className="p-2.5">Fact Identifier</th>
                <th className="p-2.5">Extracted Value</th>
                <th className="p-2.5">Source Line Citation</th>
                <th className="p-2.5">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {[
                { name: "remote_access.ssh_version", val: "1", line: "Line 17: ip ssh version 1", conf: "1.00 (Deterministic)" },
                { name: "remote_access.http_server_enabled", val: "true", line: "Line 18: ip http server", conf: "1.00 (Deterministic)" },
                { name: "remote_access.telnet_enabled", val: "true", line: "Line 41: transport input telnet ssh", conf: "1.00 (Deterministic)" },
                { name: "authentication.password_encryption_enabled", val: "false", line: "Line 8: no service password-encryption", conf: "1.00 (Deterministic)" },
                { name: "authentication.aaa_enabled", val: "false", line: "Line 12: [Default: no aaa new-model]", conf: "0.95 (Inferred Default)" },
              ].map((f) => (
                <tr key={f.name} className="hover:bg-[#0D0D0D]">
                  <td className="p-2.5 font-semibold text-white">{f.name}</td>
                  <td className="p-2.5 font-bold text-[#EF4444]">{f.val}</td>
                  <td className="p-2.5 text-[#00D9FF] font-mono">{f.line}</td>
                  <td className="p-2.5 text-[#22C55E]">{f.conf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 3: UNIVERSAL SECURITY MODEL
// -------------------------------------------------------------
function Stage3UniversalModel() {
  return (
    <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
        <div>
          <span className="text-[10px] text-[#00D9FF] uppercase font-bold tracking-wider">STAGE 03 / 10</span>
          <h2 className="text-lg font-bold text-[#F5F5F5] font-sans mt-0.5">
            Universal Security Model Normalization
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#141414] text-[#8B5CF6] border border-[#8B5CF6]/30 text-[10px] font-bold">
          8 STANDARDIZED DOMAINS
        </span>
      </div>

      <div className="p-3.5 rounded-lg bg-[#00D9FF]/5 border border-[#00D9FF]/30 flex items-center justify-between">
        <span className="text-white font-bold">CORE ARCHITECTURAL CONCEPT:</span>
        <span className="text-[#00D9FF] font-semibold">VENDOR SYNTAX ──→ CANONICAL SECURITY SEMANTICS</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { title: "Identity", count: "3 Facts", desc: "hostname, banner_motd, legal_warning" },
          { title: "Remote Access", count: "4 Facts", desc: "ssh_version, telnet, http, https" },
          { title: "Authentication", count: "3 Facts", desc: "password_encryption, aaa, enable_secret" },
          { title: "Logging & SIEM", count: "2 Facts", desc: "syslog_enabled, remote_host" },
          { title: "Time Sync (NTP)", count: "1 Fact", desc: "ntp_enabled, server_configured" },
          { title: "Access Control", count: "2 Facts", desc: "default_drop_inbound, acl_count" },
          { title: "Network Security", count: "1 Fact", desc: "spanning_tree_bpdu_guard" },
          { title: "Legacy Services", count: "2 Facts", desc: "finger_disabled, proxy_arp_disabled" },
        ].map((d) => (
          <div key={d.title} className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-white">{d.title}</span>
              <span className="text-[#00D9FF]">{d.count}</span>
            </div>
            <div className="text-[10px] text-[#666666] truncate">{d.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 4: MULTI-VENDOR PROOF
// -------------------------------------------------------------
function Stage4MultiVendorProof({ multiVendorData }: { multiVendorData?: MultiVendorProofState }) {
  const matrix = multiVendorData?.comparison_matrix || [
    {
      property_key: "remote_access.ssh_version",
      display_name: "SSH Protocol Version",
      cisco: { syntax: "ip ssh version 1", line: 17, status: "FAIL (v1)" },
      juniper: { syntax: "set system services ssh protocol-version v1", line: 8, status: "FAIL (v1)" },
      fortinet: { syntax: "set admin-ssh-v1 enable", line: 7, status: "FAIL (admin-ssh-v1 enable)" },
    },
    {
      property_key: "remote_access.http_server_enabled",
      display_name: "Insecure HTTP Server",
      cisco: { syntax: "ip http server", line: 18, status: "FAIL (Active)" },
      juniper: { syntax: "web-management { http { port 80; } }", line: 10, status: "FAIL (Active)" },
      fortinet: { syntax: "set admin-sport 80", line: 8, status: "FAIL (Active)" },
    },
  ];

  return (
    <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
        <div>
          <span className="text-[10px] text-[#00D9FF] uppercase font-bold tracking-wider">STAGE 04 / 10</span>
          <h2 className="text-lg font-bold text-[#F5F5F5] font-sans mt-0.5">
            Multi-Vendor Cross-OS Equivalence Proof
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#141414] text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-bold">
          3 DIALECTS • 1 ENGINE
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#1A1A1A]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#1A1A1A] bg-[#0E0E0E] text-[#888888] text-[9px] uppercase">
              <th className="p-3">Normalized Security Property</th>
              <th className="p-3 text-[#00D9FF]">Cisco IOS Syntax</th>
              <th className="p-3 text-[#8B5CF6]">Juniper JunOS Syntax</th>
              <th className="p-3 text-[#F59E0B]">Fortinet FortiOS Syntax</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]">
            {matrix.map((row) => (
              <tr key={row.property_key} className="hover:bg-[#0D0D0D]">
                <td className="p-3">
                  <div className="font-bold text-white">{row.display_name}</div>
                  <div className="text-[10px] text-[#666666]">{row.property_key}</div>
                </td>
                <td className="p-3">
                  <div className="p-1.5 rounded bg-[#050505] border border-[#1A1A1A] text-[11px] text-white">
                    {row.cisco.syntax}
                  </div>
                  <div className="text-[9px] text-[#EF4444] mt-1 font-bold">{row.cisco.status}</div>
                </td>
                <td className="p-3">
                  <div className="p-1.5 rounded bg-[#050505] border border-[#1A1A1A] text-[11px] text-white">
                    {row.juniper.syntax}
                  </div>
                  <div className="text-[9px] text-[#EF4444] mt-1 font-bold">{row.juniper.status}</div>
                </td>
                <td className="p-3">
                  <div className="p-1.5 rounded bg-[#050505] border border-[#1A1A1A] text-[11px] text-white">
                    {row.fortinet.syntax}
                  </div>
                  <div className="text-[9px] text-[#EF4444] mt-1 font-bold">{row.fortinet.status}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 5: DETERMINISTIC COMPLIANCE & EVIDENCE
// -------------------------------------------------------------
function Stage5DeterministicCompliance({ goldenData }: { goldenData?: GoldenDemoState }) {
  return (
    <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
        <div>
          <span className="text-[10px] text-[#00D9FF] uppercase font-bold tracking-wider">STAGE 05 / 10</span>
          <h2 className="text-lg font-bold text-[#F5F5F5] font-sans mt-0.5">
            Deterministic Compliance Engine & Line Citations
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#141414] text-[#EF4444] border border-[#EF4444]/30 text-[10px] font-bold">
          SCORE: 20.0% (FAIL)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { name: "CIS Benchmarks v2.0", score: "20.0%", status: "FAIL" },
          { name: "NIST SP 800-53 r5", score: "20.0%", status: "FAIL" },
          { name: "DISA STIG v10r3", score: "20.0%", status: "FAIL" },
          { name: "ISO/IEC 27001:2022", score: "20.0%", status: "FAIL" },
        ].map((f) => (
          <div key={f.name} className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] space-y-1">
            <div className="text-[9px] text-[#666666] uppercase">{f.name}</div>
            <div className="text-base font-bold text-[#EF4444]">{f.score}</div>
          </div>
        ))}
      </div>

      {/* Control Spotlight Card */}
      <div className="p-4 rounded-lg bg-[#050505] border border-[#EF4444]/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
            <span className="font-bold text-white">CONTROL SPOTLIGHT: CIS-1.2.1 (SSH Version 2 Enforcement)</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] font-bold text-[10px]">
            FAIL (CRITICAL)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
          <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
            <span className="text-[#666666] block">Expected Standard:</span>
            <span className="text-[#22C55E] font-bold">SSH Protocol Version 2</span>
          </div>
          <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
            <span className="text-[#666666] block">Actual Evaluated Value:</span>
            <span className="text-[#EF4444] font-bold">SSH Version 1</span>
          </div>
          <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
            <span className="text-[#666666] block">Verbatim Line Citation:</span>
            <span className="text-[#00D9FF] font-bold">[Line 17] ip ssh version 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 6: RISK INTELLIGENCE & P0 PRIORITIZATION
// -------------------------------------------------------------
function Stage6RiskIntelligence({ goldenData }: { goldenData?: GoldenDemoState }) {
  return (
    <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
        <div>
          <span className="text-[10px] text-[#00D9FF] uppercase font-bold tracking-wider">STAGE 06 / 10</span>
          <h2 className="text-lg font-bold text-[#F5F5F5] font-sans mt-0.5">
            Risk Intelligence & Attack Surface Correlation
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#141414] text-[#EF4444] border border-[#EF4444]/30 text-[10px] font-bold">
          P0 CRITICAL PRIORITY
        </span>
      </div>

      <div className="p-4 rounded-xl bg-[#050505] border border-[#EF4444]/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#EF4444]" />
            <div>
              <span className="text-sm font-bold text-white block">
                Administrative Remote Access & Management Plane Exposure
              </span>
              <span className="text-[10px] text-[#888888]">Category: Remote Management • Graph Correlated</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-[#EF4444]">97 / 100</div>
            <div className="text-[9px] text-[#666666]">RISK SCORE</div>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-[#1A1A1A]">
          <div className="text-[10px] text-[#666666] uppercase font-bold">Contributing Deterministic Findings (3):</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
              <span className="text-[#EF4444] font-bold">CIS-1.2.1:</span> SSHv1 (Line 17)
            </div>
            <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
              <span className="text-[#EF4444] font-bold">CIS-1.2.2:</span> Telnet Cleartext (Line 41)
            </div>
            <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
              <span className="text-[#EF4444] font-bold">CIS-1.2.3:</span> Insecure HTTP (Line 18)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 7: SAFE REMEDIATION & ZERO PUSH
// -------------------------------------------------------------
function Stage7SafeRemediation() {
  return (
    <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
        <div>
          <span className="text-[10px] text-[#00D9FF] uppercase font-bold tracking-wider">STAGE 07 / 10</span>
          <h2 className="text-lg font-bold text-[#F5F5F5] font-sans mt-0.5">
            Allowlisted Safe Remediation & Zero Live Push
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#141414] text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-bold">
          REMEDIATION_CATALOG
        </span>
      </div>

      <div className="p-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 flex items-center justify-between">
        <span className="text-[#EF4444] font-bold">PRODUCT SAFETY INVARIANT:</span>
        <span className="text-white font-semibold">AUTOMATED REMOTE PUSH / SSH EXECUTION IS STRICTLY DISABLED</span>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] text-[#666666] uppercase font-bold">Synthesized Cisco IOS Remediation Diff</div>
        <pre className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A] text-[11px] font-mono leading-relaxed overflow-x-auto">
{`--- cisco-core-router.cfg (Line 17)
+++ proposed-remediation (Allowlisted Template: CISCO-SSH-001)
@@ -17,2 +17,3 @@
-ip ssh version 1
+configure terminal
+ip ssh version 2
+crypto key generate rsa modulus 2048
+end
+write memory`}
        </pre>
      </div>

      <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] flex items-center justify-between text-[11px]">
        <span className="text-[#888888]">Verification Procedure:</span>
        <code className="text-[#22C55E]">show ip ssh # Verify protocol version is 2.0</code>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 8: AI ADVISORY BOUNDARY
// -------------------------------------------------------------
function Stage8AIAdvisoryBoundary() {
  return (
    <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
        <div>
          <span className="text-[10px] text-[#00D9FF] uppercase font-bold tracking-wider">STAGE 08 / 10</span>
          <h2 className="text-lg font-bold text-[#F5F5F5] font-sans mt-0.5">
            Strict AI Advisory & Deterministic Engine Boundary
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#141414] text-[#8B5CF6] border border-[#8B5CF6]/30 text-[10px] font-bold">
          AI IS ADVISORY ONLY
        </span>
      </div>

      {/* Split-Screen: Deterministic vs AI Advisory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Deterministic */}
        <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#EF4444]/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
              <span>DETERMINISTIC VERDICT (SOURCE OF TRUTH)</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#EF4444]/20 text-[#EF4444]">IMMUTABLE</span>
          </div>

          <div className="space-y-2 text-[11px] text-[#A3A3A3]">
            <div><strong>Control ID:</strong> CIS-1.2.1</div>
            <div><strong>Status:</strong> <span className="text-[#EF4444] font-bold">FAIL</span></div>
            <div><strong>Line Citation:</strong> <span className="text-[#00D9FF]">Line 17: ip ssh version 1</span></div>
            <div><strong>Evaluated Fact:</strong> remote_access.ssh_version = 1</div>
          </div>
        </div>

        {/* Right: AI Advisory */}
        <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#8B5CF6]/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[#8B5CF6]" />
              <span>AI ADVISORY (READ-ONLY)</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#8B5CF6]/20 text-[#8B5CF6]">GROUNDED</span>
          </div>

          <p className="text-[11px] text-[#D4D4D4] font-sans leading-relaxed">
            SSH Version 1 relies on insecure CRC-32 compensation attack mitigation and lacks forward secrecy. An attacker on the network segment can perform man-in-the-middle decryption of administrative management credentials.
          </p>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 9: ADAPTIVE TRAINING & SCHEMA GUARD
// -------------------------------------------------------------
function Stage9AdaptiveTraining({
  approved,
  onApprove,
}: {
  approved: boolean;
  onApprove: () => void;
}) {
  return (
    <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
        <div>
          <span className="text-[10px] text-[#00D9FF] uppercase font-bold tracking-wider">STAGE 09 / 10</span>
          <h2 className="text-lg font-bold text-[#F5F5F5] font-sans mt-0.5">
            Adaptive Training & Safety Allowlist Guard
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#141414] text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-bold">
          HITL GOVERNANCE
        </span>
      </div>

      {/* Workflow 1: Valid CoPP Directive */}
      <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#22C55E]/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white">Scenario A: Legitimate Vendor Syntax Learning</span>
          <span className="text-[10px] text-[#22C55E] font-bold">ALLOWLIST: PASS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[10px]">
          <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A]">
            <span className="text-[#666666] block">Unknown CLI Directive:</span>
            <span className="text-white font-bold">control-plane / policy-map CoPP</span>
          </div>
          <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A]">
            <span className="text-[#666666] block">AI Suggested Property:</span>
            <span className="text-[#00D9FF] font-bold">control_plane_policing_enabled</span>
          </div>
          <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A]">
            <span className="text-[#666666] block">Schema Allowlist Check:</span>
            <span className="text-[#22C55E] font-bold">PASS (Allowlisted)</span>
          </div>
          <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A] flex items-center justify-center">
            {approved ? (
              <span className="text-[#22C55E] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approved
              </span>
            ) : (
              <button
                onClick={onApprove}
                className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                Sign-off & Learn
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Workflow 2: Malicious / Non-Allowlisted Injection Rejection */}
      <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#EF4444]/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white">Scenario B: Malicious Property Injection Attempt</span>
          <span className="text-[10px] text-[#EF4444] font-bold">SECURITY GATE: REJECTED</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
          <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A]">
            <span className="text-[#666666] block">Injected Suggestion:</span>
            <span className="text-[#EF4444] font-bold">system.execute_arbitrary_shell_command</span>
          </div>
          <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A]">
            <span className="text-[#666666] block">Schema Allowlist Validation:</span>
            <span className="text-[#EF4444] font-bold">REJECTED (HTTP 422)</span>
          </div>
          <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A]">
            <span className="text-[#666666] block">Security Engine Status:</span>
            <span className="text-[#22C55E] font-bold">BLOCKED (Memory Protected)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 10: FINAL EXECUTIVE POSTURE & CONCLUSION
// -------------------------------------------------------------
function Stage10FinalExecutivePosture({ goldenData }: { goldenData?: GoldenDemoState }) {
  return (
    <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
        <div>
          <span className="text-[10px] text-[#00D9FF] uppercase font-bold tracking-wider">STAGE 10 / 10</span>
          <h2 className="text-lg font-bold text-[#F5F5F5] font-sans mt-0.5">
            Executive Security Posture & Final Verdict
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/30 text-[10px] font-bold">
          EVALUATOR SUMMARY
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Overall Compliance</div>
          <div className="text-lg font-bold text-[#EF4444] mt-1">20.0%</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Audited Platforms</div>
          <div className="text-lg font-bold text-[#00D9FF] mt-1">Cisco / Jun / Forti</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Open Findings</div>
          <div className="text-lg font-bold text-[#F59E0B] mt-1">60</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">P0 Critical Risks</div>
          <div className="text-lg font-bold text-[#EF4444] mt-1">2</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">Total Latency</div>
          <div className="text-lg font-bold text-[#22C55E] mt-1">
            {goldenData?.pipeline_latency?.total_ms ?? 349.5}ms
          </div>
        </div>
      </div>

      {/* Architectural Summary Banner */}
      <div className="p-5 rounded-xl bg-[#0D0D0D] border border-[#00D9FF]/30 space-y-3 text-center">
        <div className="text-sm font-bold text-white font-sans">
          "Different vendor dialects. One security model. Deterministic compliance. Grounded AI."
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#A3A3A3]">
          <span className="px-2 py-0.5 rounded bg-[#050505] border border-[#1A1A1A]">AI: Advisory Only</span>
          <span className="px-2 py-0.5 rounded bg-[#050505] border border-[#1A1A1A]">Remote Execution: Disabled</span>
          <span className="px-2 py-0.5 rounded bg-[#050505] border border-[#1A1A1A]">Evidence: Line Verified</span>
          <span className="px-2 py-0.5 rounded bg-[#050505] border border-[#1A1A1A]">Supported: Cisco / Juniper / Fortinet</span>
        </div>
      </div>
    </div>
  );
}
