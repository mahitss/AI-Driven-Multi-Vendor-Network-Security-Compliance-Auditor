"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  SlidersHorizontal,
} from "lucide-react";
import {
  fetchAudits,
  AuditItem,
  fetchComparableAuditPairs,
  ComparableAuditPairItem,
  sendCopilotChat,
  CopilotChatResponse,
  EvidenceCitation,
  fetchConfigurationDetail,
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

function AICopilotContent() {
  const searchParams = useSearchParams();
  const queryAuditId = searchParams.get("audit_id") || "";

  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [comparablePairs, setComparablePairs] = useState<ComparableAuditPairItem[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>(queryAuditId);
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>("");
  const [isAuditsLoading, setIsAuditsLoading] = useState<boolean>(true);

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

  // Load Audits & Baseline Candidate Pairs
  useEffect(() => {
    async function loadData() {
      setIsAuditsLoading(true);
      try {
        const [auditsList, pairsList] = await Promise.all([
          fetchAudits(),
          fetchComparableAuditPairs(),
        ]);
        setAudits(auditsList);
        setComparablePairs(pairsList);

        if (auditsList.length > 0) {
          // If query audit exists in list, use it; otherwise default to first audit
          const activeAudit =
            queryAuditId && auditsList.some((a) => a.id === queryAuditId)
              ? queryAuditId
              : auditsList[0].id;
          setSelectedAuditId(activeAudit);

          // If there is an evolution baseline pair matching this audit, auto-populate baseline
          const matchingPair = pairsList.find((p) => p.remediated_audit_id === activeAudit);
          if (matchingPair) {
            setSelectedBaselineId(matchingPair.baseline_audit_id);
          }
        }
      } catch (err) {
        console.error("Failed to load audits for AI Copilot:", err);
      } finally {
        setIsAuditsLoading(false);
      }
    }
    loadData();
  }, [queryAuditId]);

  // Selected audit object
  const selectedAudit = useMemo(() => {
    return audits.find((a) => a.id === selectedAuditId) || null;
  }, [audits, selectedAuditId]);

  // Selected baseline object
  const selectedBaseline = useMemo(() => {
    return audits.find((a) => a.id === selectedBaselineId) || null;
  }, [audits, selectedBaselineId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isSendingChat]);

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
      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
      const response: CopilotChatResponse = await sendCopilotChat({
        query: userMessage,
        audit_id: selectedAuditId,
        baseline_audit_id: selectedBaselineId || undefined,
        chat_history: history,
      });

      const responseTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
          evidence: response.grounded_evidence,
          suggestedFollowups: response.suggested_followups,
          modelUsed: response.model_used,
          timestamp: responseTime,
        },
      ]);
    } catch (err: any) {
      console.error("Copilot chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Unable to process investigation query: ${err?.message || "AI gateway timeout"}. Please retry or inspect deterministic findings directly in Evidence Explorer.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-16">
      {/* 1. Page Header & AI Invariant Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#1F1F1F] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6]">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#F2F2F2]">
              AI COPILOT
            </h1>
            <span className="px-2 py-0.5 rounded bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] text-[10px] uppercase font-mono font-bold">
              SOC ANALYST
            </span>
          </div>
          <p className="text-sm text-[#8E8E93] mt-1 font-sans leading-relaxed">
            Evidence-grounded security analyst for investigating findings, risk, controls, and remediation.
          </p>
        </div>

        {/* Advisory Disclaimer Badge */}
        <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl p-3 flex items-center gap-3 text-xs max-w-md">
          <div className="p-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-[11px] leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#F59E0B] font-mono">AI ADVISORY ONLY</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#080808] border border-[#1F1F1F] text-[#636366] font-mono">
                AST GROUNDED
              </span>
            </div>
            <p className="text-[#636366] text-[10px] mt-0.5 font-sans">
              Deterministic AST compliance decisions and risk scoring remain strictly authoritative. Zero device write capability.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Audit Session & Context Bar */}
      <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono">
        <div className="flex flex-wrap items-center gap-4 flex-1 w-full md:w-auto">
          {/* Target Audit Selector */}
          <div className="space-y-1.5 flex-1 min-w-[280px]">
            <label className="text-[11px] text-[#8E8E93] uppercase font-semibold flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Target Audit Session</span>
            </label>
            <select
              value={selectedAuditId}
              onChange={(e) => {
                setSelectedAuditId(e.target.value);
                const matchingPair = comparablePairs.find((p) => p.remediated_audit_id === e.target.value);
                if (matchingPair) {
                  setSelectedBaselineId(matchingPair.baseline_audit_id);
                } else {
                  setSelectedBaselineId("");
                }
              }}
              disabled={isAuditsLoading || audits.length === 0}
              className="w-full bg-[#080808] border border-[#1F1F1F] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#3B82F6] disabled:opacity-50"
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

          {/* Optional Evolution Baseline */}
          <div className="space-y-1.5 flex-1 min-w-[280px]">
            <label className="text-[11px] text-[#8E8E93] uppercase font-semibold flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Evolution Baseline (Time Machine)</span>
            </label>
            <select
              value={selectedBaselineId}
              onChange={(e) => setSelectedBaselineId(e.target.value)}
              disabled={isAuditsLoading || audits.length === 0}
              className="w-full bg-[#080808] border border-[#1F1F1F] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6] disabled:opacity-50"
            >
              <option value="">None (Single Audit Investigation)</option>
              {audits
                .filter((a) => a.id !== selectedAuditId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    Baseline {a.id.substring(0, 8)}... — Score: {a.score?.toFixed(1) || 0}% ({a.device_id || "Gateway"})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Audit Context Metrics Pill */}
        {selectedAudit && (
          <div className="flex items-center gap-3 self-stretch md:self-auto bg-[#080808] border border-[#1F1F1F] px-4 py-2 rounded-xl text-xs shrink-0">
            <div>
              <div className="text-[10px] text-[#636366] uppercase">Compliance</div>
              <div className="text-sm font-bold text-[#10B981]">{selectedAudit.score?.toFixed(1) || 0}%</div>
            </div>
            <div className="w-px h-6 bg-[#1F1F1F]" />
            <div>
              <div className="text-[10px] text-[#636366] uppercase">Platform</div>
              <div className="text-sm font-bold text-[#F2F2F2]">{(selectedAudit as any)?.detected_vendor?.toUpperCase() || selectedAudit.device_id || "GATEWAY"}</div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Investigation Workspace */}
      <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl flex flex-col h-[760px] overflow-hidden shadow-xl">
        {/* Workspace Top Bar */}
        <div className="p-4 border-b border-[#1F1F1F] bg-[#080808] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#10B981] tactical-pulse-green" />
            <span className="text-xs font-semibold text-white tracking-wide font-mono">
              ANALYST INVESTIGATION STREAM
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#141414] text-[#8E8E93] border border-[#242424] font-mono">
              READ-ONLY CO-PILOT
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
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
              <Sparkles className="w-3 h-3 text-[#8B5CF6]" />
              <span>Executive Briefing</span>
            </Link>
          </div>
        </div>

        {/* Suggested Security Questions */}
        <div className="px-5 py-3 border-b border-[#1F1F1F] bg-[#0A0A0A] space-y-2">
          <div className="text-[10px] text-[#636366] uppercase font-semibold font-mono flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#8B5CF6]" />
            <span>Suggested SOC Investigation Queries:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSendChat(q)}
                disabled={isSendingChat || !selectedAuditId}
                className="px-3 py-1.5 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#1F1F1F] hover:border-[#2A2A2A] text-xs text-[#8E8E93] hover:text-white transition-all cursor-pointer font-sans text-left disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] mb-1">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white font-sans">
                Evidence-Grounded AI Security Analyst
              </h3>
              <p className="text-sm text-[#8E8E93] max-w-md font-sans leading-relaxed">
                Ask questions regarding target vulnerabilities, risk attribution, compliance gaps, or recommended allowlisted CLI patches.
              </p>
              <div className="p-3 bg-[#080808] border border-[#1F1F1F] rounded-xl text-xs text-[#636366] max-w-lg font-mono">
                Every response is derived strictly from verified AST configuration lines and authoritative framework rules.
              </div>
            </div>
          ) : (
            chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 rounded-xl border space-y-2.5 transition-all",
                  msg.role === "user"
                    ? "bg-[#141414] border-[#2A2A2A] text-white ml-8 md:ml-24 shadow-sm"
                    : "bg-[#080808] border-[#1F1F1F] text-[#D4D4D8] mr-8 md:mr-24"
                )}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between text-[11px] font-mono text-[#636366] border-b border-[#1A1A1A] pb-1.5">
                  <div className="flex items-center gap-2">
                    {msg.role === "user" ? (
                      <span className="font-bold text-[#E5E5E5]">SECURITY ANALYST</span>
                    ) : (
                      <>
                        <span className="font-bold text-[#8B5CF6]">NETVIGIL COPILOT</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#141414] border border-[#242424] text-[#888888]">
                          {msg.modelUsed || "AST Grounded"}
                        </span>
                      </>
                    )}
                  </div>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Content */}
                <div className="text-sm leading-relaxed whitespace-pre-line font-sans">
                  {msg.content}
                </div>

                {/* Grounded Evidence Citations */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <div className="pt-2.5 border-t border-[#1A1A1A] space-y-1.5">
                    <div className="text-[10px] text-[#636366] uppercase font-mono font-semibold">
                      Authoritative Evidence Proof:
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {msg.evidence.map((cit, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => setActiveCitation(cit)}
                          className="px-2.5 py-1 rounded-lg bg-[#0B0B0B] hover:bg-[#141414] text-[#22D3EE] border border-[#22D3EE]/30 text-xs flex items-center gap-1.5 transition-all cursor-pointer font-mono font-semibold"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>{cit.citation_label || `[EVIDENCE · ${cit.control_id}]`}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Followups */}
                {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                  <div className="pt-2 border-t border-[#1A1A1A] flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-[#636366] font-mono">Follow up:</span>
                    {msg.suggestedFollowups.map((fu, fIdx) => (
                      <button
                        key={fIdx}
                        onClick={() => handleSendChat(fu)}
                        className="text-xs text-[#8B5CF6] hover:underline font-sans"
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
            <div className="p-4 rounded-xl bg-[#080808] border border-[#1F1F1F] text-[#8E8E93] text-xs flex items-center gap-3 font-mono animate-pulse mr-8 md:mr-24">
              <RefreshCw className="w-4 h-4 animate-spin text-[#8B5CF6]" />
              <span>Evaluating deterministic AST evidence & synthesizing findings...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#1F1F1F] bg-[#080808] flex items-center gap-3">
          <input
            type="text"
            placeholder="Ask Copilot about findings, blast radius, or allowlisted fixes..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendChat();
              }
            }}
            disabled={isSendingChat || !selectedAuditId}
            className="flex-1 bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl px-4 py-3 text-sm text-white placeholder-[#636366] focus:outline-none focus:border-[#8B5CF6] transition-colors disabled:opacity-50 font-sans"
          />
          <button
            onClick={() => handleSendChat()}
            disabled={!chatInput.trim() || isSendingChat || !selectedAuditId}
            className="px-5 py-3 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-40 text-white font-semibold transition-all cursor-pointer flex items-center gap-2 text-sm shadow-md shadow-[#8B5CF6]/20 shrink-0"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Grounded Evidence Citation Inspector Modal */}
      {activeCitation && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveCitation(null)}
        >
          <div
            className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#22D3EE]" />
                <span className="text-white font-bold">
                  {activeCitation.control_id} Evidence Proof
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-[10px] uppercase font-semibold">
                {activeCitation.status} ({activeCitation.severity})
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] text-[#636366] uppercase">Framework Standard:</div>
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
                className="px-4 py-1.5 rounded-lg bg-[#080808] hover:bg-[#141414] text-[#8E8E93] hover:text-white text-xs transition-colors"
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
    <Suspense fallback={<div className="p-12 text-center text-[#636366] font-mono">Loading AI Copilot...</div>}>
      <AICopilotContent />
    </Suspense>
  );
}
