"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wrench,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  Lock,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Shield,
  Activity,
  Server,
  Download,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  startAgentWorkflow,
  fetchAgentSession,
  submitAgentApproval,
  fetchAgentReport,
  AgentSessionState,
  TimelineEvent,
  ProposedRemediationItem,
  FinalExecutiveReport,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

const QUICK_OBJECTIVES = [
  {
    id: "golden-demo",
    label: "Audit & fix high-risk (protect SSH)",
    objective:
      "Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access.",
    baseline: "CIS",
  },
  {
    id: "cis-full",
    label: "Fleet CIS Level 1 compliance",
    objective:
      "Perform comprehensive CIS Benchmark inspection across multi-vendor devices and isolate non-compliant controls.",
    baseline: "CIS",
  },
  {
    id: "perimeter-harden",
    label: "Disable cleartext protocols",
    objective:
      "Harden management access: disable Telnet and unencrypted HTTP, enforce SSHv2, and verify policy compliance.",
    baseline: "NIST",
  },
];

export default function AgentPage() {
  const [objective, setObjective] = useState<string>(QUICK_OBJECTIVES[0].objective);
  const [selectedBaseline, setSelectedBaseline] = useState<string>("CIS");
  const [session, setSession] = useState<AgentSessionState | null>(null);
  const [report, setReport] = useState<FinalExecutiveReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  // Restore previous session from localStorage on mount
  useEffect(() => {
    try {
      const savedSessionId = localStorage.getItem("netvigil_active_session_id");
      if (savedSessionId && !session) {
        fetchAgentSession(savedSessionId)
          .then((s) => {
            setSession(s);
            if (s.final_report) setReport(s.final_report);
          })
          .catch(() => localStorage.removeItem("netvigil_active_session_id"));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Poll active session if it is running or waiting
  useEffect(() => {
    if (!session || !session.session_id) return;
    if (session.status === "COMPLETED" || session.status === "REJECTED" || session.status === "FAILED") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await fetchAgentSession(session.session_id);
        setSession(updated);
        if (updated.final_report) setReport(updated.final_report);
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [session?.session_id, session?.status]);

  // Launch autonomous agent run
  const handleStartAgent = async () => {
    if (!objective.trim()) return;
    setIsLoading(true);
    setSession(null);
    setReport(null);

    try {
      const result = await startAgentWorkflow({
        objective: objective.trim(),
        baseline_framework: selectedBaseline,
        risk_threshold: "HIGH",
      });
      setSession(result);
      if (result.session_id) {
        localStorage.setItem("netvigil_active_session_id", result.session_id);
      }
      if (result.final_report) {
        setReport(result.final_report);
      }
    } catch (err: any) {
      console.error("Agent launch failure:", err);
      alert(`Agent execution failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Process human approval
  const handleApproval = async (approved: boolean) => {
    if (!session) return;
    setIsApproving(true);

    try {
      const updated = await submitAgentApproval(session.session_id, { approved });
      setSession(updated);
      if (updated.final_report) {
        setReport(updated.final_report);
      }
    } catch (err: any) {
      console.error("Approval submission failure:", err);
      alert(`Approval processing error: ${err.message || "Unknown error"}`);
    } finally {
      setIsApproving(false);
    }
  };

  // Reset to run another session
  const handleResetSession = () => {
    localStorage.removeItem("netvigil_active_session_id");
    setSession(null);
    setReport(null);
    setExpandedSteps({});
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const actionableProposals = session?.proposals?.filter((p) => !p.is_constrained) || [];
  const constrainedProposals = session?.proposals?.filter((p) => p.is_constrained) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#181a22]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[#f0f3f8] tracking-tight">Autonomous Security Engineer</h1>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0ea5e9]/10 text-[#0ea5e9] font-medium border border-[#0ea5e9]/20">
              Gemini 3.5 + ADK
            </span>
          </div>
          <p className="text-xs text-[#8b95a8] mt-0.5">
            Formulates audit plans, enforces negative operational constraints, applies allowlisted remediations, and verifies resolution.
          </p>
        </div>

        {session && (
          <button
            onClick={handleResetSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#12141a] hover:bg-[#181a22] border border-[#181a22] text-xs text-[#8b95a8] hover:text-[#f0f3f8] transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Objective</span>
          </button>
        )}
      </div>

      {/* Hero Objective Input Card */}
      <div className="p-5 rounded-lg bg-[#0d0e12] border border-[#181a22] space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#f0f3f8] mb-1.5">
            What should NetVigil secure?
          </label>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            disabled={isLoading || (session !== null && session.status !== "COMPLETED" && session.status !== "REJECTED")}
            rows={3}
            className="w-full p-3 rounded-md bg-[#050608] border border-[#181a22] focus:border-[#0ea5e9] text-xs text-[#f0f3f8] placeholder-[#5d677a] focus:outline-none transition-colors disabled:opacity-60"
            placeholder="e.g. Audit network configurations against CIS baseline. Fix high-risk violations, but do not modify SSH access."
          />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[#5d677a]">Suggested:</span>
          {QUICK_OBJECTIVES.map((chip) => (
            <button
              key={chip.id}
              onClick={() => {
                setObjective(chip.objective);
                setSelectedBaseline(chip.baseline);
              }}
              disabled={isLoading || (session !== null && session.status !== "COMPLETED" && session.status !== "REJECTED")}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded border transition-colors",
                objective === chip.objective
                  ? "bg-[#0ea5e9]/10 text-[#0ea5e9] border-[#0ea5e9]/30"
                  : "bg-[#12141a] text-[#8b95a8] hover:text-[#f0f3f8] border-[#181a22]"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#181a22]">
          <div className="flex items-center gap-2 text-xs text-[#8b95a8]">
            <span>Baseline:</span>
            <select
              value={selectedBaseline}
              onChange={(e) => setSelectedBaseline(e.target.value)}
              disabled={isLoading || (session !== null && session.status !== "COMPLETED")}
              className="p-1 rounded bg-[#12141a] border border-[#181a22] text-xs text-[#f0f3f8] focus:outline-none"
            >
              <option value="CIS">CIS Benchmarks</option>
              <option value="NIST">NIST SP 800-53</option>
              <option value="STIG">DISA STIG</option>
              <option value="ISO">ISO 27001</option>
            </select>
          </div>

          <button
            onClick={handleStartAgent}
            disabled={isLoading || !objective.trim() || (session !== null && session.status === "WAITING_APPROVAL")}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#0ea5e9] hover:bg-[#0284c7] disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-sm"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Orchestrating agent...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Agent</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Execution Session Active View */}
      {session && (
        <div className="space-y-6">
          {/* Status Banner */}
          <div className="p-4 rounded-lg bg-[#0d0e12] border border-[#181a22] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded flex items-center justify-center text-xs font-bold",
                  session.status === "COMPLETED"
                    ? "bg-[#10b981]/10 text-[#10b981]"
                    : session.status === "WAITING_APPROVAL"
                    ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                    : session.status === "REJECTED"
                    ? "bg-[#ef4444]/10 text-[#ef4444]"
                    : "bg-[#0ea5e9]/10 text-[#0ea5e9]"
                )}
              >
                {session.status === "COMPLETED" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : session.status === "WAITING_APPROVAL" ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-[#f0f3f8] flex items-center gap-2">
                  <span>Execution Session:</span>
                  <span className="font-mono text-[#0ea5e9]">{session.session_id}</span>
                </div>
                <div className="text-[11px] text-[#5d677a] mt-0.5">
                  State: <span className="font-medium text-[#c5cbd8]">{session.status}</span> • Steps completed: {session.timeline?.length || 0}
                </div>
              </div>
            </div>

            {session.constraints && session.constraints.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#12141a] border border-[#181a22] text-xs">
                <Lock className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span className="text-[11px] text-[#8b95a8]">Policy Guardrail:</span>
                <span className="text-[11px] font-semibold text-[#f0f3f8]">
                  {session.constraints.map((c) => c.subsystem.toUpperCase()).join(", ")} PROTECTED
                </span>
              </div>
            )}
          </div>

          {/* APPROVAL GATE CARD (When WAITING_APPROVAL) */}
          {session.status === "WAITING_APPROVAL" && (
            <div className="p-5 rounded-lg bg-[#0d0e12] border-2 border-[#f59e0b]/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#181a22]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
                  <h3 className="text-sm font-semibold text-[#f0f3f8]">
                    Remediation requires operator approval
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#8b95a8]">
                  Token: {session.active_approval?.approval_token || "auth_token"}
                </span>
              </div>

              <p className="text-xs text-[#8b95a8]">
                The agent formulated {actionableProposals.length} allowlisted remediation patch(es) across {session.discovered_configs?.length || 0} device(s). Review the proposed diff below.
              </p>

              {/* Proposals Diff Viewer */}
              <div className="space-y-3">
                {actionableProposals.map((prop) => (
                  <div key={prop.proposal_id} className="p-3.5 rounded bg-[#050608] border border-[#181a22] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ef4444]/10 text-[#ef4444] font-semibold border border-[#ef4444]/20">
                          {prop.severity}
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#f0f3f8]">{prop.device_name}</span>
                        <span className="text-xs text-[#8b95a8]">• {prop.title}</span>
                      </div>
                      <span className="text-[11px] text-[#5d677a]">{prop.control_id}</span>
                    </div>

                    {/* Diff Preview */}
                    {prop.diff_preview?.diff_lines && prop.diff_preview.diff_lines.length > 0 ? (
                      <div className="p-2 rounded bg-[#050608] border border-[#181a22] text-[11px] font-mono space-y-0.5 max-h-40 overflow-y-auto">
                        {prop.diff_preview.diff_lines.map((line, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "truncate px-1 py-0.5 rounded",
                              line.type === "removed"
                                ? "text-[#ef4444] bg-[#ef4444]/10"
                                : line.type === "added"
                                ? "text-[#10b981] bg-[#10b981]/10"
                                : "text-[#8b95a8]"
                            )}
                          >
                            {line.type === "removed" ? "- " : line.type === "added" ? "+ " : "  "}
                            {line.text}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="p-2 rounded bg-[#12141a] border border-[#ef4444]/20">
                          <div className="text-[10px] text-[#ef4444] uppercase font-sans font-semibold mb-1">Target Violation</div>
                          <div className="text-[#c5cbd8] truncate">{prop.potential_impact || "Protocol configuration"}</div>
                        </div>
                        <div className="p-2 rounded bg-[#12141a] border border-[#10b981]/20">
                          <div className="text-[10px] text-[#10b981] uppercase font-sans font-semibold mb-1">Commands to Apply</div>
                          <div className="text-[#10b981] truncate">{prop.commands}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Constrained Proposals Protected Badge */}
                {constrainedProposals.length > 0 && (
                  <div className="p-3 rounded bg-[#12141a] border border-[#f59e0b]/20 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-[#f59e0b]" />
                      <span className="text-[#c5cbd8]">
                        {constrainedProposals.length} item(s) protected by operator constraint (SSH Subsystem)
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded border border-[#f59e0b]/20">
                      SKIPPED & PROTECTED
                    </span>
                  </div>
                )}
              </div>

              {/* Decision Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#181a22]">
                <button
                  onClick={() => handleApproval(false)}
                  disabled={isApproving}
                  className="px-4 py-2 rounded bg-[#12141a] hover:bg-[#181a22] border border-[#181a22] text-xs text-[#8b95a8] hover:text-[#f0f3f8] font-medium transition-colors"
                >
                  Reject Plan
                </button>
                <button
                  onClick={() => handleApproval(true)}
                  disabled={isApproving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#10b981] hover:bg-[#059669] text-white text-xs font-medium transition-colors shadow-sm"
                >
                  {isApproving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Applying & verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Verify</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* VERIFICATION PROOF (When COMPLETED) */}
          {session.status === "COMPLETED" && report && (
            <div className="p-5 rounded-lg bg-[#0d0e12] border border-[#10b981]/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#181a22]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
                  <div>
                    <h3 className="text-sm font-semibold text-[#f0f3f8]">
                      Autonomous Remediation & Verification Complete
                    </h3>
                    <div className="text-[11px] text-[#5d677a]">
                      Verified by deterministic AST re-analysis and compliance rule comparison.
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] font-semibold border border-[#10b981]/20">
                    VERIFICATION PASSED
                  </span>
                </div>
              </div>

              {/* Verification Delta Scorecard */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-3 rounded bg-[#050608] border border-[#181a22]">
                  <div className="text-[10px] text-[#5d677a] uppercase">Violations Before</div>
                  <div className="text-xl font-semibold text-[#ef4444] mt-1">{report.total_violations_before}</div>
                </div>
                <div className="p-3 rounded bg-[#050608] border border-[#181a22]">
                  <div className="text-[10px] text-[#5d677a] uppercase">Violations After</div>
                  <div className="text-xl font-semibold text-[#10b981] mt-1">{report.total_violations_after}</div>
                </div>
                <div className="p-3 rounded bg-[#050608] border border-[#181a22]">
                  <div className="text-[10px] text-[#5d677a] uppercase">Patches Applied</div>
                  <div className="text-xl font-semibold text-[#0ea5e9] mt-1">{report.remediations_applied}</div>
                </div>
                <div className="p-3 rounded bg-[#050608] border border-[#181a22]">
                  <div className="text-[10px] text-[#5d677a] uppercase">SSH Subsystem</div>
                  <div className="text-xs font-semibold text-[#10b981] mt-2">100% UNTOUCHED</div>
                </div>
              </div>

              {/* Executive Summary */}
              {report.overall_posture_delta && (
                <div className="p-3 rounded bg-[#050608] border border-[#181a22] text-xs text-[#c5cbd8]">
                  <span className="font-semibold text-[#f0f3f8]">Outcome: </span>
                  {report.overall_posture_delta}
                </div>
              )}
            </div>
          )}

          {/* 12-Step Execution Timeline */}
          <div className="p-5 rounded-lg bg-[#0d0e12] border border-[#181a22] space-y-4">
            <h3 className="text-xs font-semibold text-[#f0f3f8] uppercase tracking-wider text-[#5d677a]">
              Execution Timeline ({session.timeline?.length || 0} Steps)
            </h3>

            <div className="relative border-l border-[#181a22] ml-3 space-y-4 pl-4">
              {session.timeline?.map((step) => {
                const isExpanded = expandedSteps[step.step_id];
                return (
                  <div key={step.step_id} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={cn(
                        "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-[#050608]",
                        step.status === "COMPLETED"
                          ? "border-[#10b981] bg-[#10b981]"
                          : step.status === "WAITING_APPROVAL"
                          ? "border-[#f59e0b] bg-[#f59e0b]"
                          : step.status === "REJECTED"
                          ? "border-[#ef4444] bg-[#ef4444]"
                          : "border-[#0ea5e9] bg-[#0ea5e9]"
                      )}
                    />

                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#f0f3f8]">{step.title}</span>
                          <span className="text-[10px] font-mono text-[#5d677a]">[{step.phase}]</span>
                        </div>
                        <p className="text-xs text-[#8b95a8]">{step.summary}</p>
                      </div>

                      {step.details && Object.keys(step.details).length > 0 && (
                        <button
                          onClick={() => toggleStep(step.step_id)}
                          className="text-[11px] text-[#5d677a] hover:text-[#8b95a8] flex items-center gap-1 font-mono"
                        >
                          <span>{isExpanded ? "Hide" : "Details"}</span>
                          <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                        </button>
                      )}
                    </div>

                    {/* Expandable Step Details */}
                    {isExpanded && step.details && (
                      <pre className="mt-2 p-2.5 rounded bg-[#050608] border border-[#181a22] text-[11px] font-mono text-[#8b95a8] overflow-x-auto">
                        {JSON.stringify(step.details, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
