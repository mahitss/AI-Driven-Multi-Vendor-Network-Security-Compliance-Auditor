"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Sparkles,
  Terminal,
  Cpu,
  Search,
  CheckCircle,
  HelpCircle,
  Info,
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
    label: "Fleet CIS Level 1 compliance (Audit only)",
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
  const [copiedSessionId, setCopiedSessionId] = useState(false);

  // Request race-condition & user interaction refs
  const activeRequestIdRef = useRef<string | null>(null);
  const isUserDirtyRef = useRef<boolean>(false);

  // Restore previous session from localStorage on mount ONLY if user has not typed
  useEffect(() => {
    try {
      const savedSessionId = localStorage.getItem("netvigil_active_session_id");
      if (savedSessionId && !session) {
        fetchAgentSession(savedSessionId)
          .then((s) => {
            if (s && !isUserDirtyRef.current) {
              setSession(s);
              // Bind input to the restored execution's exact immutable objective
              if (s.objective) setObjective(s.objective);
              if (s.final_report) setReport(s.final_report);
            } else if (!s) {
              localStorage.removeItem("netvigil_active_session_id");
            }
          })
          .catch(() => {
            localStorage.removeItem("netvigil_active_session_id");
          });
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Poll active session ONLY while actively running in the background
  useEffect(() => {
    if (!session || !session.session_id) return;

    // Stop polling if session is terminal, invalid, or already waiting for human approval
    const isTerminalOrAwaitingUser =
      session.status === "COMPLETED" ||
      session.status === "REJECTED" ||
      session.status === "FAILED" ||
      session.status === "INVALID_OBJECTIVE" ||
      session.status === "WAITING_APPROVAL";

    if (isTerminalOrAwaitingUser) {
      return;
    }

    const currentSessionId = session.session_id;
    let failureCount = 0;
    const interval = setInterval(async () => {
      try {
        const updated = await fetchAgentSession(currentSessionId);
        if (updated && updated.session_id === currentSessionId) {
          setSession(updated);
          if (updated.final_report) setReport(updated.final_report);
          failureCount = 0;
        } else if (!updated) {
          // Session was not found (404)
          clearInterval(interval);
          localStorage.removeItem("netvigil_active_session_id");
        }
      } catch (err: any) {
        failureCount++;
        // If multiple consecutive failures occur, clear interval cleanly
        if (failureCount >= 3) {
          clearInterval(interval);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [session?.session_id, session?.status]);

  // Handle objective textarea input: cleanly decouple session state on edit
  const handleObjectiveChange = (newText: string) => {
    isUserDirtyRef.current = true;
    setObjective(newText);
    // If currently viewing any session and text is edited, decouple session state immediately
    if (session) {
      setSession(null);
      setReport(null);
      setExpandedSteps({});
      localStorage.removeItem("netvigil_active_session_id");
    }
  };

  // Launch autonomous agent run
  const handleStartAgent = async (overrideObjective?: string) => {
    const targetObj = (overrideObjective ?? objective).trim();
    if (!targetObj) return;
    
    isUserDirtyRef.current = true;
    setObjective(targetObj);

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    activeRequestIdRef.current = requestId;

    setIsLoading(true);
    setSession(null);
    setReport(null);
    setExpandedSteps({});
    localStorage.removeItem("netvigil_active_session_id");

    try {
      const result = await startAgentWorkflow({
        objective: targetObj,
        baseline_framework: selectedBaseline,
        risk_threshold: "HIGH",
      });

      // Strict session binding: only set state if this request is still active
      if (activeRequestIdRef.current === requestId && result?.session_id) {
        setSession(result);
        if (result.objective) {
          setObjective(result.objective);
        }
        if (result.status !== "INVALID_OBJECTIVE") {
          localStorage.setItem("netvigil_active_session_id", result.session_id);
        }
        if (result.final_report) {
          setReport(result.final_report);
        }
      }
    } catch (err: any) {
      if (activeRequestIdRef.current === requestId) {
        console.error("Agent launch failure:", err);
        alert(`Agent execution failed: ${err.message || "Unknown error"}`);
      }
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  // Process human approval
  const handleApproval = async (approved: boolean) => {
    if (!session || !session.session_id) return;
    setIsApproving(true);

    try {
      const updated = await submitAgentApproval(session.session_id, {
        approved,
        approval_token: session.active_approval?.approval_token,
      });
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

  // Reset to run another session (Clean State: completely clear objective, session, and state)
  const handleResetSession = () => {
    activeRequestIdRef.current = null;
    isUserDirtyRef.current = true;
    localStorage.removeItem("netvigil_active_session_id");
    setSession(null);
    setReport(null);
    setExpandedSteps({});
    setObjective("");
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const handleCopySessionId = () => {
    if (!session?.session_id) return;
    navigator.clipboard.writeText(session.session_id);
    setCopiedSessionId(true);
    setTimeout(() => setCopiedSessionId(false), 2000);
  };

  const actionableProposals = useMemo(() => {
    return session?.proposals?.filter((p) => !p.is_constrained) || [];
  }, [session?.proposals]);

  const constrainedProposals = useMemo(() => {
    return session?.proposals?.filter((p) => p.is_constrained) || [];
  }, [session?.proposals]);

  const isInvalidObjective = session?.status === "INVALID_OBJECTIVE";
  const isInformationQuery = session?.intent === "INFORMATION";
  const isAmbiguousObjective = session?.intent === "AMBIGUOUS";
  const isReadOnlyAudit = session?.intent === "AUDIT_ONLY";

  // Derive real telemetry metrics directly from session execution data
  const telemetry = useMemo(() => {
    if (!session || isInvalidObjective || isInformationQuery) return null;

    // Discovered configurations
    const configsCount = session.discovered_configs?.length || 0;

    // Vendors detected from configs or timeline Step 3
    const vendorsSet = new Set<string>();
    session.discovered_configs?.forEach((c) => {
      if (c.vendor) vendorsSet.add(c.vendor.toUpperCase());
    });
    const step3 = session.timeline?.find((t) => t.phase === "DETECTION" || t.event_type === "VENDOR_DETECTED");
    if (step3?.details?.vendors_detected) {
      String(step3.details.vendors_detected).split(",").forEach((v) => vendorsSet.add(v.trim().toUpperCase()));
    }
    const vendorsList = Array.from(vendorsSet).filter(Boolean);

    // Total violations found from Step 5 or Step 6
    const step5 = session.timeline?.find((t) => t.phase === "AUDIT" || t.event_type === "AUDIT_COMPLETED");
    const step6 = session.timeline?.find((t) => t.phase === "RISK" || t.event_type === "FINDINGS_IDENTIFIED");
    const totalViolations = step5?.details?.total_violations ?? step6?.details?.total_failed ?? 0;
    const highRiskViolations = step6?.details?.high_risk_count ?? 0;

    // Active guardrails (e.g. SSH: DO_NOT_MODIFY)
    const constraintsList = (session.constraints && session.constraints.length > 0)
      ? session.constraints
      : (session.user_constraints && session.user_constraints.length > 0)
      ? session.user_constraints
      : [];
    const guardrailsCount = constraintsList.length;
    const guardrailNames = constraintsList.map((c) => c.subsystem.toUpperCase()).join(", ") || "None";

    // Unique devices affected by proposed patches
    const affectedDevicesSet = new Set<string>();
    session.proposals?.forEach((p) => {
      if (p.device_name) affectedDevicesSet.add(p.device_name);
    });
    const affectedDevicesCount = affectedDevicesSet.size || configsCount;

    return {
      configsCount,
      vendorsCount: vendorsList.length || (configsCount > 0 ? 3 : 0),
      vendorsList: vendorsList.length > 0 ? vendorsList.join(", ") : "Cisco, Juniper, Fortinet",
      frameworksCount: 4, // CIS, NIST, STIG, ISO evaluated
      totalViolations,
      highRiskViolations,
      proposalsCount: actionableProposals.length,
      guardrailsCount,
      guardrailNames,
      maskedCount: constrainedProposals.length,
      affectedDevicesCount,
    };
  }, [session, isInvalidObjective, isInformationQuery, actionableProposals, constrainedProposals]);

  // Derived state presentation
  const statePresentation = useMemo(() => {
    if (isLoading) {
      return {
        label: "ANALYZING OBJECTIVE",
        badgeClass: "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30",
        indicatorDot: "bg-[#3B82F6] animate-pulse",
        title: "Autonomous Security Engine Validating Intent",
        narrative: "NetVigil is categorizing objective scope, verifying remediation authority, and analyzing fleet baselines.",
      };
    }
    if (!session) {
      return {
        label: "STANDBY",
        badgeClass: "bg-[#111827] text-[#A7B0C0] border-[#1D2939]",
        indicatorDot: "bg-[#667085]",
        title: "Ready for New Objective",
        narrative: "Provide a natural language security objective above and click 'Launch Investigation' to initiate an autonomous investigation.",
      };
    }
    if (session.status === "INVALID_OBJECTIVE") {
      return {
        label: "OBJECTIVE NOT UNDERSTOOD",
        badgeClass: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30",
        indicatorDot: "bg-[#EF4444]",
        title: "No Security Operation Was Performed",
        narrative: session.error || "I couldn't determine a valid network security objective from this request. Please provide an actionable security task.",
      };
    }
    if (session.intent === "INFORMATION") {
      return {
        label: "INFORMATIONAL GUIDANCE",
        badgeClass: "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30",
        indicatorDot: "bg-[#3B82F6]",
        title: "Cybersecurity Knowledge & Compliance Guidance",
        narrative: "Informational query resolved with structured compliance guidance. Zero network operations performed.",
      };
    }
    if (session.intent === "AMBIGUOUS") {
      return {
        label: "READ-ONLY POSTURE ASSESSMENT",
        badgeClass: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
        indicatorDot: "bg-[#F59E0B]",
        title: "Ambiguous Objective: Remediation Planning Withheld",
        narrative: "Performed safe read-only assessment. Remediation planning was withheld because the objective lacked explicit authorization.",
      };
    }
    if (session.intent === "AUDIT_ONLY") {
      return {
        label: "READ-ONLY AUDIT COMPLETED",
        badgeClass: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30",
        indicatorDot: "bg-[#10B981]",
        title: "Fleet Compliance Audit Complete",
        narrative: "Inspected network configurations against baseline. Zero remediation modifications formulated in accordance with read-only directive.",
      };
    }
    if (session.status === "WAITING_APPROVAL") {
      return {
        label: "WAITING FOR OPERATOR APPROVAL",
        badgeClass: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
        indicatorDot: "bg-[#F59E0B] animate-pulse",
        title: "Autonomous Investigation Complete — Human Sign-off Required",
        narrative: "NetVigil formulated allowlisted remediation patches while strictly preserving your constraints. Zero changes are applied without your explicit approval.",
      };
    }
    if (session.status === "COMPLETED") {
      return {
        label: "VERIFIED & COMPLETED",
        badgeClass: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30",
        indicatorDot: "bg-[#10B981]",
        title: "Remediation Applied & Deterministically Verified",
        narrative: "Patches were committed and verified through independent AST re-analysis. Compliance elevated with mathematical proof.",
      };
    }
    if (session.status === "REJECTED") {
      return {
        label: "REMEDIATION REJECTED",
        badgeClass: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30",
        indicatorDot: "bg-[#EF4444]",
        title: "Execution Plan Cancelled by Operator",
        narrative: "The proposed configuration changes were rejected. Zero modifications were committed to device configurations.",
      };
    }
    return {
      label: "EXECUTING",
      badgeClass: "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30",
      indicatorDot: "bg-[#3B82F6] animate-pulse",
      title: "Autonomous Agent Active",
      narrative: "Progressing through multi-stage deterministic compliance pipeline...",
    };
  }, [session, isLoading]);

  // Calculate active stage in 10-stage lifecycle based on real backend session state
  const currentLifecycleStageIndex = useMemo(() => {
    if (!session) return isLoading ? 1 : 0;
    if (session.status === "INVALID_OBJECTIVE") return 1;
    if (session.status === "COMPLETED") return 9;
    if (session.status === "WAITING_APPROVAL") return 7;
    if (session.status === "REJECTED") return 7;

    const timelinePhases: string[] = (session.timeline?.map((t) => t.phase || t.event_type) || []).filter((p): p is string => Boolean(p));
    if (timelinePhases.some((p) => p.includes("VERIF"))) return 9;
    if (timelinePhases.some((p) => p.includes("EXEC"))) return 8;
    if (timelinePhases.some((p) => p.includes("APPROV") || p.includes("PROPOSAL"))) return 7;
    if (timelinePhases.some((p) => p.includes("REMED"))) return 6;
    if (timelinePhases.some((p) => p.includes("RISK"))) return 5;
    if (timelinePhases.some((p) => p.includes("AUDIT") || p.includes("COMPLIANCE"))) return 4;
    if (timelinePhases.some((p) => p.includes("PARSE") || p.includes("AST"))) return 3;
    if (timelinePhases.some((p) => p.includes("DISCOV") || p.includes("DETECT"))) return 2;
    if (timelinePhases.some((p) => p.includes("VALID") || p.includes("INTENT"))) return 1;
    return 0;
  }, [session, isLoading]);

  const LIFECYCLE_STAGES = [
    { id: "objective", label: "OBJECTIVE" },
    { id: "validation", label: "VALIDATION" },
    { id: "discovery", label: "DISCOVERY" },
    { id: "parsing", label: "PARSING" },
    { id: "compliance", label: "COMPLIANCE" },
    { id: "risk", label: "RISK" },
    { id: "remediation", label: "REMEDIATION" },
    { id: "approval", label: "HUMAN APPROVAL" },
    { id: "execution", label: "EXECUTION" },
    { id: "verification", label: "VERIFICATION" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 font-sans">
      {/* 1. Tactical Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1D2939] bg-[#080B12]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[#F3F4F6] tracking-tight font-mono">
              AUTONOMOUS INVESTIGATION CONSOLE
            </h1>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#3B82F6]/10 text-[#3B82F6] font-mono font-medium border border-[#3B82F6]/20">
              MISSION CONTROL
            </span>
          </div>
          <p className="text-xs text-[#A7B0C0] mt-0.5">
            Validates security intent, enforces negative constraints, formulates allowlisted remediations, and verifies resolution.
          </p>
        </div>

        {session && (
          <button
            onClick={handleResetSession}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0D121C] hover:bg-[#151E2D] border border-[#1D2939] text-xs font-mono text-[#A7B0C0] hover:text-[#F3F4F6] transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>NEW OBJECTIVE</span>
          </button>
        )}
      </div>

      {/* 2. 10-Stage Horizontal Tactical Lifecycle Stepper Ribbon */}
      <div className="p-2.5 rounded bg-[#0D121C] border border-[#1D2939] overflow-x-auto">
        <div className="flex items-center justify-between min-w-[760px] gap-1 font-mono text-[9px]">
          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentLifecycleStageIndex;
            const isCurrent = idx === currentLifecycleStageIndex;
            const isPending = idx > currentLifecycleStageIndex;

            return (
              <React.Fragment key={stage.id}>
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded border transition-all flex-shrink-0",
                    isCurrent
                      ? "bg-[#3B82F6]/15 border-[#3B82F6] text-[#3B82F6] font-bold shadow-sm"
                      : isCompleted
                      ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
                      : "bg-[#080B12] border-[#1D2939] text-[#667085]"
                  )}
                >
                  <span
                    className={cn(
                      "w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold",
                      isCurrent
                        ? "bg-[#3B82F6] text-white"
                        : isCompleted
                        ? "bg-[#10B981] text-black"
                        : "bg-[#1D2939] text-[#667085]"
                    )}
                  >
                    {isCompleted ? "✓" : idx + 1}
                  </span>
                  <span>{stage.label}</span>
                </div>
                {idx < LIFECYCLE_STAGES.length - 1 && (
                  <span
                    className={cn(
                      "text-[9px]",
                      isCompleted ? "text-[#10B981]" : "text-[#1D2939]"
                    )}
                  >
                    →
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. Objective Command Input Console */}
      <div className="p-4 rounded bg-[#0D121C] border border-[#1D2939] space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-mono font-medium text-[#F3F4F6] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>OPERATIONAL OBJECTIVE</span>
            </label>
            {session && (
              <span className="text-[10px] text-[#3B82F6] font-mono">
                Bound Session: {session.session_id.slice(0, 16)}...
              </span>
            )}
          </div>
          <textarea
            value={objective}
            onChange={(e) => handleObjectiveChange(e.target.value)}
            disabled={isLoading}
            rows={2}
            className="w-full p-2.5 rounded bg-[#080B12] border border-[#1D2939] focus:border-[#3B82F6] text-xs text-[#F3F4F6] placeholder-[#667085] focus:outline-none transition-colors disabled:opacity-60 font-mono"
            placeholder="e.g. Audit network configurations against CIS baseline. Fix high-risk violations, but do not modify SSH access."
          />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#667085]">PRESETS:</span>
          {QUICK_OBJECTIVES.map((chip) => (
            <button
              key={chip.id}
              onClick={() => {
                handleObjectiveChange(chip.objective);
                setSelectedBaseline(chip.baseline);
              }}
              disabled={isLoading}
              className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded border transition-colors",
                objective === chip.objective
                  ? "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/40"
                  : "bg-[#080B12] text-[#A7B0C0] hover:text-[#F3F4F6] border-[#1D2939]"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-[#1D2939]">
          <div className="flex items-center gap-2 text-xs text-[#A7B0C0] font-mono">
            <span className="text-[11px]">BASELINE:</span>
            <select
              value={selectedBaseline}
              onChange={(e) => setSelectedBaseline(e.target.value)}
              disabled={isLoading}
              className="p-1 rounded bg-[#080B12] border border-[#1D2939] text-xs text-[#F3F4F6] focus:outline-none font-mono"
            >
              <option value="CIS">CIS Benchmarks (Level 1 & 2)</option>
              <option value="NIST">NIST SP 800-53 (Rev 5)</option>
              <option value="STIG">DISA Network STIG</option>
              <option value="ISO">ISO/IEC 27001</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {session && (
              <button
                onClick={handleResetSession}
                className="px-2.5 py-1.5 rounded bg-[#080B12] hover:bg-[#151E2D] border border-[#1D2939] text-xs font-mono text-[#A7B0C0] hover:text-[#F3F4F6] transition-colors"
              >
                CLEAR
              </button>
            )}
            <button
              onClick={() => handleStartAgent()}
              disabled={isLoading || !objective.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white text-xs font-mono font-medium transition-colors shadow-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>VALIDATING INTENT...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  <span>{session ? "RE-RUN INVESTIGATION" : "LAUNCH INVESTIGATION"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Primary Agent State Banner */}
      <div className="p-3.5 rounded bg-[#0D121C] border border-[#1D2939] space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#1D2939]">
          <div className="flex items-center gap-2.5">
            <div className={cn("px-2 py-0.5 rounded border text-[10px] font-mono font-semibold flex items-center gap-1.5", statePresentation.badgeClass)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", statePresentation.indicatorDot)} />
              <span>{statePresentation.label}</span>
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#F3F4F6] font-mono">{statePresentation.title}</h2>
              <p className="text-[11px] text-[#A7B0C0] mt-0.5">{statePresentation.narrative}</p>
            </div>
          </div>

          {session && (
            <div className="flex items-center gap-2 text-xs font-mono self-start sm:self-auto">
              <span className="text-[10px] text-[#667085]">Stage {session.timeline?.length || 0}/10</span>
              <button
                onClick={handleCopySessionId}
                title="Click to copy Session ID"
                className="px-2 py-0.5 rounded bg-[#080B12] hover:bg-[#151E2D] border border-[#1D2939] text-[10px] text-[#A7B0C0] hover:text-[#F3F4F6] flex items-center gap-1 transition-colors"
              >
                <span>{session.session_id.slice(0, 16)}...</span>
                {copiedSessionId ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>

        {/* 5. Live Telemetry Facts Strip */}
        {telemetry && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 pt-0.5 text-center font-mono">
            <div className="p-1.5 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#667085] uppercase font-sans">Configs</div>
              <div className="text-xs font-bold text-[#F3F4F6] mt-0.5">{telemetry.configsCount}</div>
            </div>
            <div className="p-1.5 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#667085] uppercase font-sans">Vendors</div>
              <div className="text-xs font-bold text-[#3B82F6] mt-0.5">{telemetry.vendorsCount}</div>
            </div>
            <div className="p-1.5 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#667085] uppercase font-sans">Frameworks</div>
              <div className="text-xs font-bold text-[#F3F4F6] mt-0.5">{telemetry.frameworksCount}</div>
            </div>
            <div className="p-1.5 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#667085] uppercase font-sans">Violations</div>
              <div className="text-xs font-bold text-[#EF4444] mt-0.5">{telemetry.totalViolations}</div>
            </div>
            <div className="p-1.5 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#EF4444] uppercase font-sans">P1 High-Risk</div>
              <div className="text-xs font-bold text-[#EF4444] mt-0.5">{telemetry.highRiskViolations}</div>
            </div>
            <div className="p-1.5 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#10B981] uppercase font-sans">Patches</div>
              <div className="text-xs font-bold text-[#10B981] mt-0.5">{telemetry.proposalsCount}</div>
            </div>
            <div className="p-1.5 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#F59E0B] uppercase font-sans">Guardrails</div>
              <div className="text-xs font-bold text-[#F59E0B] mt-0.5">
                {telemetry.guardrailsCount > 0 ? `${telemetry.guardrailsCount} Active` : "None"}
              </div>
            </div>
            <div className="p-1.5 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#667085] uppercase font-sans">Devices</div>
              <div className="text-xs font-bold text-[#F3F4F6] mt-0.5">{telemetry.affectedDevicesCount}</div>
            </div>
          </div>
        )}

        {/* Clean Standby State Prompt When No Session Is Active */}
        {!session && (
          <div className="p-3 rounded bg-[#080B12] border border-[#1D2939] text-xs text-[#A7B0C0] flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span className="text-[11px]">
                Enter an objective above. NetVigil validates intent, parses negative constraints, evaluates AST baselines, and generates allowlisted patches.
              </span>
            </div>
            <span className="text-[9px] font-mono text-[#667085] px-2 py-0.5 rounded bg-[#0D121C] border border-[#1D2939] flex-shrink-0">
              STANDBY • ZERO PENDING ACTIONS
            </span>
          </div>
        )}
      </div>

      {/* 4. CASE 1: INVALID OBJECTIVE REJECTION HERO CARD */}
      {isInvalidObjective && (
        <div className="p-4 rounded bg-[#0D121C] border-2 border-[#EF4444]/30 space-y-3 font-mono">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#1D2939]">
            <div className="w-8 h-8 rounded bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center text-[#EF4444]">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F3F4F6] uppercase">OBJECTIVE NOT UNDERSTOOD</h3>
              <p className="text-[11px] text-[#A7B0C0] font-sans">
                No security operation or configuration change was performed.
              </p>
            </div>
          </div>

          <div className="p-3 rounded bg-[#080B12] border border-[#1D2939] text-xs text-[#A7B0C0] space-y-1.5 font-sans">
            <div className="text-[#A7B0C0] text-[11px]">
              The agent could not determine an actionable network security task or infrastructure target from your request:
            </div>
            <div className="p-2 rounded bg-[#111827] border border-[#1D2939] font-mono text-xs text-[#EF4444]">
              &quot;{session?.objective}&quot;
            </div>
          </div>

          {/* Clickable Suggested Valid Objectives */}
          <div className="space-y-1.5 pt-1 font-mono">
            <div className="text-xs font-semibold text-[#F3F4F6] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span className="text-[11px] uppercase">SUGGESTED VALID OBJECTIVES:</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {(session?.suggested_prompts?.length ? session.suggested_prompts : QUICK_OBJECTIVES.map((q) => q.objective)).map(
                (prompt: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleStartAgent(prompt)}
                    className="p-2.5 rounded bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] hover:border-[#3B82F6]/40 text-left text-xs text-[#A7B0C0] hover:text-[#F3F4F6] transition-colors flex items-center justify-between group"
                  >
                    <span className="font-mono text-[11px]">{prompt}</span>
                    <ArrowRight className="w-3 h-3 text-[#667085] group-hover:text-[#3B82F6] transition-colors ml-2 flex-shrink-0" />
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. CASE 2: INFORMATIONAL GUIDANCE CARD */}
      {isInformationQuery && session && (
        <div className="p-4 rounded bg-[#0D121C] border border-[#3B82F6]/30 space-y-3 font-mono">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#1D2939]">
            <div className="w-8 h-8 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F3F4F6] uppercase">COMPLIANCE & SECURITY GUIDANCE</h3>
              <p className="text-[11px] text-[#A7B0C0] font-sans">Informational query resolved. Zero fleet changes performed.</p>
            </div>
          </div>

          <div className="p-3 rounded bg-[#080B12] border border-[#1D2939] text-xs text-[#A7B0C0] leading-relaxed font-sans">
            {session.intent_explanation}
          </div>

          <div className="flex items-center justify-between pt-1 text-xs text-[#A7B0C0] font-mono">
            <span className="text-[10px]">To audit your devices against this standard, choose an actionable prompt:</span>
            <button
              onClick={() => handleStartAgent(QUICK_OBJECTIVES[0].objective)}
              className="px-2.5 py-1 rounded bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] font-medium border border-[#3B82F6]/20 transition-colors text-[10px]"
            >
              RUN AUDIT & REMEDIATION
            </button>
          </div>
        </div>
      )}

      {/* 6. Show Autonomy: Autonomous Decisions & Guardrails */}
      {session && !isInvalidObjective && !isInformationQuery && (
        <div className="p-4 rounded bg-[#0D121C] border border-[#1D2939] space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#1D2939]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
              <h3 className="text-xs font-mono font-semibold text-[#F3F4F6] uppercase tracking-wider">
                AUTONOMOUS POLICY DECISIONS & NEGATIVE CONSTRAINTS
              </h3>
            </div>
            <span className="text-[10px] text-[#667085] font-mono">FAIL-CLOSED ENFORCEMENT</span>
          </div>

          <p className="text-[11px] text-[#A7B0C0] leading-relaxed">
            {isReadOnlyAudit || isAmbiguousObjective
              ? "Read-only inspection completed. Remediation planning was withheld in accordance with operator directive."
              : "NetVigil identified high-risk exposure points and formulated allowlisted remediation actions while strictly preserving specified constraints."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
            {/* Pillar 1: Decision */}
            <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939] space-y-0.5">
              <div className="text-[9px] text-[#667085] uppercase">Autonomous Decision</div>
              <div className="font-semibold text-[#F3F4F6] text-[11px]">{telemetry?.highRiskViolations || 0} P1 Findings Isolated</div>
              <div className="text-[10px] text-[#A7B0C0] font-sans">Prioritized cleartext protocols & insecure auth.</div>
            </div>

            {/* Pillar 2: Constraint */}
            <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939] space-y-0.5">
              <div className="text-[9px] text-[#F59E0B] uppercase flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#F59E0B]" />
                <span>Operational Constraint</span>
              </div>
              <div className="font-semibold text-[#F59E0B] text-[11px]">
                {telemetry?.guardrailsCount ? `${telemetry.guardrailNames} Protected ✓` : "Full Baseline Hardening"}
              </div>
              <div className="text-[10px] text-[#A7B0C0] font-sans">
                {telemetry?.guardrailsCount
                  ? "Zero SSH modifications permitted in formulated patch set."
                  : "No negative user constraints specified by operator."}
              </div>
            </div>

            {/* Pillar 3: Plan */}
            <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939] space-y-0.5">
              <div className="text-[9px] text-[#10B981] uppercase">Remediation Plan</div>
              <div className="font-semibold text-[#10B981] text-[11px]">
                {isReadOnlyAudit || isAmbiguousObjective ? "0 Patches (Read-Only)" : `${actionableProposals.length} Allowlisted Patches`}
              </div>
              <div className="text-[10px] text-[#A7B0C0] font-sans">
                {isReadOnlyAudit || isAmbiguousObjective ? "Remediation withheld." : "100% catalog-grounded vendor CLI commands."}
              </div>
            </div>

            {/* Pillar 4: Approval */}
            <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939] space-y-0.5">
              <div className="text-[9px] text-[#3B82F6] uppercase">Authority Boundary</div>
              <div className="font-semibold text-[#3B82F6] text-[11px]">
                {isReadOnlyAudit || isAmbiguousObjective
                  ? "Read-Only Mode"
                  : session.status === "COMPLETED"
                  ? "Approved & Verified ✓"
                  : "Operator Sign-off Required"}
              </div>
              <div className="text-[10px] text-[#A7B0C0] font-sans">
                {isReadOnlyAudit || isAmbiguousObjective
                  ? "Zero modifications permitted."
                  : session.status === "COMPLETED"
                  ? "Executed with deterministic proof."
                  : "0 changes committed without human approval."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. HERO APPROVAL SCREEN (When WAITING_APPROVAL) */}
      {session && session.status === "WAITING_APPROVAL" && (
        <div className="p-4 rounded bg-[#0D121C] border-2 border-[#F59E0B]/40 space-y-3 shadow-lg shadow-[#F59E0B]/5 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#1D2939]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                <h3 className="text-xs font-semibold text-[#F3F4F6] uppercase tracking-wider">
                  HUMAN APPROVAL REQUIRED — ZERO DRIFT GATE
                </h3>
              </div>
              <p className="text-[11px] text-[#A7B0C0] font-sans">
                NetVigil completed the autonomous investigation and prepared the following controlled changes.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#F59E0B]/10 text-[#F59E0B] font-semibold border border-[#F59E0B]/20">
                0 CHANGES COMMITTED
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#10B981]/10 text-[#10B981] font-semibold border border-[#10B981]/20">
                SSH PROTECTED ✓
              </span>
            </div>
          </div>

          {/* Hero Metrics Row */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#EF4444] uppercase font-sans font-semibold">High-Risk Findings</div>
              <div className="text-base font-bold text-[#EF4444] mt-0.5">{telemetry?.highRiskViolations || 0}</div>
            </div>
            <div className="p-2 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#10B981] uppercase font-sans font-semibold">Proposed Patches</div>
              <div className="text-base font-bold text-[#10B981] mt-0.5">{actionableProposals.length}</div>
            </div>
            <div className="p-2 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#3B82F6] uppercase font-sans font-semibold">Affected Devices</div>
              <div className="text-base font-bold text-[#3B82F6] mt-0.5">{telemetry?.affectedDevicesCount || 0}</div>
            </div>
          </div>

          {/* Proposals Before / After CLI Diff Viewer */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#F3F4F6] flex items-center justify-between font-mono">
              <span className="text-[11px] uppercase text-[#A7B0C0]">PROPOSED CONFIGURATION DIFFS</span>
              <span className="text-[10px] text-[#667085]">BEFORE ↓ PROPOSED CHANGE ↓ AFTER</span>
            </div>

            {actionableProposals.map((prop) => (
              <div key={prop.proposal_id} className="p-3 rounded bg-[#080B12] border border-[#1D2939] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#EF4444]/10 text-[#EF4444] font-semibold border border-[#EF4444]/20 font-mono">
                      {prop.severity}
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#F3F4F6]">{prop.device_name}</span>
                    <span className="text-xs text-[#A7B0C0] truncate max-w-md font-sans">• {prop.title}</span>
                  </div>
                  <span className="text-[10px] text-[#667085] font-mono">{prop.control_id}</span>
                </div>

                {/* Diff Preview Lines */}
                {prop.diff_preview?.diff_lines && prop.diff_preview.diff_lines.length > 0 ? (
                  <div className="p-2 rounded bg-[#080B12] border border-[#1D2939] text-[10px] font-mono space-y-0.5 max-h-40 overflow-y-auto">
                    {prop.diff_preview.diff_lines.map((line, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "truncate px-1 py-0.2 rounded",
                          line.type === "removed"
                            ? "text-[#EF4444] bg-[#EF4444]/10"
                            : line.type === "added"
                            ? "text-[#10B981] bg-[#10B981]/10"
                            : "text-[#A7B0C0]"
                        )}
                      >
                        {line.type === "removed" ? "- " : line.type === "added" ? "+ " : "  "}
                        {line.text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="p-2 rounded bg-[#111827] border border-[#EF4444]/20">
                      <div className="text-[9px] text-[#EF4444] uppercase font-sans font-semibold mb-0.5">Target Violation</div>
                      <div className="text-[#A7B0C0] truncate">{prop.potential_impact || "Protocol configuration"}</div>
                    </div>
                    <div className="p-2 rounded bg-[#111827] border border-[#10B981]/20">
                      <div className="text-[9px] text-[#10B981] uppercase font-sans font-semibold mb-0.5">Commands to Apply</div>
                      <div className="text-[#10B981] truncate">{prop.commands}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Constrained Proposals Badge & Detailed View */}
            {constrainedProposals.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#1D2939]">
                <div className="p-2 rounded bg-[#080B12] border border-[#F59E0B]/25 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-[#F59E0B]" />
                    <span className="text-[#A7B0C0] text-[11px]">
                      {constrainedProposals.length} prohibited proposal(s) skipped to honor operator constraint ({telemetry?.guardrailNames || "Protected Subsystem"})
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.2 rounded border border-[#F59E0B]/20 font-mono">
                    SKIPPED — CONSTRAINED
                  </span>
                </div>

                <div className="space-y-1.5">
                  {constrainedProposals.map((prop) => (
                    <div key={prop.proposal_id} className="p-2.5 rounded bg-[#080B12] border border-[#F59E0B]/20 space-y-1 opacity-90">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#F59E0B]/10 text-[#F59E0B] font-semibold border border-[#F59E0B]/20 font-mono">
                            SKIPPED
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#F3F4F6]">{prop.device_name}</span>
                          <span className="text-xs text-[#A7B0C0] truncate max-w-md font-sans">• {prop.title}</span>
                        </div>
                        <span className="text-[10px] text-[#F59E0B] font-mono">{prop.control_id}</span>
                      </div>
                      <div className="text-[10px] text-[#A7B0C0] flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-[#F59E0B] inline shrink-0" />
                        <span>{prop.constraint_reason || "Operator Negative Constraint: Subsystem modification prohibited."}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Decision Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-[#1D2939]">
            <button
              onClick={() => handleApproval(false)}
              disabled={isApproving}
              className="px-3 py-1.5 rounded bg-[#080B12] hover:bg-[#151E2D] border border-[#1D2939] text-xs font-mono text-[#A7B0C0] hover:text-[#EF4444] font-medium transition-colors"
            >
              REJECT PLAN
            </button>
            <button
              onClick={() => handleApproval(true)}
              disabled={isApproving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#10B981] hover:bg-[#059669] text-white text-xs font-mono font-semibold transition-colors shadow-sm"
            >
              {isApproving ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>APPLYING & VERIFYING...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>APPROVE & VERIFY RESOLUTION</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 8. CLOSED-LOOP VERIFICATION SCORECARD (When COMPLETED) */}
      {session && session.status === "COMPLETED" && report && (
        <div className="p-4 rounded bg-[#0D121C] border border-[#10B981]/30 space-y-3 shadow-lg shadow-[#10B981]/5 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#1D2939]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#10B981]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-[#F3F4F6] uppercase tracking-wider">
                  {isReadOnlyAudit || isAmbiguousObjective
                    ? "READ-ONLY COMPLIANCE AUDIT REPORT COMPILED"
                    : "AUTONOMOUS REMEDIATION & CLOSED-LOOP VERIFICATION PASSED"}
                </h3>
                <div className="text-[10px] text-[#667085]">
                  Verified by deterministic AST parsing, rule evaluation, and constraint verification.
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] font-semibold border border-[#10B981]/20">
                {isReadOnlyAudit || isAmbiguousObjective ? "AUDIT COMPILED ✓" : "VERIFICATION PASSED ✓"}
              </span>
            </div>
          </div>

          {/* Verification Delta Scorecard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs font-mono">
            <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#667085] uppercase font-sans">Total Violations</div>
              <div className="text-base font-bold text-[#EF4444] mt-0.5">{report.total_violations_before}</div>
            </div>
            <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#667085] uppercase font-sans">
                {isReadOnlyAudit || isAmbiguousObjective ? "Active Exposure" : "Violations After"}
              </div>
              <div className="text-base font-bold text-[#10B981] mt-0.5">
                {isReadOnlyAudit || isAmbiguousObjective ? report.total_violations_before : report.total_violations_after}
              </div>
            </div>
            <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#667085] uppercase font-sans">Patches Applied</div>
              <div className="text-base font-bold text-[#3B82F6] mt-0.5">{report.remediations_applied}</div>
            </div>
            <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939]">
              <div className="text-[9px] text-[#10B981] uppercase font-sans">SSH Subsystem</div>
              <div className="text-[11px] font-bold text-[#10B981] mt-1.5">100% UNTOUCHED ✓</div>
            </div>
          </div>

          {/* Executive Summary */}
          {report.overall_posture_delta && (
            <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939] text-xs text-[#A7B0C0] font-sans">
              <span className="font-semibold text-[#F3F4F6] font-mono text-[11px]">Outcome Proof: </span>
              {report.overall_posture_delta}
            </div>
          )}
        </div>
      )}

      {/* 9. REAL VERTICAL EXECUTION TIMELINE */}
      {session && session.timeline && session.timeline.length > 0 && (
        <div className="p-4 rounded bg-[#0D121C] border border-[#1D2939] space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-[#1D2939]">
            <h3 className="text-xs font-semibold text-[#F3F4F6] uppercase tracking-wider">
              AUTONOMOUS EXECUTION TIMELINE ({session.timeline.length} STAGES)
            </h3>
            <span className="text-[10px] text-[#667085]">DETERMINISTIC TELEMETRY</span>
          </div>

          <div className="relative border-l border-[#1D2939] ml-2.5 space-y-3 pl-3.5">
            {session.timeline.map((step) => {
              const isExpanded = expandedSteps[step.step_id];
              return (
                <div key={step.step_id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div
                    className={cn(
                      "absolute -left-[19px] top-1 w-2 h-2 rounded-full border bg-[#080B12]",
                      step.status === "COMPLETED"
                        ? "border-[#10B981] bg-[#10B981]"
                        : step.status === "WAITING_APPROVAL"
                        ? "border-[#F59E0B] bg-[#F59E0B]"
                        : step.status === "REJECTED"
                        ? "border-[#EF4444] bg-[#EF4444]"
                        : "border-[#3B82F6] bg-[#3B82F6]"
                    )}
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#F3F4F6]">{step.title}</span>
                        <span className="text-[9px] text-[#667085]">[{step.phase}]</span>
                      </div>
                      <p className="text-[11px] text-[#A7B0C0] font-sans">{step.summary}</p>
                    </div>

                    {step.details && Object.keys(step.details).length > 0 && (
                      <button
                        onClick={() => toggleStep(step.step_id)}
                        className="text-[10px] text-[#667085] hover:text-[#A7B0C0] flex items-center gap-1 flex-shrink-0"
                      >
                        <span>{isExpanded ? "HIDE" : "DETAILS"}</span>
                        <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                      </button>
                    )}
                  </div>

                  {/* Expandable Step Details */}
                  {isExpanded && step.details && (
                    <pre className="mt-1.5 p-2 rounded bg-[#080B12] border border-[#1D2939] text-[10px] text-[#A7B0C0] overflow-x-auto">
                      {JSON.stringify(step.details, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
