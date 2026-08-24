"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  initGoldenDemo,
  fetchEngineDiagnostics,
  GoldenDemoState,
  reanalyzeConfiguration,
} from "@/lib/api-client";
import {
  Play,
  RotateCcw,
  Sparkles,
  Shield,
  ShieldAlert,
  CheckCircle2,
  FileCode,
  Layers,
  Bot,
  GraduationCap,
  FileText,
  Activity,
  Zap,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

const DEMO_STEPS = [
  { id: 1, title: "Ingestion", desc: "Upload & SHA-256 Hashing" },
  { id: 2, title: "Detection", desc: "Cisco IOS Signature" },
  { id: 3, title: "Normalization", desc: "8-Domain Schema" },
  { id: 4, title: "Compliance", desc: "CIS / NIST / STIG / ISO" },
  { id: 5, title: "Evidence", desc: "Line-Level Citations" },
  { id: 6, title: "Risk Intelligence", desc: "P0-P3 Prioritization" },
  { id: 7, title: "Remediation", desc: "Allowlisted Safe Diffs" },
  { id: 8, title: "AI Co-Pilot", desc: "Grounded Explanations" },
  { id: 9, title: "Adaptive Training", desc: "HITL Knowledge Learning" },
  { id: 10, title: "Official Report", desc: "PDF / Audit Summary" },
];

export default function GoldenDemoPresenterPage() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [demoState, setDemoState] = useState<GoldenDemoState | null>(null);
  const [isSimulatingLearning, setIsSimulatingLearning] = useState(false);
  const [learningApplied, setLearningApplied] = useState(false);
  const [afterLearningScore, setAfterLearningScore] = useState<number | null>(null);

  // Diagnostics query
  const { data: diagnostics } = useQuery({
    queryKey: ["engineDiagnostics"],
    queryFn: fetchEngineDiagnostics,
  });

  // Launch Demo Mutation
  const launchMutation = useMutation({
    mutationFn: initGoldenDemo,
    onSuccess: (data) => {
      setDemoState(data);
      setLearningApplied(false);
      setAfterLearningScore(null);
      setActiveStep(1);
    },
  });

  // Simulate Adaptive Learning
  const handleSimulateAdaptiveLearning = async () => {
    if (!demoState) return;
    setIsSimulatingLearning(true);
    try {
      const res = await reanalyzeConfiguration(demoState.configuration_id);
      setAfterLearningScore(res.new_score);
      setLearningApplied(true);
      setActiveStep(9);
    } catch (err) {
      console.error("Adaptive learning reanalysis error:", err);
    } finally {
      setIsSimulatingLearning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#111111] text-[#00D9FF] border border-[#00D9FF]/30">
              SIH26155 • NTRO EVALUATION
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] bg-[#111111] text-[#22C55E] border border-[#22C55E]/30">
              PRESENTER MODE
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#F5F5F5] flex items-center gap-2">
            NetVigil Golden Demonstration
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1 max-w-2xl">
            2-Minute interactive demonstration flow showcasing multi-vendor normalization, deterministic compliance, line-level evidence, allowlisted remediation, and adaptive training.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono">
          <Link
            href="/demo/judge"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-[#00D9FF] border border-[#00D9FF]/40 text-xs font-semibold transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Judge Mode →</span>
          </Link>

          <Link
            href="/demo/multi-vendor"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0E0E0E] hover:bg-[#141414] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#1A1A1A] text-xs font-semibold transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span>Multi-Vendor Proof →</span>
          </Link>

          <button
            onClick={() => launchMutation.mutate()}
            disabled={launchMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B0B0B] hover:bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/50 hover:border-[#00D9FF] font-semibold text-xs transition-all disabled:opacity-50"
          >
            {launchMutation.isPending ? (
              <Activity className="w-4 h-4 animate-spin text-[#00D9FF]" />
            ) : (
              <Play className="w-4 h-4 fill-[#00D9FF] text-[#00D9FF]" />
            )}
            {demoState ? "Re-Launch Golden Demo" : "Launch 2-Min Demo"}
          </button>

          <button
            onClick={() => {
              setDemoState(null);
              setLearningApplied(false);
              setAfterLearningScore(null);
              setActiveStep(1);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#0B0B0B] hover:bg-[#141414] text-[#A3A3A3] text-xs font-medium border border-[#1A1A1A]"
            title="Reset demo state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Latency & Diagnostics Benchmarks */}
      {demoState && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
            <div className="text-[10px] text-[#A3A3A3] uppercase">Ingestion & Hash</div>
            <div className="text-base font-bold text-[#00D9FF] mt-0.5">
              {demoState.pipeline_latency.ingestion_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
            <div className="text-[10px] text-[#A3A3A3] uppercase">AST & Normalizer</div>
            <div className="text-base font-bold text-[#8B5CF6] mt-0.5">
              {demoState.pipeline_latency.parsing_and_normalization_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
            <div className="text-[10px] text-[#A3A3A3] uppercase">Compliance (60 Rules)</div>
            <div className="text-base font-bold text-[#22C55E] mt-0.5">
              {demoState.pipeline_latency.compliance_evaluation_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
            <div className="text-[10px] text-[#A3A3A3] uppercase">Risk Correlator</div>
            <div className="text-base font-bold text-[#F59E0B] mt-0.5">
              {demoState.pipeline_latency.risk_scoring_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
            <div className="text-[10px] text-[#A3A3A3] uppercase">Remediation Diffs</div>
            <div className="text-base font-bold text-[#8B5CF6] mt-0.5">
              {demoState.pipeline_latency.remediation_diff_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#00D9FF]/40">
            <div className="text-[10px] text-[#00D9FF] font-semibold uppercase">Total Pipeline</div>
            <div className="text-base font-bold text-[#F5F5F5] mt-0.5">
              {demoState.pipeline_latency.total_ms} ms
            </div>
          </div>
        </div>
      )}

      {/* Stepper Navigation */}
      <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#666666] mb-3 flex items-center justify-between font-mono">
          <span>Demo Lifecycle Stages</span>
          <span className="text-[#00D9FF]">Stage {activeStep} of 10</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {DEMO_STEPS.map((step) => {
            const isCurrent = activeStep === step.id;
            const isCompleted = activeStep > step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`p-2.5 rounded-lg text-left transition-all border font-mono ${
                  isCurrent
                    ? "bg-[#141414] border-[#00D9FF] text-[#F5F5F5]"
                    : isCompleted
                    ? "bg-[#0D0D0D] border-[#22C55E]/40 text-[#D4D4D4]"
                    : "bg-[#0D0D0D] border-[#1A1A1A] text-[#666666] hover:text-[#A3A3A3]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold">
                    0{step.id}
                  </span>
                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />}
                </div>
                <div className="text-xs font-semibold truncate">{step.title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage Presentation */}
      {!demoState ? (
        <div className="p-12 text-center rounded-xl bg-[#0A0A0A] border border-dashed border-[#1A1A1A] space-y-4 font-mono">
          <div className="w-16 h-16 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] text-[#00D9FF] flex items-center justify-center mx-auto">
            <Play className="w-8 h-8 fill-[#00D9FF] text-[#00D9FF]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#F5F5F5]">Golden Demo Ready to Launch</h3>
            <p className="text-xs text-[#A3A3A3] max-w-md mx-auto mt-1">
              Click &quot;Launch 2-Min Demo&quot; to execute the live deterministic pipeline on canonical gateway CORE-RTR-01.
            </p>
          </div>
          <button
            onClick={() => launchMutation.mutate()}
            className="px-6 py-2.5 rounded-lg bg-[#0B0B0B] border border-[#00D9FF]/60 hover:border-[#00D9FF] hover:bg-[#141414] text-[#00D9FF] font-semibold text-xs transition-all inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-[#00D9FF] text-[#00D9FF]" />
            Launch Golden Demo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Active Stage Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Stage Detail */}
            <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-6">
              <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-4">
                <div>
                  <span className="text-xs font-mono text-[#00D9FF] uppercase">Stage 0{activeStep}</span>
                  <h2 className="text-xl font-bold text-[#F5F5F5] mt-0.5">
                    {DEMO_STEPS[activeStep - 1].title} — {DEMO_STEPS[activeStep - 1].desc}
                  </h2>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <button
                    disabled={activeStep <= 1}
                    onClick={() => setActiveStep((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded bg-[#0D0D0D] hover:bg-[#141414] text-xs font-medium text-[#A3A3A3] border border-[#1A1A1A] disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <button
                    disabled={activeStep >= 10}
                    onClick={() => setActiveStep((p) => Math.min(10, p + 1))}
                    className="px-3 py-1.5 rounded bg-[#0B0B0B] border border-[#00D9FF]/50 hover:border-[#00D9FF] hover:bg-[#141414] text-xs font-medium text-[#00D9FF] disabled:opacity-30 flex items-center gap-1"
                  >
                    Next Stage <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Stage Specific Highlights */}
              {activeStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#A3A3A3]">
                    NetVigil securely ingests the raw configuration file <code className="text-[#00D9FF] font-mono">cisco-core-router.cfg</code>, sanitizes against path-traversal attacks, and calculates cryptographic SHA-256 digest in isolated disk storage.
                  </p>
                  <div className="p-4 rounded-lg bg-[#050505] font-mono text-xs text-[#D4D4D4] border border-[#1A1A1A] space-y-1">
                    <div className="text-[#00D9FF]"># Ingestion Metadata</div>
                    <div>Device: <span className="text-[#F5F5F5] font-bold">{demoState.device_name}</span></div>
                    <div>Detected Vendor: <span className="text-[#22C55E] font-bold">{demoState.vendor.toUpperCase()}</span></div>
                    <div>Detected Platform: <span className="text-[#F5F5F5]">{demoState.platform.toUpperCase()}</span></div>
                    <div>Configuration ID: <span className="text-[#666666]">{demoState.configuration_id}</span></div>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#A3A3A3]">
                    Deterministic signature engine matches Cisco IOS directives (<code className="text-[#00D9FF] font-mono">service password-encryption</code>, <code className="text-[#00D9FF] font-mono">line vty</code>, <code className="text-[#00D9FF] font-mono">aaa new-model</code>) with 99% confidence in &lt;2 milliseconds.
                  </p>
                  <div className="grid grid-cols-3 gap-3 font-mono">
                    <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#22C55E]/40">
                      <div className="text-xs text-[#22C55E] font-semibold">Cisco IOS</div>
                      <div className="text-lg font-bold text-[#F5F5F5]">99% Match</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]">
                      <div className="text-xs text-[#666666] font-semibold">Juniper JunOS</div>
                      <div className="text-lg font-bold text-[#666666]">0%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]">
                      <div className="text-xs text-[#666666] font-semibold">Fortinet FortiOS</div>
                      <div className="text-lg font-bold text-[#666666]">0%</div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#A3A3A3]">
                    The AST parser translates proprietary vendor syntax into our canonical 8-domain Universal Security Model.
                  </p>
                  <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-[#050505] border border-[#EF4444]/40 space-y-1">
                      <div className="text-[#EF4444] font-bold">Raw Cisco CLI</div>
                      <div className="text-[#D4D4D4]">ip ssh version 1</div>
                      <div className="text-[#D4D4D4]">transport input telnet ssh</div>
                      <div className="text-[#D4D4D4]">no service password-encryption</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#050505] border border-[#22C55E]/40 space-y-1">
                      <div className="text-[#22C55E] font-bold">Universal Security Model</div>
                      <div className="text-[#D4D4D4]">remote_access.ssh_version = 1</div>
                      <div className="text-[#D4D4D4]">remote_access.telnet_enabled = true</div>
                      <div className="text-[#D4D4D4]">authentication.password_encryption = false</div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#A3A3A3]">
                    Deterministic compliance engine evaluates 60+ rules across CIS, NIST, DISA STIG, and ISO 27001 with 100% mathematical reproducibility.
                  </p>
                  <div className="grid grid-cols-4 gap-3 font-mono">
                    {Object.entries(demoState.framework_scores).map(([fw, score]) => (
                      <div key={fw} className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] text-center">
                        <div className="text-xs text-[#A3A3A3] font-semibold">{fw}</div>
                        <div className="text-xl font-bold text-[#F5F5F5] mt-1">{score}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeStep === 5 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#A3A3A3]">
                    NetVigil provides verbatim line citations and observed vs expected values for every finding.
                  </p>
                  <div className="p-4 rounded-lg bg-[#050505] border border-[#EF4444]/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#EF4444] flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" /> CIS-1.1.2: Insecure Telnet Service Enabled
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#141414] text-[#EF4444] border border-[#EF4444]/40 font-bold font-mono">
                        CRITICAL ●
                      </span>
                    </div>
                    <div className="font-mono text-xs text-[#D4D4D4] p-2.5 rounded bg-[#0A0A0A] border border-[#1A1A1A]">
                      <span className="text-[#666666]">Line 28: </span>transport input telnet ssh
                    </div>
                    <div className="text-xs text-[#A3A3A3] flex items-center justify-between font-mono">
                      <span>Observed: <strong className="text-[#F5F5F5]">telnet_enabled = true</strong></span>
                      <span>Expected: <strong className="text-[#22C55E]">telnet_enabled = false</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 6 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#A3A3A3]">
                    The Risk Intelligence Engine aggregates individual findings into correlated, prioritized risks (P0 to P3).
                  </p>
                  <div className="p-4 rounded-lg bg-[#050505] border border-[#F59E0B]/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#F5F5F5]">Unencrypted Administrative Access Exposure</span>
                      <span className="px-2.5 py-0.5 rounded text-xs bg-[#141414] text-[#EF4444] border border-[#EF4444]/40 font-bold font-mono">
                        P0 IMMEDIATE
                      </span>
                    </div>
                    <p className="text-xs text-[#A3A3A3]">
                      Cleartext Telnet and SSH v1 on WAN interface permits credential interception and privileged session hijacking.
                    </p>
                    <div className="text-xs text-[#F59E0B] font-semibold font-mono">
                      NetVigil Risk Score: 94.5 / 100
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 7 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#A3A3A3]">
                    Vendor-specific remediation with visual diffs and strict **Zero Automated Execution Policy**.
                  </p>
                  <div className="p-4 rounded-lg bg-[#050505] border border-[#8B5CF6]/40 space-y-2 font-mono text-xs">
                    <div className="text-[#8B5CF6] font-bold">Allowlisted Remediation CLI (Cisco IOS)</div>
                    <div className="text-[#EF4444]">- transport input telnet ssh</div>
                    <div className="text-[#22C55E]">+ transport input ssh</div>
                    <div className="text-[#22C55E]">+ ip ssh version 2</div>
                  </div>
                </div>
              )}

              {activeStep === 8 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#A3A3A3]">
                    AI Audit Co-Pilot provides evidence-grounded explanations without altering compliance scores.
                  </p>
                  <div className="p-4 rounded-lg bg-[#050505] border border-[#00D9FF]/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#00D9FF] font-mono">
                      <Bot className="w-4 h-4" /> AI ADVISORY (Grounded in Verified Lines)
                    </div>
                    <p className="text-xs text-[#D4D4D4] leading-relaxed">
                      &quot;Enabling Telnet creates an unencrypted transport channel over port 23. Passwords and CLI commands are sent in cleartext across the network, directly violating NIST AC-17 and CIS Benchmark 1.1.2.&quot;
                    </p>
                  </div>
                </div>
              )}

              {activeStep === 9 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#A3A3A3]">
                    Hero Feature: Learning unseen vendor directives with Human-in-the-Loop approval and property allowlists.
                  </p>
                  <div className="p-4 rounded-lg bg-[#050505] border border-[#22C55E]/40 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400">Unknown Directive: control-plane policing policy-map COPP_MGMT_POLICY</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#141414] text-[#F59E0B] border border-[#F59E0B]/30">Pending Review</span>
                    </div>
                    <div className="text-[#D4D4D4]">
                      AI candidate: <code className="text-[#22C55E]">access_control.control_plane_policing_enabled = true</code> (Allowlisted)
                    </div>
                    <button
                      onClick={handleSimulateAdaptiveLearning}
                      disabled={isSimulatingLearning || learningApplied}
                      className="px-4 py-2 rounded-lg bg-[#0B0B0B] border border-[#22C55E]/50 hover:border-[#22C55E] hover:bg-[#141414] text-[#22C55E] font-semibold text-xs transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <GraduationCap className="w-4 h-4" />
                      {learningApplied ? "Knowledge Mapping Approved & Re-Analyzed" : "Approve Mapping & Re-Analyze"}
                    </button>
                  </div>
                </div>
              )}

              {activeStep === 10 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#A3A3A3]">
                    Official Executive Compliance Reports with NTRO header seal, executive metrics, and PDF export.
                  </p>
                  <div className="p-4 rounded-lg bg-[#050505] border border-[#1A1A1A] flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-[#F5F5F5]">Executive Audit Summary — CORE-RTR-01</div>
                      <div className="text-xs text-[#A3A3A3]">Includes CIS, NIST, DISA STIG, and ISO 27001 findings</div>
                    </div>
                    <Link
                      href="/reports"
                      className="px-4 py-2 rounded-lg bg-[#0B0B0B] border border-[#00D9FF]/50 hover:border-[#00D9FF] hover:bg-[#141414] text-[#00D9FF] text-xs font-semibold flex items-center gap-1.5 font-mono"
                    >
                      <FileText className="w-4 h-4" /> View in Reports
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Hero Before / After Adaptive Learning Posture Card */}
            <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#8B5CF6]" />
                  <h3 className="text-base font-bold text-[#F5F5F5]">Adaptive Learning Impact Evaluation</h3>
                </div>
                {learningApplied && (
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold font-mono bg-[#141414] text-[#22C55E] border border-[#22C55E]/40">
                    KNOWLEDGE EXPANDED (+{((afterLearningScore || 0) - demoState.compliance_score).toFixed(1)}%)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] space-y-2 font-mono">
                  <div className="text-xs font-semibold text-[#666666] uppercase">Before Learning</div>
                  <div className="text-2xl font-bold text-[#EF4444]">{demoState.compliance_score}%</div>
                  <div className="text-xs text-[#A3A3A3]">Unknown Directives: <strong className="text-[#F59E0B]">1 (CoPP)</strong></div>
                  <div className="text-xs text-[#A3A3A3]">Control State: <span className="text-[#F59E0B]">UNKNOWN</span></div>
                </div>

                <div className={`p-4 rounded-lg border space-y-2 transition-all font-mono ${
                  learningApplied
                    ? "bg-[#0D0D0D] border-[#22C55E]/40"
                    : "bg-[#0D0D0D] border-[#1A1A1A] opacity-50"
                }`}>
                  <div className="text-xs font-semibold text-[#22C55E] uppercase">After Learning & Re-Audit</div>
                  <div className="text-2xl font-bold text-[#22C55E]">
                    {learningApplied ? `${afterLearningScore}%` : "Pending Approval"}
                  </div>
                  <div className="text-xs text-[#A3A3A3]">Unknown Directives: <strong className="text-[#22C55E]">0</strong></div>
                  <div className="text-xs text-[#A3A3A3]">Control State: <span className="text-[#22C55E]">PASS (CoPP Guarded)</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Deep Navigation & Device State */}
          <div className="space-y-6">
            {/* Quick Deep Navigation */}
            <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-3">
              <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00D9FF]" /> Live Application Workspaces
              </h3>
              <p className="text-xs text-[#A3A3A3]">
                Directly inspect the real underlying databases and audit engines:
              </p>
              <div className="space-y-1.5 pt-2">
                <Link
                  href="/audits"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#141414] text-xs font-medium text-[#F5F5F5] border border-[#1A1A1A] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#00D9FF]" /> Audit Workspace
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                </Link>
                <Link
                  href="/risk"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#141414] text-xs font-medium text-[#F5F5F5] border border-[#1A1A1A] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#F59E0B]" /> Risk Intelligence Graph
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                </Link>
                <Link
                  href="/remediation"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#141414] text-xs font-medium text-[#F5F5F5] border border-[#1A1A1A] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-[#8B5CF6]" /> Remediation Center
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                </Link>
                <Link
                  href="/ai-assistant"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#141414] text-xs font-medium text-[#F5F5F5] border border-[#1A1A1A] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#00D9FF]" /> AI Co-Pilot Assistant
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                </Link>
                <Link
                  href="/adaptive-training"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#141414] text-xs font-medium text-[#F5F5F5] border border-[#1A1A1A] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#22C55E]" /> Adaptive Training System
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                </Link>
                <Link
                  href="/reports"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#141414] text-xs font-medium text-[#F5F5F5] border border-[#1A1A1A] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-white" /> Compliance Reports
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                </Link>
              </div>
            </div>

            {/* Why NetVigil Differentiators Card */}
            <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-3">
              <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#F59E0B]" /> Technical Differentiators
              </h3>
              <ul className="text-xs text-[#D4D4D4] space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] mt-0.5 shrink-0" />
                  <span><strong>Deterministic Compliance</strong> — Zero LLM hallucinations in rule checks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] mt-0.5 shrink-0" />
                  <span><strong>Universal Normalization</strong> — Cross-vendor equivalence for Cisco, Juniper, Fortinet.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] mt-0.5 shrink-0" />
                  <span><strong>Adaptive HITL Learning</strong> — Learns unseen syntax without code redeployments.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] mt-0.5 shrink-0" />
                  <span><strong>Allowlisted Remediation</strong> — Zero automated execution risk on live networks.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
