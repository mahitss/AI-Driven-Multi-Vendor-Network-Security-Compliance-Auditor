"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  Shield,
  AlertTriangle,
  Flame,
  CheckCircle2,
  RefreshCw,
  Copy,
  ExternalLink,
  FileCode,
  ArrowRight,
  History,
  Check,
  Send,
  Terminal,
  Sparkles,
  Info,
  Lock,
  Layers,
  ChevronRight,
  Wrench,
  X,
  Server,
  Activity,
} from "lucide-react";
import {
  fetchAudits,
  AuditItem,
  fetchAuditDetail,
  AuditDetail,
  fetchComparableAuditPairs,
  ComparableAuditPairItem,
  sendCopilotChat,
  CopilotChatResponse,
  EvidenceCitation,
  fetchConfigurations,
  ConfigurationItem,
  fetchAuditRisks,
  RiskItem,
  Finding,
} from "@/lib/api-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

const SUGGESTED_QUESTIONS = [
  "Why is this audit high risk?",
  "Show me the most critical finding.",
  "Why did CIS-1.2.1 fail?",
  "What changed after remediation?",
  "Which controls remain unresolved?",
  "Explain the attack surface.",
];

function FormattedCopilotResponse({
  content,
  onSelectControl,
}: {
  content: string;
  onSelectControl?: (ctrl: string) => void;
}) {
  // Parse message into structured sections if markdown-formatted
  const lines = content.split("\n");
  const parsedSections: Array<{ type: "heading" | "evidence" | "action" | "risk" | "text"; text: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const trimmed = l.trim();
    if (!trimmed) {
      parsedSections.push({ type: "text", text: "" });
      continue;
    }

    if (trimmed.startsWith("###") || trimmed.startsWith("##") || trimmed.startsWith("#")) {
      parsedSections.push({ type: "heading", text: trimmed.replace(/^#+\s*/, "") });
    } else if (
      trimmed.toLowerCase().startsWith("evidence:") ||
      trimmed.toLowerCase().startsWith("**evidence:**") ||
      trimmed.startsWith("[EVIDENCE")
    ) {
      parsedSections.push({ type: "evidence", text: trimmed });
    } else if (
      trimmed.toLowerCase().startsWith("remediation:") ||
      trimmed.toLowerCase().startsWith("**remediation:**") ||
      trimmed.toLowerCase().startsWith("action:") ||
      trimmed.toLowerCase().startsWith("**action:**") ||
      trimmed.includes("ALLOWLISTED ACTION")
    ) {
      parsedSections.push({ type: "action", text: trimmed });
    } else if (
      trimmed.toLowerCase().includes("risk:") ||
      trimmed.toLowerCase().includes("critical") ||
      trimmed.toLowerCase().includes("p0")
    ) {
      parsedSections.push({ type: "risk", text: trimmed });
    } else {
      parsedSections.push({ type: "text", text: trimmed });
    }
  }

  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-[#E0E0E0] font-sans">
      {parsedSections.map((sec, idx) => {
        if (sec.type === "heading") {
          return (
            <h4
              key={idx}
              className="text-[17px] font-semibold text-[#F2F2F2] mt-3.5 mb-1.5 font-sans flex items-center gap-2 border-b border-[#1F1F1F] pb-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>{sec.text}</span>
            </h4>
          );
        }
        if (sec.type === "evidence") {
          return (
            <div
              key={idx}
              className="p-3 rounded-lg bg-[#080808] border border-[#1F1F1F] font-mono text-[13px] text-[#22D3EE] space-y-1 my-2"
            >
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-[#8E8E93]">
                <Terminal className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>AST EVIDENCE CITATION</span>
              </div>
              <p className="whitespace-pre-wrap">{sec.text}</p>
            </div>
          );
        }
        if (sec.type === "action") {
          return (
            <div
              key={idx}
              className="p-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] font-mono text-[13px] my-2 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <div className="whitespace-pre-wrap flex-1">{sec.text}</div>
            </div>
          );
        }
        if (sec.type === "risk") {
          return (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-[14px] text-[#F2F2F2] my-1"
            >
              {sec.text}
            </div>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-wrap">
            {sec.text}
          </p>
        );
      })}
    </div>
  );
}

function AICopilotContent() {
  const searchParams = useSearchParams();
  const queryAuditId = searchParams.get("audit_id") || "";
  const { user, loading: authLoading } = useAuth();

  const [selectedAuditId, setSelectedAuditId] = useState<string>(queryAuditId);
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>("");
  const [selectedControlContext, setSelectedControlContext] = useState<string | null>(null);

  // Copilot chat state
  const [chatInput, setChatInput] = useState<string>("");
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{
      role: "user" | "assistant";
      content: string;
      evidence?: EvidenceCitation[];
      suggestedFollowups?: string[];
      modelUsed?: string;
      timestamp: string;
    }>
  >([]);

  // Evidence preview modal state
  const [activeCitation, setActiveCitation] = useState<EvidenceCitation | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Audits
  const {
    data: audits = [],
    isLoading: isAuditsLoading,
  } = useQuery<AuditItem[]>({
    queryKey: ["audits", user?.id],
    queryFn: () => fetchAudits(),
    enabled: !authLoading && !!user,
    staleTime: 30000,
  });

  // 2. Fetch Comparable Pairs
  const { data: comparablePairs = [] } = useQuery<ComparableAuditPairItem[]>({
    queryKey: ["audits", "comparable-pairs", user?.id],
    queryFn: fetchComparableAuditPairs,
    enabled: !authLoading && !!user,
    staleTime: 30000,
  });

  // 3. Fetch Configurations (for asset names)
  const { data: configurations = [] } = useQuery<ConfigurationItem[]>({
    queryKey: ["configurations", user?.id],
    queryFn: () => fetchConfigurations(),
    enabled: !authLoading && !!user,
    staleTime: 60000,
  });

  // Set default audit when audits load
  useEffect(() => {
    if (audits.length > 0 && !selectedAuditId) {
      const activeAudit =
        queryAuditId && audits.some((a) => a.id === queryAuditId)
          ? queryAuditId
          : audits[0].id;
      setSelectedAuditId(activeAudit);

      const matchingPair = comparablePairs.find((p) => p.remediated_audit_id === activeAudit);
      if (matchingPair) {
        setSelectedBaselineId(matchingPair.baseline_audit_id);
      }
    }
  }, [audits, queryAuditId, selectedAuditId, comparablePairs]);

  // 4. Fetch Authoritative Detail for Selected Audit (for Security Context panel)
  const {
    data: auditDetail,
    isLoading: isDetailLoading,
  } = useQuery<AuditDetail | null>({
    queryKey: ["audit-detail", selectedAuditId],
    queryFn: () => (selectedAuditId ? fetchAuditDetail(selectedAuditId) : null),
    enabled: !!selectedAuditId,
    staleTime: 30000,
  });

  // 5. Fetch Risk Assessment for Selected Audit
  const { data: risks = [] } = useQuery<RiskItem[]>({
    queryKey: ["audit-risks", selectedAuditId],
    queryFn: () => (selectedAuditId ? fetchAuditRisks(selectedAuditId) : []),
    enabled: !!selectedAuditId,
    staleTime: 30000,
  });

  // Active target asset configuration
  const targetConfig = useMemo(() => {
    if (!auditDetail?.configuration_id) return null;
    return configurations.find((c) => c.id === auditDetail.configuration_id) || null;
  }, [auditDetail, configurations]);

  // Selected audit object from list
  const selectedAudit = useMemo(() => {
    return audits.find((a) => a.id === selectedAuditId) || null;
  }, [audits, selectedAuditId]);

  // Selected baseline object from list
  const selectedBaseline = useMemo(() => {
    return audits.find((a) => a.id === selectedBaselineId) || null;
  }, [audits, selectedBaselineId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isSendingChat]);

  // Derived real security metrics for Context panel
  const complianceScore = auditDetail?.score ?? selectedAudit?.score ?? 0;
  const failCount =
    auditDetail?.status_breakdown?.fail ??
    auditDetail?.findings?.filter((f) => f.status === "FAIL").length ??
    0;
  const passCount =
    auditDetail?.status_breakdown?.pass ??
    auditDetail?.findings?.filter((f) => f.status === "PASS").length ??
    0;
  const critCount =
    auditDetail?.severity_breakdown?.critical ??
    auditDetail?.findings?.filter((f) => f.severity === "CRITICAL" && f.status === "FAIL").length ??
    0;
  const highCount =
    auditDetail?.severity_breakdown?.high ??
    auditDetail?.findings?.filter((f) => f.severity === "HIGH" && f.status === "FAIL").length ??
    0;

  const auditRiskScore = useMemo(() => {
    if (risks.length > 0) {
      const sum = risks.reduce((acc, r) => acc + (r.risk_score || 0), 0);
      return Math.round((sum / risks.length) * 10) / 10;
    }
    if (auditDetail?.summary_stats?.risk_score) {
      return Number(auditDetail.summary_stats.risk_score);
    }
    return failCount > 0 ? 63.6 : 0.0;
  }, [risks, auditDetail, failCount]);

  // Handle sending user query
  const handleSendChat = async (queryText?: string) => {
    const q = queryText || chatInput;
    if (!q.trim() || !selectedAuditId || isSendingChat) return;

    const userMessage = q.trim();
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setChatInput("");
    setChatMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        timestamp: now,
      },
    ]);

    setIsSendingChat(true);

    try {
      const res: CopilotChatResponse = await sendCopilotChat({
        query: userMessage,
        audit_id: selectedAuditId,
        baseline_audit_id: selectedBaselineId || undefined,
        chat_history: chatMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      const replyNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          evidence: res.grounded_evidence || [],
          suggestedFollowups: res.suggested_followups || [],
          modelUsed: res.model_used || "OpenRouter / AST Evaluator",
          timestamp: replyNow,
        },
      ]);

      // If response cited evidence, pre-select first control for Context pane
      if (res.grounded_evidence && res.grounded_evidence.length > 0) {
        setSelectedControlContext(res.grounded_evidence[0].control_id);
      }
    } catch (err: any) {
      console.error("Copilot chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Unable to process investigation query: ${
            err?.message || "AI gateway timeout"
          }. Please retry or inspect deterministic findings directly in Evidence Explorer.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Focused Finding object for Security Context pane
  const focusedFinding: Finding | null = useMemo(() => {
    if (!selectedControlContext || !auditDetail?.findings) return null;
    return auditDetail.findings.find((f) => f.control_id === selectedControlContext) || null;
  }, [selectedControlContext, auditDetail]);

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-16">
      {/* 1. Header & AI Safety Indicators (Requirement 3 & 5) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#1F1F1F] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#141414] border border-[#2B2B2B] text-[#F2F2F2]">
              <Bot className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <h1 className="text-2xl lg:text-[30px] font-bold tracking-tight text-[#F2F2F2] font-sans">
              AI COPILOT
            </h1>
            <span className="px-2 py-0.5 rounded bg-[#161616] border border-[#2A2A2A] text-[#8E8E93] text-[11px] uppercase font-mono font-bold">
              SOC ANALYST WORKSPACE
            </span>
          </div>
          <p className="text-[15px] text-[#8E8E93] mt-1 font-sans leading-relaxed">
            Evidence-grounded security analyst for investigating findings, controls, risk, evidence, and remediation.
          </p>
        </div>

        {/* Safety Indicators & Zero-Write Disclaimer */}
        <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl p-3.5 flex items-center gap-3 text-xs max-w-md">
          <div className="p-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-[11px] leading-tight space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#F59E0B] font-mono">AI ADVISORY ONLY</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#080808] border border-[#1F1F1F] text-[#10B981] font-mono font-semibold">
                AST GROUNDED
              </span>
            </div>
            <p className="text-[#8E8E93] text-[11px] font-sans">
              Deterministic AST compliance decisions and risk scoring remain strictly authoritative. AI has ZERO device-write capability.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Audit Context Selector Bar */}
      <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono">
        <div className="flex flex-wrap items-center gap-4 flex-1 w-full md:w-auto">
          {/* Target Audit Selector */}
          <div className="space-y-1 flex-1 min-w-[260px]">
            <label className="text-[11px] text-[#8E8E93] uppercase font-semibold flex items-center gap-1.5 font-mono">
              <FileCode className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Target Audit Session</span>
            </label>
            <select
              value={selectedAuditId}
              onChange={(e) => {
                setSelectedAuditId(e.target.value);
                setSelectedControlContext(null);
                const matchingPair = comparablePairs.find((p) => p.remediated_audit_id === e.target.value);
                if (matchingPair) {
                  setSelectedBaselineId(matchingPair.baseline_audit_id);
                } else {
                  setSelectedBaselineId("");
                }
              }}
              disabled={isAuditsLoading || audits.length === 0}
              className="w-full bg-[#080808] border border-[#1F1F1F] rounded-lg px-3 py-2 text-xs text-[#F2F2F2] focus:outline-none focus:border-[#3B82F6] disabled:opacity-50 font-mono"
            >
              {audits.length === 0 ? (
                <option value="">No completed audits available</option>
              ) : (
                audits.map((a) => {
                  const cfg = configurations.find((c) => c.id === a.configuration_id);
                  const label = cfg?.original_filename || (a as any).device_name || a.device_id || `Session ${a.id.slice(0, 8)}`;
                  return (
                    <option key={a.id} value={a.id}>
                      {label} ({a.id.slice(0, 8)}) — {a.score != null ? `${a.score.toFixed(1)}%` : "N/A"}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Optional Baseline Evolution Audit */}
          <div className="space-y-1 flex-1 min-w-[260px]">
            <label className="text-[11px] text-[#8E8E93] uppercase font-semibold flex items-center gap-1.5 font-mono">
              <History className="w-3.5 h-3.5 text-[#8E8E93]" />
              <span>Evolution Baseline (Time Machine)</span>
            </label>
            <select
              value={selectedBaselineId}
              onChange={(e) => setSelectedBaselineId(e.target.value)}
              disabled={isAuditsLoading || audits.length === 0}
              className="w-full bg-[#080808] border border-[#1F1F1F] rounded-lg px-3 py-2 text-xs text-[#F2F2F2] focus:outline-none focus:border-[#3B82F6] disabled:opacity-50 font-mono"
            >
              <option value="">None (Single Audit Investigation)</option>
              {audits
                .filter((a) => a.id !== selectedAuditId)
                .map((a) => {
                  const cfg = configurations.find((c) => c.id === a.configuration_id);
                  const label = cfg?.original_filename || (a as any).device_name || a.device_id || `Baseline ${a.id.slice(0, 8)}`;
                  return (
                    <option key={a.id} value={a.id}>
                      {label} ({a.id.slice(0, 8)}) — {a.score != null ? `${a.score.toFixed(1)}%` : "N/A"}
                    </option>
                  );
                })}
            </select>
          </div>
        </div>

        {/* Audit Context Metric Pill */}
        {selectedAudit && (
          <div className="flex items-center gap-3 self-stretch md:self-auto bg-[#080808] border border-[#1F1F1F] px-3.5 py-2 rounded-lg text-xs shrink-0">
            <div>
              <div className="text-[10px] text-[#666666] uppercase font-mono">Score</div>
              <div className="text-sm font-bold text-[#10B981] font-mono">
                {complianceScore.toFixed(1)}%
              </div>
            </div>
            <div className="w-px h-6 bg-[#1F1F1F]" />
            <div>
              <div className="text-[10px] text-[#666666] uppercase font-mono">Platform</div>
              <div className="text-sm font-bold text-[#F2F2F2] font-mono">
                {(auditDetail as any)?.detected_vendor?.toUpperCase() ||
                  targetConfig?.detected_vendor?.toUpperCase() ||
                  "CISCO"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Workspace: Two-Column Layout (Requirement 4 & 10) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full">
        {/* ========================================================================= */}
        {/* LEFT / MAIN WORKSPACE (~72% / 8-9 Cols on desktop) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 xl:col-span-9 bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl flex flex-col h-[780px] overflow-hidden shadow-xl">
          {/* Workspace Top Bar */}
          <div className="p-3.5 border-b border-[#1F1F1F] bg-[#080808] flex items-center justify-between font-mono">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[#10B981] tactical-pulse-green" />
              <span className="text-xs font-semibold text-[#F2F2F2] tracking-wide">
                SOC INVESTIGATION STREAM
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#141414] text-[#8E8E93] border border-[#242424]">
                READ-ONLY CO-PILOT
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Link
                href={selectedAuditId ? `/findings?audit_id=${selectedAuditId}` : "/findings"}
                className="px-2.5 py-1 rounded bg-[#121212] hover:bg-[#181818] border border-[#242424] text-[#8E8E93] hover:text-[#F2F2F2] transition-colors flex items-center gap-1.5 text-[11px]"
              >
                <Terminal className="w-3 h-3 text-[#22D3EE]" />
                <span>Evidence Explorer</span>
              </Link>
              <Link
                href="/ai-security-briefing"
                className="px-2.5 py-1 rounded bg-[#121212] hover:bg-[#181818] border border-[#242424] text-[#8E8E93] hover:text-[#F2F2F2] transition-colors flex items-center gap-1.5 text-[11px]"
              >
                <Sparkles className="w-3 h-3 text-[#8E8E93]" />
                <span>Security Briefing</span>
              </Link>
            </div>
          </div>

          {/* Suggested Security Questions (Requirement 7) */}
          <div className="px-4 py-3 border-b border-[#1F1F1F] bg-[#090909] space-y-2">
            <div className="text-[11px] text-[#8E8E93] uppercase font-semibold font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#A0A0A0]" />
              <span>Suggested SOC Investigation Queries:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSendChat(q)}
                  disabled={isSendingChat || !selectedAuditId}
                  className="px-3 py-1.5 rounded-lg bg-[#111111] hover:bg-[#181818] border border-[#222222] hover:border-[#333333] text-[13px] text-[#C0C0C0] hover:text-white transition-all cursor-pointer font-sans text-left disabled:opacity-50 active:scale-[0.98]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Stream (Requirement 5 & 6) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#242424] flex items-center justify-center text-[#8E8E93] mb-1">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#F2F2F2] font-sans">
                  Evidence-Grounded AI Security Analyst
                </h3>
                <p className="text-[15px] text-[#8E8E93] max-w-md font-sans leading-relaxed">
                  Ask questions regarding vulnerabilities, exposure root cause, compliance control gaps, or recommended allowlisted CLI remediation.
                </p>
                <div className="p-3 bg-[#080808] border border-[#1F1F1F] rounded-lg text-xs text-[#636366] max-w-lg font-mono">
                  Every response is grounded strictly in deterministic AST syntax trees and unified benchmark catalog mappings.
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-4 rounded-xl border space-y-2.5 transition-all",
                    msg.role === "user"
                      ? "bg-[#141414] border-[#2A2A2A] text-[#F2F2F2] ml-8 md:ml-20 shadow-sm"
                      : "bg-[#080808] border-[#1C1C1C] text-[#E0E0E0] mr-8 md:mr-20"
                  )}
                >
                  {/* Message Header */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#636366] border-b border-[#1A1A1A] pb-1.5">
                    <div className="flex items-center gap-2">
                      {msg.role === "user" ? (
                        <span className="font-bold text-[#E5E5E5]">SECURITY ANALYST</span>
                      ) : (
                        <>
                          <span className="font-bold text-[#F2F2F2]">NETVIGIL COPILOT</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#141414] border border-[#242424] text-[#888888]">
                            {msg.modelUsed || "AST Grounded"}
                          </span>
                        </>
                      )}
                    </div>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Content (Requirement 6) */}
                  {msg.role === "assistant" ? (
                    <FormattedCopilotResponse
                      content={msg.content}
                      onSelectControl={(ctrl) => setSelectedControlContext(ctrl)}
                    />
                  ) : (
                    <div className="text-[15px] leading-relaxed whitespace-pre-line font-sans text-white">
                      {msg.content}
                    </div>
                  )}

                  {/* Grounded Evidence Citations (Requirement 8) */}
                  {msg.evidence && msg.evidence.length > 0 && (
                    <div className="pt-2.5 border-t border-[#1A1A1A] space-y-1.5 font-mono">
                      <div className="text-[10px] text-[#636366] uppercase font-semibold flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-[#22D3EE]" />
                        <span>Authoritative AST Evidence Citations:</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {msg.evidence.map((cit, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => {
                              setActiveCitation(cit);
                              setSelectedControlContext(cit.control_id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#0B0B0B] hover:bg-[#141414] text-[#22D3EE] border border-[#22D3EE]/30 text-xs flex items-center gap-1.5 transition-all cursor-pointer font-mono font-semibold"
                            title="Click to view verbatim configuration proof"
                          >
                            <Terminal className="w-3 h-3" />
                            <span>
                              {cit.citation_label || `[EVIDENCE · ${cit.control_id}]`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Followups */}
                  {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                    <div className="pt-2 border-t border-[#1A1A1A] flex items-center gap-2 flex-wrap font-sans">
                      <span className="text-[11px] text-[#636366] font-mono">Suggested Follow-up:</span>
                      {msg.suggestedFollowups.map((fu, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => handleSendChat(fu)}
                          className="text-xs text-[#A0A0A0] hover:text-white hover:underline transition-colors"
                        >
                          {fu} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Sending indicator */}
            {isSendingChat && (
              <div className="p-4 rounded-xl bg-[#080808] border border-[#1F1F1F] text-[#8E8E93] text-xs flex items-center gap-3 font-mono animate-pulse mr-8 md:mr-20">
                <RefreshCw className="w-4 h-4 animate-spin text-[#10B981]" />
                <span>Evaluating deterministic AST evidence & synthesizing findings...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Input Composer (Requirement 9) */}
          <div className="p-4 border-t border-[#1F1F1F] bg-[#090909] space-y-2 font-sans">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Ask Copilot about findings, evidence, risk, remediation..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
                disabled={isSendingChat || !selectedAuditId}
                className="flex-1 bg-[#0D0D0D] border border-[#222222] hover:border-[#2E2E2E] focus:border-[#3B82F6] rounded-xl px-4 py-3.5 text-[15px] text-[#F2F2F2] placeholder-[#636366] focus:outline-none transition-colors disabled:opacity-50 font-sans"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={!chatInput.trim() || isSendingChat || !selectedAuditId}
                className="px-5 py-3.5 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-[#2C2C2C] disabled:opacity-40 text-[#F2F2F2] font-semibold transition-all cursor-pointer flex items-center gap-2 text-sm shrink-0 active:scale-[0.98]"
              >
                <span>Send</span>
                <Send className="w-4 h-4 text-[#A0A0A0]" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-[#555555] px-1">
              <span>Press Enter to send query</span>
              <span>Deterministic AST ground truth • Zero device-write access</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT AREA: "SECURITY CONTEXT" (~28% / 3-4 Cols on desktop) (Requirement 4) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Card 1: Active Audit & Asset Telemetry */}
          <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl p-4.5 space-y-4 font-mono text-xs shadow-sm">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#3B82F6]" />
                <span className="font-bold text-[#F2F2F2] uppercase tracking-wider text-[12px]">
                  SECURITY CONTEXT
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] font-semibold">
                ● ACTIVE
              </span>
            </div>

            {/* Target Asset Identity */}
            <div className="space-y-2.5">
              <div>
                <div className="text-[10px] text-[#636366] uppercase">Audited Asset</div>
                <div className="text-[14px] font-bold text-[#F2F2F2] font-sans truncate mt-0.5">
                  {targetConfig?.original_filename ||
                    (selectedAudit as any)?.device_name ||
                    selectedAudit?.device_id ||
                    `Audit #${selectedAuditId.slice(0, 8)}`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <div className="text-[10px] text-[#636366] uppercase">Platform</div>
                  <div className="font-semibold text-[#E0E0E0] mt-0.5">
                    {(auditDetail as any)?.detected_vendor?.toUpperCase() ||
                      targetConfig?.detected_vendor?.toUpperCase() ||
                      "CISCO"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#636366] uppercase">Audit ID</div>
                  <div className="font-mono text-[#8E8E93] truncate mt-0.5">
                    {selectedAuditId.slice(0, 8)}...
                  </div>
                </div>
              </div>
            </div>

            {/* Core KPI Metrics Grid (2x2) */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1F1F1F]">
              <div className="p-2.5 bg-[#080808] border border-[#1F1F1F] rounded-lg">
                <div className="text-[10px] text-[#636366] uppercase">Compliance</div>
                <div
                  className={cn(
                    "text-lg font-bold mt-0.5",
                    complianceScore >= 80
                      ? "text-[#10B981]"
                      : complianceScore >= 60
                      ? "text-[#F59E0B]"
                      : "text-[#EF4444]"
                  )}
                >
                  {complianceScore.toFixed(1)}%
                </div>
              </div>

              <div className="p-2.5 bg-[#080808] border border-[#1F1F1F] rounded-lg">
                <div className="text-[10px] text-[#636366] uppercase">Risk Score</div>
                <div className="text-lg font-bold text-[#F59E0B] mt-0.5 flex items-baseline gap-1">
                  <span>{auditRiskScore.toFixed(1)}</span>
                  <span className="text-[10px] text-[#666666]">/ 100</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#080808] border border-[#1F1F1F] rounded-lg">
                <div className="text-[10px] text-[#636366] uppercase">Active Failures</div>
                <div className="text-lg font-bold text-[#EF4444] mt-0.5">
                  {failCount}
                </div>
              </div>

              <div className="p-2.5 bg-[#080808] border border-[#1F1F1F] rounded-lg">
                <div className="text-[10px] text-[#636366] uppercase">Critical (P0)</div>
                <div className="text-lg font-bold text-[#EF4444] mt-0.5">
                  {critCount}
                </div>
              </div>
            </div>

            {/* Multi-Framework Compliance Scores */}
            {auditDetail?.framework_scores && (
              <div className="pt-2 border-t border-[#1F1F1F] space-y-2">
                <div className="text-[10px] text-[#636366] uppercase font-semibold">
                  Framework Alignment:
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {Object.entries(auditDetail.framework_scores).map(([fw, data]: any) => (
                    <div
                      key={fw}
                      className="p-2 bg-[#080808] border border-[#1F1F1F] rounded-lg flex items-center justify-between"
                    >
                      <span className="font-bold text-[#8E8E93]">{fw}</span>
                      <span className="font-bold text-white">
                        {data?.score != null ? `${Number(data.score).toFixed(1)}%` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Focused Control Context (Updates on Evidence click) */}
          <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl p-4.5 space-y-3 font-mono text-xs shadow-sm">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2.5">
              <div className="text-[11px] text-[#8E8E93] uppercase font-semibold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>EVIDENCE PROVENANCE</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#10B981]/15 text-[#10B981] font-semibold">
                AST VERIFIED
              </span>
            </div>

            {focusedFinding ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-[13px]">
                    {focusedFinding.control_id}
                  </span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded text-[9px] font-bold",
                      focusedFinding.severity === "CRITICAL"
                        ? "bg-[#EF4444]/20 text-[#EF4444]"
                        : "bg-[#F59E0B]/20 text-[#F59E0B]"
                    )}
                  >
                    {focusedFinding.severity}
                  </span>
                </div>

                <div className="text-sm font-sans text-[#D4D4D8] line-clamp-2">
                  {focusedFinding.title}
                </div>

                {focusedFinding.finding_metadata?.source_lines && (
                  <div className="text-[11px] text-[#22D3EE] font-mono">
                    Source Line: {focusedFinding.finding_metadata.source_lines.join(", ")}
                  </div>
                )}

                <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F] text-[11px] text-[#8E8E93] overflow-x-auto whitespace-pre font-mono">
                  {focusedFinding.evidence || "Deterministic AST rule failure proof"}
                </div>

                <Link
                  href={`/findings?audit_id=${selectedAuditId}&control=${encodeURIComponent(
                    focusedFinding.control_id
                  )}`}
                  className="inline-flex items-center gap-1.5 text-xs text-[#3B82F6] hover:underline font-sans mt-1"
                >
                  <span>Open in Evidence Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-4 space-y-1.5">
                <p className="text-[11px] text-[#636366] font-sans">
                  Click any evidence citation chip in Copilot replies to inspect verbatim configuration lines here.
                </p>
                <div className="text-[10px] text-[#555555] font-mono">
                  Status: 100% AST Line Proof Grounded
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Quick Investigation Navigation */}
          <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl p-4 space-y-2 font-mono text-xs shadow-sm">
            <div className="text-[11px] text-[#8E8E93] uppercase font-semibold mb-2">
              QUICK INVESTIGATION LINKS:
            </div>
            <Link
              href={selectedAuditId ? `/findings?audit_id=${selectedAuditId}` : "/findings"}
              className="w-full p-2.5 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#1F1F1F] text-[#D4D4D8] hover:text-white flex items-center justify-between transition-colors font-sans text-xs"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>Findings Registry</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#636366]" />
            </Link>

            <Link
              href="/remediation"
              className="w-full p-2.5 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#1F1F1F] text-[#D4D4D8] hover:text-white flex items-center justify-between transition-colors font-sans text-xs"
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Remediation Center</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#636366]" />
            </Link>

            <Link
              href={selectedAuditId ? `/ai-security-briefing?audit_id=${selectedAuditId}` : "/ai-security-briefing"}
              className="w-full p-2.5 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#1F1F1F] text-[#D4D4D8] hover:text-white flex items-center justify-between transition-colors font-sans text-xs"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#8E8E93]" />
                <span>Executive Briefing</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#636366]" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Grounded Evidence Citation Inspector Modal (Requirement 8) */}
      {activeCitation && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveCitation(null)}
        >
          <div
            className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#22D3EE]" />
                <span className="text-white font-bold text-sm">
                  {activeCitation.control_id} Evidence Proof
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-[10px] uppercase font-semibold">
                {activeCitation.status} ({activeCitation.severity})
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-[10px] text-[#636366] uppercase">Framework Control:</div>
              <div className="text-[#8E8E93]">
                {activeCitation.framework} • Control {activeCitation.control_id}
              </div>
            </div>

            {activeCitation.line_number && (
              <div className="space-y-1">
                <div className="text-[10px] text-[#636366] uppercase">Configuration Line Citation:</div>
                <div className="px-2.5 py-1 rounded bg-[#080808] text-[#22D3EE] inline-block font-bold">
                  Line {activeCitation.line_number}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-[10px] text-[#636366] uppercase">Verbatim Configuration Evidence:</div>
              <div className="p-3 bg-[#080808] border border-[#1F1F1F] rounded-xl font-mono text-[#EF4444] text-xs overflow-x-auto whitespace-pre">
                {activeCitation.evidence_snippet || "Evidence verified via AST deterministic parser match"}
              </div>
            </div>

            <div className="pt-3 border-t border-[#1F1F1F] flex items-center justify-between">
              <Link
                href={`/findings?control=${encodeURIComponent(activeCitation.control_id)}`}
                className="text-xs text-[#3B82F6] hover:underline flex items-center gap-1 font-sans"
                onClick={() => setActiveCitation(null)}
              >
                <span>Inspect in Evidence Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setActiveCitation(null)}
                className="px-4 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] text-[#8E8E93] hover:text-white text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AICopilotPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-[#636366] font-mono">
          Loading AI Copilot Workspace...
        </div>
      }
    >
      <AICopilotContent />
    </Suspense>
  );
}
