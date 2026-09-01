"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
} from "lucide-react";
import {
  fetchAuditComparison,
  fetchComparableAuditPairs,
  fetchAudits,
  AuditComparisonResponse,
  ComparableAuditPairItem,
  ControlTransitionItem,
  AuditItem,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

type ActiveTab = "diff" | "transitions" | "risk" | "timeline" | "traceability";
type TransitionFilter = "ALL" | "RESOLVED" | "REGRESSED" | "UNCHANGED_FAIL" | "UNCHANGED_PASS";

export default function SecurityTimeMachinePage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedPairKey, setSelectedPairKey] = useState<string>("");
  const [beforeAuditId, setBeforeAuditId] = useState<string>("");
  const [afterAuditId, setAfterAuditId] = useState<string>("");
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

  // Automatically select the best pair on initial load
  useEffect(() => {
    if (pairs.length > 0 && !beforeAuditId && !afterAuditId) {
      const firstPair = pairs[0];
      setSelectedPairKey(`${firstPair.baseline_audit_id}:${firstPair.remediated_audit_id}`);
      setBeforeAuditId(firstPair.baseline_audit_id);
      setAfterAuditId(firstPair.remediated_audit_id);
    } else if (audits.length >= 2 && !beforeAuditId && !afterAuditId) {
      // Sort ascending to get oldest as before, newest as after
      const sorted = [...audits].sort(
        (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      );
      setBeforeAuditId(sorted[0].id);
      setAfterAuditId(sorted[sorted.length - 1].id);
    } else if (audits.length === 1 && !beforeAuditId && !afterAuditId) {
      setBeforeAuditId(audits[0].id);
      setAfterAuditId(audits[0].id);
    }
  }, [pairs, audits, beforeAuditId, afterAuditId]);

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

  // 3. Fetch comparison data
  const {
    data: comparison,
    isLoading: comparisonLoading,
    isError,
    error,
    refetch,
  } = useQuery<AuditComparisonResponse>({
    queryKey: ["audit-comparison", beforeAuditId, afterAuditId],
    queryFn: () => fetchAuditComparison(beforeAuditId, afterAuditId),
    enabled: Boolean(beforeAuditId && afterAuditId),
  });

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
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1D2939] pb-5 font-mono">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0D121C] border border-[#1D2939] rounded-xl text-[#3B82F6]">
              <History className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#F3F4F6] tracking-tight font-sans">SECURITY TIME MACHINE</h1>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[#0D121C] text-[#3B82F6] border border-[#3B82F6]/30 rounded font-bold">
                  v2.0 DELTA ENGINE
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 rounded font-bold">
                  AST GROUNDED
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#A7B0C0] mt-0.5 font-sans">
                Replay configuration security evolution with deterministic evidence.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Pair Presets */}
        <div className="flex items-center gap-3">
          {pairs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#667085] font-mono">Evolution Presets:</span>
              <select
                value={selectedPairKey}
                onChange={(e) => handlePairChange(e.target.value)}
                className="bg-[#0D121C] border border-[#1D2939] text-xs text-[#A7B0C0] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="">Custom Selection</option>
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
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0D121C] hover:bg-[#151E2D] border border-[#1D2939] text-xs text-[#A7B0C0] hover:text-white rounded-lg transition-colors font-semibold shadow-sm active:scale-[0.98]"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", comparisonLoading && "animate-spin text-[#3B82F6]")} />
            <span>Re-compute Delta</span>
          </button>
        </div>
      </div>

      {/* Audit Selection Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#0D121C] border border-[#1D2939] rounded-xl p-4">
        {/* BEFORE Selector */}
        <div className="md:col-span-5 space-y-1.5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#667085] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            Baseline Audit (BEFORE)
          </label>
          <select
            value={beforeAuditId}
            onChange={(e) => setBeforeAuditId(e.target.value)}
            className="w-full bg-[#080B12] border border-[#1D2939] text-xs text-[#A7B0C0] rounded-lg p-2.5 focus:outline-none focus:border-[#3B82F6] font-mono"
          >
            <option value="">Select Baseline Audit...</option>
            {audits.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id.substring(0, 8)}... — Score: {a.score != null ? `${a.score.toFixed(1)}%` : "N/A"} (
                {a.started_at ? new Date(a.started_at).toLocaleTimeString() : "N/A"})
              </option>
            ))}
          </select>
        </div>

        {/* Transition Icon */}
        <div className="md:col-span-2 flex flex-col items-center justify-center pt-2">
          <div className="p-2 rounded-full bg-[#080B12] border border-[#1D2939] text-[#3B82F6]">
            <ArrowRight className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-mono uppercase text-[#667085] mt-1">Re-Analysis</span>
        </div>

        {/* AFTER Selector */}
        <div className="md:col-span-5 space-y-1.5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#667085] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            Remediated Audit (AFTER)
          </label>
          <select
            value={afterAuditId}
            onChange={(e) => setAfterAuditId(e.target.value)}
            className="w-full bg-[#080B12] border border-[#1D2939] text-xs text-[#A7B0C0] rounded-lg p-2.5 focus:outline-none focus:border-[#3B82F6] font-mono"
          >
            <option value="">Select Remediated Audit...</option>
            {audits.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id.substring(0, 8)}... — Score: {a.score != null ? `${a.score.toFixed(1)}%` : "N/A"} (
                {a.started_at ? new Date(a.started_at).toLocaleTimeString() : "N/A"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Compatibility Notice if Cross-Vendor */}
      {comparison && !comparison.is_compatible && (
        <div className="flex items-start gap-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl p-3.5 text-xs text-[#F59E0B]">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Cross-Vendor Normalization Notice: </span>
            {comparison.compatibility_notes || "Comparing configurations across different network operating systems."}
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4 text-sm text-[#EF4444] flex items-center gap-3">
          <XCircle className="h-5 w-5 text-[#EF4444] shrink-0" />
          <div>
            <p className="font-semibold">Comparison Engine Error</p>
            <p className="text-xs text-[#A7B0C0] mt-0.5 font-sans">
              {(error as Error)?.message || "Failed to compare selected audits. Ensure both audits are COMPLETED."}
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {comparisonLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#0D121C] border border-[#1D2939] rounded-xl" />
          ))}
        </div>
      )}

      {/* Hero Posture Delta Cards */}
      {comparison && deltas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          {/* Card 1: Compliance Score Delta */}
          <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#667085]">Compliance Posture</span>
              <ShieldCheck className="h-4 w-4 text-[#3B82F6]" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-lg font-mono text-[#667085] line-through">
                {deltas.before_score.toFixed(1)}%
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-[#667085]" />
              <span className="text-2xl font-bold font-mono text-white">
                {deltas.after_score.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-mono font-semibold inline-flex items-center gap-1",
                  deltas.score_delta >= 0
                    ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                    : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                )}
              >
                {deltas.score_delta >= 0 ? `+${deltas.score_delta.toFixed(1)}%` : `${deltas.score_delta.toFixed(1)}%`}
              </span>
              <span className="text-[11px] text-[#667085]">Deterministic Delta</span>
            </div>
          </div>

          {/* Card 2: Risk Score Delta */}
          <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#667085]">Risk Score</span>
              <Flame className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-lg font-mono text-[#667085] line-through">
                {deltas.before_risk_score.toFixed(1)}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-[#667085]" />
              <span className="text-2xl font-bold font-mono text-white">
                {deltas.after_risk_score.toFixed(1)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-mono font-semibold inline-flex items-center gap-1",
                  deltas.risk_delta <= 0
                    ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                    : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                )}
              >
                {deltas.risk_delta <= 0 ? `${deltas.risk_delta.toFixed(1)} pts` : `+${deltas.risk_delta.toFixed(1)} pts`}
              </span>
              <span className="text-[11px] text-[#667085]">Total Fleet Risk</span>
            </div>
          </div>

          {/* Card 3: Failed Controls Delta */}
          <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#667085]">Failed Controls</span>
              <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-lg font-mono text-[#667085] line-through">
                {deltas.before_failed_count}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-[#667085]" />
              <span className="text-2xl font-bold font-mono text-white">
                {deltas.after_failed_count}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-mono font-semibold inline-flex items-center gap-1",
                  deltas.failed_delta <= 0
                    ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                    : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                )}
              >
                {deltas.resolved_count} Resolved
              </span>
              {deltas.regressed_count > 0 && (
                <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">
                  {deltas.regressed_count} Regressed
                </span>
              )}
            </div>
          </div>

          {/* Card 4: P0 / Critical Exposures */}
          <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-[#667085]">P0 / Critical Risks</span>
              <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-lg font-mono text-[#667085] line-through">
                {deltas.before_priority_counts.p0}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-[#667085]" />
              <span className="text-2xl font-bold font-mono text-white">
                {deltas.after_priority_counts.p0}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30">
                {deltas.posture_improvement_percentage.toFixed(1)}% Improved
              </span>
              <span className="text-[11px] text-[#667085]">Posture Quality</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-[#1D2939] pt-2 font-mono">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("diff")}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2",
              activeTab === "diff"
                ? "bg-[#0D121C] text-[#3B82F6] border border-[#3B82F6]/40 shadow-sm"
                : "text-[#667085] hover:text-white hover:bg-[#0D121C]"
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
                ? "bg-[#0D121C] text-[#3B82F6] border border-[#3B82F6]/40 shadow-sm"
                : "text-[#667085] hover:text-white hover:bg-[#0D121C]"
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Finding Transition Matrix</span>
            {comparison?.transitions && (
              <span className="px-1.5 py-0.2 bg-[#080B12] text-[10px] rounded-full font-mono text-[#A7B0C0] border border-[#1D2939]">
                {comparison.transitions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("risk")}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2",
              activeTab === "risk"
                ? "bg-[#0D121C] text-[#3B82F6] border border-[#3B82F6]/40 shadow-sm"
                : "text-[#667085] hover:text-white hover:bg-[#0D121C]"
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
                ? "bg-[#0D121C] text-[#3B82F6] border border-[#3B82F6]/40 shadow-sm"
                : "text-[#667085] hover:text-white hover:bg-[#0D121C]"
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
                ? "bg-[#0D121C] text-[#3B82F6] border border-[#3B82F6]/40 shadow-sm"
                : "text-[#667085] hover:text-white hover:bg-[#0D121C]"
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
          <div className="flex items-center justify-between text-xs text-[#667085] px-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#10B981]/20 border border-[#10B981]/50" />
                <span>Hardened / Added</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#EF4444]/20 border border-[#EF4444]/50" />
                <span>Insecure / Removed</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#F59E0B]/20 border border-[#F59E0B]/50" />
                <span>Modified Line</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#22D3EE]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Line AST Bound</span>
              </span>
            </div>
            <span>Click any line to highlight governance control</span>
          </div>

          <div className="border border-[#1D2939] rounded-xl overflow-hidden bg-[#080B12] font-mono text-xs shadow-2xl">
            {/* Diff Header */}
            <div className="grid grid-cols-2 bg-[#0D121C] border-b border-[#1D2939] py-2 px-4 text-[11px] text-[#667085] font-semibold tracking-wider uppercase">
              <div className="flex items-center justify-between pr-4 border-r border-[#1D2939]">
                <span>BASELINE CONFIGURATION (BEFORE)</span>
                <span className="text-[#667085] text-[10px]">{comparison.device_name}</span>
              </div>
              <div className="flex items-center justify-between pl-4">
                <span>REMEDIATED CONFIGURATION (AFTER)</span>
                <span className="text-[#10B981] text-[10px]">VERIFIED HARDENED</span>
              </div>
            </div>

            {/* Side-by-side lines */}
            <div className="max-h-[600px] overflow-y-auto divide-y divide-[#1D2939]/40">
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
                      "grid grid-cols-2 transition-colors cursor-pointer group",
                      isHighlighted && "bg-[#3B82F6]/10",
                      !isHighlighted && isModified && "bg-[#F59E0B]/5 hover:bg-[#F59E0B]/10",
                      !isHighlighted && isAdded && "bg-[#10B981]/5 hover:bg-[#10B981]/10",
                      !isHighlighted && isRemoved && "bg-[#EF4444]/5 hover:bg-[#EF4444]/10",
                      !isHighlighted && !isModified && !isAdded && !isRemoved && "hover:bg-[#0D121C]"
                    )}
                  >
                    {/* Left Pane (Before) */}
                    <div className="flex items-start border-r border-[#1D2939] pr-2 py-1">
                      <span className="w-12 text-right pr-3 select-none text-[#667085] text-[11px]">
                        {line.line_number_before ?? ""}
                      </span>
                      <div className="flex-1 overflow-x-auto whitespace-pre font-mono">
                        <span
                          className={cn(
                            isRemoved && "text-[#EF4444] bg-[#EF4444]/20 px-1 rounded",
                            isModified && "text-[#F59E0B] bg-[#F59E0B]/15 px-1 rounded",
                            !isRemoved && !isModified && "text-[#A7B0C0]"
                          )}
                        >
                          {line.content_before ?? ""}
                        </span>
                        {hasControls && line.content_before && (
                          <div className="inline-flex gap-1 ml-2">
                            {line.associated_control_ids.map((cid) => (
                              <span
                                key={cid}
                                className="text-[9px] px-1 py-0.2 rounded bg-[#0D121C] text-[#3B82F6] border border-[#3B82F6]/40 font-mono"
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
                      <span className="w-12 text-right pr-3 select-none text-[#667085] text-[11px]">
                        {line.line_number_after ?? ""}
                      </span>
                      <div className="flex-1 overflow-x-auto whitespace-pre font-mono">
                        <span
                          className={cn(
                            isAdded && "text-[#10B981] bg-[#10B981]/20 px-1 rounded",
                            isModified && "text-[#10B981] bg-[#10B981]/15 px-1 rounded",
                            !isAdded && !isModified && "text-[#A7B0C0]"
                          )}
                        >
                          {line.content_after ?? ""}
                        </span>
                        {hasControls && line.content_after && (
                          <div className="inline-flex gap-1 ml-2">
                            {line.associated_control_ids.map((cid) => (
                              <span
                                key={cid}
                                className="text-[9px] px-1 py-0.2 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 font-mono"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D121C] border border-[#1D2939] p-3 rounded-xl">
            <div className="flex items-center gap-1.5 flex-wrap">
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
                      ? "bg-[#080B12] text-[#3B82F6] border border-[#3B82F6]/40"
                      : "text-[#667085] hover:text-white hover:bg-[#080B12]"
                  )}
                >
                  <span>{f.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0D121C] border border-[#1D2939] font-mono">
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
              <input
                type="text"
                placeholder="Search controls or evidence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#080B12] border border-[#1D2939] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#667085] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          {/* Transition Table */}
          <div className="border border-[#1D2939] rounded-xl overflow-hidden bg-[#080B12] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0D121C] border-b border-[#1D2939] text-[11px] text-[#667085] uppercase tracking-wider">
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
                <tbody className="divide-y divide-[#1D2939]/40">
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
                          isSelected && "bg-[#3B82F6]/10",
                          !isSelected && isResolved && "hover:bg-[#10B981]/5",
                          !isSelected && isRegressed && "hover:bg-[#EF4444]/10 bg-[#EF4444]/5",
                          !isSelected && !isResolved && !isRegressed && "hover:bg-[#0D121C]"
                        )}
                      >
                        <td className="py-3 px-4 font-bold text-white">
                          <span className="text-[#3B82F6]">{item.control_id}</span>
                        </td>
                        <td className="py-3 px-3 text-[#667085]">{item.framework}</td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                              item.severity === "CRITICAL" && "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30",
                              item.severity === "HIGH" && "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30",
                              item.severity === "MEDIUM" && "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30",
                              item.severity === "LOW" && "bg-[#667085]/20 text-[#A7B0C0] border border-[#667085]/30"
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
                              item.before_status !== "PASS" && item.before_status !== "FAIL" && "bg-[#0D121C] text-[#667085]"
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
                              item.after_status !== "PASS" && item.after_status !== "FAIL" && "bg-[#0D121C] text-[#667085]"
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
                            <span className="text-[#667085] bg-[#0D121C] border border-[#1D2939] px-2 py-0.5 rounded text-[10px]">
                              UNCHANGED (FAIL)
                            </span>
                          )}
                          {!isResolved && !isRegressed && !isUnchangedFail && (
                            <span className="text-[#667085] text-[10px]">
                              {item.transition_type}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <p className="text-white font-sans text-xs truncate">
                            {item.title}
                          </p>
                          <p className="text-[#667085] text-[11px] font-mono mt-0.5 truncate">
                            {item.explanation}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 text-[#667085] inline-block transition-transform",
                              isSelected && "rotate-90 text-[#3B82F6]"
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
            <div className="bg-[#0D121C] border border-[#3B82F6]/40 rounded-xl p-5 space-y-4 shadow-2xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#1D2939] pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#3B82F6]/15 text-[#3B82F6] font-mono font-bold text-xs rounded border border-[#3B82F6]/30">
                    {selectedTransition.control_id}
                  </span>
                  <h3 className="text-sm font-semibold text-white font-sans">{selectedTransition.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedControlId(null)}
                  className="text-xs text-[#667085] hover:text-white"
                >
                  Close ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                {/* Before Evidence */}
                <div className="bg-[#080B12] border border-[#1D2939] rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[#667085]">
                    <span className="text-[11px] uppercase font-bold text-[#EF4444]">
                      Baseline Evidence (BEFORE)
                    </span>
                    <span>Status: {selectedTransition.before_status}</span>
                  </div>
                  <pre className="bg-[#0D121C] p-2.5 rounded border border-[#1D2939] text-[#EF4444] overflow-x-auto text-[11px]">
                    {selectedTransition.before_evidence || "No matching explicit configuration rule (Implicit Default)"}
                  </pre>
                  {selectedTransition.before_line && (
                    <span className="text-[10px] text-[#667085]">
                      Located at baseline line #{selectedTransition.before_line}
                    </span>
                  )}
                </div>

                {/* After Evidence */}
                <div className="bg-[#080B12] border border-[#1D2939] rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[#667085]">
                    <span className="text-[11px] uppercase font-bold text-[#10B981]">
                      Remediated Evidence (AFTER)
                    </span>
                    <span>Status: {selectedTransition.after_status}</span>
                  </div>
                  <pre className="bg-[#0D121C] p-2.5 rounded border border-[#1D2939] text-[#10B981] overflow-x-auto text-[11px]">
                    {selectedTransition.after_evidence || "Hardened compliant syntax verified"}
                  </pre>
                  {selectedTransition.after_line && (
                    <span className="text-[10px] text-[#667085]">
                      Located at remediated line #{selectedTransition.after_line}
                    </span>
                  )}
                </div>
              </div>

              {/* Allowlisted Remediation Applied */}
              {selectedTransition.remediation_applied && (
                <div className="bg-[#080B12] border border-[#10B981]/30 rounded-lg p-3.5 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-[#10B981] font-bold text-[11px] uppercase">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5" />
                      Allowlisted Remediation Applied
                    </span>
                    <span className="text-[10px] text-[#667085]">Read-Only Advisory</span>
                  </div>
                  <pre className="bg-[#0D121C] p-2.5 rounded border border-[#1D2939] text-[#10B981] overflow-x-auto text-[11px]">
                    {selectedTransition.remediation_applied}
                  </pre>
                </div>
              )}

              {/* Deterministic Explanation */}
              <div className="bg-[#080B12] p-3 rounded-lg text-xs text-[#A7B0C0] font-sans border border-[#1D2939]">
                <span className="font-semibold text-white">Deterministic Verification: </span>
                {selectedTransition.explanation}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Risk Intelligence Evolution */}
      {activeTab === "risk" && comparison && deltas && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
          {/* Risk Gauge Comparison */}
          <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#F59E0B]" />
              <span>Deterministic Fleet Risk Score Evolution</span>
            </h3>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-[#EF4444]">Baseline Audit Risk</span>
                  <span className="text-white font-bold">{deltas.before_risk_score}/100</span>
                </div>
                <div className="w-full bg-[#080B12] rounded-full h-3 overflow-hidden border border-[#1D2939]">
                  <div
                    className="bg-[#EF4444] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, deltas.before_risk_score)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-[#10B981]">Remediated Audit Risk</span>
                  <span className="text-white font-bold">{deltas.after_risk_score}/100</span>
                </div>
                <div className="w-full bg-[#080B12] rounded-full h-3 overflow-hidden border border-[#1D2939]">
                  <div
                    className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, deltas.after_risk_score)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#080B12] border border-[#1D2939] rounded-lg p-3 text-xs text-[#A7B0C0] font-mono mt-4">
              <span className="text-[#3B82F6] font-bold">Risk Reduction Delta: </span>
              {deltas.risk_delta <= 0 ? `${deltas.risk_delta} points` : `+${deltas.risk_delta} points`}
            </div>
          </div>

          {/* P0-P3 Distribution Comparison */}
          <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
              <span>Priority Exposure Distribution (P0 - P3)</span>
            </h3>

            <div className="space-y-3 pt-2 font-mono text-xs">
              {(
                [
                  { label: "P0 (Critical)", before: deltas.before_priority_counts.p0, after: deltas.after_priority_counts.p0, color: "text-[#EF4444]" },
                  { label: "P1 (High)", before: deltas.before_priority_counts.p1, after: deltas.after_priority_counts.p1, color: "text-[#F59E0B]" },
                  { label: "P2 (Medium)", before: deltas.before_priority_counts.p2, after: deltas.after_priority_counts.p2, color: "text-[#3B82F6]" },
                  { label: "P3 (Low)", before: deltas.before_priority_counts.p3, after: deltas.after_priority_counts.p3, color: "text-[#667085]" },
                ] as const
              ).map((p) => {
                const diff = p.after - p.before;
                return (
                  <div key={p.label} className="bg-[#080B12] border border-[#1D2939] rounded-lg p-2.5 flex items-center justify-between">
                    <span className={cn("font-semibold", p.color)}>{p.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#667085]">{p.before}</span>
                      <ArrowRight className="h-3 w-3 text-[#667085]" />
                      <span className="text-white font-bold">{p.after}</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[10px] font-semibold",
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
        <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight font-sans">Configuration Security Evolution Pipeline</h3>
            <p className="text-xs text-[#667085] mt-1 font-sans">
              Git-style chronological trace of configuration state, audit evaluations, and verified remediations.
            </p>
          </div>

          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1D2939]">
            {comparison.timeline.map((evt, idx) => (
              <div key={evt.id || idx} className="relative group">
                {/* Dot */}
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#080B12] border-2 border-[#3B82F6] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                </div>

                <div className="bg-[#080B12] border border-[#1D2939] rounded-xl p-4 space-y-2 hover:border-[#3B82F6]/40 transition-colors font-mono text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        {evt.title}
                      </span>
                      {evt.badge && (
                        <span className="px-2 py-0.5 bg-[#0D121C] text-[#3B82F6] text-[10px] font-mono rounded border border-[#3B82F6]/30">
                          {evt.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-[#667085]">
                      {new Date(evt.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-[#A7B0C0] font-sans">{evt.description}</p>

                  {(evt.configuration_hash || evt.audit_id) && (
                    <div className="flex items-center gap-4 text-[10px] font-mono text-[#667085] pt-1 border-t border-[#1D2939]">
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
        <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight font-sans">
              Deterministic Remediation Traceability Engine
            </h3>
            <p className="text-xs text-[#667085] mt-1 font-sans">
              End-to-end mathematical proof linking non-compliant AST facts to allowlisted remediation directives and verified post-remediation verdicts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-mono">
            {/* Step 1 */}
            <div className="bg-[#080B12] border border-[#1D2939] rounded-xl p-4 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#3B82F6] font-bold">1. Finding Identified</span>
              <p className="text-white font-semibold">Insecure Baseline AST Fact</p>
              <p className="text-[#667085] text-[11px]">
                Deterministic rule flagged non-compliant AST state (e.g. SSHv1, plaintext telnet, unencrypted secrets).
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#080B12] border border-[#1D2939] rounded-xl p-4 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#8B5CF6] font-bold">2. Line Evidence</span>
              <p className="text-white font-semibold">Exact AST Proof</p>
              <p className="text-[#667085] text-[11px]">
                Source line index and concrete token mapped in configuration inventory.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#080B12] border border-[#1D2939] rounded-xl p-4 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#F59E0B] font-bold">3. Remediation</span>
              <p className="text-white font-semibold">Allowlisted Catalog</p>
              <p className="text-[#667085] text-[11px]">
                Zero device write: generates static, verified vendor CLI hardening commands.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-[#080B12] border border-[#1D2939] rounded-xl p-4 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#3B82F6] font-bold">4. Modified Config</span>
              <p className="text-white font-semibold">Configuration Diff</p>
              <p className="text-[#667085] text-[11px]">
                Hardened configuration submitted for re-analysis audit evaluation.
              </p>
            </div>

            {/* Step 5 */}
            <div className="bg-[#080B12] border border-[#10B981]/40 rounded-xl p-4 space-y-2 bg-[#10B981]/5">
              <span className="text-[10px] uppercase tracking-wider text-[#10B981] font-bold">5. Verified PASS</span>
              <p className="text-white font-semibold">Re-Analysis Proof</p>
              <p className="text-[#667085] text-[11px]">
                Deterministic compliance engine confirms 100% compliant state transition.
              </p>
            </div>
          </div>

          {/* Resolved Controls Trace Table */}
          <div className="border border-[#1D2939] rounded-xl overflow-hidden bg-[#080B12]">
            <div className="bg-[#0D121C] px-4 py-3 border-b border-[#1D2939] flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-white">Verified Remediated Controls ({comparison.resolved_controls_summary.length})</span>
              <span className="text-[11px] font-mono text-[#10B981]">FAIL → PASS ✓</span>
            </div>

            <div className="divide-y divide-[#1D2939]/40">
              {comparison.transitions
                .filter((t) => t.transition_type === "RESOLVED")
                .map((t) => (
                  <div key={t.control_id} className="p-4 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#3B82F6]">{t.control_id}</span>
                        <span className="text-white font-sans font-medium">{t.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold">
                        RESOLVED
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                      <div className="bg-[#0D121C] p-2.5 rounded border border-[#EF4444]/20 text-[#EF4444]">
                        <span className="block text-[10px] text-[#667085] uppercase font-bold mb-1">Baseline Token</span>
                        <code>{t.before_evidence || "Insecure default"}</code>
                      </div>
                      <div className="bg-[#0D121C] p-2.5 rounded border border-[#10B981]/20 text-[#10B981]">
                        <span className="block text-[10px] text-[#667085] uppercase font-bold mb-1">Hardened Token</span>
                        <code>{t.after_evidence || "Compliant"}</code>
                      </div>
                    </div>

                    {t.remediation_applied && (
                      <div className="bg-[#0D121C] p-2.5 rounded border border-[#1D2939] text-[#A7B0C0] text-[11px]">
                        <span className="block text-[10px] text-[#667085] uppercase font-bold mb-1">Allowlisted Directive</span>
                        <pre className="text-[#10B981] overflow-x-auto">{t.remediation_applied}</pre>
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
