"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  FileCode,
  ArrowRight,
  History,
  Lock,
  Layers,
  Check,
  ChevronRight,
  Info,
  Terminal,
  Clock,
  Wrench,
  Search,
} from "lucide-react";
import {
  fetchAudits,
  AuditItem,
  fetchComparableAuditPairs,
  ComparableAuditPairItem,
  generateAISecurityBriefing,
  AISecurityBriefingResponse,
  EvidenceCitation,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

function AISecurityBriefingContent() {
  const searchParams = useSearchParams();
  const queryAuditId = searchParams.get("audit_id") || "";

  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [comparablePairs, setComparablePairs] = useState<ComparableAuditPairItem[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>(queryAuditId);
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>("");
  const [isLoadingBriefing, setIsLoadingBriefing] = useState<boolean>(false);
  const [briefing, setBriefing] = useState<AISecurityBriefingResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedBriefing, setCopiedBriefing] = useState<boolean>(false);
  const [copiedSessionId, setCopiedSessionId] = useState<boolean>(false);

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
          const activeAudit =
            queryAuditId && auditsList.some((a) => a.id === queryAuditId)
              ? queryAuditId
              : auditsList[0].id;
          setSelectedAuditId(activeAudit);

          // If there is a comparable baseline pair matching this audit, auto-populate baseline
          const matchingPair = pairsList.find((p) => p.remediated_audit_id === activeAudit);
          if (matchingPair) {
            setSelectedBaselineId(matchingPair.baseline_audit_id);
          }
        }
      } catch (err) {
        console.error("Failed to load audits for briefing:", err);
      }
    }
    loadData();
  }, [queryAuditId]);

  // Selected audit object
  const selectedAudit = useMemo(() => {
    return audits.find((a) => a.id === selectedAuditId) || null;
  }, [audits, selectedAuditId]);

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
    } catch (err: any) {
      console.error("Briefing generation failed:", err);
      setErrorMsg(err?.message || "Failed to generate AI Security Briefing.");
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  const handleCopyBriefing = () => {
    if (!briefing) return;
    const text = `NETVIGIL AI SECURITY BRIEFING
Asset: ${briefing.device_hostname} (${briefing.detected_vendor.toUpperCase()})
Deterministic Compliance Score: ${briefing.compliance_score.toFixed(1)}%
Risk Score: ${briefing.risk_score.toFixed(1)}/100
P0 Critical Exposures: ${briefing.critical_p0_count}

EXECUTIVE POSTURE SUMMARY:
${briefing.executive_summary}

TOP CRITICAL RISKS:
${briefing.top_risks.map((r) => `- [${r.priority}] ${r.control_id}: ${r.title}\n  Why it matters: ${r.why_it_matters}\n  Action: ${r.recommended_action}`).join("\n\n")}

RECOMMENDED INVESTIGATION ORDER:
${briefing.recommended_investigation_order.map((s) => `${s.step_number}. ${s.control_id} (${s.priority}): ${s.action_summary}`).join("\n")}
`;
    navigator.clipboard.writeText(text);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2000);
  };

  const handleCopySessionId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedSessionId(true);
    setTimeout(() => setCopiedSessionId(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-16">
      {/* 1. Top Header & Advisory Notice */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#1F1F1F] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#F2F2F2]">
              AI SECURITY BRIEFING
            </h1>
            <span className="px-2 py-0.5 rounded bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] text-[10px] uppercase font-mono font-bold">
              EXECUTIVE SYNTHESIS
            </span>
          </div>
          <p className="text-sm text-[#8E8E93] mt-1 font-sans leading-relaxed">
            Evidence-grounded executive briefing and posture evaluation synthesized from deterministic AST compliance audits.
          </p>
        </div>

        {/* Strict Invariant Disclaimer Badge */}
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

      {/* 2. Empty State when no audits exist */}
      {audits.length === 0 && (
        <div className="p-10 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#F2F2F2] uppercase tracking-wider font-mono">
              NO AUDIT SESSIONS AVAILABLE
            </div>
            <p className="text-sm text-[#8E8E93] mt-1 max-w-md mx-auto font-sans leading-relaxed">
              Ingest and evaluate a network device configuration to synthesize an authoritative AI security briefing.
            </p>
          </div>
          <Link
            href="/configurations?mode=ingest"
            className="inline-block px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold shadow-lg shadow-[#8B5CF6]/20 transition-all"
          >
            Ingest Configuration →
          </Link>
        </div>
      )}

      {/* 3. Audit Context Selection Bar */}
      <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono">
        <div className="flex flex-wrap items-center gap-4 flex-1 w-full md:w-auto">
          {/* Primary Audit Selection */}
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
              disabled={audits.length === 0}
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

          {/* Optional Baseline Evolution Audit */}
          <div className="space-y-1.5 flex-1 min-w-[280px]">
            <label className="text-[11px] text-[#8E8E93] uppercase font-semibold flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Evolution Baseline (Time Machine)</span>
            </label>
            <select
              value={selectedBaselineId}
              onChange={(e) => setSelectedBaselineId(e.target.value)}
              className="w-full bg-[#080808] border border-[#1F1F1F] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
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

        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
          <button
            onClick={handleGenerateBriefing}
            disabled={isLoadingBriefing || !selectedAuditId}
            className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/20 transition-all cursor-pointer font-sans"
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
              className="p-2.5 rounded-xl bg-[#080808] hover:bg-[#141414] border border-[#1F1F1F] text-[#8E8E93] hover:text-white transition-colors"
              title="Copy Briefing"
            >
              {copiedBriefing ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4 text-[#888888]" />}
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-xs text-[#EF4444] flex items-center gap-2.5 font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4. Hero Metric Cards Row (4 Equal Height, Balanced Widths) */}
      {briefing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Compliance Score */}
          <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-5 min-h-[140px] flex flex-col justify-between">
            <div className="text-[11px] text-[#8E8E93] uppercase font-semibold font-mono flex items-center justify-between">
              <span>Compliance Posture</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold">
                AUTHORITATIVE
              </span>
            </div>
            <div className="my-1">
              <div className="text-3xl lg:text-4xl font-black text-white font-mono">
                {briefing.compliance_score.toFixed(1)}%
              </div>
            </div>
            <div className="text-xs text-[#636366] font-mono truncate">
              {briefing.device_hostname} • {briefing.detected_vendor.toUpperCase()}
            </div>
          </div>

          {/* Risk Score */}
          <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-5 min-h-[140px] flex flex-col justify-between">
            <div className="text-[11px] text-[#8E8E93] uppercase font-semibold font-mono flex items-center justify-between">
              <span>Algorithmic Risk</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 font-bold">
                DETERMINISTIC
              </span>
            </div>
            <div className="my-1">
              <div className="text-3xl lg:text-4xl font-black text-[#EF4444] font-mono">
                {briefing.risk_score.toFixed(1)}
                <span className="text-sm font-normal text-[#636366]"> / 100</span>
              </div>
            </div>
            <div className="text-xs text-[#636366] font-mono">
              Composite Topological Exposure
            </div>
          </div>

          {/* P0 / Critical Exposures */}
          <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-5 min-h-[140px] flex flex-col justify-between">
            <div className="text-[11px] text-[#8E8E93] uppercase font-semibold font-mono flex items-center justify-between">
              <span>Critical / P0 Risks</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 font-bold">
                URGENT
              </span>
            </div>
            <div className="my-1">
              <div className="text-3xl lg:text-4xl font-black text-[#8B5CF6] font-mono">
                {briefing.critical_p0_count}
              </div>
            </div>
            <div className="text-xs text-[#636366] font-mono">
              {briefing.high_p1_count} High (P1) Exposures
            </div>
          </div>

          {/* Posture Trend */}
          <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-5 min-h-[140px] flex flex-col justify-between">
            <div className="text-[11px] text-[#8E8E93] uppercase font-semibold font-mono flex items-center justify-between">
              <span>Posture Evaluation</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#141414] text-[#8E8E93] border border-[#242424] font-mono">
                ACTIVE
              </span>
            </div>
            <div className="my-1 flex items-center gap-2.5">
              <span
                className={cn(
                  "w-3 h-3 rounded-full shrink-0",
                  briefing.posture_trend.includes("CRITICAL") || briefing.posture_trend.includes("ELEVATED")
                    ? "bg-[#EF4444] animate-pulse"
                    : "bg-[#10B981]"
                )}
              />
              <span className="text-base lg:text-lg font-bold text-white uppercase font-mono truncate">
                {briefing.posture_trend.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-xs text-[#636366] font-mono truncate">
              Provider: {briefing.provider.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* 5. Main Dashboard Content Area */}
      {!briefing && !isLoadingBriefing ? (
        <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-16 text-center text-[#636366] space-y-3">
          <Sparkles className="w-12 h-12 text-[#636366] mx-auto opacity-50" />
          <h3 className="text-white text-base font-semibold font-sans">No Security Briefing Synthesized</h3>
          <p className="text-sm text-[#8E8E93] max-w-lg mx-auto font-sans leading-relaxed">
            Select a target audit session above and click &quot;Generate Security Briefing&quot; to synthesize an authoritative executive briefing, critical risk narrative, and playbook.
          </p>
        </div>
      ) : isLoadingBriefing ? (
        /* Loading Skeletons */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-8 space-y-4 animate-pulse">
              <div className="h-5 bg-[#141414] rounded w-1/4" />
              <div className="h-4 bg-[#141414]/60 rounded w-full" />
              <div className="h-4 bg-[#141414]/60 rounded w-5/6" />
              <div className="h-4 bg-[#141414]/60 rounded w-4/6" />
            </div>
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-8 space-y-4 animate-pulse">
              <div className="h-5 bg-[#141414] rounded w-1/3" />
              <div className="h-20 bg-[#141414]/40 rounded-xl" />
              <div className="h-20 bg-[#141414]/40 rounded-xl" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-[#141414] rounded w-1/2" />
              <div className="h-10 bg-[#141414]/40 rounded-xl" />
              <div className="h-10 bg-[#141414]/40 rounded-xl" />
            </div>
          </div>
        </div>
      ) : briefing ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Primary Column (~70% / 8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Executive Summary Narrative (Substantially Larger Readable Scale) */}
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm">
              <div className="text-[11px] text-[#8B5CF6] uppercase font-semibold font-mono flex items-center justify-between border-b border-[#1F1F1F] pb-3">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Executive Posture Summary</span>
                </span>
                <span className="text-[#636366] text-[10px]">Grounded in AST Facts</span>
              </div>
              <p className="text-[15px] sm:text-[16px] text-[#E0E0E0] leading-relaxed font-sans whitespace-pre-line">
                {briefing.executive_summary}
              </p>
            </div>

            {/* 2. Top Critical Risks Section (Full Width Cards with High Readability) */}
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm">
              <div className="text-[11px] text-[#EF4444] uppercase font-semibold font-mono flex items-center justify-between border-b border-[#1F1F1F] pb-3">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Top Critical Risks ({briefing.top_risks.length})</span>
                </span>
                <span className="text-[#636366] text-[10px]">Prioritized Exposures</span>
              </div>

              <div className="space-y-4">
                {briefing.top_risks.map((risk) => (
                  <div
                    key={risk.control_id}
                    className="bg-[#080808] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors rounded-xl p-5 space-y-3.5"
                  >
                    {/* Header: Priority Badge + Control ID + Title + Severity */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-xs font-mono font-bold">
                          {risk.priority}
                        </span>
                        <span className="text-white font-mono font-bold text-sm">
                          {risk.control_id}
                        </span>
                        <span className="text-[#8E8E93] text-sm font-sans font-medium">
                          {risk.title}
                        </span>
                      </div>
                      <span className="text-xs text-[#636366] uppercase font-mono self-start sm:self-auto">
                        {risk.severity}
                      </span>
                    </div>

                    {/* Impact / Description */}
                    <p className="text-sm text-[#D4D4D8] leading-relaxed font-sans">
                      {risk.why_it_matters}
                    </p>

                    {/* Evidence Indicator & Citation */}
                    {risk.evidence_citation && (
                      <div className="pt-2 border-t border-[#1F1F1F] flex items-center justify-between gap-2 flex-wrap text-xs">
                        <button
                          onClick={() => setActiveCitation(risk.evidence_citation!)}
                          className="px-2.5 py-1 rounded-lg bg-[#0B0B0B] hover:bg-[#141414] border border-[#1F1F1F] text-[#22D3EE] flex items-center gap-1.5 transition-colors cursor-pointer font-mono text-xs font-semibold"
                        >
                          <Terminal className="w-3.5 h-3.5 text-[#22D3EE]" />
                          <span>
                            {risk.evidence_citation.line_number
                              ? `[EVIDENCE · LINE ${risk.evidence_citation.line_number}]`
                              : "[EVIDENCE · AST PROOF]"}
                          </span>
                        </button>
                        <span className="text-[#636366] font-mono text-xs truncate max-w-md">
                          {risk.evidence_citation.evidence_snippet || "Verified AST rule match"}
                        </span>
                      </div>
                    )}

                    {/* Recommended Allowlisted Action */}
                    <div className="text-xs text-[#10B981] font-mono bg-[#10B981]/10 p-3 rounded-lg border border-[#10B981]/20 flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block mb-0.5">ALLOWLISTED ACTION:</strong>
                        <span>{risk.recommended_action}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Security Time Machine Evolution (If Baseline Supplied) */}
            {briefing.security_evolution && (
              <div className="bg-[#0B0B0B] border border-[#8B5CF6]/30 rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm">
                <div className="text-[11px] text-[#8B5CF6] uppercase font-semibold font-mono flex items-center justify-between border-b border-[#1F1F1F] pb-3">
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Security Time Machine Evolution</span>
                  </span>
                  <Link
                    href={`/security-time-machine?before_id=${briefing.security_evolution.baseline_audit_id}&after_id=${briefing.security_evolution.current_audit_id}`}
                    className="text-xs text-[#3B82F6] hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>Open Diff Viewer</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center font-mono">
                  <div className="p-3.5 bg-[#080808] rounded-xl border border-[#1F1F1F]">
                    <div className="text-[10px] text-[#636366]">Baseline Score</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {briefing.security_evolution.before_score.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#080808] rounded-xl border border-[#1F1F1F]">
                    <div className="text-[10px] text-[#636366]">Remediated Score</div>
                    <div className="text-xl font-bold text-[#10B981] mt-1">
                      {briefing.security_evolution.after_score.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#8B5CF6]/10 rounded-xl border border-[#8B5CF6]/30">
                    <div className="text-[10px] text-[#8B5CF6]">Posture Delta</div>
                    <div className="text-xl font-bold text-[#8B5CF6] mt-1">
                      +{briefing.security_evolution.score_delta.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[#D4D4D8] leading-relaxed font-sans">
                  {briefing.security_evolution.narrative}
                </p>

                {briefing.security_evolution.resolved_controls_summary.length > 0 && (
                  <div className="text-xs text-[#636366] flex items-center gap-2 flex-wrap font-mono pt-2 border-t border-[#1F1F1F]">
                    <span className="text-[#10B981] font-semibold">Resolved Controls:</span>
                    {briefing.security_evolution.resolved_controls_summary.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. Recommended Investigation Order */}
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm">
              <div className="text-[11px] text-[#3B82F6] uppercase font-semibold font-mono flex items-center justify-between border-b border-[#1F1F1F] pb-3">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Recommended Investigation Order</span>
                </span>
                <span className="text-[#636366] text-[10px]">Deterministic Priority Sequence</span>
              </div>

              <div className="space-y-3">
                {briefing.recommended_investigation_order.map((step) => (
                  <div
                    key={step.step_number}
                    className="p-4 bg-[#080808] border border-[#1F1F1F] rounded-xl flex items-start gap-3.5 text-xs font-mono"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {step.step_number}
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold text-sm">{step.control_id}</span>
                        <span className="px-1.5 py-0.2 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-[9px] font-bold">
                          {step.priority}
                        </span>
                        {step.target_lines.length > 0 && (
                          <span className="text-xs text-[#8E8E93]">
                            Line {step.target_lines.join(", ")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#D4D4D8] font-sans leading-relaxed">{step.action_summary}</p>
                      <p className="text-xs text-[#636366] font-sans">{step.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Compact Details & Quick Actions (~30% / 4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Audit Details Card */}
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-5 space-y-4 shadow-sm font-mono text-xs">
              <div className="text-[11px] text-[#8E8E93] uppercase font-semibold flex items-center gap-2 border-b border-[#1F1F1F] pb-2.5">
                <FileCode className="w-4 h-4 text-[#3B82F6]" />
                <span>AUDIT DETAILS</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[10px] text-[#636366] uppercase">Asset Hostname</div>
                  <div className="text-sm font-bold text-white mt-0.5 font-mono">{briefing.device_hostname}</div>
                </div>

                <div>
                  <div className="text-[10px] text-[#636366] uppercase">Detected Platform</div>
                  <div className="text-sm font-bold text-[#E5E5E5] mt-0.5 font-mono">
                    {briefing.detected_vendor.toUpperCase()}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#636366] uppercase">Session ID</div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-[#8E8E93] font-mono truncate">
                      {briefing.audit_id}
                    </span>
                    <button
                      onClick={() => handleCopySessionId(briefing.audit_id)}
                      className="p-1 rounded hover:bg-[#141414] text-[#636366] hover:text-white transition-colors shrink-0"
                      title="Copy Session ID"
                    >
                      {copiedSessionId ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#636366] uppercase">Analysis Mode</div>
                  <div className="text-xs font-semibold text-[#10B981] mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    <span>DETERMINISTIC AST EVALUATION</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#636366] uppercase">AI Gateway Model</div>
                  <div className="text-xs text-[#8E8E93] mt-0.5 truncate font-mono">
                    {briefing.model_used || "OpenRouter Standby"}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-2xl p-5 space-y-3.5 shadow-sm font-mono text-xs">
              <div className="text-[11px] text-[#8E8E93] uppercase font-semibold flex items-center gap-2 border-b border-[#1F1F1F] pb-2.5">
                <Wrench className="w-4 h-4 text-[#8B5CF6]" />
                <span>QUICK ACTIONS</span>
              </div>

              <div className="space-y-2">
                {/* 1. Open in Dedicated AI Copilot */}
                <div className="p-3.5 rounded-xl bg-[#080808] border border-[#1F1F1F] space-y-2">
                  <div className="text-[11px] text-[#8E8E93] font-sans">Need deeper analysis?</div>
                  <Link
                    href={`/ai-copilot?audit_id=${briefing.audit_id}`}
                    className="w-full p-2.5 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] text-white border border-[#2B2B2B] hover:border-[#383838] flex items-center justify-between transition-all group font-sans text-xs font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#A0A0A0] group-hover:text-white transition-colors" />
                      <span>Open AI Copilot →</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#636366] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                {/* 2. View Findings in Evidence Explorer */}
                <Link
                  href={`/findings?audit_id=${briefing.audit_id}`}
                  className="w-full p-3 rounded-xl bg-[#080808] hover:bg-[#141414] text-[#E0E0E0] hover:text-white border border-[#1F1F1F] flex items-center justify-between transition-all group font-sans text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Terminal className="w-4 h-4 text-[#22D3EE]" />
                    <span>View Findings & Evidence</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#636366] group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* 3. Generate Remediation Plan */}
                <Link
                  href="/remediation"
                  className="w-full p-3 rounded-xl bg-[#080808] hover:bg-[#141414] text-[#E0E0E0] hover:text-white border border-[#1F1F1F] flex items-center justify-between transition-all group font-sans text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-4 h-4 text-[#10B981]" />
                    <span>Remediation Center</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#636366] group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* 4. Compare with Time Machine */}
                <Link
                  href="/security-time-machine"
                  className="w-full p-3 rounded-xl bg-[#080808] hover:bg-[#141414] text-[#E0E0E0] hover:text-white border border-[#1F1F1F] flex items-center justify-between transition-all group font-sans text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <History className="w-4 h-4 text-[#F59E0B]" />
                    <span>Security Time Machine</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#636366] group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 6. Grounded Evidence Inspector Modal */}
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
                  {activeCitation.control_id} Evidence Inspection
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
                <div className="text-[10px] text-[#636366] uppercase">Configuration Line:</div>
                <div className="px-2.5 py-1 rounded bg-[#080808] text-[#22D3EE] inline-block font-bold">
                  Line {activeCitation.line_number}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-[10px] text-[#636366] uppercase">Verbatim Evidence Snippet:</div>
              <div className="p-3 bg-[#080808] border border-[#1F1F1F] rounded-xl font-mono text-[#EF4444] text-xs overflow-x-auto whitespace-pre">
                {activeCitation.evidence_snippet || "Evidence verified via AST rule match"}
              </div>
            </div>

            <div className="pt-3 border-t border-[#1F1F1F] flex items-center justify-between">
              <Link
                href={`/findings?control=${encodeURIComponent(activeCitation.control_id)}`}
                className="text-xs text-[#3B82F6] hover:underline flex items-center gap-1 font-sans"
                onClick={() => setActiveCitation(null)}
              >
                <span>Open in Evidence Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setActiveCitation(null)}
                className="px-4 py-1.5 rounded-lg bg-[#080808] hover:bg-[#141414] text-[#8E8E93] hover:text-white text-xs transition-colors font-sans"
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

export default function AISecurityBriefingPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[#636366] font-mono">Loading Security Briefing...</div>}>
      <AISecurityBriefingContent />
    </Suspense>
  );
}
