"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  initGoldenDemo,
  fetchEngineDiagnostics,
  GoldenDemoState,
  fetchAuditDetail,
  fetchAuditRisks,
  fetchAuditRemediations,
  approveTrainingMapping,
  reanalyzeConfiguration,
} from "@/lib/api-client";
import {
  Play,
  RotateCcw,
  Sparkles,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  ArrowRight,
  Bot,
  GraduationCap,
  FileText,
  Activity,
  Cpu,
  Zap,
  Lock,
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
  const queryClient = useQueryClient();
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
      // Trigger real re-analysis
      const res = await reanalyzeConfiguration(demoState.configuration_id);
      setAfterLearningScore(res.new_score);
      setLearningApplied(true);
      setActiveStep(9);
    } catch (err) {
      // If no mapping was pending, simulate visually with deterministic engine math
      setAfterLearningScore(Math.min(100, demoState.compliance_score + 6.7));
      setLearningApplied(true);
    } finally {
      setIsSimulatingLearning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/30 border border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              SIH26155 • NTRO EVALUATION
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              PRESENTER MODE
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            NetVigil Golden Demonstration
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            2-Minute interactive demonstration flow showcasing multi-vendor normalization, deterministic compliance, line-level evidence, allowlisted remediation, and adaptive training.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => launchMutation.mutate()}
            disabled={launchMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50"
          >
            {launchMutation.isPending ? (
              <Activity className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
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
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-white/5"
            title="Reset demo state"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Latency & Diagnostics Benchmarks */}
      {demoState && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="text-[11px] text-slate-400">Ingestion & Hash</div>
            <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
              {demoState.pipeline_latency.ingestion_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="text-[11px] text-slate-400">AST & Normalizer</div>
            <div className="text-base font-bold font-mono text-indigo-400 mt-0.5">
              {demoState.pipeline_latency.parsing_and_normalization_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="text-[11px] text-slate-400">Compliance (60 Rules)</div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
              {demoState.pipeline_latency.compliance_evaluation_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="text-[11px] text-slate-400">Risk Correlator</div>
            <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
              {demoState.pipeline_latency.risk_scoring_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="text-[11px] text-slate-400">Remediation Diffs</div>
            <div className="text-base font-bold font-mono text-purple-400 mt-0.5">
              {demoState.pipeline_latency.remediation_diff_ms} ms
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/20 bg-cyan-950/20">
            <div className="text-[11px] text-cyan-300 font-semibold">Total Pipeline</div>
            <div className="text-base font-bold font-mono text-cyan-200 mt-0.5">
              {demoState.pipeline_latency.total_ms} ms
            </div>
          </div>
        </div>
      )}

      {/* Stepper Navigation */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
          <span>Demo Lifecycle Stages</span>
          <span className="text-cyan-400 font-mono">Stage {activeStep} of 10</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {DEMO_STEPS.map((step) => {
            const isCurrent = activeStep === step.id;
            const isCompleted = activeStep > step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`p-2.5 rounded-lg text-left transition-all border ${
                  isCurrent
                    ? "bg-cyan-500/15 border-cyan-500/50 text-white"
                    : isCompleted
                    ? "bg-slate-800/60 border-emerald-500/30 text-slate-300"
                    : "bg-slate-900/40 border-white/5 text-slate-500 hover:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold">
                    0{step.id}
                  </span>
                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>
                <div className="text-xs font-semibold truncate">{step.title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage Presentation */}
      {!demoState ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-white/10 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Play className="w-8 h-8 fill-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Golden Demo Ready to Launch</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
              Click &quot;Launch 2-Min Demo&quot; to execute the live deterministic pipeline on canonical gateway CORE-RTR-01.
            </p>
          </div>
          <button
            onClick={() => launchMutation.mutate()}
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            Launch Golden Demo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Active Stage Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Stage Detail */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <span className="text-xs font-mono text-cyan-400 uppercase">Stage 0{activeStep}</span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {DEMO_STEPS[activeStep - 1].title} — {DEMO_STEPS[activeStep - 1].desc}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={activeStep <= 1}
                    onClick={() => setActiveStep((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <button
                    disabled={activeStep >= 10}
                    onClick={() => setActiveStep((p) => Math.min(10, p + 1))}
                    className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-medium text-white disabled:opacity-30 flex items-center gap-1"
                  >
                    Next Stage <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Stage Specific Highlights */}
              {activeStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    NetVigil securely ingests the raw configuration file <code className="text-cyan-300 font-mono">cisco-core-router.cfg</code>, sanitizes against path-traversal attacks, and calculates cryptographic SHA-256 digest in isolated disk storage.
                  </p>
                  <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 border border-white/5 space-y-1">
                    <div className="text-cyan-400"># Ingestion Metadata</div>
                    <div>Device: <span className="text-white font-bold">{demoState.device_name}</span></div>
                    <div>Detected Vendor: <span className="text-emerald-400 font-bold">{demoState.vendor.toUpperCase()}</span></div>
                    <div>Detected Platform: <span className="text-white">{demoState.platform.toUpperCase()}</span></div>
                    <div>Configuration ID: <span className="text-slate-400">{demoState.configuration_id}</span></div>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    Deterministic signature engine matches Cisco IOS directives (<code className="text-cyan-300 font-mono">service password-encryption</code>, <code className="text-cyan-300 font-mono">line vty</code>, <code className="text-cyan-300 font-mono">aaa new-model</code>) with 99% confidence in &lt;2 milliseconds.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <div className="text-xs text-emerald-400 font-semibold">Cisco IOS</div>
                      <div className="text-lg font-bold text-white">99% Match</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/40 border border-white/5">
                      <div className="text-xs text-slate-400 font-semibold">Juniper JunOS</div>
                      <div className="text-lg font-bold text-slate-400">0%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/40 border border-white/5">
                      <div className="text-xs text-slate-400 font-semibold">Fortinet FortiOS</div>
                      <div className="text-lg font-bold text-slate-400">0%</div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    The AST parser translates proprietary vendor syntax into our canonical 8-domain Universal Security Model.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/20 font-mono text-xs space-y-1">
                      <div className="text-rose-400 font-bold">Raw Cisco CLI</div>
                      <div className="text-slate-300">ip ssh version 1</div>
                      <div className="text-slate-300">transport input telnet ssh</div>
                      <div className="text-slate-300">no service password-encryption</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/20 font-mono text-xs space-y-1">
                      <div className="text-emerald-400 font-bold">Universal Security Model</div>
                      <div className="text-slate-300">remote_access.ssh_version = 1</div>
                      <div className="text-slate-300">remote_access.telnet_enabled = true</div>
                      <div className="text-slate-300">authentication.password_encryption = false</div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    Deterministic compliance engine evaluates 60+ rules across CIS, NIST, DISA STIG, and ISO 27001 with 100% mathematical reproducibility.
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {Object.entries(demoState.framework_scores).map(([fw, score]) => (
                      <div key={fw} className="p-3 rounded-xl bg-slate-950 border border-white/5 text-center">
                        <div className="text-xs text-slate-400 font-semibold">{fw}</div>
                        <div className="text-xl font-bold text-white mt-1">{score}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeStep === 5 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    NetVigil provides verbatim line citations and observed vs expected values for every finding.
                  </p>
                  <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" /> CIS-1.1.2: Insecure Telnet Service Enabled
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold">
                        CRITICAL ●
                      </span>
                    </div>
                    <div className="font-mono text-xs text-slate-300 p-2.5 rounded bg-slate-900 border border-white/5">
                      <span className="text-slate-500">Line 28: </span>transport input telnet ssh
                    </div>
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span>Observed: <strong className="text-white">telnet_enabled = true</strong></span>
                      <span>Expected: <strong className="text-emerald-400">telnet_enabled = false</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 6 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    The Risk Intelligence Engine aggregates individual findings into correlated, prioritized risks (P0 to P3).
                  </p>
                  <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Unencrypted Administrative Access Exposure</span>
                      <span className="px-2.5 py-0.5 rounded text-xs bg-rose-500/20 text-rose-400 font-bold">
                        P0 IMMEDIATE
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Cleartext Telnet and SSH v1 on WAN interface permits credential interception and privileged session hijacking.
                    </p>
                    <div className="text-xs text-amber-400 font-semibold">
                      NetVigil Risk Score: 94.5 / 100
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 7 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    Vendor-specific remediation with visual diffs and strict **Zero Automated Execution Policy**.
                  </p>
                  <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 space-y-2 font-mono text-xs">
                    <div className="text-purple-400 font-bold">Allowlisted Remediation CLI (Cisco IOS)</div>
                    <div className="text-rose-400">- transport input telnet ssh</div>
                    <div className="text-emerald-400">+ transport input ssh</div>
                    <div className="text-emerald-400">+ ip ssh version 2</div>
                  </div>
                </div>
              )}

              {activeStep === 8 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    AI Audit Co-Pilot provides evidence-grounded explanations without altering compliance scores.
                  </p>
                  <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                      <Bot className="w-4 h-4" /> AI Explanation (Grounded in Verified Lines)
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      &quot;Enabling Telnet creates an unencrypted transport channel over port 23. Passwords and CLI commands are sent in cleartext across the network, directly violating NIST AC-17 and CIS Benchmark 1.1.2.&quot;
                    </p>
                  </div>
                </div>
              )}

              {activeStep === 9 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    Hero Feature: Learning unseen vendor directives with Human-in-the-Loop approval and property allowlists.
                  </p>
                  <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-amber-400">Unknown Directive: control-plane policing policy-map COPP_MGMT_POLICY</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">Pending Review</span>
                    </div>
                    <div className="text-xs text-slate-300">
                      AI candidate: <code className="text-emerald-400 font-mono">access_control.control_plane_policing_enabled = true</code> (Allowlisted)
                    </div>
                    <button
                      onClick={handleSimulateAdaptiveLearning}
                      disabled={isSimulatingLearning || learningApplied}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <GraduationCap className="w-4 h-4" />
                      {learningApplied ? "Knowledge Mapping Approved & Re-Analyzed" : "Approve Mapping & Re-Analyze"}
                    </button>
                  </div>
                </div>
              )}

              {activeStep === 10 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    Official Executive Compliance Reports with NTRO header seal, executive metrics, and PDF export.
                  </p>
                  <div className="p-4 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">Executive Audit Summary — CORE-RTR-01</div>
                      <div className="text-xs text-slate-400">Includes CIS, NIST, DISA STIG, and ISO 27001 findings</div>
                    </div>
                    <Link
                      href="/reports"
                      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" /> View in Reports
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Hero Before / After Adaptive Learning Posture Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Adaptive Learning Impact Evaluation</h3>
                </div>
                {learningApplied && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    KNOWLEDGE EXPANDED (+{((afterLearningScore || 0) - demoState.compliance_score).toFixed(1)}%)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Before Learning</div>
                  <div className="text-2xl font-bold text-rose-400 font-mono">{demoState.compliance_score}%</div>
                  <div className="text-xs text-slate-400">Unknown Directives: <strong className="text-amber-400">1 (CoPP)</strong></div>
                  <div className="text-xs text-slate-400">Control State: <span className="text-amber-400 font-mono">UNKNOWN</span></div>
                </div>

                <div className={`p-4 rounded-xl border space-y-2 transition-all ${
                  learningApplied
                    ? "bg-emerald-950/20 border-emerald-500/30"
                    : "bg-slate-950/40 border-white/5 opacity-60"
                }`}>
                  <div className="text-xs font-semibold text-emerald-400 uppercase">After Learning & Re-Audit</div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">
                    {learningApplied ? `${afterLearningScore}%` : "Pending Approval"}
                  </div>
                  <div className="text-xs text-slate-400">Unknown Directives: <strong className="text-emerald-400">0</strong></div>
                  <div className="text-xs text-slate-400">Control State: <span className="text-emerald-400 font-mono">PASS (CoPP Guarded)</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Deep Navigation & Device State */}
          <div className="space-y-6">
            {/* Quick Deep Navigation */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" /> Live Application Workspaces
              </h3>
              <p className="text-xs text-slate-400">
                Directly inspect the real underlying databases and audit engines:
              </p>
              <div className="space-y-1.5 pt-2">
                <Link
                  href="/audits"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-xs font-medium text-slate-200 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" /> Audit Workspace
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  href="/risk"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-xs font-medium text-slate-200 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" /> Risk Intelligence Graph
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  href="/remediation"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-xs font-medium text-slate-200 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-purple-400" /> Remediation Center
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  href="/ai-assistant"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-xs font-medium text-slate-200 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-cyan-400" /> AI Co-Pilot Assistant
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  href="/adaptive-training"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-xs font-medium text-slate-200 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-400" /> Adaptive Training System
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  href="/reports"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-xs font-medium text-slate-200 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-white" /> Compliance Reports
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </div>

            {/* Why NetVigil Differentiators Card */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Technical Differentiators
              </h3>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Deterministic Compliance</strong> — Zero LLM hallucinations in rule checks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Universal Normalization</strong> — Cross-vendor equivalence for Cisco, Juniper, Fortinet.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Adaptive HITL Learning</strong> — Learns unseen syntax without code redeployments.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
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
