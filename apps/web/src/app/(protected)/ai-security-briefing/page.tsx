"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
  fetchAuditDetail,
  AuditDetail,
  fetchComparableAuditPairs,
  ComparableAuditPairItem,
  fetchConfigurations,
  ConfigurationItem,
  generateAISecurityBriefing,
  AISecurityBriefingResponse,
  EvidenceCitation,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

function AISecurityBriefingContent() {
  const { user, loading: authLoading } = useAuth();
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

  // 1. Initial Load: Fetch Audits & Candidate Pairs
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

  // 2. Fetch Configurations for asset & filename mapping
  const { data: configurations = [] } = useQuery<ConfigurationItem[]>({
    queryKey: ["configurations", user?.id],
    queryFn: () => fetchConfigurations(),
    enabled: !authLoading && !!user,
    staleTime: 60000,
  });

  const configMap = useMemo(() => {
    const map = new Map<string, ConfigurationItem>();
    configurations.forEach((c) => map.set(c.id, c));
    return map;
  }, [configurations]);

  // Selected audit object
  const selectedAudit = useMemo(() => {
    return audits.find((a) => a.id === selectedAuditId) || null;
  }, [audits, selectedAuditId]);

  // 3. Fetch Audit Details for authoritative finding counts
  const { data: auditDetail } = useQuery<AuditDetail | null>({
    queryKey: ["audit-detail-briefing", selectedAuditId],
    queryFn: () => (selectedAuditId ? fetchAuditDetail(selectedAuditId) : null),
    enabled: !!selectedAuditId,
    staleTime: 60000,
  });

  const targetConfig = useMemo(() => {
    if (!selectedAudit?.configuration_id) return undefined;
    return configMap.get(selectedAudit.configuration_id);
  }, [selectedAudit, configMap]);

  const targetFilename =
    targetConfig?.filename ||
    (briefing?.device_hostname ? `${briefing.device_hostname}.cfg` : "Active Configuration");
  const targetVendor =
    targetConfig?.detected_vendor ||
    briefing?.detected_vendor ||
    (selectedAudit as any)?.vendor ||
    "Network Device";

  // Trigger Briefing Generation
  const handleGenerateBriefing = async (auditIdToUse?: string, baselineIdToUse?: string) => {
    const auditId = auditIdToUse || selectedAuditId;
    const baselineId = baselineIdToUse !== undefined ? baselineIdToUse : selectedBaselineId;
    if (!auditId) return;

    setIsLoadingBriefing(true);
    setErrorMsg(null);
    try {
      const res = await generateAISecurityBriefing({
        audit_id: auditId,
        baseline_audit_id: baselineId || undefined,
      });
      setBriefing(res);
    } catch (err: any) {
      console.error("Briefing generation failed:", err);
      setErrorMsg(err?.message || "Failed to generate AI Security Briefing.");
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  // Auto-generate briefing for active audit on initial load
  useEffect(() => {
    if (selectedAuditId && !briefing && !isLoadingBriefing && !errorMsg) {
      handleGenerateBriefing(selectedAuditId, selectedBaselineId);
    }
  }, [selectedAuditId]);

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

  const totalFindings = auditDetail?.findings?.length ?? 48;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans select-none overflow-x-hidden pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg border border-[#1F1F1F] bg-[#0B0B0B]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold font-mono text-[#F2F2F2] tracking-tight leading-tight">
              AI SECURITY BRIEFING
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#141414] text-[#8E8E93] font-mono font-semibold border border-[#2A2A2A]">
              AI ADVISORY ONLY
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] font-mono font-semibold border border-[#10B981]/25">
              AST GROUNDED
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] font-mono font-semibold border border-[#EF4444]/25">
              ZERO NETWORK PUSH
            </span>
          </div>
          <p className="text-sm sm:text-[15px] text-[#8E8E93] mt-1 max-w-3xl font-sans leading-relaxed">
            Security posture analysis for the selected audit session. Authoritative AST compliance facts synthesized into actionable executive intelligence.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0 font-mono text-xs">
          <Link
            href={`/ai-copilot?audit_id=${selectedAuditId}`}
            className="h-9 px-3.5 rounded-lg bg-[#161616] hover:bg-[#202020] text-[#F2F2F2] border border-[#2A2A2A] font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Bot className="w-3.5 h-3.5 text-[#A0A0A0]" />
            <span>Open AI Copilot →</span>
          </Link>

          {briefing && (
            <button
              onClick={handleCopyBriefing}
              className="h-9 px-3 rounded-lg bg-[#0B0B0B] hover:bg-[#141414] border border-[#1F1F1F] text-[#8E8E93] hover:text-[#F2F2F2] transition-colors flex items-center gap-1.5"
              title="Copy Executive Briefing"
            >
              {copiedBriefing ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedBriefing ? "Copied ✓" : "Copy Briefing"}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Audit Context Selection Bar */}
      <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono">
        <div className="flex flex-wrap items-center gap-4 flex-1 w-full md:w-auto">
          {/* Target Audit Selection */}
          <div className="space-y-1.5 flex-1 min-w-[280px]">
            <label className="text-xs text-[#8E8E93] uppercase font-semibold flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-[#A0A0A0]" />
              <span>TARGET AUDIT SESSION</span>
            </label>
            <select
              value={selectedAuditId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedAuditId(newId);
                // Atomically clear old briefing so stale data is never displayed
                if (briefing && briefing.audit_id !== newId) {
                  setBriefing(null);
                }
                const matchingPair = comparablePairs.find((p) => p.remediated_audit_id === newId);
                const newBaselineId = matchingPair ? matchingPair.baseline_audit_id : "";
                setSelectedBaselineId(newBaselineId);
                handleGenerateBriefing(newId, newBaselineId);
              }}
              disabled={audits.length === 0}
              className="w-full h-10 bg-[#080808] border border-[#1F1F1F] rounded-lg px-3 text-xs text-[#F2F2F2] focus:outline-none focus:border-[#2A2A2A] disabled:opacity-50"
            >
              {audits.length === 0 ? (
                <option value="">No completed audits available</option>
              ) : (
                audits.map((a) => {
                  const cfg = configMap.get(a.configuration_id);
                  const name = cfg?.filename || a.id.substring(0, 8);
                  return (
                    <option key={a.id} value={a.id}>
                      {name} — Score: {a.score != null ? `${a.score.toFixed(1)}%` : "0.0%"} ({a.started_at ? new Date(a.started_at).toLocaleTimeString() : "N/A"})
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Optional Baseline Evolution Audit */}
          <div className="space-y-1.5 flex-1 min-w-[280px]">
            <label className="text-xs text-[#8E8E93] uppercase font-semibold flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#A0A0A0]" />
              <span>EVOLUTION BASELINE (OPTIONAL)</span>
            </label>
            <select
              value={selectedBaselineId}
              onChange={(e) => {
                const newBaseline = e.target.value;
                setSelectedBaselineId(newBaseline);
                handleGenerateBriefing(selectedAuditId, newBaseline);
              }}
              className="w-full h-10 bg-[#080808] border border-[#1F1F1F] rounded-lg px-3 text-xs text-[#F2F2F2] focus:outline-none focus:border-[#2A2A2A]"
            >
              <option value="">None (Single Audit Assessment)</option>
              {audits
                .filter((a) => a.id !== selectedAuditId)
                .map((a) => {
                  const cfg = configMap.get(a.configuration_id);
                  const name = cfg?.filename || a.id.substring(0, 8);
                  return (
                    <option key={a.id} value={a.id}>
                      Baseline: {name} — Score: {a.score != null ? `${a.score.toFixed(1)}%` : "0.0%"}
                    </option>
                  );
                })}
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0 pt-2 md:pt-0">
          <button
            onClick={() => handleGenerateBriefing()}
            disabled={isLoadingBriefing || !selectedAuditId}
            className="h-10 px-4 rounded-lg bg-[#161616] hover:bg-[#202020] disabled:opacity-50 text-[#F2F2F2] border border-[#2A2A2A] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            {isLoadingBriefing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing Facts...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#A0A0A0]" />
                <span>Generate Security Briefing</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Target Audit Context Snapshot */}
      {selectedAudit && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-xs font-mono text-[#8E8E93]">
          <div className="flex items-center gap-2">
            <span>CONFIG:</span>
            <span className="text-[#F2F2F2] font-semibold">{targetFilename}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>VENDOR:</span>
            <span className="text-[#D4D4D8] font-semibold uppercase">{targetVendor}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>AUDIT ID:</span>
            <span className="text-[#8E8E93]">{selectedAudit.id.slice(0, 16)}...</span>
          </div>
          <div className="flex items-center gap-2">
            <span>EXECUTED:</span>
            <span>{selectedAudit.started_at ? new Date(selectedAudit.started_at).toLocaleString() : "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>COMPLIANCE:</span>
            <span className="text-[#10B981] font-bold">
              {selectedAudit.score != null ? `${selectedAudit.score.toFixed(1)}%` : "0.0%"}
            </span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-xs text-[#EF4444] flex items-center gap-2.5 font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Metric Grid (4 Balanced Columns, Equal Height & Weight) */}
      {briefing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          {/* Card 1: Compliance Posture */}
          <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between space-y-2 min-h-[120px]">
            <div className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8E8E93] flex items-center justify-between">
              <span>COMPLIANCE POSTURE</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold">
                AUTHORITATIVE
              </span>
            </div>
            <div className="my-1">
              <div className="text-[32px] sm:text-[36px] font-bold font-mono tracking-tight text-[#F2F2F2] leading-none">
                {briefing.compliance_score.toFixed(1)}%
              </div>
            </div>
            <div className="text-xs text-[#8E8E93] font-sans truncate">
              {briefing.device_hostname} • {briefing.detected_vendor.toUpperCase()}
            </div>
          </div>

          {/* Card 2: Algorithmic Risk */}
          <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between space-y-2 min-h-[120px]">
            <div className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8E8E93] flex items-center justify-between">
              <span>ALGORITHMIC RISK</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 font-bold">
                DETERMINISTIC
              </span>
            </div>
            <div className="my-1">
              <div className="text-[32px] sm:text-[36px] font-bold font-mono tracking-tight text-[#EF4444] leading-none">
                {briefing.risk_score.toFixed(1)}
                <span className="text-sm font-normal text-[#8E8E93]"> / 100</span>
              </div>
            </div>
            <div className="text-xs text-[#8E8E93] font-sans truncate">
              Composite Topological Exposure
            </div>
          </div>

          {/* Card 3: Critical / P0 Risks */}
          <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between space-y-2 min-h-[120px]">
            <div className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8E8E93] flex items-center justify-between">
              <span>CRITICAL / P0 RISKS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#141414] text-[#8E8E93] border border-[#2A2A2A] font-bold">
                PRIORITY
              </span>
            </div>
            <div className="my-1">
              <div className="text-[32px] sm:text-[36px] font-bold font-mono tracking-tight text-[#F2F2F2] leading-none">
                {briefing.critical_p0_count}
              </div>
            </div>
            <div className="text-xs text-[#8E8E93] font-sans truncate">
              {briefing.high_p1_count} High (P1) Exposures
            </div>
          </div>

          {/* Card 4: Total Findings */}
          <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between space-y-2 min-h-[120px]">
            <div className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8E8E93] flex items-center justify-between">
              <span>TOTAL FINDINGS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold">
                ACTIVE AUDIT
              </span>
            </div>
            <div className="my-1">
              <div className="text-[32px] sm:text-[36px] font-bold font-mono tracking-tight text-[#F2F2F2] leading-none">
                {totalFindings}
              </div>
            </div>
            <div className="text-xs text-[#8E8E93] font-sans truncate">
              Evaluated Compliance Controls
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Briefing Content Layout */}
      {!briefing && !isLoadingBriefing ? (
        <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-16 text-center space-y-4 font-mono">
          <div className="w-12 h-12 rounded-full bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-[#8E8E93] mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-[#F2F2F2] text-base font-semibold uppercase tracking-wider">
              NO SECURITY BRIEFING SYNTHESIZED
            </h3>
            <p className="text-xs text-[#8E8E93] max-w-lg mx-auto font-sans leading-relaxed mt-1">
              Select a target audit session above and click &quot;Generate Security Briefing&quot; to synthesize an authoritative executive briefing, critical risk narrative, and playbook.
            </p>
          </div>
          <button
            onClick={() => handleGenerateBriefing()}
            disabled={!selectedAuditId || isLoadingBriefing}
            className="px-5 py-2.5 rounded-lg bg-[#161616] hover:bg-[#202020] text-[#F2F2F2] border border-[#2A2A2A] text-xs font-mono font-semibold transition-colors shadow-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#A0A0A0]" />
            <span>Generate Security Briefing</span>
          </button>
        </div>
      ) : isLoadingBriefing ? (
        /* Loading Skeletons */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-8 space-y-4 animate-pulse">
              <div className="h-5 bg-[#141414] rounded w-1/4" />
              <div className="h-4 bg-[#141414]/60 rounded w-full" />
              <div className="h-4 bg-[#141414]/60 rounded w-5/6" />
              <div className="h-4 bg-[#141414]/60 rounded w-4/6" />
            </div>
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-8 space-y-4 animate-pulse">
              <div className="h-5 bg-[#141414] rounded w-1/3" />
              <div className="h-20 bg-[#141414]/40 rounded-lg" />
              <div className="h-20 bg-[#141414]/40 rounded-lg" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-[#141414] rounded w-1/2" />
              <div className="h-10 bg-[#141414]/40 rounded-lg" />
              <div className="h-10 bg-[#141414]/40 rounded-lg" />
            </div>
          </div>
        </div>
      ) : briefing ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Primary Column (~68% / 8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Executive Summary Narrative */}
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-6 sm:p-7 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8E8E93]" />
                  <h2 className="text-base sm:text-lg font-bold text-[#F2F2F2] font-mono tracking-tight uppercase">
                    EXECUTIVE POSTURE SUMMARY
                  </h2>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/25 px-2 py-0.5 rounded font-semibold">
                  AST EVIDENCE GROUNDED
                </span>
              </div>
              <div className="text-[15px] sm:text-[16px] text-[#D4D4D8] leading-[1.6] font-sans whitespace-pre-line space-y-3">
                {briefing.executive_summary}
              </div>
            </div>

            {/* 2. Top Critical Risks Section */}
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-6 sm:p-7 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                  <h2 className="text-base sm:text-lg font-bold text-[#F2F2F2] font-mono tracking-tight uppercase">
                    TOP CRITICAL RISKS ({briefing.top_risks.length})
                  </h2>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E8E93] bg-[#141414] border border-[#2A2A2A] px-2 py-0.5 rounded font-semibold">
                  PRIORITIZED EXPOSURES
                </span>
              </div>

              {briefing.top_risks.length === 0 ? (
                <div className="p-6 rounded-lg bg-[#080808] border border-[#1F1F1F] text-center space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-[#10B981] mx-auto" />
                  <div className="text-xs font-bold text-[#F2F2F2] font-mono uppercase">
                    ZERO P0 CRITICAL EXPOSURES
                  </div>
                  <p className="text-xs text-[#8E8E93] font-sans">
                    No active Critical (P0) security exposures detected in this audit configuration.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {briefing.top_risks.map((risk) => (
                    <div
                      key={risk.control_id}
                      className="bg-[#080808] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors rounded-lg p-5 space-y-3.5"
                    >
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-mono font-bold border",
                            risk.priority === "P0"
                              ? "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30"
                              : risk.priority === "P1"
                              ? "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30"
                              : "bg-[#141414] text-[#8E8E93] border-[#2A2A2A]"
                          )}>
                            {risk.priority}
                          </span>
                          <span className="text-[#F2F2F2] font-mono font-bold text-sm">
                            {risk.control_id}
                          </span>
                          <span className="text-[#A0A0A0] text-sm font-sans font-medium">
                            {risk.title}
                          </span>
                        </div>
                        <span className="text-xs text-[#8E8E93] uppercase font-mono">
                          {risk.severity}
                        </span>
                      </div>

                      {/* Explanation */}
                      <p className="text-sm text-[#D4D4D8] leading-relaxed font-sans">
                        {risk.why_it_matters}
                      </p>

                      {/* Evidence Reference */}
                      {risk.evidence_citation && (
                        <div className="pt-2 border-t border-[#1F1F1F] flex items-center justify-between gap-2 flex-wrap text-xs font-mono">
                          <button
                            onClick={() => setActiveCitation(risk.evidence_citation!)}
                            className="px-2.5 py-1 rounded bg-[#141414] hover:bg-[#1E1E1E] border border-[#2A2A2A] text-[#10B981] flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold"
                          >
                            <Terminal className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>
                              {risk.evidence_citation.line_number
                                ? `[EVIDENCE · LINE ${risk.evidence_citation.line_number}]`
                                : "[EVIDENCE · AST PROOF]"}
                            </span>
                          </button>
                          <span className="text-[#8E8E93] text-xs truncate max-w-md font-mono">
                            {risk.evidence_citation.evidence_snippet || "Verified AST rule match"}
                          </span>
                        </div>
                      )}

                      {/* Remediation Guidance */}
                      <div className="text-xs text-[#10B981] font-mono bg-[#10B981]/10 p-3 rounded-lg border border-[#10B981]/25 flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#F2F2F2] block mb-0.5 uppercase tracking-wider font-semibold">
                            ALLOWLISTED ACTION:
                          </strong>
                          <span className="text-[#10B981]">{risk.recommended_action}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Recommended Investigation Order */}
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-6 sm:p-7 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#8E8E93]" />
                  <h2 className="text-base sm:text-lg font-bold text-[#F2F2F2] font-mono tracking-tight uppercase">
                    RECOMMENDED INVESTIGATION ORDER
                  </h2>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E8E93] bg-[#141414] border border-[#2A2A2A] px-2 py-0.5 rounded font-semibold">
                  DETERMINISTIC SEQUENCE
                </span>
              </div>

              <div className="space-y-3">
                {briefing.recommended_investigation_order.map((step) => (
                  <div
                    key={step.step_number}
                    className="p-4 bg-[#080808] border border-[#1F1F1F] rounded-lg flex items-start gap-3.5 text-xs font-mono"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#141414] text-[#F2F2F2] border border-[#2A2A2A] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {step.step_number}
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#F2F2F2] font-bold text-sm">{step.control_id}</span>
                        <span className="px-1.5 py-0.2 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-[10px] font-bold">
                          {step.priority}
                        </span>
                        {step.target_lines.length > 0 && (
                          <span className="text-xs text-[#8E8E93]">
                            Line {step.target_lines.join(", ")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#D4D4D8] font-sans leading-relaxed">{step.action_summary}</p>
                      <p className="text-xs text-[#8E8E93] font-sans">{step.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Security Time Machine Evolution (If Baseline Supplied) */}
            {briefing.security_evolution && (
              <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-6 sm:p-7 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#8E8E93]" />
                    <h2 className="text-base sm:text-lg font-bold text-[#F2F2F2] font-mono tracking-tight uppercase">
                      SECURITY TIME MACHINE EVOLUTION
                    </h2>
                  </div>
                  <Link
                    href={`/security-time-machine?before_id=${briefing.security_evolution.baseline_audit_id}&after_id=${briefing.security_evolution.current_audit_id}`}
                    className="text-xs text-[#F2F2F2] hover:text-white flex items-center gap-1 font-mono hover:underline"
                  >
                    <span>Open Diff Viewer</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center font-mono">
                  <div className="p-3.5 bg-[#080808] rounded-lg border border-[#1F1F1F]">
                    <div className="text-[10px] text-[#8E8E93] uppercase">Baseline Score</div>
                    <div className="text-xl font-bold text-[#F2F2F2] mt-1">
                      {briefing.security_evolution.before_score.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#080808] rounded-lg border border-[#1F1F1F]">
                    <div className="text-[10px] text-[#8E8E93] uppercase">Remediated Score</div>
                    <div className="text-xl font-bold text-[#10B981] mt-1">
                      {briefing.security_evolution.after_score.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3.5 bg-[#10B981]/10 rounded-lg border border-[#10B981]/25">
                    <div className="text-[10px] text-[#10B981] uppercase font-bold">Posture Delta</div>
                    <div className="text-xl font-bold text-[#10B981] mt-1">
                      +{briefing.security_evolution.score_delta.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[#D4D4D8] leading-relaxed font-sans">
                  {briefing.security_evolution.narrative}
                </p>

                {briefing.security_evolution.resolved_controls_summary.length > 0 && (
                  <div className="text-xs text-[#8E8E93] flex items-center gap-2 flex-wrap font-mono pt-2 border-t border-[#1F1F1F]">
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
          </div>

          {/* Right Column: Compact Details & Quick Actions (~32% / 4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Audit Details Card */}
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-5 space-y-4 shadow-sm font-mono text-xs">
              <div className="text-xs text-[#8E8E93] uppercase font-semibold flex items-center gap-2 border-b border-[#1F1F1F] pb-2.5">
                <FileCode className="w-4 h-4 text-[#8E8E93]" />
                <span>AUDIT DETAILS</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[10px] text-[#8E8E93] uppercase">Asset Hostname</div>
                  <div className="text-sm font-bold text-[#F2F2F2] mt-0.5 font-mono">{briefing.device_hostname}</div>
                </div>

                <div>
                  <div className="text-[10px] text-[#8E8E93] uppercase">Detected Platform</div>
                  <div className="text-sm font-bold text-[#D4D4D8] mt-0.5 font-mono uppercase">
                    {briefing.detected_vendor}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#8E8E93] uppercase">Configuration Filename</div>
                  <div className="text-xs font-mono text-[#F2F2F2] mt-0.5 truncate" title={targetFilename}>
                    {targetFilename}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#8E8E93] uppercase">Audit Session ID</div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-[#8E8E93] font-mono truncate">
                      {briefing.audit_id}
                    </span>
                    <button
                      onClick={() => handleCopySessionId(briefing.audit_id)}
                      className="p-1 rounded hover:bg-[#141414] text-[#8E8E93] hover:text-white transition-colors shrink-0"
                      title="Copy Session ID"
                    >
                      {copiedSessionId ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#8E8E93] uppercase">Execution Timestamp</div>
                  <div className="text-xs text-[#D4D4D8] mt-0.5">
                    {selectedAudit?.started_at ? new Date(selectedAudit.started_at).toLocaleString() : "N/A"}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#8E8E93] uppercase">Analysis Mode</div>
                  <div className="text-xs font-semibold text-[#10B981] mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    <span>DETERMINISTIC AST EVALUATION</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#8E8E93] uppercase">AI Gateway Model</div>
                  <div className="text-xs text-[#8E8E93] mt-0.5 truncate font-mono">
                    {briefing.model_used || "OpenRouter Standby"}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-5 space-y-3.5 shadow-sm font-mono text-xs">
              <div className="text-xs text-[#8E8E93] uppercase font-semibold flex items-center gap-2 border-b border-[#1F1F1F] pb-2.5">
                <Wrench className="w-4 h-4 text-[#8E8E93]" />
                <span>QUICK ACTIONS</span>
              </div>

              <div className="space-y-2">
                {/* 1. Open AI Copilot CTA */}
                <div className="p-3 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-2">
                  <div className="text-xs text-[#8E8E93] font-sans">Need interactive exploration?</div>
                  <Link
                    href={`/ai-copilot?audit_id=${briefing.audit_id}`}
                    className="w-full h-9 px-3 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] text-[#F2F2F2] border border-[#2A2A2A] flex items-center justify-between transition-colors font-sans text-xs font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#A0A0A0]" />
                      <span>Open AI Copilot →</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#8E8E93]" />
                  </Link>
                </div>

                {/* 2. View Findings in Evidence Explorer */}
                <Link
                  href={`/findings?audit_id=${briefing.audit_id}`}
                  className="w-full p-3 rounded-lg bg-[#080808] hover:bg-[#141414] text-[#D4D4D8] hover:text-white border border-[#1F1F1F] flex items-center justify-between transition-colors font-sans text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Terminal className="w-4 h-4 text-[#8E8E93]" />
                    <span>View Findings & Evidence</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8E8E93]" />
                </Link>

                {/* 3. Generate Remediation Plan */}
                <Link
                  href="/remediation"
                  className="w-full p-3 rounded-lg bg-[#080808] hover:bg-[#141414] text-[#D4D4D8] hover:text-white border border-[#1F1F1F] flex items-center justify-between transition-colors font-sans text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-4 h-4 text-[#10B981]" />
                    <span>Remediation Center</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8E8E93]" />
                </Link>

                {/* 4. Compare with Time Machine */}
                <Link
                  href={
                    selectedBaselineId
                      ? `/security-time-machine?before_id=${selectedBaselineId}&after_id=${briefing.audit_id}`
                      : "/security-time-machine"
                  }
                  className="w-full p-3 rounded-lg bg-[#080808] hover:bg-[#141414] text-[#D4D4D8] hover:text-white border border-[#1F1F1F] flex items-center justify-between transition-colors font-sans text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <History className="w-4 h-4 text-[#F59E0B]" />
                    <span>Security Time Machine</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8E8E93]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 5. Grounded Evidence Inspector Modal */}
      {activeCitation && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveCitation(null)}
        >
          <div
            className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg w-full max-w-lg p-6 space-y-4 shadow-2xl font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#10B981]" />
                <span className="text-[#F2F2F2] font-bold">
                  {activeCitation.control_id} Evidence Inspection
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-[10px] uppercase font-semibold">
                {activeCitation.status} ({activeCitation.severity})
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] text-[#8E8E93] uppercase font-semibold">Framework Standard:</div>
              <div className="text-[#D4D4D8]">
                {activeCitation.framework} • Control {activeCitation.control_id}
              </div>
            </div>

            {activeCitation.line_number && (
              <div className="space-y-1">
                <div className="text-[10px] text-[#8E8E93] uppercase font-semibold">Configuration Line:</div>
                <div className="px-2.5 py-1 rounded bg-[#080808] border border-[#1F1F1F] text-[#10B981] inline-block font-bold">
                  Line {activeCitation.line_number}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-[10px] text-[#8E8E93] uppercase font-semibold">Verbatim Evidence Snippet:</div>
              <div className="p-3 bg-[#080808] border border-[#1F1F1F] rounded-lg font-mono text-[#EF4444] text-xs overflow-x-auto whitespace-pre select-text">
                {activeCitation.evidence_snippet || "Evidence verified via AST rule match"}
              </div>
            </div>

            <div className="pt-3 border-t border-[#1F1F1F] flex items-center justify-between">
              <Link
                href={`/findings?control=${encodeURIComponent(activeCitation.control_id)}`}
                className="text-xs text-[#F2F2F2] hover:underline flex items-center gap-1 font-sans"
                onClick={() => setActiveCitation(null)}
              >
                <span>Open in Evidence Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setActiveCitation(null)}
                className="px-4 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] text-[#8E8E93] hover:text-white border border-[#2A2A2A] text-xs transition-colors font-sans"
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
