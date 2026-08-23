"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  Sparkles,
  Send,
  ShieldAlert,
  Cpu,
  RefreshCw,
  Terminal,
  Play,
} from "lucide-react";
import {
  fetchAudits,
  queryAuditAssistant,
  interpretSyntax,
  fetchAIStatus,
  UnknownInterpretation,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  supporting_findings?: string[];
  confidence?: number;
  timestamp: string;
}

export default function AIAssistantPage() {
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"audit_assistant" | "syntax_interpreter">("audit_assistant");
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Syntax interpreter tab state
  const [rawSyntaxInput, setRawSyntaxInput] = useState("ip ssh timeout 15");
  const [syntaxVendor, setSyntaxVendor] = useState("cisco");
  const [syntaxResult, setSyntaxResult] = useState<UnknownInterpretation | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);

  // Chat message stream
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Welcome to **NetVigil AI Co-Pilot**. I am your read-only assistant grounded directly in your active audit records. Ask questions such as:\n- *What are my highest priority critical findings?*\n- *Why did the target fail CIS remote management baseline?*\n- *What configuration lines should I remediate first?*",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Fetch audits
  const { data: audits = [] } = useQuery({
    queryKey: ["audits"],
    queryFn: () => fetchAudits(),
  });

  // Fetch AI provider status
  const { data: aiHealth } = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => fetchAIStatus(),
  });

  useEffect(() => {
    if (audits.length > 0 && !selectedAuditId) {
      setSelectedAuditId(audits[0].id);
    }
  }, [audits, selectedAuditId]);

  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || !selectedAuditId || isLoading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const resp = await queryAuditAssistant(selectedAuditId, queryText);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: resp.answer,
        supporting_findings: resp.supporting_findings,
        confidence: resp.confidence,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I could not query the audit data at this time. Please ensure an audit session is selected.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterpretSyntax = async () => {
    if (!rawSyntaxInput.trim() || isInterpreting) return;

    setIsInterpreting(true);
    try {
      const res = await interpretSyntax({
        raw_command: rawSyntaxInput,
        vendor_hint: syntaxVendor,
      });
      setSyntaxResult(res);
    } catch (err) {
      console.error("Syntax interpretation error:", err);
    } finally {
      setIsInterpreting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2.5 font-mono">
            <Bot className="w-5 h-5 text-[#8B5CF6]" />
            <span>NetVigil AI Intelligence Co-Pilot</span>
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Grounded natural-language audit reasoning and unknown configuration semantic interpretation.
          </p>
        </div>

        {/* AI Provider Status Badge */}
        <div className="flex items-center gap-2.5 font-mono text-[11px] px-3 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] text-[#A3A3A3]">
          <Cpu className="w-3.5 h-3.5 text-[#8B5CF6]" />
          <span>
            AI Gateway: <strong className="text-[#F5F5F5]">OpenRouter</strong> (15 Models)
          </span>
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span className="text-[10px] uppercase font-bold text-[#22C55E]">
            ADVISORY ACTIVE
          </span>
        </div>
      </div>

      {/* Deterministic Guardrail Banner */}
      <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#8B5CF6]/30 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-[#F5F5F5] font-mono">AI ADVISORY • STRICT DETERMINISTIC BOUNDARY</div>
          <p className="text-[#A3A3A3] leading-relaxed font-sans">
            Compliance statuses (<code className="text-[#22C55E]">PASS</code>, <code className="text-[#EF4444]">FAIL</code>, <code className="text-[#F59E0B]">UNKNOWN</code>) and scores are generated 100% deterministically by NetVigil AST parsers. The AI Co-pilot assists with explanation, prioritization, and semantic syntax translation without altering deterministic compliance scores.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab("audit_assistant")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "audit_assistant"
              ? "bg-[#141414] text-[#8B5CF6] border border-[#8B5CF6]/40"
              : "text-[#A3A3A3] hover:text-[#F5F5F5]"
          )}
        >
          <Bot className="w-4 h-4" />
          <span>Audit Q&A Assistant</span>
        </button>

        <button
          onClick={() => setActiveTab("syntax_interpreter")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "syntax_interpreter"
              ? "bg-[#141414] text-[#8B5CF6] border border-[#8B5CF6]/40"
              : "text-[#A3A3A3] hover:text-[#F5F5F5]"
          )}
        >
          <Terminal className="w-4 h-4" />
          <span>Unknown Syntax Classifier</span>
        </button>
      </div>

      {activeTab === "audit_assistant" ? (
        /* Audit Assistant Tab */
        <div className="space-y-4 font-mono">
          {/* Audit Selector Bar */}
          <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#A3A3A3]">Target Audit Context:</span>
              <select
                value={selectedAuditId}
                onChange={(e) => setSelectedAuditId(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] text-[#00D9FF] font-semibold focus:outline-none focus:border-[#8B5CF6]"
              >
                {audits.map((a) => (
                  <option key={a.id} value={a.id}>
                    Audit ID: {a.id.slice(0, 8)}... (Score: {a.score ? `${a.score.toFixed(0)}%` : "N/A"})
                  </option>
                ))}
              </select>
            </div>

            <Link
              href="/audits"
              className="text-[11px] text-[#8B5CF6] hover:underline flex items-center gap-1"
            >
              <span>View Audit Workspace</span>
              <Play className="w-3 h-3 fill-current" />
            </Link>
          </div>

          {/* Chat Container */}
          <div className="rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col h-[520px] overflow-hidden">
            {/* Quick Prompt Suggestions */}
            <div className="p-2.5 bg-[#070707] border-b border-[#1A1A1A] flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-[#666666] text-[10px] whitespace-nowrap">Try asking:</span>
              {[
                "What are my highest risk findings?",
                "Why did this device fail CIS?",
                "What should I remediate first?",
                "Which findings affect remote management?",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendMessage(chip)}
                  className="px-2.5 py-1 rounded bg-[#0D0D0D] hover:bg-[#141414] hover:text-[#8B5CF6] text-[#A3A3A3] border border-[#1A1A1A] whitespace-nowrap transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div key={idx} className={cn("flex gap-3", isAssistant ? "items-start" : "items-end justify-end")}>
                    {isAssistant && (
                      <div className="w-7 h-7 rounded-lg bg-[#0D0D0D] border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "p-4 rounded-xl text-xs max-w-[85%] leading-relaxed",
                        isAssistant
                          ? "bg-[#0D0D0D] border border-[#1A1A1A] text-[#D4D4D4] font-sans"
                          : "bg-[#141414] border border-[#8B5CF6]/40 text-[#F5F5F5] font-sans"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Supporting Findings Badges */}
                      {msg.supporting_findings && msg.supporting_findings.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#1A1A1A] space-y-1.5">
                          <div className="text-[10px] font-mono text-[#8B5CF6] font-bold uppercase">
                            Supporting Finding Citations:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {msg.supporting_findings.map((fId) => (
                              <span
                                key={fId}
                                className="px-2 py-0.5 rounded bg-[#111111] text-[#8B5CF6] border border-[#8B5CF6]/30 text-[10px] font-mono font-semibold"
                              >
                                {fId}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-[#666666] mt-2 text-right">{msg.timestamp}</div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3 items-center text-[#A3A3A3] font-mono text-xs p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                  <span>NetVigil AI is analyzing audit session findings...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3.5 border-t border-[#1A1A1A] bg-[#070707]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputQuery);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask a question about this audit (e.g. Which findings are Critical?)..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#8B5CF6] font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isLoading}
                  className="px-4 py-2.5 rounded-lg bg-[#0B0B0B] border border-[#8B5CF6]/50 hover:border-[#8B5CF6] hover:bg-[#141414] disabled:opacity-40 text-[#8B5CF6] text-xs font-semibold font-mono flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask AI</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Unknown Syntax Classifier Tab */
        <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-5">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2 font-mono">
              <Terminal className="w-4 h-4 text-[#00D9FF]" />
              <span>Unknown Configuration Semantic Interpreter</span>
            </h3>
            <p className="text-xs text-[#A3A3A3] font-sans">
              Test how NetVigil's AI classifier maps unrecognized or proprietary vendor CLI statements to canonical security domains.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[#A3A3A3]">Raw Vendor Configuration Command:</label>
              <input
                type="text"
                value={rawSyntaxInput}
                onChange={(e) => setRawSyntaxInput(e.target.value)}
                placeholder="e.g. ip ssh timeout 15, set system services web-management http disable..."
                className="w-full px-3.5 py-2 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] text-[#00D9FF] focus:outline-none focus:border-[#8B5CF6] text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A3A3A3]">Target Vendor:</label>
              <select
                value={syntaxVendor}
                onChange={(e) => setSyntaxVendor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] text-[#F5F5F5] focus:outline-none focus:border-[#8B5CF6] text-xs font-mono"
              >
                <option value="cisco">Cisco IOS / IOS-XE</option>
                <option value="juniper">Juniper JunOS</option>
                <option value="fortinet">Fortinet FortiOS</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleInterpretSyntax}
              disabled={isInterpreting || !rawSyntaxInput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B0B0B] border border-[#8B5CF6]/50 hover:border-[#8B5CF6] hover:bg-[#141414] disabled:opacity-50 text-[#8B5CF6] text-xs font-semibold font-mono transition-colors"
            >
              {isInterpreting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Interpreting Semantic Intent...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Classify Directive</span>
                </>
              )}
            </button>
          </div>

          {/* Syntax Interpretation Result */}
          {syntaxResult && (
            <div className="p-4 rounded-xl bg-[#050505] border border-[#1A1A1A] space-y-3 font-mono text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#111111] text-[#8B5CF6] border border-[#8B5CF6]/30 font-bold uppercase">
                    {syntaxResult.status}
                  </span>
                  <span className="text-[#F5F5F5] font-bold">Category: {syntaxResult.normalized_category}</span>
                </div>

                <span
                  className={cn(
                    "px-2 py-0.5 rounded font-bold uppercase text-[10px] border",
                    syntaxResult.confidence_tier === "high"
                      ? "bg-[#141414] text-[#22C55E] border-[#22C55E]/40"
                      : syntaxResult.confidence_tier === "review"
                      ? "bg-[#141414] text-[#F59E0B] border-[#F59E0B]/40"
                      : "bg-[#141414] text-[#EF4444] border-[#EF4444]/40"
                  )}
                >
                  {(syntaxResult.confidence * 100).toFixed(0)}% Confidence ({syntaxResult.confidence_tier})
                </span>
              </div>

              <div className="space-y-1 font-sans">
                <div className="text-[10px] text-[#666666] font-mono uppercase">Semantic Meaning</div>
                <p className="text-[#D4D4D4]">{syntaxResult.semantic_meaning}</p>
              </div>

              {syntaxResult.candidate_property && (
                <div className="p-2.5 rounded bg-[#0A0A0A] border border-[#1A1A1A] space-y-1">
                  <div className="text-[10px] text-[#666666] uppercase">Candidate Normalized Mapping</div>
                  <div className="text-[#00D9FF]">
                    <strong className="text-white">{syntaxResult.candidate_property}</strong> = {String(syntaxResult.candidate_value)}
                  </div>
                </div>
              )}

              <div className="space-y-1 font-sans">
                <div className="text-[10px] text-[#666666] font-mono uppercase">Reasoning Summary</div>
                <p className="text-[#A3A3A3] text-[11px]">{syntaxResult.reasoning_summary}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
