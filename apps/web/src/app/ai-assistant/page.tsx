"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  Sparkles,
  Send,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Zap,
  CheckCircle2,
  Terminal,
  HelpCircle,
  Play,
  Layers,
  FileCode2,
} from "lucide-react";
import {
  fetchAudits,
  fetchAuditDetail,
  queryAuditAssistant,
  interpretSyntax,
  fetchAIStatus,
  AuditItem,
  AuditDetail,
  AuditAssistantResponse,
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-indigo-400" />
            <span>NetVigil AI Intelligence Co-Pilot</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Grounded natural-language audit reasoning and unknown configuration semantic interpretation.
          </p>
        </div>

        {/* AI Provider Status Badge */}
        <div className="flex items-center gap-2 font-mono text-[11px] px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/5 text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            Provider: <strong className="text-slate-200">{aiHealth?.provider || "OpenRouter"}</strong> ({aiHealth?.model || "Claude 3.5"})
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Deterministic Guardrail Banner */}
      <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-indigo-200">Strict Deterministic Boundary</div>
          <p className="text-slate-300 leading-relaxed font-sans">
            Compliance statuses (<code className="text-emerald-400">PASS</code>, <code className="text-rose-400">FAIL</code>, <code className="text-amber-400">UNKNOWN</code>) and scores are generated 100% deterministically by NetVigil AST parsers. The AI Co-pilot assists with explanation, prioritization, and semantic syntax translation without altering deterministic compliance scores.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab("audit_assistant")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "audit_assistant"
              ? "bg-indigo-950 text-indigo-300 border border-indigo-500/40"
              : "text-slate-400 hover:text-slate-200"
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
              ? "bg-indigo-950 text-indigo-300 border border-indigo-500/40"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Terminal className="w-4 h-4" />
          <span>Unknown Syntax Classifier</span>
        </button>
      </div>

      {activeTab === "audit_assistant" ? (
        /* Audit Assistant Tab */
        <div className="space-y-4">
          {/* Audit Selector Bar */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Target Audit Context:</span>
              <select
                value={selectedAuditId}
                onChange={(e) => setSelectedAuditId(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#060911] border border-white/10 text-cyan-300 font-semibold focus:outline-none focus:border-indigo-500"
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
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View Audit Workspace</span>
              <Play className="w-3 h-3 fill-current" />
            </Link>
          </div>

          {/* Chat Container */}
          <div className="rounded-xl bg-slate-900/40 border border-white/5 flex flex-col h-[520px] overflow-hidden">
            {/* Quick Prompt Suggestions */}
            <div className="p-2.5 bg-slate-950/60 border-b border-white/5 flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
              <span className="text-slate-500 text-[10px] whitespace-nowrap">Try asking:</span>
              {[
                "What are my highest risk findings?",
                "Why did this device fail CIS?",
                "What should I remediate first?",
                "Which findings affect remote management?",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendMessage(chip)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-950 hover:text-indigo-300 text-slate-300 border border-white/5 whitespace-nowrap transition-colors"
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
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "p-4 rounded-xl text-xs max-w-[85%] leading-relaxed",
                        isAssistant
                          ? "bg-slate-900/90 border border-white/5 text-slate-200 font-sans shadow-md"
                          : "bg-indigo-600 text-white font-sans"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Supporting Findings Badges */}
                      {msg.supporting_findings && msg.supporting_findings.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
                          <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase">
                            Supporting Finding Citations:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {msg.supporting_findings.map((fId) => (
                              <span
                                key={fId}
                                className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40 text-[10px] font-mono font-semibold"
                              >
                                {fId}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-slate-500 mt-2 text-right">{msg.timestamp}</div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3 items-center text-slate-400 font-mono text-xs p-3 rounded-lg bg-slate-900/40 border border-white/5">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>NetVigil AI is analyzing audit session findings...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3.5 border-t border-white/10 bg-slate-950/80">
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
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#060911] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isLoading}
                  className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold font-mono flex items-center gap-1.5 transition-colors"
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
        <div className="p-6 rounded-xl bg-slate-900/50 border border-white/5 space-y-5">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Unknown Configuration Semantic Interpreter</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Test how NetVigil's AI classifier maps unrecognized or proprietary vendor CLI statements to canonical security domains.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-slate-400">Raw Vendor Configuration Command:</label>
              <input
                type="text"
                value={rawSyntaxInput}
                onChange={(e) => setRawSyntaxInput(e.target.value)}
                placeholder="e.g. ip ssh timeout 15, set system services web-management http disable..."
                className="w-full px-3.5 py-2 rounded-lg bg-[#060911] border border-white/10 text-cyan-300 focus:outline-none focus:border-indigo-500 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400">Target Vendor:</label>
              <select
                value={syntaxVendor}
                onChange={(e) => setSyntaxVendor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#060911] border border-white/10 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-mono"
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold font-mono transition-colors"
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
            <div className="p-4 rounded-xl bg-[#060911] border border-indigo-500/30 space-y-3 font-mono text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40 font-bold uppercase">
                    {syntaxResult.status}
                  </span>
                  <span className="text-slate-300 font-bold">Category: {syntaxResult.normalized_category}</span>
                </div>

                <span
                  className={cn(
                    "px-2 py-0.5 rounded font-bold uppercase text-[10px]",
                    syntaxResult.confidence_tier === "high"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                      : syntaxResult.confidence_tier === "review"
                      ? "bg-amber-950 text-amber-300 border border-amber-800/40"
                      : "bg-rose-950 text-rose-300 border border-rose-800/40"
                  )}
                >
                  {(syntaxResult.confidence * 100).toFixed(0)}% Confidence ({syntaxResult.confidence_tier})
                </span>
              </div>

              <div className="space-y-1 font-sans">
                <div className="text-[10px] text-slate-500 font-mono uppercase">Semantic Meaning</div>
                <p className="text-slate-200">{syntaxResult.semantic_meaning}</p>
              </div>

              {syntaxResult.candidate_property && (
                <div className="p-2.5 rounded bg-slate-900 border border-white/5 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">Candidate Normalized Mapping</div>
                  <div className="text-cyan-300">
                    <strong className="text-white">{syntaxResult.candidate_property}</strong> = {String(syntaxResult.candidate_value)}
                  </div>
                </div>
              )}

              <div className="space-y-1 font-sans">
                <div className="text-[10px] text-slate-500 font-mono uppercase">Reasoning Summary</div>
                <p className="text-slate-400 text-[11px]">{syntaxResult.reasoning_summary}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
