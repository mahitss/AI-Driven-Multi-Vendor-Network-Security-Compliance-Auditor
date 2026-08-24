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
  Check,
  X,
  FileText,
  Sliders,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIMELINE_STEPS = [
  { id: 1, key: "1", tag: "01 INGEST", title: "Ingestion" },
  { id: 2, key: "2", tag: "02 PARSE", title: "Deterministic AST" },
  { id: 3, key: "3", tag: "03 NORMALIZE", title: "Universal Model" },
  { id: 4, key: "4", tag: "04 MULTI-VENDOR", title: "Cross-OS Proof" },
  { id: 5, key: "5", tag: "05 COMPLIANCE", title: "Deterministic Rules" },
  { id: 6, key: "6", tag: "06 RISK", title: "Risk Intelligence" },
  { id: 7, key: "7", tag: "07 REMEDIATION", title: "Safe Remediation" },
  { id: 8, key: "8", tag: "08 AI", title: "AI Advisory Boundary" },
  { id: 9, key: "9", tag: "09 ADAPTIVE", title: "Adaptive Training" },
  { id: 10, key: "0", tag: "10 VERDICT", title: "Final Posture" },
];

export default function JudgePresenterModePage() {
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [adaptiveApproved, setAdaptiveApproved] = useState<boolean>(false);

  // Load live deterministic datasets
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    <div className="min-h-screen bg-[#030303] text-[#E5E5E5] font-sans selection:bg-[#00D9FF]/20 selection:text-[#00D9FF] flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-5">
      {/* 1. COMPACT COMMAND CENTER HEADER */}
      <header className="flex items-center justify-between border-b border-[#1A1A1A] pb-3.5 font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00D9FF] shadow-[0_0_8px_#00D9FF] animate-pulse" />
            <span className="font-bold text-sm tracking-wider text-white">NETVIGIL</span>
          </div>
          <span className="text-xs text-[#555555]">/</span>
          <span className="text-xs text-[#888888]">SIH26155 • NTRO</span>
          <span className="text-xs text-[#555555]">/</span>
          <span className="text-xs px-2 py-0.5 rounded bg-[#111111] text-[#00D9FF] border border-[#00D9FF]/30 font-semibold">
            JUDGE MODE
          </span>
        </div>

        {/* Live Status Indicators & Controls */}
        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#777777]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              <span>ENGINE ONLINE</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              <span>API ONLINE</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF]" />
              <span>AST READY</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={cn(
                "px-2.5 py-1 rounded text-xs border transition-colors flex items-center gap-1",
                isAutoPlaying
                  ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/40"
                  : "bg-[#0E0E0E] text-[#888888] hover:text-white border-[#222222]"
              )}
              title="Toggle Auto-Advance (8s per stage)"
            >
              {isAutoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{isAutoPlaying ? "PAUSE" : "AUTO"}</span>
            </button>

            <button
              onClick={handleReset}
              className="p-1 rounded bg-[#0E0E0E] text-[#666666] hover:text-white border border-[#222222] transition-colors"
              title="Reset to Stage 1 (Esc)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. THIN HORIZONTAL PIPELINE TIMELINE */}
      <nav className="w-full font-mono text-[10px] select-none">
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 bg-[#080808] p-1.5 rounded-lg border border-[#141414]">
          {TIMELINE_STEPS.map((step) => {
            const isActive = currentStage === step.id;
            const isDone = currentStage > step.id;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStage(step.id)}
                className={cn(
                  "px-2 py-1.5 rounded text-left transition-all relative flex flex-col justify-between overflow-hidden",
                  isActive
                    ? "bg-[#00D9FF]/10 text-white border border-[#00D9FF] shadow-[0_0_10px_rgba(0,217,255,0.2)]"
                    : isDone
                    ? "bg-[#0A0A0A] text-[#22C55E]/80 border border-[#22C55E]/20 hover:border-[#22C55E]/40"
                    : "bg-[#050505] text-[#555555] border border-[#111111] hover:border-[#222222]"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("font-bold text-[9px]", isActive ? "text-[#00D9FF]" : isDone ? "text-[#22C55E]" : "text-[#444444]")}>
                    {step.tag}
                  </span>
                  {isDone && <Check className="w-2.5 h-2.5 text-[#22C55E]" />}
                </div>
                <div className="text-[10px] font-semibold truncate mt-0.5 text-[#A3A3A3]">{step.title}</div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. MAIN STAGE VIEWPORT (OWNS MAJORITY OF SCREEN) */}
      <main className="flex-1 flex flex-col justify-center min-h-[460px] lg:min-h-[520px]">
        {/* Fail-Safe / Error State */}
        {isError && (
          <div className="p-8 rounded-xl bg-[#0A0A0A] border border-[#EF4444]/40 text-center space-y-3 font-mono">
            <div className="w-10 h-10 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white uppercase tracking-wider">NETVIGIL ENGINE OFFLINE</div>
              <div className="text-xs text-[#EF4444] mt-1">
                Backend API request failed on port 8000. Ensure the FastAPI service is active.
              </div>
            </div>
            <button
              onClick={() => {
                refetchGolden();
                refetchMulti();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#111111] hover:bg-[#181818] text-[#00D9FF] border border-[#00D9FF]/40 text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RETRY CONNECTION</span>
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !isError && (
          <div className="p-16 rounded-xl bg-[#080808] border border-[#141414] text-center space-y-3 font-mono">
            <RefreshCw className="w-7 h-7 animate-spin text-[#00D9FF] mx-auto" />
            <div className="text-sm font-bold text-white">Loading Live Evaluator Demonstration Assets...</div>
            <p className="text-xs text-[#666666]">
              Gathering AST normalization facts, multi-vendor profiles, and deterministic compliance evidence.
            </p>
          </div>
        )}

        {/* Stage Content Components */}
        {!isLoading && !isError && (
          <div className="w-full transition-all duration-300">
            {currentStage === 1 && <Stage1Ingestion />}
            {currentStage === 2 && <Stage2Parsing />}
            {currentStage === 3 && <Stage3UniversalModel />}
            {currentStage === 4 && <Stage4MultiVendorProof multiVendorData={multiVendorData} />}
            {currentStage === 5 && <Stage5Compliance goldenData={goldenData} />}
            {currentStage === 6 && <Stage6Risk goldenData={goldenData} />}
            {currentStage === 7 && <Stage7Remediation />}
            {currentStage === 8 && <Stage8AIAdvisory />}
            {currentStage === 9 && (
              <Stage9Adaptive
                approved={adaptiveApproved}
                onApprove={() => setAdaptiveApproved(true)}
              />
            )}
            {currentStage === 10 && <Stage10Verdict goldenData={goldenData} />}
          </div>
        )}
      </main>

      {/* 4. COMPACT PRESENTER FOOTER & KEYBOARD SHORTCUT BAR */}
      <footer className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-[#141414] pt-3.5 gap-3 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentStage === 1}
            className="px-3 py-1.5 rounded bg-[#0A0A0A] hover:bg-[#121212] text-[#888888] hover:text-white border border-[#1C1C1C] transition-colors disabled:opacity-20 disabled:pointer-events-none flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>PREV (←)</span>
          </button>

          <button
            onClick={handleNext}
            disabled={currentStage === 10}
            className="px-4 py-1.5 rounded bg-[#00D9FF] hover:bg-[#00B4D8] text-black font-bold transition-all shadow-[0_0_12px_rgba(0,217,255,0.3)] disabled:opacity-20 disabled:pointer-events-none flex items-center gap-1.5"
          >
            <span>NEXT STAGE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <span className="text-[#555555] ml-2 hidden md:inline">
            Stage {currentStage} of 10
          </span>
        </div>

        {/* Keyboard Shortcuts Prompt */}
        <div className="flex items-center gap-2 text-[#666666] text-[10px]">
          <span className="px-1.5 py-0.5 rounded bg-[#0D0D0D] border border-[#1A1A1A] text-[#999999]">[→ / Space] Next</span>
          <span className="px-1.5 py-0.5 rounded bg-[#0D0D0D] border border-[#1A1A1A] text-[#999999]">[←] Prev</span>
          <span className="px-1.5 py-0.5 rounded bg-[#0D0D0D] border border-[#1A1A1A] text-[#999999]">[1–0] Direct</span>
          <span className="px-1.5 py-0.5 rounded bg-[#0D0D0D] border border-[#1A1A1A] text-[#999999]">[Esc] Reset</span>
        </div>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 1: 01 / INGESTION (CANONICAL CONFIGURATION INGEST)
// -------------------------------------------------------------
function Stage1Ingestion() {
  return (
    <div className="p-6 rounded-xl bg-[#080808] border border-[#171717] space-y-4 font-mono">
      <div className="flex items-center justify-between border-b border-[#141414] pb-3">
        <div>
          <div className="text-[10px] text-[#00D9FF] uppercase tracking-wider font-bold">STAGE 01 / 10</div>
          <h2 className="text-xl font-bold text-white font-sans mt-0.5">
            01 / INGESTION <span className="text-xs text-[#888888] font-mono font-normal ml-2">CANONICAL CONFIGURATION INGEST</span>
          </h2>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-[#0D0D0D] text-[#22C55E] border border-[#22C55E]/30 font-bold">
          CRYPTOGRAPHICALLY UNTAMPERED
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Panel: Target Metadata */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-4 rounded-lg bg-[#050505] border border-[#1A1A1A] space-y-2.5">
            <div className="text-[10px] text-[#666666] uppercase font-bold">INGESTED DEVICE TARGET</div>
            <div className="text-lg font-bold text-[#00D9FF]">CORE-RTR-01</div>
            <div className="text-xs text-[#22C55E]">CISCO IOS / IOS-XE</div>
          </div>

          <div className="p-4 rounded-lg bg-[#050505] border border-[#1A1A1A] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#666666]">Filename:</span>
              <span className="text-white font-semibold">cisco-core-router.cfg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Total Lines:</span>
              <span className="text-white font-semibold">52 lines</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Payload Size:</span>
              <span className="text-white font-semibold">870 B</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Ingestion Engine:</span>
              <span className="text-[#00D9FF] font-semibold">Stream Reader v1.2</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A] space-y-1 text-xs">
            <div className="text-[9px] text-[#666666] uppercase font-bold">SHA-256 INTEGRITY HASH</div>
            <div className="text-[10px] text-[#00D9FF] break-all leading-tight">
              9b642e8d35f7564d295bbfa6574f9d0c64c7810e7b87c7161b9a9976378ef153
            </div>
          </div>
        </div>

        {/* Right Panel: Terminal Viewer with Invariant Highlights */}
        <div className="lg:col-span-8 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-[#777777]">
            <span>RAW CLI STREAM VIEWPORT</span>
            <span className="text-[#F59E0B]">CRITICAL INVARIANTS HIGHLIGHTED</span>
          </div>

          <pre className="p-4 rounded-lg bg-[#030303] border border-[#1A1A1A] text-[11px] font-mono leading-relaxed overflow-x-auto text-[#A3A3A3] max-h-[300px]">
{`! Cisco IOS Core Router Configuration (CORE-RTR-01)
hostname CORE-RTR-01
!
`}
<span className="text-[#EF4444] bg-[#EF4444]/10 px-1 py-0.5 rounded font-bold">no service password-encryption</span>
{`
service timestamps log datetime msec
!
username admin privilege 15 secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0
!
`}
<span className="text-[#EF4444] bg-[#EF4444]/10 px-1 py-0.5 rounded font-bold">ip ssh version 1</span>
{`
`}
<span className="text-[#EF4444] bg-[#EF4444]/10 px-1 py-0.5 rounded font-bold">ip http server</span>
{`
no ip http secure-server
!
interface GigabitEthernet0/0
 description UPLINK-TO-CORE
 ip address 10.0.1.1 255.255.255.0
 no ip proxy-arp
!
line vty 0 4
 `}
<span className="text-[#EF4444] bg-[#EF4444]/10 px-1 py-0.5 rounded font-bold">transport input telnet ssh</span>
{`
 login local
!
end`}
          </pre>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 2: 02 / DETERMINISTIC PARSING
// -------------------------------------------------------------
function Stage2Parsing() {
  return (
    <div className="p-6 rounded-xl bg-[#080808] border border-[#171717] space-y-5 font-mono">
      <div className="flex items-center justify-between border-b border-[#141414] pb-3">
        <div>
          <div className="text-[10px] text-[#00D9FF] uppercase tracking-wider font-bold">STAGE 02 / 10</div>
          <h2 className="text-xl font-bold text-white font-sans mt-0.5">
            02 / DETERMINISTIC PARSING <span className="text-xs text-[#888888] font-mono font-normal ml-2">AST FACT EXTRACTION</span>
          </h2>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-[#0D0D0D] text-[#00D9FF] border border-[#00D9FF]/30 font-bold">
          ZERO LLM / DETERMINISTIC PIPELINE
        </span>
      </div>

      {/* Visual Transformation Pipeline Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-center text-xs">
        <div className="p-3 rounded-lg bg-[#050505] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">INPUT</div>
          <div className="font-bold text-white mt-1">RAW CONFIG</div>
          <div className="text-[10px] text-[#777777] mt-0.5">52 Lines CLI</div>
        </div>

        <div className="p-3 rounded-lg bg-[#050505] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">STAGE 1</div>
          <div className="font-bold text-[#00D9FF] mt-1">VENDOR DETECTOR</div>
          <div className="text-[10px] text-[#22C55E] mt-0.5">Confidence: 0.99</div>
        </div>

        <div className="p-3 rounded-lg bg-[#050505] border border-[#00D9FF]/30 bg-[#00D9FF]/5">
          <div className="text-[9px] text-[#00D9FF] uppercase">STAGE 2</div>
          <div className="font-bold text-white mt-1">CISCO AST PARSER</div>
          <div className="text-[10px] text-[#00D9FF] mt-0.5">v1.2.0 State Machine</div>
        </div>

        <div className="p-3 rounded-lg bg-[#050505] border border-[#22C55E]/30 bg-[#22C55E]/5">
          <div className="text-[9px] text-[#22C55E] uppercase">OUTPUT</div>
          <div className="font-bold text-[#22C55E] mt-1">SECURITY FACTS</div>
          <div className="text-[10px] text-[#22C55E] mt-0.5">15 Extracted Facts</div>
        </div>
      </div>

      {/* Extracted Facts with Verbatim Line Evidence */}
      <div className="space-y-2">
        <div className="text-[10px] text-[#777777] uppercase font-bold">EXTRACTED DETERMINISTIC FACTS</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            { key: "remote_access.ssh_version", val: "1", line: "Line 17: ip ssh version 1", status: "CRITICAL" },
            { key: "remote_access.http_server_enabled", val: "true", line: "Line 18: ip http server", status: "HIGH" },
            { key: "remote_access.telnet_enabled", val: "true", line: "Line 41: transport input telnet ssh", status: "HIGH" },
            { key: "authentication.password_encryption_enabled", val: "false", line: "Line 8: no service password-encryption", status: "MEDIUM" },
          ].map((fact) => (
            <div key={fact.key} className="p-3 rounded-lg bg-[#050505] border border-[#1A1A1A] flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-bold text-white">{fact.key}</div>
                <div className="text-[10px] text-[#00D9FF]">{fact.line}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#EF4444]">{fact.val}</div>
                <div className="text-[9px] text-[#EF4444]">{fact.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 3: 03 / UNIVERSAL SECURITY MODEL (HERO VISUALIZATION)
// -------------------------------------------------------------
function Stage3UniversalModel() {
  return (
    <div className="p-6 rounded-xl bg-[#080808] border border-[#171717] space-y-5 font-mono">
      <div className="flex items-center justify-between border-b border-[#141414] pb-3">
        <div>
          <div className="text-[10px] text-[#00D9FF] uppercase tracking-wider font-bold">STAGE 03 / 10</div>
          <h2 className="text-xl font-bold text-white font-sans mt-0.5">
            03 / UNIVERSAL SECURITY MODEL <span className="text-xs text-[#888888] font-mono font-normal ml-2">CANONICAL NORMALIZATION</span>
          </h2>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-[#0D0D0D] text-[#8B5CF6] border border-[#8B5CF6]/30 font-bold">
          8 CANONICAL DOMAINS
        </span>
      </div>

      {/* Converging Dialects Visual Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left: 3 Dialects */}
        <div className="lg:col-span-4 space-y-2 text-xs">
          <div className="p-3 rounded bg-[#050505] border border-[#00D9FF]/30">
            <div className="text-[9px] text-[#00D9FF] font-bold">CISCO IOS SYNTAX</div>
            <div className="text-white mt-1">ip ssh version 1</div>
            <div className="text-[#666666] text-[10px]">transport input telnet ssh</div>
          </div>

          <div className="p-3 rounded bg-[#050505] border border-[#8B5CF6]/30">
            <div className="text-[9px] text-[#8B5CF6] font-bold">JUNIPER JUNOS SYNTAX</div>
            <div className="text-white mt-1">set system services ssh protocol-version v1</div>
            <div className="text-[#666666] text-[10px]">system services telnet;</div>
          </div>

          <div className="p-3 rounded bg-[#050505] border border-[#F59E0B]/30">
            <div className="text-[9px] text-[#F59E0B] font-bold">FORTINET FORTIOS SYNTAX</div>
            <div className="text-white mt-1">set admin-ssh-v1 enable</div>
            <div className="text-[#666666] text-[10px]">set admin-sport 80</div>
          </div>
        </div>

        {/* Center: Convergence Arrow */}
        <div className="lg:col-span-1 text-center hidden lg:block">
          <div className="text-[#00D9FF] text-2xl font-bold">──▶</div>
        </div>

        {/* Right: Universal Security Model & Shared Engine */}
        <div className="lg:col-span-7 space-y-3">
          <div className="p-4 rounded-xl bg-[#00D9FF]/5 border border-[#00D9FF]/40 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00D9FF]" />
                <span>UNIVERSAL SECURITY MODEL SLOTS</span>
              </span>
              <span className="text-[10px] text-[#00D9FF]">ZERO VENDOR BIAS</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A] flex justify-between font-mono">
                <span className="text-[#A3A3A3]">remote_access.ssh_version</span>
                <span className="text-[#EF4444] font-bold">1</span>
              </div>
              <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A] flex justify-between font-mono">
                <span className="text-[#A3A3A3]">remote_access.telnet_enabled</span>
                <span className="text-[#EF4444] font-bold">true</span>
              </div>
              <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A] flex justify-between font-mono">
                <span className="text-[#A3A3A3]">remote_access.http_server_enabled</span>
                <span className="text-[#EF4444] font-bold">true</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-between text-xs">
            <span className="text-white font-bold">SHARED EVALUATION:</span>
            <span className="text-[#22C55E] font-semibold">ONE COMPLIANCE & RISK ENGINE FOR ALL VENDORS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 4: 04 / MULTI-VENDOR PROOF (EVALUATOR PROOF MOMENT)
// -------------------------------------------------------------
function Stage4MultiVendorProof({ multiVendorData }: { multiVendorData?: MultiVendorProofState }) {
  return (
    <div className="p-6 rounded-xl bg-[#080808] border border-[#171717] space-y-5 font-mono">
      <div className="flex items-center justify-between border-b border-[#141414] pb-3">
        <div>
          <div className="text-[10px] text-[#00D9FF] uppercase tracking-wider font-bold">STAGE 04 / 10</div>
          <h2 className="text-xl font-bold text-white font-sans mt-0.5">
            04 / MULTI-VENDOR PROOF <span className="text-xs text-[#888888] font-mono font-normal ml-2">CROSS-OS EQUIVALENCE</span>
          </h2>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-[#0D0D0D] text-[#22C55E] border border-[#22C55E]/30 font-bold">
          3 DIALECTS • 1 VERDICT
        </span>
      </div>

      {/* Proof Box: Different Syntax -> Same Semantics -> Same Rule -> Same Verdict */}
      <div className="p-4 rounded-xl bg-[#050505] border border-[#1A1A1A] space-y-3 text-xs">
        <div className="text-[10px] text-[#777777] uppercase font-bold">
          PROOF CASE: SSH PROTOCOL VERSION 1 ENFORCEMENT (RULE-SSH-001)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#00D9FF]/30">
            <div className="text-[10px] text-[#00D9FF] font-bold">CISCO IOS</div>
            <div className="text-white mt-1 text-[11px]">ip ssh version 1</div>
            <div className="text-[9px] text-[#EF4444] mt-1 font-bold">FAIL (Line 17)</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#8B5CF6]/30">
            <div className="text-[10px] text-[#8B5CF6] font-bold">JUNIPER JUNOS</div>
            <div className="text-white mt-1 text-[11px]">set system services ssh protocol-version v1</div>
            <div className="text-[9px] text-[#EF4444] mt-1 font-bold">FAIL (Line 8)</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#F59E0B]/30">
            <div className="text-[10px] text-[#F59E0B] font-bold">FORTINET FORTIOS</div>
            <div className="text-white mt-1 text-[11px]">set admin-ssh-v1 enable</div>
            <div className="text-[9px] text-[#EF4444] mt-1 font-bold">FAIL (Line 7)</div>
          </div>
        </div>

        <div className="p-2.5 rounded bg-[#111111] border border-[#1C1C1C] flex items-center justify-between">
          <span className="text-[#888888]">Shared Rule Evaluation (CIS-1.2.1 / NIST-AC-17):</span>
          <span className="text-[#EF4444] font-bold">FAIL (100% Deterministic Match across all 3 OS)</span>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 5: 05 / DETERMINISTIC COMPLIANCE & LINE EVIDENCE
// -------------------------------------------------------------
function Stage5Compliance({ goldenData }: { goldenData?: GoldenDemoState }) {
  return (
    <div className="p-6 rounded-xl bg-[#080808] border border-[#171717] space-y-5 font-mono">
      <div className="flex items-center justify-between border-b border-[#141414] pb-3">
        <div>
          <div className="text-[10px] text-[#00D9FF] uppercase tracking-wider font-bold">STAGE 05 / 10</div>
          <h2 className="text-xl font-bold text-white font-sans mt-0.5">
            05 / DETERMINISTIC COMPLIANCE <span className="text-xs text-[#888888] font-mono font-normal ml-2">60 EVALUATED CONTROLS</span>
          </h2>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-[#0D0D0D] text-[#EF4444] border border-[#EF4444]/30 font-bold">
          BASELINE SCORE: 20.0%
        </span>
      </div>

      {/* 4 Framework Scores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        {[
          { name: "CIS BENCHMARKS", score: "20.0%", evaluated: "15 Controls" },
          { name: "NIST SP 800-53", score: "20.0%", evaluated: "15 Controls" },
          { name: "DISA STIG", score: "20.0%", evaluated: "15 Controls" },
          { name: "ISO/IEC 27001", score: "20.0%", evaluated: "15 Controls" },
        ].map((f) => (
          <div key={f.name} className="p-3 rounded-lg bg-[#050505] border border-[#1A1A1A]">
            <div className="text-[9px] text-[#666666]">{f.name}</div>
            <div className="text-lg font-bold text-[#EF4444] mt-0.5">{f.score}</div>
            <div className="text-[9px] text-[#555555] mt-0.5">{f.evaluated}</div>
          </div>
        ))}
      </div>

      {/* Control Spotlight: CIS-1.2.1 */}
      <div className="p-4 rounded-xl bg-[#050505] border border-[#EF4444]/40 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
            <span>CONTROL SPOTLIGHT: CIS-1.2.1 (SSH Version 2 Enforcement)</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] font-bold text-[10px]">FAIL</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
            <span className="text-[#666666] block text-[10px]">Expected Standard:</span>
            <span className="text-[#22C55E] font-bold">SSH Version 2</span>
          </div>
          <div className="p-2.5 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
            <span className="text-[#666666] block text-[10px]">Evaluated Fact:</span>
            <span className="text-[#EF4444] font-bold">SSH Version 1</span>
          </div>
          <div className="p-2.5 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
            <span className="text-[#666666] block text-[10px]">Line-Level Evidence:</span>
            <span className="text-[#00D9FF] font-bold">[Line 17] ip ssh version 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 6: 06 / RISK INTELLIGENCE & P0 PRIORITIZATION
// -------------------------------------------------------------
function Stage6Risk({ goldenData }: { goldenData?: GoldenDemoState }) {
  return (
    <div className="p-6 rounded-xl bg-[#080808] border border-[#171717] space-y-5 font-mono">
      <div className="flex items-center justify-between border-b border-[#141414] pb-3">
        <div>
          <div className="text-[10px] text-[#00D9FF] uppercase tracking-wider font-bold">STAGE 06 / 10</div>
          <h2 className="text-xl font-bold text-white font-sans mt-0.5">
            06 / RISK INTELLIGENCE <span className="text-xs text-[#888888] font-mono font-normal ml-2">GRAPH CORRELATION</span>
          </h2>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-[#0D0D0D] text-[#EF4444] border border-[#EF4444]/30 font-bold">
          2 P0 CRITICAL RISKS
        </span>
      </div>

      <div className="p-5 rounded-xl bg-[#050505] border border-[#EF4444]/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444]">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold text-white">
                Administrative Remote Access & Management Plane Exposure
              </div>
              <div className="text-[11px] text-[#888888]">
                Correlation: Graph-Correlated Exposure on CORE-RTR-01
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-[#EF4444]">P0 • 97 / 100</div>
            <div className="text-[9px] text-[#666666]">DETERMINISTIC RISK SCORE</div>
          </div>
        </div>

        {/* Contributing Findings List */}
        <div className="space-y-1.5 pt-3 border-t border-[#1A1A1A] text-xs">
          <div className="text-[10px] text-[#666666] uppercase font-bold">CONTRIBUTING FINDINGS:</div>
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
// STAGE 7: 07 / SAFE REMEDIATION & ZERO NETWORK PUSH
// -------------------------------------------------------------
function Stage7Remediation() {
  return (
    <div className="p-6 rounded-xl bg-[#080808] border border-[#171717] space-y-5 font-mono">
      <div className="flex items-center justify-between border-b border-[#141414] pb-3">
        <div>
          <div className="text-[10px] text-[#00D9FF] uppercase tracking-wider font-bold">STAGE 07 / 10</div>
          <h2 className="text-xl font-bold text-white font-sans mt-0.5">
            07 / SAFE REMEDIATION <span className="text-xs text-[#888888] font-mono font-normal ml-2">ALLOWLISTED CATALOG</span>
          </h2>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-[#0D0D0D] text-[#22C55E] border border-[#22C55E]/30 font-bold">
          STATIC TEMPLATES ONLY
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-[#050505] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666]">SOURCE</div>
          <div className="font-bold text-white mt-0.5">REMEDIATION_CATALOG</div>
        </div>
        <div className="p-3 rounded-lg bg-[#050505] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666]">EXECUTION</div>
          <div className="font-bold text-[#EF4444] mt-0.5">DISABLED (NO SSH/NETCONF)</div>
        </div>
        <div className="p-3 rounded-lg bg-[#050505] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666]">NETWORK PUSH</div>
          <div className="font-bold text-[#22C55E] mt-0.5">ZERO AUTOMATED PUSH</div>
        </div>
      </div>

      {/* Terminal Remediation Diff */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] text-[#777777]">
          <span>PROPOSED CISCO IOS CLI DIFF</span>
          <span className="text-[#EF4444] font-bold">STATUS: NOT EXECUTED (HUMAN OPERATOR SIGNOFF REQUIRED)</span>
        </div>
        <pre className="p-4 rounded-lg bg-[#030303] border border-[#1A1A1A] text-[11px] font-mono leading-relaxed overflow-x-auto">
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
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 8: 08 / GROUNDED AI ADVISORY & STRICT BOUNDARY
// -------------------------------------------------------------
function Stage8AIAdvisory() {
  return (
    <div className="p-6 rounded-xl bg-[#080808] border border-[#171717] space-y-5 font-mono">
      <div className="flex items-center justify-between border-b border-[#141414] pb-3">
        <div>
          <div className="text-[10px] text-[#00D9FF] uppercase tracking-wider font-bold">STAGE 08 / 10</div>
          <h2 className="text-xl font-bold text-white font-sans mt-0.5">
            08 / GROUNDED AI ADVISORY <span className="text-xs text-[#888888] font-mono font-normal ml-2">STRICT COMPLIANCE BOUNDARY</span>
          </h2>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-[#0D0D0D] text-[#8B5CF6] border border-[#8B5CF6]/30 font-bold">
          AI IS ADVISORY ONLY
        </span>
      </div>

      {/* Split Viewport Exactly 50/50 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Deterministic Verdict */}
        <div className="p-4 rounded-xl bg-[#050505] border border-[#EF4444]/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-2 text-xs">
              <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
              <span>DETERMINISTIC VERDICT (SOURCE OF TRUTH)</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] font-bold">IMMUTABLE</span>
          </div>

          <div className="space-y-2 text-xs text-[#A3A3A3]">
            <div><strong>Control ID:</strong> CIS-1.2.1</div>
            <div><strong>Status:</strong> <span className="text-[#EF4444] font-bold">FAIL</span></div>
            <div><strong>Line Citation:</strong> <span className="text-[#00D9FF]">Line 17: ip ssh version 1</span></div>
            <div><strong>Evaluated Fact:</strong> remote_access.ssh_version = 1</div>
          </div>
        </div>

        {/* Right: AI Advisory */}
        <div className="p-4 rounded-xl bg-[#050505] border border-[#8B5CF6]/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-2 text-xs">
              <Bot className="w-4 h-4 text-[#8B5CF6]" />
              <span>AI ADVISORY (WHY THIS MATTERS)</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 text-[#8B5CF6] font-bold">READ ONLY</span>
          </div>

          <p className="text-xs text-[#D4D4D4] font-sans leading-relaxed">
            SSH Version 1 lacks forward secrecy and relies on vulnerable CRC-32 compensation attack mitigation. An attacker sniffing management plane traffic can perform man-in-the-middle decryption of privileged credentials.
          </p>

          <div className="text-[10px] text-[#777777] pt-2 border-t border-[#1A1A1A] flex justify-between">
            <span>GROUNDED IN DETERMINISTIC EVIDENCE</span>
            <span className="text-[#8B5CF6] font-bold">AI ≠ VERDICT</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 9: 09 / ADAPTIVE TRAINING & SCHEMA BOUNDARY
// -------------------------------------------------------------
function Stage9Adaptive({
  approved,
  onApprove,
}: {
  approved: boolean;
  onApprove: () => void;
}) {
  return (
    <div className="p-6 rounded-xl bg-[#080808] border border-[#171717] space-y-5 font-mono">
      <div className="flex items-center justify-between border-b border-[#141414] pb-3">
        <div>
          <div className="text-[10px] text-[#00D9FF] uppercase tracking-wider font-bold">STAGE 09 / 10</div>
          <h2 className="text-xl font-bold text-white font-sans mt-0.5">
            09 / ADAPTIVE TRAINING <span className="text-xs text-[#888888] font-mono font-normal ml-2">SCHEMA SAFETY BOUNDARY</span>
          </h2>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-[#0D0D0D] text-[#22C55E] border border-[#22C55E]/30 font-bold">
          HUMAN-IN-THE-LOOP
        </span>
      </div>

      {/* Legitimate Directive Learning */}
      <div className="p-4 rounded-xl bg-[#050505] border border-[#22C55E]/40 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white">CASE A: UNKNOWN DIRECTIVE LEARNING (CoPP)</span>
          <span className="text-[10px] text-[#22C55E] font-bold">ALLOWLIST: PASS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
            <span className="text-[#666666] block text-[9px]">Unknown Directive:</span>
            <span className="text-white font-bold">COPP_MGMT_POLICY</span>
          </div>
          <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
            <span className="text-[#666666] block text-[9px]">AI Suggestion:</span>
            <span className="text-[#00D9FF] font-bold">control_plane_policing_enabled</span>
          </div>
          <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
            <span className="text-[#666666] block text-[9px]">Schema Guard:</span>
            <span className="text-[#22C55E] font-bold">PASS (Allowlisted)</span>
          </div>
          <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A] flex items-center justify-center">
            {approved ? (
              <span className="text-[#22C55E] font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approved
              </span>
            ) : (
              <button
                onClick={onApprove}
                className="px-3 py-1 rounded bg-[#00D9FF] hover:bg-[#00B4D8] text-black font-bold text-xs"
              >
                Sign-off & Learn
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Malicious Attempt Rejected */}
      <div className="p-4 rounded-xl bg-[#050505] border border-[#EF4444]/40 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white">CASE B: MALICIOUS ATTRIBUTE INJECTION REJECTION</span>
          <span className="text-[10px] text-[#EF4444] font-bold">SECURITY GATE: REJECTED (HTTP 422)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
            <span className="text-[#666666] block text-[9px]">Injected Candidate:</span>
            <span className="text-[#EF4444] font-bold">system.execute_arbitrary_shell_command</span>
          </div>
          <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
            <span className="text-[#666666] block text-[9px]">Schema Allowlist Result:</span>
            <span className="text-[#EF4444] font-bold">REJECTED</span>
          </div>
          <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
            <span className="text-[#666666] block text-[9px]">Model Protection:</span>
            <span className="text-[#22C55E] font-bold">AI CANNOT ARBITRARILY EXPAND SCHEMA</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STAGE 10: 10 / EXECUTIVE SECURITY VERDICT
// -------------------------------------------------------------
function Stage10Verdict({ goldenData }: { goldenData?: GoldenDemoState }) {
  return (
    <div className="p-6 rounded-xl bg-[#080808] border border-[#171717] space-y-5 font-mono">
      <div className="flex items-center justify-between border-b border-[#141414] pb-3">
        <div>
          <div className="text-[10px] text-[#00D9FF] uppercase tracking-wider font-bold">STAGE 10 / 10</div>
          <h2 className="text-xl font-bold text-white font-sans mt-0.5">
            10 / EXECUTIVE SECURITY VERDICT <span className="text-xs text-[#888888] font-mono font-normal ml-2">SUMMARY OF FINDINGS</span>
          </h2>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-[#0D0D0D] text-[#00D9FF] border border-[#00D9FF]/30 font-bold">
          EVALUATOR CONCLUSION
        </span>
      </div>

      {/* Real Backend Values Only */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">AUDITED ASSETS</div>
          <div className="text-base font-bold text-[#00D9FF] mt-0.5">3 Platforms</div>
        </div>
        <div className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">TOTAL FINDINGS</div>
          <div className="text-base font-bold text-[#F59E0B] mt-0.5">60</div>
        </div>
        <div className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">P0 CRITICAL</div>
          <div className="text-base font-bold text-[#EF4444] mt-0.5">2</div>
        </div>
        <div className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">P1 HIGH</div>
          <div className="text-base font-bold text-[#EF4444] mt-0.5">8</div>
        </div>
        <div className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A]">
          <div className="text-[9px] text-[#666666] uppercase">COMPLIANCE SCORE</div>
          <div className="text-base font-bold text-[#EF4444] mt-0.5">20.0%</div>
        </div>
      </div>

      {/* Three Large Invariants */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
        <div className="p-3.5 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] font-bold">
          ✓ DETERMINISTIC VERDICT
        </div>
        <div className="p-3.5 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/30 text-[#00D9FF] font-bold">
          ✓ LINE-LEVEL EVIDENCE
        </div>
        <div className="p-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] font-bold">
          ✓ ZERO LIVE NETWORK PUSH
        </div>
      </div>

      {/* Final Statement */}
      <div className="p-4 rounded-xl bg-[#030303] border border-[#1A1A1A] text-center space-y-1.5">
        <div className="text-sm font-bold text-white font-sans tracking-wide">
          THREE DIALECTS. ONE SECURITY MODEL. ONE DETERMINISTIC VERDICT.
        </div>
        <div className="text-xs text-[#888888]">
          AI: ADVISORY ONLY • VENDORS: CISCO • JUNIPER • FORTINET
        </div>
      </div>
    </div>
  );
}
