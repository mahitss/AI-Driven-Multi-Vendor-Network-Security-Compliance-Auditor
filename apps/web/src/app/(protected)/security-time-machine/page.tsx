"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  GitCompare,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  FileCode,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronRight,
  ChevronDown,
  Terminal,
  ExternalLink,
  Info,
  Lock,
} from "lucide-react";
import {
  fetchAuditComparison,
  fetchComparableAuditPairs,
  fetchAudits,
  fetchConfigurations,
  AuditComparisonResponse,
  ComparableAuditPairItem,
  ControlTransitionItem,
  AuditItem,
  ConfigurationItem,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

type ActiveTab = "diff" | "transitions" | "risk" | "timeline" | "traceability";
type TransitionFilter = "ALL" | "RESOLVED" | "REGRESSED" | "UNCHANGED_FAIL" | "UNCHANGED_PASS";

function SecurityTimeMachineContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const paramBeforeId = searchParams.get("before_id") || searchParams.get("before");
  const paramAfterId = searchParams.get("after_id") || searchParams.get("after");

  const [selectedPairKey, setSelectedPairKey] = useState<string>("");
  const [beforeAuditId, setBeforeAuditId] = useState<string>(paramBeforeId || "");
  const [afterAuditId, setAfterAuditId] = useState<string>(paramAfterId || "");
  const [activeTab, setActiveTab] = useState<ActiveTab>("diff");
  const [transitionFilter, setTransitionFilter] = useState<TransitionFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  // 1. Fetch available completed audits
  const { data: audits = [], isLoading: auditsLoading } = useQuery<AuditItem[]>({
    queryKey: ["audits", "all", user?.id],
    queryFn: () => fetchAudits(),
    enabled: !authLoading && !!user,
  });

  // 2. Fetch comparable pairs
  const { data: pairs = [], isLoading: pairsLoading } = useQuery<ComparableAuditPairItem[]>({
    queryKey: ["audits", "comparable-pairs", user?.id],
    queryFn: fetchComparableAuditPairs,
    enabled: !authLoading && !!user,
  });

  // 3. Fetch configurations for metadata mapping
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

  // Automatically select the best pair on initial load
  useEffect(() => {
    if (pairsLoading || auditsLoading) return;

    if (paramBeforeId && paramAfterId) {
      setBeforeAuditId(paramBeforeId);
      setAfterAuditId(paramAfterId);
      setSelectedPairKey(`${paramBeforeId}:${paramAfterId}`);
      return;
    }

    if (pairs.length > 0 && !beforeAuditId && !afterAuditId) {
      const firstPair = pairs[0];
      setSelectedPairKey(`${firstPair.baseline_audit_id}:${firstPair.remediated_audit_id}`);
      setBeforeAuditId(firstPair.baseline_audit_id);
      setAfterAuditId(firstPair.remediated_audit_id);
    } else if (audits.length >= 2 && !beforeAuditId && !afterAuditId) {
      const sorted = [...audits].sort(
        (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      );
      setBeforeAuditId(sorted[0].id);
      setAfterAuditId(sorted[sorted.length - 1].id);
    }
  }, [pairs, pairsLoading, audits, auditsLoading, beforeAuditId, afterAuditId, paramBeforeId, paramAfterId]);

  // Handle pair preset change
  const handlePairChange = (key: string) => {
    setSelectedPairKey(key);
    if (!key) return;
    const [bId, aId] = key.split(":");
    if (bId && aId) {
      setBeforeAuditId(bId);
      setAfterAuditId(aId);
    }
  };

  // 4. Fetch comparison data
  const {
    data: comparison,
    isLoading: comparisonLoading,
    isError,
    error,
    refetch,
  } = useQuery<AuditComparisonResponse>({
    queryKey: ["audit-comparison", beforeAuditId, afterAuditId],
    queryFn: () => fetchAuditComparison(beforeAuditId, afterAuditId),
    enabled: Boolean(beforeAuditId && afterAuditId && beforeAuditId !== afterAuditId),
  });

  // Selected audit entities
  const beforeAudit = useMemo(() => audits.find((a) => a.id === beforeAuditId), [audits, beforeAuditId]);
  const afterAudit = useMemo(() => audits.find((a) => a.id === afterAuditId), [audits, afterAuditId]);

  const beforeConfig = useMemo(() => {
    if (!beforeAudit?.configuration_id) return undefined;
    return configMap.get(beforeAudit.configuration_id);
  }, [beforeAudit, configMap]);

  const afterConfig = useMemo(() => {
    if (!afterAudit?.configuration_id) return undefined;
    return configMap.get(afterAudit.configuration_id);
  }, [afterAudit, configMap]);

  const beforeFilename = beforeConfig?.filename || (comparison?.device_name ? `${comparison.device_name}.cfg` : "Baseline Configuration");
  const beforeVendor = beforeConfig?.detected_vendor || comparison?.vendor || "Network Device";

  const afterFilename = afterConfig?.filename || (comparison?.device_name ? `${comparison.device_name}_hardened.cfg` : "Remediated Configuration");
  const afterVendor = afterConfig?.detected_vendor || comparison?.vendor || "Network Device";

  // Filtered transitions
  const filteredTransitions = useMemo(() => {
    if (!comparison?.transitions) return [];
    return comparison.transitions.filter((item) => {
      const matchesFilter =
        transitionFilter === "ALL" ||
        (transitionFilter === "RESOLVED" && item.transition_type === "RESOLVED") ||
        (transitionFilter === "REGRESSED" && item.transition_type === "REGRESSED") ||
        (transitionFilter === "UNCHANGED_FAIL" && item.transition_type === "UNCHANGED_FAIL") ||
        (transitionFilter === "UNCHANGED_PASS" && item.transition_type === "UNCHANGED_PASS");

      const matchesSearch =
        !searchQuery.trim() ||
        item.control_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.explanation && item.explanation.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesFilter && matchesSearch;
    });
  }, [comparison, transitionFilter, searchQuery]);

  const selectedTransition = useMemo(() => {
    if (!comparison?.transitions || !selectedControlId) return null;
    return comparison.transitions.find((t) => t.control_id === selectedControlId) || null;
  }, [comparison, selectedControlId]);

  const deltas = comparison?.deltas;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans select-none overflow-x-hidden pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg border border-[#1F1F1F] bg-[#0B0B0B]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold font-mono text-[#F2F2F2] tracking-tight leading-tight">
              SECURITY TIME MACHINE
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#141414] text-[#8E8E93] font-mono font-semibold border border-[#2A2A2A]">
              v2.0 DELTA ENGINE
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] font-mono font-semibold border border-[#10B981]/25">
              AST GROUNDED
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] font-mono font-semibold border border-[#EF4444]/25">
              ZERO NETWORK PUSH
            </span>
          </div>
          <p className="text-sm sm:text-[15px] text-[#8E8E93] mt-1 max-w-3xl font-sans leading-relaxed">
            Replay network security posture evolution across audit baselines. Quantify deterministic risk reduction, track control transitions, and verify hardening diffs.
          </p>
        </div>

        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center shrink-0 font-mono text-xs">
          {pairs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8E8E93] hidden sm:inline">Preset:</span>
              <select
                value={selectedPairKey}
                onChange={(e) => handlePairChange(e.target.value)}
                className="h-9 bg-[#080808] border border-[#1F1F1F] text-xs text-[#F2F2F2] rounded-lg px-3 focus:outline-none focus:border-[#2A2A2A]"
              >
                <option value="">Custom Pair Selection</option>
                {pairs.map((p, idx) => (
                  <option
                    key={idx}
                    value={`${p.baseline_audit_id}:${p.remediated_audit_id}`}
                  >
                    {p.device_name} ({p.score_delta >= 0 ? `+${p.score_delta}%` : `${p.score_delta}%`})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => refetch()}
            disabled={comparisonLoading}
            className="h-9 px-3.5 bg-[#161616] hover:bg-[#202020] border border-[#2A2A2A] text-xs text-[#F2F2F2] rounded-lg transition-colors font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50"
            title="Re-compute Delta"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", comparisonLoading && "animate-spin text-[#10B981]")} />
            <span>Re-compute Delta</span>
          </button>
        </div>
      </div>

      {/* 2. Audit Selection & Comparison Identity Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-5 font-mono">
        {/* Baseline Audit (BEFORE) */}
        <div className="md:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-[#8E8E93] flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span>BASELINE AUDIT (BEFORE)</span>
            </label>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25 font-bold">
              PRE-REMEDIATION
            </span>
          </div>

          <select
            value={beforeAuditId}
            onChange={(e) => setBeforeAuditId(e.target.value)}
            className="w-full h-10 bg-[#080808] border border-[#1F1F1F] text-xs text-[#F2F2F2] rounded-lg px-3 focus:outline-none focus:border-[#2A2A2A] font-mono"
          >
            <option value="">Select Baseline Audit...</option>
            {audits.map((a) => {
              const c = configMap.get(a.configuration_id);
              const name = c?.filename || a.id.substring(0, 8);
              return (
                <option key={a.id} value={a.id}>
                  {name} — Score: {a.score != null ? `${a.score.toFixed(1)}%` : "N/A"} ({a.started_at ? new Date(a.started_at).toLocaleTimeString() : "N/A"})
                </option>
              );
            })}
          </select>

          {beforeAudit && (
            <div className="p-3 rounded-lg bg-[#080808] border border-[#1F1F1F] text-xs space-y-1.5 text-[#8E8E93]">
              <div className="flex items-center justify-between">
                <span>Configuration:</span>
                <span className="text-[#F2F2F2] font-mono truncate max-w-[220px]" title={beforeFilename}>
                  {beforeFilename}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Vendor Platform:</span>
                <span className="text-[#D4D4D8] font-mono font-semibold uppercase">{beforeVendor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Audit Session ID:</span>
                <span className="text-[#8E8E93] font-mono">{beforeAudit.id.slice(0, 16)}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Execution Time:</span>
                <span>{beforeAudit.started_at ? new Date(beforeAudit.started_at).toLocaleString() : "N/A"}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-[#1F1F1F]">
                <span className="font-semibold text-[#8E8E93]">Baseline Score:</span>
                <span className="text-[#EF4444] font-bold font-mono text-sm">
                  {beforeAudit.score != null ? `${beforeAudit.score.toFixed(1)}%` : "N/A"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Transition Indicator */}
        <div className="md:col-span-2 flex flex-col items-center justify-center py-2 space-y-1">
          <div className="p-3 rounded-full bg-[#080808] border border-[#1F1F1F] text-[#8E8E93]">
            <ArrowRight className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#8E8E93] font-bold text-center">
            RE-AUDIT DELTA
          </span>
          <span className="text-[10px] text-[#666666] font-mono text-center">
            AST Simulation
          </span>
        </div>

        {/* Remediated Audit (AFTER) */}
        <div className="md:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-[#8E8E93] flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span>REMEDIATED AUDIT (AFTER)</span>
            </label>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 font-bold">
              POST-REMEDIATION
            </span>
          </div>

          <select
            value={afterAuditId}
            onChange={(e) => setAfterAuditId(e.target.value)}
            className="w-full h-10 bg-[#080808] border border-[#1F1F1F] text-xs text-[#F2F2F2] rounded-lg px-3 focus:outline-none focus:border-[#2A2A2A] font-mono"
          >
            <option value="">Select Remediated Audit...</option>
            {audits.map((a) => {
              const c = configMap.get(a.configuration_id);
              const name = c?.filename || a.id.substring(0, 8);
              return (
                <option key={a.id} value={a.id}>
                  {name} — Score: {a.score != null ? `${a.score.toFixed(1)}%` : "N/A"} ({a.started_at ? new Date(a.started_at).toLocaleTimeString() : "N/A"})
                </option>
              );
            })}
          </select>

          {afterAudit && (
            <div className="p-3 rounded-lg bg-[#080808] border border-[#1F1F1F] text-xs space-y-1.5 text-[#8E8E93]">
              <div className="flex items-center justify-between">
                <span>Configuration:</span>
                <span className="text-[#F2F2F2] font-mono truncate max-w-[220px]" title={afterFilename}>
                  {afterFilename}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Vendor Platform:</span>
                <span className="text-[#D4D4D8] font-mono font-semibold uppercase">{afterVendor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Audit Session ID:</span>
                <span className="text-[#8E8E93] font-mono">{afterAudit.id.slice(0, 16)}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Execution Time:</span>
                <span>{afterAudit.started_at ? new Date(afterAudit.started_at).toLocaleString() : "N/A"}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-[#1F1F1F]">
                <span className="font-semibold text-[#8E8E93]">Remediated Score:</span>
                <span className="text-[#10B981] font-bold font-mono text-sm">
                  {afterAudit.score != null ? `${afterAudit.score.toFixed(1)}%` : "N/A"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Same-Asset vs Cross-Vendor Notice */}
      {comparison && !comparison.is_compatible && (
        <div className="flex items-start gap-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg p-3.5 text-xs text-[#F59E0B] font-mono">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider">CROSS-VENDOR BENCHMARK COMPARISON: </span>
            <span className="text-[#F59E0B]/90 font-sans">
              {comparison.compatibility_notes || "Comparing configurations across different network platforms. Metrics reflect normalized cross-vendor benchmark alignment rather than single-asset remediation evolution."}
            </span>
          </div>
        </div>
      )}
      {comparison && comparison.is_compatible && (
        <div className="flex items-start gap-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg p-3.5 text-xs text-[#10B981] font-mono">
          <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider">VERIFIED SAME-ASSET REMEDIATION EVOLUTION: </span>
            <span className="text-[#10B981]/90 font-sans">
              Comparing baseline and remediated audits for the same device configuration. Deltas represent genuine evolutionary hardening and resolved security exposures.
            </span>
          </div>
        </div>
      )}

      {/* 4. 5-Stage Evolution Pipeline Sequence */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-lg bg-[#080808] border border-[#1F1F1F] text-xs font-mono">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
          <span className="w-4 h-4 rounded-full bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-[10px] font-bold text-[#A0A0A0]">1</span>
          <div className="truncate">
            <span className="text-[10px] text-[#666666] block leading-none">CONFIG</span>
            <span className="text-[#F2F2F2] text-xs font-semibold">BASELINE</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
          <span className="w-4 h-4 rounded-full bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-[10px] font-bold text-[#A0A0A0]">2</span>
          <div className="truncate">
            <span className="text-[10px] text-[#666666] block leading-none">PARSER</span>
            <span className="text-[#F2F2F2] text-xs font-semibold">ANALYZE</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#F59E0B]/5 border border-[#F59E0B]/25">
          <span className="w-4 h-4 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 flex items-center justify-center text-[10px] font-bold text-[#F59E0B]">3</span>
          <div className="truncate">
            <span className="text-[10px] text-[#F59E0B]/80 block leading-none">CATALOG</span>
            <span className="text-[#F59E0B] text-xs font-semibold">REMEDIATION</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
          <span className="w-4 h-4 rounded-full bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-[10px] font-bold text-[#A0A0A0]">4</span>
          <div className="truncate">
            <span className="text-[10px] text-[#666666] block leading-none">SIMULATION</span>
            <span className="text-[#F2F2F2] text-xs font-semibold">RE-AUDIT</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#10B981]/5 border border-[#10B981]/25">
          <span className="w-4 h-4 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[10px] font-bold text-[#10B981]">5</span>
          <div className="truncate">
            <span className="text-[10px] text-[#10B981]/80 block leading-none">DELTA</span>
            <span className="text-[#10B981] text-xs font-semibold">VERIFIED</span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-4 text-sm text-[#EF4444] flex items-center gap-3">
          <XCircle className="h-5 w-5 text-[#EF4444] shrink-0" />
          <div>
            <p className="font-semibold font-mono text-xs">Comparison Engine Error</p>
            <p className="text-xs text-[#8E8E93] mt-0.5 font-sans">
              {(error as Error)?.message || "Failed to compare selected audits. Ensure both audits are COMPLETED."}
            </p>
          </div>
        </div>
      )}

      {/* Insufficient audits notice */}
      {audits.length < 2 && !auditsLoading && (
        <div className="p-8 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-center space-y-3 font-mono">
          <div className="w-10 h-10 rounded-full bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-[#8E8E93] mx-auto">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#F2F2F2] uppercase tracking-wider">
              NO COMPARABLE AUDIT PAIR AVAILABLE
            </div>
            <p className="text-xs text-[#8E8E93] mt-1 max-w-md mx-auto font-sans leading-relaxed">
              At least two distinct audit sessions are required to evaluate security drift and remediation impact. Run another audit session to compare baselines.
            </p>
          </div>
          <Link
            href="/configurations?mode=ingest"
            className="inline-block px-3.5 py-1.5 rounded-lg bg-[#161616] hover:bg-[#202020] text-[#F2F2F2] border border-[#2A2A2A] text-xs font-semibold font-mono transition-colors"
          >
            Ingest Configuration →
          </Link>
        </div>
      )}

      {/* Self-comparison notice */}
      {beforeAuditId && afterAuditId && beforeAuditId === afterAuditId && (
        <div className="p-4 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#F59E0B] flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Please select two distinct audit sessions. Comparing an audit to itself is invalid.</span>
        </div>
      )}

      {/* Loading state */}
      {comparisonLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg" />
          ))}
        </div>
      )}

      {/* 5. Balanced Before / After Score Cards (4 Columns) */}
      {comparison && deltas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          {/* Card 1: Compliance Posture Delta */}
          <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between space-y-2 min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8E8E93]">
                COMPLIANCE POSTURE
              </span>
              <ShieldCheck className="h-4 w-4 text-[#10B981]" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm font-mono text-[#8E8E93] line-through">
                {deltas.before_score.toFixed(1)}%
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-[#666666]" />
              <span className="text-[32px] sm:text-[36px] font-bold font-mono tracking-tight text-[#F2F2F2] leading-none">
                {deltas.after_score.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#1F1F1F] text-xs">
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-mono font-bold inline-flex items-center gap-1",
                  deltas.score_delta >= 0
                    ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                    : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                )}
              >
                {deltas.score_delta >= 0 ? `+${deltas.score_delta.toFixed(1)} pts` : `${deltas.score_delta.toFixed(1)} pts`}
              </span>
              <span className="text-[11px] text-[#666666] font-sans">Deterministic Delta</span>
            </div>
          </div>

          {/* Card 2: Risk Score Delta */}
          <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between space-y-2 min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8E8E93]">
                RISK SCORE
              </span>
              <Flame className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm font-mono text-[#8E8E93] line-through">
                {deltas.before_risk_score.toFixed(1)}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-[#666666]" />
              <span className="text-[32px] sm:text-[36px] font-bold font-mono tracking-tight text-[#F2F2F2] leading-none">
                {deltas.after_risk_score.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#1F1F1F] text-xs">
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-mono font-bold inline-flex items-center gap-1",
                  deltas.risk_delta <= 0
                    ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                    : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                )}
              >
                {deltas.risk_delta <= 0 ? `${deltas.risk_delta.toFixed(1)} pts` : `+${deltas.risk_delta.toFixed(1)} pts`}
              </span>
              <span className="text-[11px] text-[#666666] font-sans">Total Fleet Risk</span>
            </div>
          </div>

          {/* Card 3: Failed Controls Delta */}
          <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between space-y-2 min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8E8E93]">
                FAILED CONTROLS
              </span>
              <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm font-mono text-[#8E8E93] line-through">
                {deltas.before_failed_count}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-[#666666]" />
              <span className="text-[32px] sm:text-[36px] font-bold font-mono tracking-tight text-[#F2F2F2] leading-none">
                {deltas.after_failed_count}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#1F1F1F] text-xs">
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-mono font-bold inline-flex items-center gap-1",
                  deltas.failed_delta <= 0
                    ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                    : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                )}
              >
                {deltas.resolved_count} Resolved
              </span>
              {deltas.regressed_count > 0 ? (
                <span className="text-[11px] text-[#EF4444] font-mono font-semibold">
                  {deltas.regressed_count} Regressed
                </span>
              ) : (
                <span className="text-[11px] text-[#666666] font-sans">Policy Conformance</span>
              )}
            </div>
          </div>

          {/* Card 4: Critical (P0) Exposures */}
          <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between space-y-2 min-h-[120px]">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold text-[#EF4444]">
                P0 EXPOSURES
              </span>
              <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm font-mono text-[#8E8E93] line-through">
                {deltas.before_priority_counts.p0}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-[#666666]" />
              <span className="text-[32px] sm:text-[36px] font-bold font-mono tracking-tight text-[#F2F2F2] leading-none">
                {deltas.after_priority_counts.p0}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#1F1F1F] text-xs">
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-mono font-bold",
                  deltas.after_priority_counts.p0 === 0
                    ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                    : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                )}
              >
                {deltas.after_priority_counts.p0 === 0 ? "0 ACTIVE P0 ✓" : `${deltas.after_priority_counts.p0} ACTIVE P0`}
              </span>
              <span className="text-[11px] text-[#666666] font-sans">Critical Hardening</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab Navigation */}
      <div className="flex items-center justify-between border-b border-[#1F1F1F] pt-2 font-mono">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("diff")}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2",
              activeTab === "diff"
                ? "bg-[#141414] text-[#F2F2F2] border border-[#2A2A2A] shadow-sm"
                : "text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#121212]"
            )}
          >
            <GitCompare className="h-3.5 w-3.5" />
            <span>Synchronized Diff Viewer</span>
          </button>

          <button
            onClick={() => setActiveTab("transitions")}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2",
              activeTab === "transitions"
                ? "bg-[#141414] text-[#F2F2F2] border border-[#2A2A2A] shadow-sm"
                : "text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#121212]"
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Finding Transition Matrix</span>
            {comparison?.transitions && (
              <span className="px-1.5 py-0.2 bg-[#080808] text-[10px] rounded-full font-mono text-[#8E8E93] border border-[#1F1F1F]">
                {comparison.transitions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("risk")}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2",
              activeTab === "risk"
                ? "bg-[#141414] text-[#F2F2F2] border border-[#2A2A2A] shadow-sm"
                : "text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#121212]"
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Risk Distribution Evolution</span>
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2",
              activeTab === "timeline"
                ? "bg-[#141414] text-[#F2F2F2] border border-[#2A2A2A] shadow-sm"
                : "text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#121212]"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Security Evolution Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab("traceability")}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2",
              activeTab === "traceability"
                ? "bg-[#141414] text-[#F2F2F2] border border-[#2A2A2A] shadow-sm"
                : "text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#121212]"
            )}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Remediation Traceability Playbook</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Synchronized Diff Viewer */}
      {activeTab === "diff" && comparison && (
        <div className="space-y-3 font-mono">
          <div className="flex flex-wrap items-center justify-between text-xs text-[#8E8E93] px-1 gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#10B981]/20 border border-[#10B981]/50" />
                <span>Hardened / Added (+)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#EF4444]/20 border border-[#EF4444]/50" />
                <span>Insecure / Removed (-)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#F59E0B]/20 border border-[#F59E0B]/50" />
                <span>Modified Line (Δ)</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#10B981]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AST Provenance Linked</span>
              </span>
            </div>
            <span className="text-[11px] text-[#666666]">Click any line to inspect governance control</span>
          </div>

          <div className="border border-[#1F1F1F] rounded-lg overflow-hidden bg-[#080808] font-mono text-[13px] shadow-sm">
            {/* Diff Header */}
            <div className="grid grid-cols-2 bg-[#0B0B0B] border-b border-[#1F1F1F] py-2.5 px-4 text-xs text-[#8E8E93] font-semibold tracking-wider uppercase">
              <div className="flex items-center justify-between pr-4 border-r border-[#1F1F1F]">
                <span>BASELINE CONFIGURATION (BEFORE)</span>
                <span className="text-[#8E8E93] text-[11px] font-mono font-normal">{beforeFilename}</span>
              </div>
              <div className="flex items-center justify-between pl-4">
                <span>REMEDIATED CONFIGURATION (AFTER)</span>
                <span className="text-[#10B981] text-[11px] font-mono font-normal">VERIFIED HARDENED</span>
              </div>
            </div>

            {/* Side-by-side lines */}
            <div className="max-h-[640px] overflow-y-auto divide-y divide-[#1F1F1F]/40 select-text">
              {comparison.diff_lines.map((line, idx) => {
                const isModified = line.type === "MODIFIED";
                const isAdded = line.type === "ADDED";
                const isRemoved = line.type === "REMOVED";
                const hasControls = line.associated_control_ids.length > 0;
                const isHighlighted =
                  highlightedLine === line.line_number_before ||
                  highlightedLine === line.line_number_after;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (hasControls) {
                        setSelectedControlId(line.associated_control_ids[0]);
                        setActiveTab("transitions");
                      }
                    }}
                    className={cn(
                      "grid grid-cols-2 transition-colors cursor-pointer group leading-relaxed",
                      isHighlighted && "bg-[#141414]",
                      !isHighlighted && isModified && "bg-[#F59E0B]/5 hover:bg-[#F59E0B]/10",
                      !isHighlighted && isAdded && "bg-[#10B981]/5 hover:bg-[#10B981]/10",
                      !isHighlighted && isRemoved && "bg-[#EF4444]/5 hover:bg-[#EF4444]/10",
                      !isHighlighted && !isModified && !isAdded && !isRemoved && "hover:bg-[#0B0B0B]"
                    )}
                  >
                    {/* Left Pane (Before) */}
                    <div className="flex items-start border-r border-[#1F1F1F] pr-2 py-1">
                      <span className="w-12 text-right pr-3 select-none text-[#666666] text-xs font-mono shrink-0">
                        {line.line_number_before ?? ""}
                      </span>
                      <div className="flex-1 overflow-x-auto whitespace-pre font-mono text-[13px]">
                        <span
                          className={cn(
                            isRemoved && "text-[#EF4444] bg-[#EF4444]/20 px-1 rounded font-medium",
                            isModified && "text-[#F59E0B] bg-[#F59E0B]/15 px-1 rounded",
                            !isRemoved && !isModified && "text-[#8E8E93]"
                          )}
                        >
                          {line.content_before ?? ""}
                        </span>
                        {hasControls && line.content_before && (
                          <div className="inline-flex gap-1 ml-2">
                            {line.associated_control_ids.map((cid) => (
                              <span
                                key={cid}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-[#141414] text-[#D4D4D8] border border-[#2A2A2A] font-mono"
                              >
                                {cid}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Pane (After) */}
                    <div className="flex items-start pl-2 py-1">
                      <span className="w-12 text-right pr-3 select-none text-[#666666] text-xs font-mono shrink-0">
                        {line.line_number_after ?? ""}
                      </span>
                      <div className="flex-1 overflow-x-auto whitespace-pre font-mono text-[13px]">
                        <span
                          className={cn(
                            isAdded && "text-[#10B981] bg-[#10B981]/20 px-1 rounded font-medium",
                            isModified && "text-[#10B981] bg-[#10B981]/15 px-1 rounded",
                            !isAdded && !isModified && "text-[#8E8E93]"
                          )}
                        >
                          {line.content_after ?? ""}
                        </span>
                        {hasControls && line.content_after && (
                          <div className="inline-flex gap-1 ml-2">
                            {line.associated_control_ids.map((cid) => (
                              <span
                                key={cid}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-mono font-bold"
                              >
                                {cid} ✓
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Finding Transition Matrix */}
      {activeTab === "transitions" && comparison && (
        <div className="space-y-4 font-mono">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0B0B] border border-[#1F1F1F] p-3.5 rounded-lg">
            <div className="flex items-center gap-2 flex-wrap">
              {(
                [
                  { id: "ALL", label: "ALL", count: comparison.transitions.length },
                  { id: "RESOLVED", label: "RESOLVED", count: deltas?.resolved_count || 0 },
                  { id: "REGRESSED", label: "REGRESSED", count: deltas?.regressed_count || 0 },
                  { id: "UNCHANGED_FAIL", label: "UNCHANGED FAIL", count: deltas?.unchanged_fail_count || 0 },
                  { id: "UNCHANGED_PASS", label: "UNCHANGED PASS", count: deltas?.unchanged_pass_count || 0 },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTransitionFilter(f.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
                    transitionFilter === f.id
                      ? "bg-[#141414] text-[#F2F2F2] border border-[#2A2A2A]"
                      : "text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#121212]"
                  )}
                >
                  <span>{f.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#080808] border border-[#1F1F1F] font-mono">
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
              <input
                type="text"
                placeholder="Search controls or evidence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 bg-[#080808] border border-[#1F1F1F] rounded-lg pl-9 pr-3 text-xs text-[#F2F2F2] placeholder-[#666666] focus:outline-none focus:border-[#2A2A2A] font-sans"
              />
            </div>
          </div>

          {/* Transition Table */}
          <div className="border border-[#1F1F1F] rounded-lg overflow-hidden bg-[#080808]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0B0B0B] border-b border-[#1F1F1F] text-[11px] text-[#8E8E93] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Control ID</th>
                    <th className="py-3 px-3">Framework</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">Before Status</th>
                    <th className="py-3 px-3">After Status</th>
                    <th className="py-3 px-3">Transition Verdict</th>
                    <th className="py-3 px-4">Line Evidence & Explanation</th>
                    <th className="py-3 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]/40">
                  {filteredTransitions.map((item) => {
                    const isResolved = item.transition_type === "RESOLVED";
                    const isRegressed = item.transition_type === "REGRESSED";
                    const isUnchangedFail = item.transition_type === "UNCHANGED_FAIL";
                    const isSelected = selectedControlId === item.control_id;

                    return (
                      <tr
                        key={item.control_id}
                        onClick={() =>
                          setSelectedControlId(isSelected ? null : item.control_id)
                        }
                        className={cn(
                          "transition-colors cursor-pointer",
                          isSelected && "bg-[#141414]",
                          !isSelected && isResolved && "hover:bg-[#10B981]/5",
                          !isSelected && isRegressed && "hover:bg-[#EF4444]/10 bg-[#EF4444]/5",
                          !isSelected && !isResolved && !isRegressed && "hover:bg-[#0B0B0B]"
                        )}
                      >
                        <td className="py-3 px-4 font-bold text-[#F2F2F2]">
                          <span>{item.control_id}</span>
                        </td>
                        <td className="py-3 px-3 text-[#8E8E93]">{item.framework}</td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                              item.severity === "CRITICAL" && "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30",
                              item.severity === "HIGH" && "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30",
                              item.severity === "MEDIUM" && "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30",
                              item.severity === "LOW" && "bg-[#8E8E93]/20 text-[#8E8E93] border border-[#8E8E93]/30"
                            )}
                          >
                            {item.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-semibold",
                              item.before_status === "PASS" && "bg-[#10B981]/15 text-[#10B981]",
                              item.before_status === "FAIL" && "bg-[#EF4444]/15 text-[#EF4444]",
                              item.before_status !== "PASS" && item.before_status !== "FAIL" && "bg-[#0B0B0B] text-[#8E8E93]"
                            )}
                          >
                            {item.before_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-semibold",
                              item.after_status === "PASS" && "bg-[#10B981]/15 text-[#10B981]",
                              item.after_status === "FAIL" && "bg-[#EF4444]/15 text-[#EF4444]",
                              item.after_status !== "PASS" && item.after_status !== "FAIL" && "bg-[#0B0B0B] text-[#8E8E93]"
                            )}
                          >
                            {item.after_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {isResolved && (
                            <span className="inline-flex items-center gap-1 text-[#10B981] bg-[#10B981]/15 border border-[#10B981]/30 px-2 py-0.5 rounded text-[11px] font-bold">
                              <CheckCircle2 className="h-3 w-3" />
                              RESOLVED
                            </span>
                          )}
                          {isRegressed && (
                            <span className="inline-flex items-center gap-1 text-[#EF4444] bg-[#EF4444]/20 border border-[#EF4444]/40 px-2 py-0.5 rounded text-[11px] font-bold">
                              <AlertTriangle className="h-3 w-3" />
                              REGRESSED
                            </span>
                          )}
                          {isUnchangedFail && (
                            <span className="text-[#8E8E93] bg-[#0B0B0B] border border-[#1F1F1F] px-2 py-0.5 rounded text-[10px]">
                              UNCHANGED (FAIL)
                            </span>
                          )}
                          {!isResolved && !isRegressed && !isUnchangedFail && (
                            <span className="text-[#8E8E93] text-[10px]">
                              {item.transition_type}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <p className="text-[#F2F2F2] font-sans text-xs truncate font-medium">
                            {item.title}
                          </p>
                          <p className="text-[#8E8E93] text-[11px] font-mono mt-0.5 truncate">
                            {item.explanation}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 text-[#8E8E93] inline-block transition-transform",
                              isSelected && "rotate-90 text-[#F2F2F2]"
                            )}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Control Detail Drawer */}
          {selectedTransition && (
            <div className="bg-[#0B0B0B] border border-[#2A2A2A] rounded-lg p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#161616] text-[#D4D4D8] font-mono font-bold text-xs rounded border border-[#262626]">
                    {selectedTransition.control_id}
                  </span>
                  <h3 className="text-sm font-semibold text-[#F2F2F2] font-sans">{selectedTransition.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedControlId(null)}
                  className="text-xs text-[#8E8E93] hover:text-[#F2F2F2]"
                >
                  Close ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                {/* Before Evidence */}
                <div className="bg-[#080808] border border-[#1F1F1F] rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[#8E8E93]">
                    <span className="text-[11px] uppercase font-bold text-[#EF4444]">
                      Baseline Evidence (BEFORE)
                    </span>
                    <span>Status: {selectedTransition.before_status}</span>
                  </div>
                  <pre className="bg-[#0B0B0B] p-2.5 rounded border border-[#1F1F1F] text-[#EF4444] overflow-x-auto text-[11px] whitespace-pre select-text">
                    {selectedTransition.before_evidence || "No matching explicit configuration rule (Implicit Default)"}
                  </pre>
                  {selectedTransition.before_line && (
                    <span className="text-[10px] text-[#8E8E93]">
                      Located at baseline line #{selectedTransition.before_line}
                    </span>
                  )}
                </div>

                {/* After Evidence */}
                <div className="bg-[#080808] border border-[#1F1F1F] rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[#8E8E93]">
                    <span className="text-[11px] uppercase font-bold text-[#10B981]">
                      Remediated Evidence (AFTER)
                    </span>
                    <span>Status: {selectedTransition.after_status}</span>
                  </div>
                  <pre className="bg-[#0B0B0B] p-2.5 rounded border border-[#1F1F1F] text-[#10B981] overflow-x-auto text-[11px] whitespace-pre select-text">
                    {selectedTransition.after_evidence || "Hardened compliant syntax verified"}
                  </pre>
                  {selectedTransition.after_line && (
                    <span className="text-[10px] text-[#8E8E93]">
                      Located at remediated line #{selectedTransition.after_line}
                    </span>
                  )}
                </div>
              </div>

              {/* Allowlisted Remediation Applied */}
              {selectedTransition.remediation_applied && (
                <div className="bg-[#080808] border border-[#10B981]/30 rounded-lg p-3.5 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-[#10B981] font-bold text-[11px] uppercase">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5" />
                      Allowlisted Remediation Applied
                    </span>
                    <span className="text-[10px] text-[#8E8E93]">Read-Only Advisory</span>
                  </div>
                  <pre className="bg-[#0B0B0B] p-2.5 rounded border border-[#1F1F1F] text-[#10B981] overflow-x-auto text-[11px] whitespace-pre select-text">
                    {selectedTransition.remediation_applied}
                  </pre>
                </div>
              )}

              {/* Deterministic Explanation */}
              <div className="bg-[#080808] p-3 rounded-lg text-xs text-[#8E8E93] font-sans border border-[#1F1F1F]">
                <span className="font-semibold text-[#F2F2F2]">Deterministic Verification: </span>
                {selectedTransition.explanation}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Risk Intelligence Evolution */}
      {activeTab === "risk" && comparison && deltas && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
          {/* Risk Gauge Comparison */}
          <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#F2F2F2] flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#F59E0B]" />
              <span>Deterministic Fleet Risk Score Evolution</span>
            </h3>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-[#EF4444]">Baseline Audit Risk</span>
                  <span className="text-[#F2F2F2] font-bold">{deltas.before_risk_score}/100</span>
                </div>
                <div className="w-full bg-[#080808] rounded-full h-2.5 overflow-hidden border border-[#1F1F1F]">
                  <div
                    className="bg-[#EF4444] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, deltas.before_risk_score)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-[#10B981]">Remediated Audit Risk</span>
                  <span className="text-[#F2F2F2] font-bold">{deltas.after_risk_score}/100</span>
                </div>
                <div className="w-full bg-[#080808] rounded-full h-2.5 overflow-hidden border border-[#1F1F1F]">
                  <div
                    className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, deltas.after_risk_score)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#080808] border border-[#1F1F1F] rounded-lg p-3 text-xs text-[#8E8E93] font-mono mt-4 flex items-center justify-between">
              <span>Risk Reduction Delta:</span>
              <span className="text-[#10B981] font-bold">
                {deltas.risk_delta <= 0 ? `${deltas.risk_delta} points` : `+${deltas.risk_delta} points`}
              </span>
            </div>
          </div>

          {/* P0-P3 Distribution Comparison */}
          <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#F2F2F2] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
              <span>Priority Exposure Distribution (P0 - P3)</span>
            </h3>

            <div className="space-y-2.5 pt-1 font-mono text-xs">
              {(
                [
                  { label: "P0 (Critical)", before: deltas.before_priority_counts.p0, after: deltas.after_priority_counts.p0, color: "text-[#EF4444]" },
                  { label: "P1 (High)", before: deltas.before_priority_counts.p1, after: deltas.after_priority_counts.p1, color: "text-[#F59E0B]" },
                  { label: "P2 (Medium)", before: deltas.before_priority_counts.p2, after: deltas.after_priority_counts.p2, color: "text-[#10B981]" },
                  { label: "P3 (Low)", before: deltas.before_priority_counts.p3, after: deltas.after_priority_counts.p3, color: "text-[#8E8E93]" },
                ] as const
              ).map((p) => {
                const diff = p.after - p.before;
                return (
                  <div key={p.label} className="bg-[#080808] border border-[#1F1F1F] rounded-lg p-2.5 flex items-center justify-between">
                    <span className={cn("font-semibold", p.color)}>{p.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#8E8E93]">{p.before}</span>
                      <ArrowRight className="h-3 w-3 text-[#666666]" />
                      <span className="text-[#F2F2F2] font-bold">{p.after}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold",
                          diff <= 0 ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#EF4444]/20 text-[#EF4444]"
                        )}
                      >
                        {diff <= 0 ? `${diff}` : `+${diff}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Security Evolution Timeline */}
      {activeTab === "timeline" && comparison && (
        <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#F2F2F2] tracking-tight font-sans">Configuration Security Evolution Pipeline</h3>
            <p className="text-xs text-[#8E8E93] mt-1 font-sans">
              Git-style chronological trace of configuration state, audit evaluations, and verified remediations.
            </p>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1F1F1F]">
            {comparison.timeline.map((evt, idx) => (
              <div key={evt.id || idx} className="relative group">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#080808] border-2 border-[#10B981] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                </div>

                <div className="bg-[#080808] border border-[#1F1F1F] rounded-lg p-4 space-y-2 hover:border-[#2A2A2A] transition-colors font-mono text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#F2F2F2] uppercase tracking-wider">
                        {evt.title}
                      </span>
                      {evt.badge && (
                        <span className="px-2 py-0.5 bg-[#141414] text-[#D4D4D8] text-[10px] font-mono rounded border border-[#2A2A2A]">
                          {evt.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-[#8E8E93]">
                      {new Date(evt.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-[#A0A0A0] font-sans">{evt.description}</p>

                  {(evt.configuration_hash || evt.audit_id) && (
                    <div className="flex items-center gap-4 text-[10px] font-mono text-[#8E8E93] pt-1.5 border-t border-[#1F1F1F]">
                      {evt.configuration_hash && (
                        <span>SHA-256: {evt.configuration_hash.substring(0, 16)}...</span>
                      )}
                      {evt.audit_id && (
                        <span>Audit ID: {evt.audit_id.substring(0, 8)}...</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Remediation Traceability Playbook */}
      {activeTab === "traceability" && comparison && (
        <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#F2F2F2] tracking-tight font-sans">
              Deterministic Remediation Traceability Engine
            </h3>
            <p className="text-xs text-[#8E8E93] mt-1 font-sans">
              End-to-end mathematical proof linking non-compliant AST facts to allowlisted remediation directives and verified post-remediation verdicts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-mono">
            {/* Step 1 */}
            <div className="bg-[#080808] border border-[#1F1F1F] rounded-lg p-4 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-bold">1. Finding Identified</span>
              <p className="text-[#F2F2F2] font-semibold">Insecure Baseline AST Fact</p>
              <p className="text-[#8E8E93] text-[11px] font-sans leading-relaxed">
                Deterministic rule flagged non-compliant AST state (e.g. SSHv1, plaintext telnet, unencrypted secrets).
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#080808] border border-[#1F1F1F] rounded-lg p-4 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#8B5CF6] font-bold">2. Line Evidence</span>
              <p className="text-[#F2F2F2] font-semibold">Exact AST Proof</p>
              <p className="text-[#8E8E93] text-[11px] font-sans leading-relaxed">
                Source line index and concrete token mapped in configuration inventory.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#080808] border border-[#1F1F1F] rounded-lg p-4 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#F59E0B] font-bold">3. Remediation</span>
              <p className="text-[#F2F2F2] font-semibold">Allowlisted Catalog</p>
              <p className="text-[#8E8E93] text-[11px] font-sans leading-relaxed">
                Zero device write: generates static, verified vendor CLI hardening commands.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-[#080808] border border-[#1F1F1F] rounded-lg p-4 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-bold">4. Modified Config</span>
              <p className="text-[#F2F2F2] font-semibold">Configuration Diff</p>
              <p className="text-[#8E8E93] text-[11px] font-sans leading-relaxed">
                Hardened configuration submitted for re-analysis audit evaluation.
              </p>
            </div>

            {/* Step 5 */}
            <div className="bg-[#080808] border border-[#10B981]/30 rounded-lg p-4 space-y-2 bg-[#10B981]/5">
              <span className="text-[10px] uppercase tracking-wider text-[#10B981] font-bold">5. Verified PASS</span>
              <p className="text-[#F2F2F2] font-semibold">Re-Analysis Proof</p>
              <p className="text-[#8E8E93] text-[11px] font-sans leading-relaxed">
                Deterministic compliance engine confirms 100% compliant state transition.
              </p>
            </div>
          </div>

          {/* Resolved Controls Trace Table */}
          <div className="border border-[#1F1F1F] rounded-lg overflow-hidden bg-[#080808]">
            <div className="bg-[#0B0B0B] px-4 py-3 border-b border-[#1F1F1F] flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-[#F2F2F2]">Verified Remediated Controls ({comparison.resolved_controls_summary.length})</span>
              <span className="text-[11px] font-mono text-[#10B981] font-semibold">FAIL → PASS ✓</span>
            </div>

            <div className="divide-y divide-[#1F1F1F]/40">
              {comparison.transitions
                .filter((t) => t.transition_type === "RESOLVED")
                .map((t) => (
                  <div key={t.control_id} className="p-4 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F2F2F2]">{t.control_id}</span>
                        <span className="text-[#D4D4D8] font-sans font-medium">{t.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold">
                        RESOLVED ✓
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                      <div className="bg-[#0B0B0B] p-2.5 rounded border border-[#EF4444]/20 text-[#EF4444]">
                        <span className="block text-[10px] text-[#8E8E93] uppercase font-bold mb-1">Baseline Token</span>
                        <code>{t.before_evidence || "Insecure default"}</code>
                      </div>
                      <div className="bg-[#0B0B0B] p-2.5 rounded border border-[#10B981]/20 text-[#10B981]">
                        <span className="block text-[10px] text-[#8E8E93] uppercase font-bold mb-1">Hardened Token</span>
                        <code>{t.after_evidence || "Compliant"}</code>
                      </div>
                    </div>

                    {t.remediation_applied && (
                      <div className="bg-[#0B0B0B] p-2.5 rounded border border-[#1F1F1F] text-[#8E8E93] text-[11px]">
                        <span className="block text-[10px] text-[#8E8E93] uppercase font-bold mb-1">Allowlisted Directive</span>
                        <pre className="text-[#10B981] overflow-x-auto whitespace-pre select-text">{t.remediation_applied}</pre>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SecurityTimeMachinePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[#636366] font-mono">Loading Security Time Machine...</div>}>
      <SecurityTimeMachineContent />
    </Suspense>
  );
}
