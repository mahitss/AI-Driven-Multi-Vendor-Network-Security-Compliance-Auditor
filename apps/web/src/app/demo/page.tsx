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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-xl bg-[#0D121C] border border-[#1D2939]">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#080B12] text-[#3B82F6] border border-[#3B82F6]/30">
              SECURITY INTELLIGENCE
            </span>
            <span className="px-2.5 py-0.5 rounded text-[11px] bg-[#080B12] text-[#10B981] border border-[#10B981]/30">
              PIPELINE INSPECTOR
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#F3F4F6] flex items-center gap-2">
            NetVigil Pipeline Inspector
          </h1>
          <p className="text-sm text-[#A7B0C0] mt-1 max-w-2xl font-sans">
            Interactive pipeline verification showcasing multi-vendor normalization, deterministic compliance, line-level evidence, allowlisted remediation, and adaptive training.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono">
          <Link
            href="/demo/multi-vendor"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#080B12] hover:bg-[#111827] text-[#A7B0C0] hover:text-white border border-[#1D2939] text-xs font-semibold transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Multi-Vendor Engine →</span>
          </Link>

          <button
            onClick={() => launchMutation.mutate()}
            disabled={launchMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs transition-all disabled:opacity-50"
          >
            {launchMutation.isPending ? (
              <Activity className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Play className="w-4 h-4 fill-white text-white" />
            )}
            {demoState ? "Re-Run Pipeline Verification" : "Execute Pipeline Verification"}
          </button>

          <button
            onClick={() => {
              setDemoState(null);
              setLearningApplied(false);
              setAfterLearningScore(null);
              setActiveStep(1);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#080B12] hover:bg-[#111827] text-[#A7B0C0] hover:text-white text-xs font-medium border border-[#1D2939]"
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
          <div className="p-3 rounded-lg bg-[#0D121C] border border-[#1D2939]">
            <div className="text-[10px] text-[#667085] uppercase">Ingestion & Hash</div>
            <div className="text-base font-bold text-[#3B82F6] mt-0.5">
              {demoState.pipeline_latency.ingestion_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0D121C] border border-[#1D2939]">
            <div className="text-[10px] text-[#667085] uppercase">AST & Normalizer</div>
            <div className="text-base font-bold text-[#8B5CF6] mt-0.5">
              {demoState.pipeline_latency.parsing_and_normalization_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0D121C] border border-[#1D2939]">
            <div className="text-[10px] text-[#667085] uppercase">Compliance (60 Rules)</div>
            <div className="text-base font-bold text-[#10B981] mt-0.5">
              {demoState.pipeline_latency.compliance_evaluation_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0D121C] border border-[#1D2939]">
            <div className="text-[10px] text-[#667085] uppercase">Risk Correlator</div>
            <div className="text-base font-bold text-[#F59E0B] mt-0.5">
              {demoState.pipeline_latency.risk_scoring_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0D121C] border border-[#1D2939]">
            <div className="text-[10px] text-[#667085] uppercase">Remediation Diffs</div>
            <div className="text-base font-bold text-[#8B5CF6] mt-0.5">
              {demoState.pipeline_latency.remediation_diff_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#0D121C] border border-[#3B82F6]/40">
            <div className="text-[10px] text-[#3B82F6] font-semibold uppercase">Total Pipeline</div>
            <div className="text-base font-bold text-[#F3F4F6] mt-0.5">
              {demoState.pipeline_latency.total_ms} ms
            </div>
          </div>
        </div>
      )}

      {/* Stepper Navigation */}
      <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939]">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#667085] mb-3 flex items-center justify-between font-mono">
          <span>Demo Lifecycle Stages</span>
          <span className="text-[#3B82F6]">Stage {activeStep} of 10</span>
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
                    ? "bg-[#111827] border-[#3B82F6] text-white"
                    : isCompleted
                    ? "bg-[#080B12] border-[#10B981]/40 text-[#A7B0C0]"
                    : "bg-[#080B12] border-[#1D2939] text-[#667085] hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold">
                    0{step.id}
                  </span>
                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-[#10B981]" />}
                </div>
                <div className="text-xs font-semibold truncate">{step.title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage Presentation */}
      {!demoState ? (
        <div className="p-12 text-center rounded-xl bg-[#0D121C] border border-dashed border-[#1D2939] space-y-4 font-mono">
          <div className="w-16 h-16 rounded-xl bg-[#080B12] border border-[#1D2939] text-[#3B82F6] flex items-center justify-center mx-auto">
            <Play className="w-8 h-8 fill-[#3B82F6] text-[#3B82F6]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#F3F4F6] font-sans">Pipeline Verification Ready</h3>
            <p className="text-xs text-[#A7B0C0] max-w-md mx-auto mt-1 font-sans">
              Click &quot;Execute Pipeline Verification&quot; to execute the live deterministic pipeline on canonical gateway CORE-RTR-01.
            </p>
          </div>
          <button
            onClick={() => launchMutation.mutate()}
            className="px-6 py-2.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs transition-all inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white text-white" />
            Execute Pipeline Verification
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Active Stage Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Stage Detail */}
            <div className="p-6 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-6">
              <div className="flex items-center justify-between border-b border-[#1D2939] pb-4">
                <div>
                  <span className="text-xs font-mono text-[#3B82F6] uppercase">Stage 0{activeStep}</span>
                  <h2 className="text-xl font-bold text-[#F3F4F6] mt-0.5 font-sans">
                    {DEMO_STEPS[activeStep - 1].title} — {DEMO_STEPS[activeStep - 1].desc}
                  </h2>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <button
                    disabled={activeStep <= 1}
                    onClick={() => setActiveStep((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded bg-[#080B12] hover:bg-[#111827] text-xs font-medium text-[#A7B0C0] border border-[#1D2939] disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <button
                    disabled={activeStep >= 10}
                    onClick={() => setActiveStep((p) => Math.min(10, p + 1))}
                    className="px-3 py-1.5 rounded bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-medium text-white disabled:opacity-30 flex items-center gap-1"
                  >
                    Next Stage <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Stage Specific Highlights */}
              {activeStep === 1 && (
                <div className="space-y-4 font-sans">
                  <p className="text-sm text-[#A7B0C0]">
                    NetVigil securely ingests the raw configuration file <code className="text-[#3B82F6] font-mono">cisco-core-router.cfg</code>, sanitizes against path-traversal attacks, and calculates cryptographic SHA-256 digest in isolated disk storage.
                  </p>
                  <div className="p-4 rounded-lg bg-[#080B12] font-mono text-xs text-[#A7B0C0] border border-[#1D2939] space-y-1">
                    <div className="text-[#3B82F6]"># Ingestion Metadata</div>
                    <div>Device: <span className="text-[#F3F4F6] font-bold">{demoState.device_name}</span></div>
                    <div>Detected Vendor: <span className="text-[#10B981] font-bold">{demoState.vendor.toUpperCase()}</span></div>
                    <div>Detected Platform: <span className="text-[#F3F4F6]">{demoState.platform.toUpperCase()}</span></div>
                    <div>Configuration ID: <span className="text-[#667085]">{demoState.configuration_id}</span></div>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-4 font-sans">
                  <p className="text-sm text-[#A7B0C0]">
                    Deterministic signature engine matches Cisco IOS directives (<code className="text-[#3B82F6] font-mono">service password-encryption</code>, <code className="text-[#3B82F6] font-mono">line vty</code>, <code className="text-[#3B82F6] font-mono">aaa new-model</code>) with 99% confidence in &lt;2 milliseconds.
                  </p>
                  <div className="grid grid-cols-3 gap-3 font-mono">
                    <div className="p-3 rounded-lg bg-[#080B12] border border-[#10B981]/40">
                      <div className="text-xs text-[#10B981] font-semibold">Cisco IOS</div>
                      <div className="text-lg font-bold text-[#F3F4F6]">99% Match</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#080B12] border border-[#1D2939]">
                      <div className="text-xs text-[#667085] font-semibold">Juniper JunOS</div>
                      <div className="text-lg font-bold text-[#667085]">0%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#080B12] border border-[#1D2939]">
                      <div className="text-xs text-[#667085] font-semibold">Fortinet FortiOS</div>
                      <div className="text-lg font-bold text-[#667085]">0%</div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4 font-sans">
                  <p className="text-sm text-[#A7B0C0]">
                    The AST parser translates proprietary vendor syntax into our canonical 8-domain Universal Security Model.
                  </p>
                  <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-[#080B12] border border-[#EF4444]/40 space-y-1">
                      <div className="text-[#EF4444] font-bold">Raw Cisco CLI</div>
                      <div className="text-[#A7B0C0]">ip ssh version 1</div>
                      <div className="text-[#A7B0C0]">transport input telnet ssh</div>
                      <div className="text-[#A7B0C0]">no service password-encryption</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#080B12] border border-[#10B981]/40 space-y-1">
                      <div className="text-[#10B981] font-bold">Universal Security Model</div>
                      <div className="text-[#A7B0C0]">remote_access.ssh_version = 1</div>
                      <div className="text-[#A7B0C0]">remote_access.telnet_enabled = true</div>
                      <div className="text-[#A7B0C0]">authentication.password_encryption = false</div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div className="space-y-4 font-sans">
                  <p className="text-sm text-[#A7B0C0]">
                    Deterministic compliance engine evaluates 60+ rules across CIS, NIST, DISA STIG, and ISO 27001 with 100% mathematical reproducibility.
                  </p>
                  <div className="grid grid-cols-4 gap-3 font-mono">
                    {Object.entries(demoState.framework_scores).map(([fw, score]) => (
                      <div key={fw} className="p-3 rounded-lg bg-[#080B12] border border-[#1D2939] text-center">
                        <div className="text-xs text-[#667085] font-semibold">{fw}</div>
                        <div className="text-xl font-bold text-[#F3F4F6] mt-1">{score}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeStep === 5 && (
                <div className="space-y-4 font-sans">
                  <p className="text-sm text-[#A7B0C0]">
                    NetVigil provides verbatim line citations and observed vs expected values for every finding.
                  </p>
                  <div className="p-4 rounded-lg bg-[#080B12] border border-[#EF4444]/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#EF4444] flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" /> CIS-1.1.2: Insecure Telnet Service Enabled
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#111827] text-[#EF4444] border border-[#EF4444]/40 font-bold font-mono">
                        CRITICAL ●
                      </span>
                    </div>
                    <div className="font-mono text-xs text-[#A7B0C0] p-2.5 rounded bg-[#0D121C] border border-[#1D2939]">
                      <span className="text-[#667085]">Line 28: </span>transport input telnet ssh
                    </div>
                    <div className="text-xs text-[#A7B0C0] flex items-center justify-between font-mono">
                      <span>Observed: <strong className="text-white">telnet_enabled = true</strong></span>
                      <span>Expected: <strong className="text-[#10B981]">telnet_enabled = false</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 6 && (
                <div className="space-y-4 font-sans">
                  <p className="text-sm text-[#A7B0C0]">
                    The Risk Intelligence Engine aggregates individual findings into correlated, prioritized risks (P0 to P3).
                  </p>
                  <div className="p-4 rounded-lg bg-[#080B12] border border-[#F59E0B]/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#F3F4F6]">Unencrypted Administrative Access Exposure</span>
                      <span className="px-2.5 py-0.5 rounded text-xs bg-[#111827] text-[#EF4444] border border-[#EF4444]/40 font-bold font-mono">
                        P0 IMMEDIATE
                      </span>
                    </div>
                    <p className="text-xs text-[#A7B0C0]">
                      Cleartext Telnet and SSH v1 on WAN interface permits credential interception and privileged session hijacking.
                    </p>
                    <div className="text-xs text-[#F59E0B] font-semibold font-mono">
                      NetVigil Risk Score: 94.5 / 100
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 7 && (
                <div className="space-y-4 font-sans">
                  <p className="text-sm text-[#A7B0C0]">
                    Vendor-specific remediation with visual diffs and strict **Zero Automated Execution Policy**.
                  </p>
                  <div className="p-4 rounded-lg bg-[#080B12] border border-[#8B5CF6]/40 space-y-2 font-mono text-xs">
                    <div className="text-[#8B5CF6] font-bold">Allowlisted Remediation CLI (Cisco IOS)</div>
                    <div className="text-[#EF4444]">- transport input telnet ssh</div>
                    <div className="text-[#10B981]">+ transport input ssh</div>
                    <div className="text-[#10B981]">+ ip ssh version 2</div>
                  </div>
                </div>
              )}

              {activeStep === 8 && (
                <div className="space-y-4 font-sans">
                  <p className="text-sm text-[#A7B0C0]">
                    AI Audit Co-Pilot provides evidence-grounded explanations without altering compliance scores.
                  </p>
                  <div className="p-4 rounded-lg bg-[#080B12] border border-[#8B5CF6]/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#8B5CF6] font-mono">
                      <Bot className="w-4 h-4" /> AI ADVISORY (Grounded in Verified Lines)
                    </div>
                    <p className="text-xs text-[#A7B0C0] leading-relaxed">
                      &quot;Enabling Telnet creates an unencrypted transport channel over port 23. Passwords and CLI commands are sent in cleartext across the network, directly violating NIST AC-17 and CIS Benchmark 1.1.2.&quot;
                    </p>
                  </div>
                </div>
              )}

              {activeStep === 9 && (
                <div className="space-y-4 font-sans">
                  <p className="text-sm text-[#A7B0C0]">
                    Hero Feature: Learning unseen vendor directives with Human-in-the-Loop approval and property allowlists.
                  </p>
                  <div className="p-4 rounded-lg bg-[#080B12] border border-[#10B981]/40 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#F59E0B]">Unknown Directive: control-plane policing policy-map COPP_MGMT_POLICY</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#111827] text-[#F59E0B] border border-[#F59E0B]/30">Pending Review</span>
                    </div>
                    <div className="text-[#A7B0C0]">
                      AI candidate: <code className="text-[#10B981]">access_control.control_plane_policing_enabled = true</code> (Allowlisted)
                    </div>
                    <button
                      onClick={handleSimulateAdaptiveLearning}
                      disabled={isSimulatingLearning || learningApplied}
                      className="px-4 py-2 rounded-lg bg-[#0D121C] border border-[#10B981]/50 hover:border-[#10B981] hover:bg-[#111827] text-[#10B981] font-semibold text-xs transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <GraduationCap className="w-4 h-4" />
                      {learningApplied ? "Knowledge Mapping Approved & Re-Analyzed" : "Approve Mapping & Re-Analyze"}
                    </button>
                  </div>
                </div>
              )}

              {activeStep === 10 && (
                <div className="space-y-4 font-sans">
                  <p className="text-sm text-[#A7B0C0]">
                    Official Executive Compliance Reports with NTRO header seal, executive metrics, and PDF export.
                  </p>
                  <div className="p-4 rounded-lg bg-[#080B12] border border-[#1D2939] flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-[#F3F4F6]">Executive Audit Summary — CORE-RTR-01</div>
                      <div className="text-xs text-[#667085]">Includes CIS, NIST, DISA STIG, and ISO 27001 findings</div>
                    </div>
                    <Link
                      href="/reports"
                      className="px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold flex items-center gap-1.5 font-mono"
                    >
                      <FileText className="w-4 h-4" /> View in Reports
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Hero Before / After Adaptive Learning Posture Card */}
            <div className="p-6 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#8B5CF6]" />
                  <h3 className="text-base font-bold text-[#F3F4F6] font-sans">Adaptive Learning Impact Evaluation</h3>
                </div>
                {learningApplied && (
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold font-mono bg-[#080B12] text-[#10B981] border border-[#10B981]/40">
                    KNOWLEDGE EXPANDED (+{((afterLearningScore || 0) - demoState.compliance_score).toFixed(1)}%)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#080B12] border border-[#1D2939] space-y-2 font-mono">
                  <div className="text-xs font-semibold text-[#667085] uppercase">Before Learning</div>
                  <div className="text-2xl font-bold text-[#EF4444]">{demoState.compliance_score}%</div>
                  <div className="text-xs text-[#667085]">Unknown Directives: <strong className="text-[#F59E0B]">1 (CoPP)</strong></div>
                  <div className="text-xs text-[#667085]">Control State: <span className="text-[#F59E0B]">UNKNOWN</span></div>
                </div>

                <div className={`p-4 rounded-lg border space-y-2 transition-all font-mono ${
                  learningApplied
                    ? "bg-[#080B12] border-[#10B981]/40"
                    : "bg-[#080B12] border-[#1D2939] opacity-50"
                }`}>
                  <div className="text-xs font-semibold text-[#10B981] uppercase">After Learning & Re-Audit</div>
                  <div className="text-2xl font-bold text-[#10B981]">
                    {learningApplied ? `${afterLearningScore}%` : "Pending Approval"}
                  </div>
                  <div className="text-xs text-[#667085]">Unknown Directives: <strong className="text-[#10B981]">0</strong></div>
                  <div className="text-xs text-[#667085]">Control State: <span className="text-[#10B981]">PASS (CoPP Guarded)</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Deep Navigation & Device State */}
          <div className="space-y-6">
            {/* Quick Deep Navigation */}
            <div className="p-5 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-3">
              <h3 className="text-sm font-bold text-[#F3F4F6] flex items-center gap-2 font-sans">
                <Layers className="w-4 h-4 text-[#3B82F6]" /> Live Application Workspaces
              </h3>
              <p className="text-xs text-[#A7B0C0] font-sans">
                Directly inspect the real underlying databases and audit engines:
              </p>
              <div className="space-y-1.5 pt-2">
                <Link
                  href="/audits"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#080B12] hover:bg-[#111827] text-xs font-medium text-[#F3F4F6] border border-[#1D2939] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#3B82F6]" /> Audit Workspace
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#667085]" />
                </Link>
                <Link
                  href="/risk"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#080B12] hover:bg-[#111827] text-xs font-medium text-[#F3F4F6] border border-[#1D2939] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#F59E0B]" /> Risk Intelligence Graph
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#667085]" />
                </Link>
                <Link
                  href="/remediation"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#080B12] hover:bg-[#111827] text-xs font-medium text-[#F3F4F6] border border-[#1D2939] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-[#8B5CF6]" /> Remediation Center
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#667085]" />
                </Link>
                <Link
                  href="/ai-assistant"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#080B12] hover:bg-[#111827] text-xs font-medium text-[#F3F4F6] border border-[#1D2939] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#8B5CF6]" /> AI Co-Pilot Assistant
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#667085]" />
                </Link>
                <Link
                  href="/adaptive-training"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#080B12] hover:bg-[#111827] text-xs font-medium text-[#F3F4F6] border border-[#1D2939] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#10B981]" /> Adaptive Training System
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#667085]" />
                </Link>
                <Link
                  href="/reports"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#080B12] hover:bg-[#111827] text-xs font-medium text-[#F3F4F6] border border-[#1D2939] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-white" /> Compliance Reports
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#667085]" />
                </Link>
              </div>
            </div>

            {/* Why NetVigil Differentiators Card */}
            <div className="p-5 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-3">
              <h3 className="text-sm font-bold text-[#F3F4F6] flex items-center gap-2 font-sans">
                <Zap className="w-4 h-4 text-[#F59E0B]" /> Technical Differentiators
              </h3>
              <ul className="text-xs text-[#A7B0C0] space-y-2 font-sans">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] mt-0.5 shrink-0" />
                  <span><strong>Deterministic Compliance</strong> — Zero LLM hallucinations in rule checks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] mt-0.5 shrink-0" />
                  <span><strong>Universal Normalization</strong> — Cross-vendor equivalence for Cisco, Juniper, Fortinet.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] mt-0.5 shrink-0" />
                  <span><strong>Adaptive HITL Learning</strong> — Learns unseen syntax without code redeployments.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] mt-0.5 shrink-0" />
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
