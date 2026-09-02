"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  Shield,
  AlertTriangle,
  Flame,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Copy,
  ExternalLink,
  HelpCircle,
  FileCode,
  ArrowRight,
  History,
  Lock,
  Layers,
  Check,
  Send,
  CornerDownLeft,
  ChevronRight,
  Info,
  Terminal,
} from "lucide-react";
import {
  fetchAudits,
  AuditItem,
  fetchComparableAuditPairs,
  ComparableAuditPairItem,
  generateAISecurityBriefing,
  AISecurityBriefingResponse,
  sendCopilotChat,
  CopilotChatResponse,
  EvidenceCitation,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

const SUGGESTED_QUESTIONS = [
  "Why is this audit high risk?",
  "Show me the most critical finding.",
  "Why did CIS-1.2.1 fail?",
  "What changed after remediation?",
  "Which controls remain unresolved?",
  "Explain the attack surface.",
];

export default function AISecurityBriefingPage() {
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [comparablePairs, setComparablePairs] = useState<ComparableAuditPairItem[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>("");
  const [isLoadingBriefing, setIsLoadingBriefing] = useState<boolean>(false);
  const [briefing, setBriefing] = useState<AISecurityBriefingResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedBriefing, setCopiedBriefing] = useState<boolean>(false);

  // Copilot chat state
  const [chatInput, setChatInput] = useState<string>("");
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; evidence?: EvidenceCitation[] }>
  >([]);

  // Evidence preview modal state
  const [activeCitation, setActiveCitation] = useState<EvidenceCitation | null>(null);

  // Initial Load: Fetch Audits & Candidate Pairs
  useEffect(() => {
    async function loadData() {
      try {
        const [auditsList, pairsList] = await Promise.all([
          fetchAudits(),
          fetchComparableAuditPairs(),
        ]);
        setAudits(auditsList);
        setComparablePairs(pairsList);

        if (auditsList.length > 0) {
          const firstAudit = auditsList[0];
          setSelectedAuditId(firstAudit.id);

          // If there is a comparable baseline pair matching this audit, auto-populate baseline
          const matchingPair = pairsList.find((p) => p.remediated_audit_id === firstAudit.id);
          if (matchingPair) {
            setSelectedBaselineId(matchingPair.baseline_audit_id);
          }
        }
      } catch (err) {
        console.error("Failed to load audits for briefing:", err);
      }
    }
    loadData();
  }, []);

  // Trigger Briefing Generation
  const handleGenerateBriefing = async () => {
    if (!selectedAuditId) return;
    setIsLoadingBriefing(true);
    setErrorMsg(null);
    try {
      const res = await generateAISecurityBriefing({
        audit_id: selectedAuditId,
        baseline_audit_id: selectedBaselineId || undefined,
      });
      setBriefing(res);

      // Add initial greeting to copilot
      setChatMessages([
        {
          role: "assistant",
          content: `AI Security Briefing synthesized for **${res.device_hostname}** (${res.detected_vendor.toUpperCase()}). Deterministic compliance score is **${res.compliance_score.toFixed(
            1
          )}%** with risk score **${res.risk_score.toFixed(1)}/100**. Ask me any technical question about findings or evidence.`,
          evidence: res.grounded_evidence_citations.slice(0, 3),
        },
      ]);
    } catch (err: any) {
      console.error("Briefing generation failed:", err);
      setErrorMsg(err?.message || "Failed to generate AI Security Briefing.");
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  // Send Copilot Query
  const handleSendChat = async (queryText?: string) => {
    const q = queryText || chatInput;
    if (!q.trim() || !selectedAuditId || isSendingChat) return;

    const userMessage = q.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsSendingChat(true);

    try {
      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
      const response: CopilotChatResponse = await sendCopilotChat({
        query: userMessage,
        audit_id: selectedAuditId,
        baseline_audit_id: selectedBaselineId || undefined,
        chat_history: history,
      });

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
          evidence: response.grounded_evidence,
        },
      ]);
    } catch (err: any) {
      console.error("Copilot chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Unable to process query: ${err?.message || "AI gateway timeout"}. Please retry or consult deterministic finding records.`,
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleCopyBriefing = () => {
    if (!briefing) return;
    const text = `NETVIGIL AI SECURITY BRIEFING
Asset: ${briefing.device_hostname} (${briefing.detected_vendor.toUpperCase()})
Deterministic Compliance Score: ${briefing.compliance_score.toFixed(1)}%
Risk Score: ${briefing.risk_score.toFixed(1)}/100
P0 Critical Exposures: ${briefing.critical_p0_count}

EXECUTIVE SUMMARY:
${briefing.executive_summary}

TOP RISKS:
${briefing.top_risks.map((r) => `- [${r.priority}] ${r.control_id}: ${r.title}\n  Why it matters: ${r.why_it_matters}\n  Action: ${r.recommended_action}`).join("\n\n")}

RECOMMENDED INVESTIGATION ORDER:
${briefing.recommended_investigation_order.map((s) => `${s.step_number}. ${s.control_id} (${s.priority}): ${s.action_summary}`).join("\n")}
`;
    navigator.clipboard.writeText(text);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2000);
  };

  return (
    <div className="space-y-6 font-mono max-w-7xl mx-auto pb-16">
        {/* Top Header & Advisory Notice */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#1D2939] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#0D121C] border border-[#8B5CF6]/30 text-[#8B5CF6]">
                <Bot className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-wider text-[#F3F4F6] font-sans">AI SECURITY BRIEFING</h1>
              <span className="px-2 py-0.5 rounded bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] text-[10px] uppercase font-bold">
                Analyst Copilot
              </span>
            </div>
            <p className="text-[#A7B0C0] text-xs mt-1 font-sans">
              Evidence-grounded executive briefing and interactive SOC copilot powered by the multi-model AI gateway.
            </p>
          </div>

          {/* Strict Invariant Disclaimer Badge */}
          <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl p-3 flex items-center gap-3 text-xs max-w-md">
            <div className="p-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-[11px] leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#F59E0B]">AI ADVISORY ONLY</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#080B12] border border-[#1D2939] text-[#667085]">
                  AST GROUNDED
                </span>
              </div>
              <p className="text-[#667085] text-[10px] mt-0.5 font-sans">
                Deterministic AST compliance decisions and risk scoring remain strictly authoritative. Zero device write capability.
              </p>
            </div>
          </div>
        </div>

        {/* Honest Empty State when no audits exist */}
        {audits.length === 0 && (
          <div className="p-8 rounded-2xl bg-[#0D121C] border border-[#1D2939] text-center space-y-3 font-mono">
            <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] mx-auto">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider">
                NO SECURITY BRIEFING AVAILABLE
              </div>
              <p className="text-xs text-[#667085] mt-1 max-w-md mx-auto font-sans leading-relaxed">
                Ingest and evaluate a network device configuration to generate an evidence-grounded AI security briefing and interactive copilot session.
              </p>
            </div>
            <Link
              href="/configurations?mode=ingest"
              className="inline-block px-3.5 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold"
            >
              Ingest Configuration →
            </Link>
          </div>
        )}

        {/* Audit Context Selection Bar */}
        <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            {/* Primary Audit Selection */}
            <div className="space-y-1 min-w-[240px]">
              <label className="text-[10px] text-[#667085] uppercase font-semibold flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-[#3B82F6]" />
                Target Audit Session
              </label>
              <select
                value={selectedAuditId}
                onChange={(e) => setSelectedAuditId(e.target.value)}
                disabled={audits.length === 0}
                className="w-full bg-[#080B12] border border-[#1D2939] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3B82F6] disabled:opacity-50"
              >
                {audits.length === 0 ? (
                  <option value="">No completed audits available</option>
                ) : (
                  audits.map((a) => (
                    <option key={a.id} value={a.id}>
                      Audit {a.id.substring(0, 8)}... — Score: {a.score?.toFixed(1) || 0}% ({a.device_id || "Gateway"})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Optional Baseline Evolution Audit */}
            <div className="space-y-1 min-w-[240px]">
              <label className="text-[10px] text-[#667085] uppercase font-semibold flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#8B5CF6]" />
                Evolution Baseline (Time Machine)
              </label>
              <select
                value={selectedBaselineId}
                onChange={(e) => setSelectedBaselineId(e.target.value)}
                className="w-full bg-[#080B12] border border-[#1D2939] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="">None (Single Audit Assessment)</option>
                {audits
                  .filter((a) => a.id !== selectedAuditId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      Baseline {a.id.substring(0, 8)}... — Score: {a.score?.toFixed(1) || 0}%
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateBriefing}
              disabled={isLoadingBriefing || !selectedAuditId}
              className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/20 transition-all cursor-pointer"
            >
              {isLoadingBriefing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Facts...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Security Briefing</span>
                </>
              )}
            </button>

            {briefing && (
              <button
                onClick={handleCopyBriefing}
                className="p-2.5 rounded-xl bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] text-[#A7B0C0] hover:text-white transition-colors"
                title="Copy Briefing"
              >
                {copiedBriefing ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-xs text-[#EF4444] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Hero Posture Row (When Briefing is Active) */}
        {briefing && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Compliance Score */}
            <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl p-4 relative overflow-hidden">
              <div className="text-[10px] text-[#667085] uppercase font-semibold flex items-center justify-between">
                <span>Compliance Posture</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30">
                  AUTHORITATIVE
                </span>
              </div>
              <div className="text-3xl font-black text-white mt-2">
                {briefing.compliance_score.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[#667085] mt-1">
                Asset: {briefing.device_hostname} ({briefing.detected_vendor.toUpperCase()})
              </div>
            </div>

            {/* Risk Score */}
            <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl p-4">
              <div className="text-[10px] text-[#667085] uppercase font-semibold flex items-center justify-between">
                <span>Algorithmic Risk</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30">
                  DETERMINISTIC
                </span>
              </div>
              <div className="text-3xl font-black text-white mt-2">
                {briefing.risk_score.toFixed(1)}
                <span className="text-sm font-normal text-[#667085]"> / 100</span>
              </div>
              <div className="text-[10px] text-[#667085] mt-1">Composite Topological Exposure</div>
            </div>

            {/* P0 / Critical Exposures */}
            <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl p-4">
              <div className="text-[10px] text-[#667085] uppercase font-semibold flex items-center justify-between">
                <span>Critical / P0 Risks</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30">
                  URGENT
                </span>
              </div>
              <div className="text-3xl font-black text-[#8B5CF6] mt-2">
                {briefing.critical_p0_count}
              </div>
              <div className="text-[10px] text-[#667085] mt-1">
                {briefing.high_p1_count} High (P1) Exposures
              </div>
            </div>

            {/* Posture Trend */}
            <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl p-4">
              <div className="text-[10px] text-[#667085] uppercase font-semibold">Posture Evaluation</div>
              <div className="text-base font-bold text-white mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    briefing.posture_trend.includes("CRITICAL") ? "bg-[#EF4444] animate-pulse" : "bg-[#10B981]"
                  )}
                />
                <span className="truncate">{briefing.posture_trend.replace(/_/g, " ")}</span>
              </div>
              <div className="text-[10px] text-[#667085] mt-1">Provider: {briefing.provider.toUpperCase()}</div>
            </div>
          </div>
        )}

        {/* Main 2-Column SOC Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Briefing Sections (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {!briefing && !isLoadingBriefing ? (
              <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl p-12 text-center text-[#667085] space-y-3">
                <Bot className="w-10 h-10 text-[#667085] mx-auto" />
                <h3 className="text-white text-sm font-semibold font-sans">No Security Briefing Synthesized</h3>
                <p className="text-xs text-[#A7B0C0] max-w-md mx-auto font-sans">
                  Select an audit session above and click &quot;Generate Security Briefing&quot; to synthesize an evidence-grounded executive briefing and investigation playbook.
                </p>
              </div>
            ) : isLoadingBriefing ? (
              /* Loading Skeletons */
              <div className="space-y-4">
                <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl p-6 space-y-3 animate-pulse">
                  <div className="h-4 bg-[#111827] rounded w-1/3" />
                  <div className="h-3 bg-[#111827]/60 rounded w-full" />
                  <div className="h-3 bg-[#111827]/60 rounded w-5/6" />
                  <div className="h-3 bg-[#111827]/60 rounded w-4/6" />
                </div>
                <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl p-6 space-y-3 animate-pulse">
                  <div className="h-4 bg-[#111827] rounded w-1/4" />
                  <div className="h-16 bg-[#111827]/40 rounded-xl" />
                  <div className="h-16 bg-[#111827]/40 rounded-xl" />
                </div>
              </div>
            ) : briefing ? (
              <>
                {/* 1. Executive Summary Narrative */}
                <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl p-6 space-y-3">
                  <div className="text-[10px] text-[#8B5CF6] uppercase font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Executive Posture Summary
                    </span>
                    <span className="text-[#667085] text-[9px]">Grounded in AST Facts</span>
                  </div>
                  <p className="text-[#A7B0C0] text-xs leading-relaxed whitespace-pre-line font-sans">
                    {briefing.executive_summary}
                  </p>
                </div>

                {/* 2. Top Critical Risks & Evidence */}
                <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl p-6 space-y-4">
                  <div className="text-[10px] text-[#EF4444] uppercase font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Top Critical Risks ({briefing.top_risks.length})
                    </span>
                    <span className="text-[#667085] text-[9px]">Prioritized Exposures</span>
                  </div>

                  <div className="space-y-3">
                    {briefing.top_risks.map((risk) => (
                      <div
                        key={risk.control_id}
                        className="bg-[#080B12] border border-[#1D2939] rounded-xl p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-[10px] font-bold">
                              {risk.priority}
                            </span>
                            <span className="text-white font-bold text-xs">{risk.control_id}</span>
                            <span className="text-[#A7B0C0] text-xs truncate max-w-xs font-sans">{risk.title}</span>
                          </div>
                          <span className="text-[10px] text-[#667085] uppercase">{risk.severity}</span>
                        </div>

                        <p className="text-[#A7B0C0] text-[11px] leading-relaxed font-sans">
                          {risk.why_it_matters}
                        </p>

                        {/* Evidence Citation Tag */}
                        {risk.evidence_citation && (
                          <div className="pt-2 border-t border-[#1D2939] flex items-center justify-between gap-2 flex-wrap text-[10px]">
                            <button
                              onClick={() => setActiveCitation(risk.evidence_citation!)}
                              className="px-2 py-1 rounded bg-[#0D121C] hover:bg-[#111827] border border-[#1D2939] text-[#22D3EE] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Terminal className="w-3 h-3 text-[#22D3EE]" />
                              <span>
                                {risk.evidence_citation.line_number
                                  ? `[EVIDENCE · LINE ${risk.evidence_citation.line_number}]`
                                  : "[EVIDENCE · AST PROOF]"}
                              </span>
                            </button>
                            <span className="text-[#667085] font-mono truncate max-w-sm">
                              {risk.evidence_citation.evidence_snippet || "Verified AST rule match"}
                            </span>
                          </div>
                        )}

                        <div className="text-[10px] text-[#10B981] font-mono bg-[#10B981]/10 p-2 rounded-lg border border-[#10B981]/20">
                          <strong>Allowlisted Action:</strong> {risk.recommended_action}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Security Time Machine Evolution (If Baseline Supplied) */}
                {briefing.security_evolution && (
                  <div className="bg-[#0D121C] border border-[#8B5CF6]/30 rounded-2xl p-6 space-y-4">
                    <div className="text-[10px] text-[#8B5CF6] uppercase font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        Security Time Machine Evolution
                      </span>
                      <Link
                        href={`/security-time-machine?before_id=${briefing.security_evolution.baseline_audit_id}&after_id=${briefing.security_evolution.current_audit_id}`}
                        className="text-[10px] text-[#3B82F6] hover:underline flex items-center gap-1"
                      >
                        <span>Open Diff Viewer</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-[#080B12] rounded-xl border border-[#1D2939]">
                        <div className="text-[10px] text-[#667085]">Baseline Score</div>
                        <div className="text-lg font-bold text-white mt-1">
                          {briefing.security_evolution.before_score.toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-3 bg-[#080B12] rounded-xl border border-[#1D2939]">
                        <div className="text-[10px] text-[#667085]">Remediated Score</div>
                        <div className="text-lg font-bold text-[#10B981] mt-1">
                          {briefing.security_evolution.after_score.toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-3 bg-[#8B5CF6]/10 rounded-xl border border-[#8B5CF6]/30">
                        <div className="text-[10px] text-[#8B5CF6]">Posture Delta</div>
                        <div className="text-lg font-bold text-[#8B5CF6] mt-1">
                          +{briefing.security_evolution.score_delta.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <p className="text-[#A7B0C0] text-xs leading-relaxed font-sans">
                      {briefing.security_evolution.narrative}
                    </p>

                    {briefing.security_evolution.resolved_controls_summary.length > 0 && (
                      <div className="text-[10px] text-[#667085] flex items-center gap-2 flex-wrap">
                        <span className="text-[#10B981] font-semibold">Resolved Controls:</span>
                        {briefing.security_evolution.resolved_controls_summary.map((c) => (
                          <span key={c} className="px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Recommended Investigation Checklist */}
                <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl p-6 space-y-4">
                  <div className="text-[10px] text-[#3B82F6] uppercase font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Recommended Investigation Order
                    </span>
                    <span className="text-[#667085] text-[9px]">Deterministic Priority Sequence</span>
                  </div>

                  <div className="space-y-2">
                    {briefing.recommended_investigation_order.map((step) => (
                      <div
                        key={step.step_number}
                        className="p-3 bg-[#080B12] border border-[#1D2939] rounded-xl flex items-start gap-3 text-xs"
                      >
                        <div className="w-6 h-6 rounded-lg bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {step.step_number}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{step.control_id}</span>
                            <span className="px-1.5 py-0.2 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-[9px]">
                              {step.priority}
                            </span>
                            {step.target_lines.length > 0 && (
                              <span className="text-[10px] text-[#667085]">
                                Line {step.target_lines.join(", ")}
                              </span>
                            )}
                          </div>
                          <p className="text-[#A7B0C0] text-[11px] font-sans">{step.action_summary}</p>
                          <p className="text-[#667085] text-[10px] font-sans">{step.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Right Column: Interactive Analyst Copilot (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl p-5 flex flex-col h-[720px] sticky top-6">
              {/* Copilot Header */}
              <div className="flex items-center justify-between border-b border-[#1D2939] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-[#8B5CF6]/20 text-[#8B5CF6]">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-white text-xs font-bold font-sans">Analyst Copilot</h3>
                    <div className="text-[9px] text-[#667085]">Grounded in verified AST records</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#080B12] text-[#A7B0C0] border border-[#1D2939] text-[9px]">
                  {briefing?.model_used || "OpenRouter Standby"}
                </span>
              </div>

              {/* Suggested Questions Chips */}
              <div className="py-3 border-b border-[#1D2939] space-y-1.5">
                <div className="text-[9px] text-[#667085] uppercase font-semibold">Suggested Questions:</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSendChat(q)}
                      disabled={isSendingChat || !selectedAuditId}
                      className="px-2 py-1 rounded-lg bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] text-[10px] text-[#A7B0C0] hover:text-white transition-colors cursor-pointer text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Stream History */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs font-mono">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-12 text-[#667085] space-y-2 font-sans">
                    <Bot className="w-8 h-8 text-[#667085] mx-auto" />
                    <p className="text-[#A7B0C0]">Ask the Analyst Copilot any question about this audit.</p>
                    <p className="text-[10px] text-[#667085]">
                      Responses reference verified AST line evidence and deterministic control invariants.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-xl border space-y-2",
                        msg.role === "user"
                          ? "bg-[#111827] border-[#263B55] text-white ml-6"
                          : "bg-[#080B12] border-[#1D2939] text-[#A7B0C0] mr-2"
                      )}
                    >
                      <div className="flex items-center justify-between text-[9px] text-[#667085] font-semibold">
                        <span>{msg.role === "user" ? "SECURITY ANALYST" : "NETVIGIL COPILOT"}</span>
                      </div>
                      <div className="text-[11px] leading-relaxed whitespace-pre-line font-sans">
                        {msg.content}
                      </div>

                      {/* Evidence Citations */}
                      {msg.evidence && msg.evidence.length > 0 && (
                        <div className="pt-2 border-t border-[#1D2939] flex items-center gap-1.5 flex-wrap">
                          {msg.evidence.map((cit, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => setActiveCitation(cit)}
                              className="px-1.5 py-0.5 rounded bg-[#0D121C] hover:bg-[#111827] text-[#22D3EE] border border-[#22D3EE]/30 text-[9px] flex items-center gap-1 transition-colors cursor-pointer font-mono"
                            >
                              <Terminal className="w-2.5 h-2.5" />
                              <span>{cit.citation_label || `[EVIDENCE · ${cit.control_id}]`}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isSendingChat && (
                  <div className="p-3 rounded-xl bg-[#080B12] border border-[#1D2939] text-[#A7B0C0] text-xs flex items-center gap-2 animate-pulse font-sans">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8B5CF6]" />
                    <span>Evaluating AST evidence & synthesizing response...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="pt-3 border-t border-[#1D2939] flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask copilot about findings, blast radius, or fixes..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  disabled={isSendingChat || !selectedAuditId}
                  className="flex-1 bg-[#080B12] border border-[#1D2939] rounded-xl px-3 py-2 text-xs text-white placeholder-[#667085] focus:outline-none focus:border-[#8B5CF6] disabled:opacity-50 font-sans"
                />
                <button
                  onClick={() => handleSendChat()}
                  disabled={!chatInput.trim() || isSendingChat || !selectedAuditId}
                  className="p-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grounded Evidence Inspector Modal */}
        {activeCitation && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActiveCitation(null)}
          >
            <div
              className="bg-[#0D121C] border border-[#1D2939] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl font-mono text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#1D2939] pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#22D3EE]" />
                  <span className="text-white font-bold">
                    {activeCitation.control_id} Evidence Inspection
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-[10px] uppercase font-semibold">
                  {activeCitation.status} ({activeCitation.severity})
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] text-[#667085] uppercase">Framework Standard:</div>
                <div className="text-[#A7B0C0]">
                  {activeCitation.framework} • Control {activeCitation.control_id}
                </div>
              </div>

              {activeCitation.line_number && (
                <div className="space-y-1">
                  <div className="text-[10px] text-[#667085] uppercase">Configuration Line:</div>
                  <div className="px-2.5 py-1 rounded bg-[#080B12] text-[#22D3EE] inline-block font-bold">
                    Line {activeCitation.line_number}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="text-[10px] text-[#667085] uppercase">Verbatim Evidence Snippet:</div>
                <div className="p-3 bg-[#080B12] border border-[#1D2939] rounded-xl font-mono text-[#EF4444] text-xs overflow-x-auto whitespace-pre">
                  {activeCitation.evidence_snippet || "Evidence verified via AST rule match"}
                </div>
              </div>

              <div className="pt-3 border-t border-[#1D2939] flex items-center justify-between">
                <Link
                  href={`/findings?control=${encodeURIComponent(activeCitation.control_id)}`}
                  className="text-xs text-[#3B82F6] hover:underline flex items-center gap-1"
                  onClick={() => setActiveCitation(null)}
                >
                  <span>Open in Evidence Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => setActiveCitation(null)}
                  className="px-4 py-1.5 rounded-lg bg-[#080B12] hover:bg-[#111827] text-[#A7B0C0] hover:text-white text-xs transition-colors"
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
