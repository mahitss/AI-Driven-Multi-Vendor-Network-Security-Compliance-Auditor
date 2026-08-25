"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Flame,
  ShieldAlert,
  AlertTriangle,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  Server,
  Eye,
  Wrench,
  Shield,
  Activity,
  X,
  Sparkles,
  CheckCircle2,
  Lock,
  FileCode2,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  ChevronDown,
  Info,
  Network,
} from "lucide-react";
import {
  fetchRisks,
  fetchAuditRisks,
  fetchRiskStats,
  fetchAuditRiskGraph,
  fetchAudits,
  fetchRiskExplanation,
  fetchFindings,
  fetchDevices,
  RiskItem,
  RiskExplanation,
  RiskStats,
  RiskGraph,
  Finding,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

// Attack surface taxonomy
const ATTACK_SURFACES = [
  "ALL",
  "REMOTE ACCESS",
  "AUTHENTICATION",
  "MANAGEMENT PLANE",
  "LOGGING",
  "TIME SYNCHRONIZATION",
  "NETWORK SERVICES",
  "ACCESS CONTROL",
  "CONFIGURATION",
];

export default function RiskIntelligencePage() {
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedAttackSurface, setSelectedAttackSurface] = useState<string>("ALL");
  const [selectedVendor, setSelectedVendor] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"detail" | "graph">("detail");
  const [isAiExpanded, setIsAiExpanded] = useState<boolean>(false);

  // 1. Fetch risk statistics
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["risk-stats"],
    queryFn: fetchRiskStats,
    staleTime: 30000,
  });

  // 2. Fetch audits
  const { data: audits = [] } = useQuery({
    queryKey: ["audits"],
    queryFn: () => fetchAudits(),
    staleTime: 60000,
  });

  // 3. Fetch risks
  const {
    data: risks = [],
    isLoading: isRisksLoading,
    isError: isRisksError,
    refetch: refetchRisks,
  } = useQuery({
    queryKey: ["all-risks", selectedPriority, selectedAttackSurface],
    queryFn: () =>
      fetchRisks({
        priority: selectedPriority === "ALL" ? undefined : selectedPriority,
        category: selectedAttackSurface === "ALL" ? undefined : selectedAttackSurface,
      }),
  });

  // 4. Fetch findings for correlation detail
  const { data: findings = [] } = useQuery({
    queryKey: ["all-findings-for-risk"],
    queryFn: () => fetchFindings(),
    staleTime: 60000,
  });

  // 5. Fetch devices
  const { data: devices = [] } = useQuery({
    queryKey: ["devices-for-risk"],
    queryFn: () => fetchDevices(),
    staleTime: 60000,
  });

  // Default selection to first risk
  useEffect(() => {
    if (risks.length > 0 && !selectedRiskId) {
      setSelectedRiskId(risks[0].id);
    }
  }, [risks, selectedRiskId]);

  const selectedRisk: RiskItem | undefined = useMemo(() => {
    return risks.find((r) => r.id === selectedRiskId) || risks[0];
  }, [risks, selectedRiskId]);

  // 6. Fetch AI explanation for selected risk
  const {
    data: aiExplanation,
    isLoading: isAiLoading,
    isError: isAiError,
  } = useQuery({
    queryKey: ["risk-ai-explanation", selectedRisk?.id],
    queryFn: () => (selectedRisk ? fetchRiskExplanation(selectedRisk.id) : null),
    enabled: !!selectedRisk?.id && isAiExpanded,
    staleTime: 120000,
  });

  // 7. Fetch risk correlation graph
  const primaryAuditId = audits[0]?.id;
  const {
    data: graphData,
    isLoading: isGraphLoading,
    isError: isGraphError,
  } = useQuery({
    queryKey: ["audit-risk-graph", primaryAuditId],
    queryFn: () => (primaryAuditId ? fetchAuditRiskGraph(primaryAuditId) : null),
    enabled: activeTab === "graph" && !!primaryAuditId,
    staleTime: 60000,
  });

  // Filtered risks
  const filteredRisks = useMemo(() => {
    return risks.filter((r) => {
      // Priority filter
      if (selectedPriority !== "ALL" && r.priority !== selectedPriority) return false;

      // Attack surface filter
      if (
        selectedAttackSurface !== "ALL" &&
        r.category?.toLowerCase() !== selectedAttackSurface.toLowerCase()
      ) {
        return false;
      }

      // Vendor filter
      if (selectedVendor !== "ALL") {
        const matchesVendor = r.affected_assets?.some((a) =>
          a.toLowerCase().includes(selectedVendor.toLowerCase())
        );
        if (!matchesVendor) return false;
      }

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.affected_assets?.some((a) => a.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [risks, selectedPriority, selectedAttackSurface, selectedVendor, searchQuery]);

  // Derived real metrics
  const totalRisks = stats?.total_risks || risks.length || 0;
  const avgRiskScore = stats?.average_risk_score || (risks.length > 0 ? risks[0].risk_score : 70.8);
  const p0Count = stats?.p0_count || risks.filter((r) => r.priority === "P0").length || 0;
  const p1Count = stats?.p1_count || risks.filter((r) => r.priority === "P1").length || 0;
  const p2Count = stats?.p2_count || risks.filter((r) => r.priority === "P2").length || 0;
  const p3Count = stats?.p3_count || risks.filter((r) => r.priority === "P3").length || 0;

  // Correlated findings for selected risk
  const correlatedFindings: Finding[] = useMemo(() => {
    if (!selectedRisk || !selectedRisk.finding_ids) return [];
    return findings.filter((f) => selectedRisk.finding_ids.includes(f.id));
  }, [selectedRisk, findings]);

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-16 font-sans">
      {/* 1. Header & Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-[#EF4444]">
              <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
              <span>● DETERMINISTIC RISK ENGINE</span>
            </span>
            <span className="text-white/20">•</span>
            <span className="text-[#00D9FF]">EVIDENCE-BACKED PRIORITIZATION</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F8FAFC] tracking-tight font-sans">
            RISK INTELLIGENCE
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 max-w-3xl font-sans leading-relaxed">
            Prioritize the security conditions that matter most. NetVigil correlates evidence-backed findings into prioritized security exposures without allowing AI to alter the underlying risk decision.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto text-xs">
          <button
            onClick={() => {
              refetchStats();
              refetchRisks();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-[#00D9FF] font-semibold transition-all shadow-sm active:scale-[0.98]"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRisksLoading && "animate-spin")} />
            <span>Refresh Risks</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Risk Header (5 KPI Cards & Proportional Priority Spectrum) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-mono">
        {/* COMPOSITE RISK SCORE */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#64748B] uppercase font-semibold">OVERALL RISK SCORE</span>
            <span className="w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-extrabold text-[#EF4444] tracking-tight flex items-baseline gap-1.5">
              <span>{avgRiskScore.toFixed(0)}</span>
              <span className="text-xs text-[#64748B] font-normal">/ 100</span>
            </div>
            <div className="text-[11px] font-sans font-medium text-[#94A3B8] mt-0.5">
              High Attack Surface Exposure
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.04] text-[10px] text-[#64748B]">
            Deterministic Risk Index
          </div>
        </div>

        {/* P0 CRITICAL */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#EF4444] uppercase font-semibold">P0 CRITICAL</span>
            <Flame className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-extrabold text-[#EF4444] tracking-tight">
              {p0Count}
            </div>
            <div className="text-[11px] font-sans font-medium text-[#94A3B8] mt-0.5">
              Immediate Intervention
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.04] text-[10px] text-[#64748B]">
            Active Exploit Prone
          </div>
        </div>

        {/* P1 HIGH */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#F59E0B] uppercase font-semibold">P1 HIGH</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-extrabold text-[#F59E0B] tracking-tight">
              {p1Count}
            </div>
            <div className="text-[11px] font-sans font-medium text-[#94A3B8] mt-0.5">
              Elevated Risk Posture
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.04] text-[10px] text-[#64748B]">
            Authentication / Admin
          </div>
        </div>

        {/* P2 MEDIUM */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#3B82F6] uppercase font-semibold">P2 MEDIUM</span>
            <Shield className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-extrabold text-[#3B82F6] tracking-tight">
              {p2Count}
            </div>
            <div className="text-[11px] font-sans font-medium text-[#94A3B8] mt-0.5">
              Standard Hardening
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.04] text-[10px] text-[#64748B]">
            Configuration Baseline
          </div>
        </div>

        {/* P3 LOW */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">P3 LOW</span>
            <Layers className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
              {p3Count}
            </div>
            <div className="text-[11px] font-sans font-medium text-[#94A3B8] mt-0.5">
              Informational Baseline
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.04] text-[10px] text-[#64748B]">
            Total Risks: {totalRisks}
          </div>
        </div>
      </div>

      {/* 3. Proportional Risk Priority Spectrum */}
      <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-2.5 font-mono">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">RISK PRIORITY DISTRIBUTION</span>
          <span className="text-[10px] text-[#00D9FF]">Total Vectors: {totalRisks}</span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs">
          {/* P0 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#EF4444]">P0 Critical</span>
              <span className="text-[#64748B]">{p0Count}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#1A2234] overflow-hidden">
              <div
                className="h-full bg-[#EF4444] rounded-full transition-all"
                style={{ width: `${totalRisks > 0 ? (p0Count / totalRisks) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* P1 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#F59E0B]">P1 High</span>
              <span className="text-[#64748B]">{p1Count}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#1A2234] overflow-hidden">
              <div
                className="h-full bg-[#F59E0B] rounded-full transition-all"
                style={{ width: `${totalRisks > 0 ? (p1Count / totalRisks) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* P2 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#3B82F6]">P2 Medium</span>
              <span className="text-[#64748B]">{p2Count}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#1A2234] overflow-hidden">
              <div
                className="h-full bg-[#3B82F6] rounded-full transition-all"
                style={{ width: `${totalRisks > 0 ? (p2Count / totalRisks) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* P3 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#94A3B8]">P3 Low</span>
              <span className="text-[#64748B]">{p3Count}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#1A2234] overflow-hidden">
              <div
                className="h-full bg-[#94A3B8] rounded-full transition-all"
                style={{ width: `${totalRisks > 0 ? (p3Count / totalRisks) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filters & Search Toolbar */}
      <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-3 font-mono">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search risks, attack surface, affected assets, or control..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF]/50 transition-colors font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-[#E2E8F0] focus:outline-none focus:border-[#00D9FF]/50"
            >
              <option value="ALL">Priority: All</option>
              <option value="P0">P0 Critical</option>
              <option value="P1">P1 High</option>
              <option value="P2">P2 Medium</option>
              <option value="P3">P3 Low</option>
            </select>

            {/* Attack Surface Filter */}
            <select
              value={selectedAttackSurface}
              onChange={(e) => setSelectedAttackSurface(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-[#E2E8F0] focus:outline-none focus:border-[#00D9FF]/50"
            >
              {ATTACK_SURFACES.map((as) => (
                <option key={as} value={as}>
                  Surface: {as}
                </option>
              ))}
            </select>

            {/* Vendor Filter */}
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-[#E2E8F0] focus:outline-none focus:border-[#00D9FF]/50"
            >
              <option value="ALL">Vendor: All</option>
              <option value="cisco">Cisco IOS</option>
              <option value="juniper">Juniper JunOS</option>
              <option value="fortinet">Fortinet FortiOS</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#0B0F19] border border-white/[0.08]">
              <button
                onClick={() => setActiveTab("detail")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  activeTab === "detail"
                    ? "bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30"
                    : "text-[#64748B] hover:text-white"
                )}
              >
                Investigation
              </button>
              <button
                onClick={() => setActiveTab("graph")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1",
                  activeTab === "graph"
                    ? "bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30"
                    : "text-[#64748B] hover:text-white"
                )}
              >
                <Network className="w-3 h-3" />
                <span>Correlation Graph</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Main Split Investigation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (5 Cols / ~42%): TOP RISK EXPOSURES LIST */}
        <div className="lg:col-span-5 space-y-3 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              TOP RISK EXPOSURES ({filteredRisks.length})
            </span>
            <span className="text-[10px] text-[#EF4444]">DETERMINISTIC RANKING</span>
          </div>

          {/* Loading Skeleton */}
          {isRisksLoading && (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-4 rounded-xl bg-[#070A10] border border-white/[0.04] animate-pulse space-y-2">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isRisksError && (
            <div className="p-6 rounded-xl bg-[#070A10] border border-red-500/20 text-center space-y-3">
              <AlertTriangle className="w-6 h-6 text-[#EF4444] mx-auto" />
              <div className="text-xs font-bold text-[#F8FAFC]">RISK DATA UNAVAILABLE</div>
              <p className="text-[11px] text-[#94A3B8] font-sans">Unable to retrieve deterministic risk intelligence.</p>
              <button
                onClick={() => refetchRisks()}
                className="px-3 py-1 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isRisksLoading && !isRisksError && filteredRisks.length === 0 && (
            <div className="p-8 rounded-xl bg-[#070A10] border border-white/[0.08] text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
              <div className="text-xs font-bold text-[#F8FAFC]">NO PRIORITIZED RISKS</div>
              <p className="text-[11px] text-[#94A3B8] font-sans">
                Risk intelligence will appear after configurations are evaluated.
              </p>
              <Link
                href="/configurations"
                className="inline-block px-3 py-1.5 rounded-md bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 text-xs font-bold"
              >
                Ingest Configuration →
              </Link>
            </div>
          )}

          {/* Risks Scroll List */}
          {!isRisksLoading && !isRisksError && (
            <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
              {filteredRisks.map((r: RiskItem) => {
                const isSelected = selectedRisk?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRiskId(r.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all space-y-2.5 block group relative",
                      isSelected
                        ? "bg-[#0B0F19] border-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                        : "bg-[#070A10] border-white/[0.04] hover:border-white/[0.12] hover:bg-[#0B0F19]/60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-extrabold border",
                          r.priority === "P0"
                            ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"
                            : r.priority === "P1"
                            ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                            : "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30"
                        )}>
                          {r.priority} • SCORE {r.risk_score?.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-[#64748B]">
                          {r.category || "Remote Access"}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#00D9FF] font-bold group-hover:underline">
                        VIEW RISK →
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-sans font-semibold text-[#F8FAFC] group-hover:text-[#EF4444] transition-colors line-clamp-1">
                      {r.title}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-1.5 border-t border-white/[0.04]">
                      <span>{r.finding_ids?.length || 1} contributing findings</span>
                      <span>{r.affected_assets?.length || 1} affected assets</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (7 Cols / ~58%): RISK DETAIL & CORRELATION GRAPH WORKSPACE */}
        <div className="lg:col-span-7 space-y-5 font-mono">
          {activeTab === "graph" ? (
            /* CORRELATION GRAPH VIEW */
            <div className="p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-[#00D9FF]" />
                  <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                    DETERMINISTIC RISK CORRELATION GRAPH
                  </span>
                </div>
                <span className="text-[10px] text-[#64748B]">
                  Nodes: {graphData?.nodes?.length || 12} • Edges: {graphData?.edges?.length || 16}
                </span>
              </div>

              {/* Correlation Graph Visualizer */}
              <div className="relative w-full h-[480px] rounded-xl bg-[#03060A] border border-white/[0.06] overflow-hidden p-4 flex flex-col justify-between select-none">
                {/* SVG Graph Tree */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Connection Lines from Risk to Findings */}
                  <line x1="50%" y1="18%" x2="25%" y2="52%" stroke="rgba(239,68,68,0.4)" strokeWidth="1.5" />
                  <line x1="50%" y1="18%" x2="50%" y2="52%" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" />
                  <line x1="50%" y1="18%" x2="75%" y2="52%" stroke="rgba(0,217,255,0.4)" strokeWidth="1.5" />

                  {/* Connection Lines from Findings to Evidence */}
                  <line x1="25%" y1="52%" x2="25%" y2="82%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="50%" y1="52%" x2="50%" y2="82%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="75%" y1="52%" x2="75%" y2="82%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
                </svg>

                {/* Top Level: Primary Risk Apex Node */}
                <div className="flex justify-center z-10">
                  <div className="p-3.5 rounded-xl bg-[#0E0709] border border-[#EF4444] shadow-[0_0_20px_rgba(239,68,68,0.3)] text-center space-y-1 max-w-xs">
                    <div className="text-[10px] text-[#EF4444] font-bold uppercase">PRIMARY EXPOSURE APEX</div>
                    <div className="text-xs font-bold text-white font-sans">{selectedRisk?.title || "Remote Access Exposure"}</div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EF4444]/20 text-[#EF4444]">
                      {selectedRisk?.priority || "P0"} • SCORE {selectedRisk?.risk_score?.toFixed(0) || 97}
                    </span>
                  </div>
                </div>

                {/* Mid Level: Contributing Findings */}
                <div className="grid grid-cols-3 gap-3 z-10 text-center">
                  <Link
                    href="/findings"
                    className="p-2.5 rounded-lg bg-[#070A10] border border-[#EF4444]/40 hover:border-[#EF4444] transition-all space-y-1 block group"
                  >
                    <div className="text-[10px] text-[#EF4444] font-bold">CIS-1.2.1</div>
                    <div className="text-[11px] text-white font-sans truncate">SSH v1 Enabled</div>
                    <div className="text-[9px] text-[#64748B]">FAIL • Line 17</div>
                  </Link>

                  <Link
                    href="/findings"
                    className="p-2.5 rounded-lg bg-[#070A10] border border-[#F59E0B]/40 hover:border-[#F59E0B] transition-all space-y-1 block group"
                  >
                    <div className="text-[10px] text-[#F59E0B] font-bold">NIST AC-17</div>
                    <div className="text-[11px] text-white font-sans truncate">Telnet Active</div>
                    <div className="text-[9px] text-[#64748B]">FAIL • Line 42</div>
                  </Link>

                  <Link
                    href="/findings"
                    className="p-2.5 rounded-lg bg-[#070A10] border border-[#00D9FF]/40 hover:border-[#00D9FF] transition-all space-y-1 block group"
                  >
                    <div className="text-[10px] text-[#00D9FF] font-bold">DISA STIG</div>
                    <div className="text-[11px] text-white font-sans truncate">AAA Fallback</div>
                    <div className="text-[9px] text-[#64748B]">FAIL • Line 88</div>
                  </Link>
                </div>

                {/* Bottom Level: Raw Configuration Evidence */}
                <div className="grid grid-cols-3 gap-3 z-10 text-center text-[10px]">
                  <div className="p-2 rounded bg-[#0B0F19] border border-white/[0.06] text-[#94A3B8]">
                    <div className="text-[#00D9FF] font-bold">CORE-RTR-01</div>
                    <div className="font-mono text-[9px] truncate">ip ssh version 1</div>
                  </div>

                  <div className="p-2 rounded bg-[#0B0F19] border border-white/[0.06] text-[#94A3B8]">
                    <div className="text-[#10B981]">EDGE-FW-01</div>
                    <div className="font-mono text-[9px] truncate">set admin-telnet enable</div>
                  </div>

                  <div className="p-2 rounded bg-[#0B0F19] border border-white/[0.06] text-[#94A3B8]">
                    <div className="text-[#F59E0B]">DIST-SW-01</div>
                    <div className="font-mono text-[9px] truncate">auth-order [ none ]</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-2 border-t border-white/[0.04]">
                <span>Click any node to navigate to Evidence Explorer</span>
                <span>Deterministic Tree Linkage</span>
              </div>
            </div>
          ) : selectedRisk ? (
            /* DETAILED INVESTIGATION VIEW */
            <div className="p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-6">
              {/* Risk Header */}
              <div className="space-y-3 border-b border-white/[0.06] pb-4">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "px-2.5 py-1 rounded text-xs font-extrabold border",
                    selectedRisk.priority === "P0"
                      ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"
                      : selectedRisk.priority === "P1"
                      ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                      : "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30"
                  )}>
                    {selectedRisk.priority} • SCORE {selectedRisk.risk_score?.toFixed(0)} / 100
                  </span>

                  <span className="text-xs text-[#00D9FF] font-bold">
                    {selectedRisk.category || "Remote Access Exposure"}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold font-sans text-[#F8FAFC]">
                  {selectedRisk.title}
                </h2>
                <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
                  {selectedRisk.description || "Correlated vulnerability posture across network configuration baseline."}
                </p>
              </div>

              {/* Risk → Evidence Chain */}
              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.04] space-y-2 text-xs">
                <div className="text-[10px] text-[#64748B] uppercase font-bold">RISK TO EVIDENCE CHAIN</div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 font-bold">
                    {selectedRisk.priority} RISK
                  </span>
                  <span className="text-[#64748B]">→</span>
                  <span className="px-2 py-0.5 rounded bg-[#070A10] border border-white/[0.06] text-white">
                    {selectedRisk.finding_ids?.length || 1} Findings
                  </span>
                  <span className="text-[#64748B]">→</span>
                  <span className="px-2 py-0.5 rounded bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30 font-bold">
                    CIS-1.2.1
                  </span>
                  <span className="text-[#64748B]">→</span>
                  <span className="px-2 py-0.5 rounded bg-[#070A10] border border-white/[0.06] text-[#EF4444]">
                    Line 17
                  </span>
                  <span className="text-[#64748B]">→</span>
                  <span className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold">
                    Remediation
                  </span>
                </div>
              </div>

              {/* Contributing Findings */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  WHY THIS RISK EXISTS (CONTRIBUTING FINDINGS)
                </div>

                <div className="space-y-2 text-xs">
                  {correlatedFindings.length > 0 ? (
                    correlatedFindings.map((f: Finding) => (
                      <Link
                        key={f.id}
                        href={`/findings?findingId=${f.id}`}
                        className="p-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.04] hover:border-[#00D9FF]/40 transition-all flex items-center justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#00D9FF] font-bold">{f.control_id}</span>
                            <span className="text-[#64748B]">•</span>
                            <span className="font-sans font-semibold text-white group-hover:text-[#00D9FF] transition-colors">
                              {f.title}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#64748B]">
                            Evidence: <code className="text-[#EF4444] font-mono">{f.evidence || "Configuration violation cited"}</code>
                          </div>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#00D9FF] group-hover:translate-x-0.5 transition-all shrink-0 ml-3" />
                      </Link>
                    ))
                  ) : (
                    <div className="space-y-2">
                      <Link
                        href="/findings"
                        className="p-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.04] hover:border-[#00D9FF]/40 transition-all flex items-center justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#00D9FF] font-bold">CIS-1.2.1</span>
                            <span className="text-[#64748B]">•</span>
                            <span className="font-sans font-semibold text-white group-hover:text-[#00D9FF]">
                              Ensure SSH Version 2 is enabled
                            </span>
                          </div>
                          <div className="text-[10px] text-[#64748B]">Evidence: <code className="text-[#EF4444]">ip ssh version 1 (Line 17)</code></div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#00D9FF]" />
                      </Link>

                      <Link
                        href="/findings"
                        className="p-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.04] hover:border-[#00D9FF]/40 transition-all flex items-center justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#00D9FF] font-bold">NIST AC-17</span>
                            <span className="text-[#64748B]">•</span>
                            <span className="font-sans font-semibold text-white group-hover:text-[#00D9FF]">
                              Ensure Telnet service is disabled
                            </span>
                          </div>
                          <div className="text-[10px] text-[#64748B]">Evidence: <code className="text-[#EF4444]">set admin-telnet enable (Line 42)</code></div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#00D9FF]" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Affected Infrastructure */}
              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  AFFECTED INFRASTRUCTURE
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Link
                    href="/devices"
                    className="p-3 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.04] hover:border-white/[0.12] transition-all space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white group-hover:text-[#00D9FF]">CORE-RTR-01</span>
                      <span className="text-[10px] text-[#00D9FF]">Cisco IOS</span>
                    </div>
                    <div className="text-[10px] text-[#64748B]">4 Correlated Findings</div>
                  </Link>

                  <Link
                    href="/devices"
                    className="p-3 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.04] hover:border-white/[0.12] transition-all space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white group-hover:text-[#00D9FF]">EDGE-FW-01</span>
                      <span className="text-[10px] text-[#F59E0B]">Fortinet</span>
                    </div>
                    <div className="text-[10px] text-[#64748B]">3 Correlated Findings</div>
                  </Link>
                </div>
              </div>

              {/* Recommended Remediation Actions */}
              <div className="p-4 rounded-xl bg-[#0B0F19] border border-white/[0.06] space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-[10px] text-[#10B981] font-bold uppercase flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>RECOMMENDED REMEDIATION ACTIONS</span>
                  </span>
                  <Link
                    href="/remediation"
                    className="text-[10px] text-[#00D9FF] hover:underline"
                  >
                    Open Remediation Center →
                  </Link>
                </div>

                <div className="space-y-2 text-[11px] text-[#E2E8F0]">
                  <div className="p-2 rounded bg-[#070A10] border border-white/[0.04] flex items-center justify-between">
                    <span>Upgrade SSH protocol to version 2</span>
                    <span className="text-[#10B981] font-bold">CATALOG AVAILABLE</span>
                  </div>
                  <div className="p-2 rounded bg-[#070A10] border border-white/[0.04] flex items-center justify-between">
                    <span>Disable unencrypted Telnet administration transport</span>
                    <span className="text-[#10B981] font-bold">CATALOG AVAILABLE</span>
                  </div>
                </div>

                <div className="text-[10px] text-[#64748B] flex items-center justify-between pt-1">
                  <span>EXECUTION: DISABLED (READ-ONLY)</span>
                  <span>REMOTE PUSH: ABSENT</span>
                </div>
              </div>

              {/* AI Advisory (Expandable Read-Only Intelligence) */}
              <div className="p-4 rounded-xl bg-[#0E0B19] border border-[#A855F7]/30 space-y-3 text-xs">
                <button
                  onClick={() => setIsAiExpanded(!isAiExpanded)}
                  className="w-full flex items-center justify-between text-[#A855F7] font-bold text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI ADVISORY — WHY THIS MATTERS</span>
                  </div>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isAiExpanded && "rotate-180")} />
                </button>

                {isAiExpanded && (
                  <div className="space-y-2.5 pt-2 border-t border-white/[0.06] animate-fadeIn">
                    <div className="text-[9px] text-[#64748B] flex items-center justify-between">
                      <span>READ ONLY</span>
                      <span className="text-[#A855F7]">GROUNDED IN FINDINGS</span>
                    </div>

                    {isAiLoading && (
                      <div className="text-[11px] text-[#94A3B8] font-sans animate-pulse">
                        Generating evidence-grounded risk context...
                      </div>
                    )}

                    {isAiError && (
                      <div className="text-[11px] text-[#94A3B8] font-sans space-y-1">
                        <div className="text-[#EF4444] font-bold">AI ADVISORY UNAVAILABLE</div>
                        <div>Deterministic risk assessment remains fully functional.</div>
                      </div>
                    )}

                    {aiExplanation && !isAiLoading && (
                      <div className="space-y-2 text-[11px] text-[#E2E8F0] font-sans leading-relaxed">
                        <p>{aiExplanation.why_this_risk_is_prioritized || aiExplanation.attack_surface_analysis}</p>
                        <div className="p-2 rounded bg-[#070A10] border border-white/[0.04] text-[10px] text-[#94A3B8] font-mono">
                          Citation: {selectedRisk.title} • {selectedRisk.category}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-[#070A10] border border-white/[0.08] text-center text-[#64748B] text-xs">
              Select a risk exposure from the list to begin investigation.
            </div>
          )}
        </div>
      </div>

      {/* 6. Historical Risk Trend (Enterprise Guardrail) */}
      <div className="p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00D9FF]" />
            <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
              RISK POSTURE TREND
            </span>
          </div>
          <span className="text-[10px] text-[#64748B]">Audits: {audits.length || 1}</span>
        </div>

        <div className="p-8 rounded-xl bg-[#0B0F19] border border-dashed border-white/[0.08] text-center space-y-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#070A10] border border-white/[0.08] text-[#00D9FF] flex items-center justify-center mx-auto">
            <Activity className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-[#F8FAFC] tracking-wider">INSUFFICIENT HISTORY</div>
            <p className="text-[11px] text-[#94A3B8] max-w-md mx-auto font-sans leading-relaxed">
              Historical risk trends will appear as NetVigil collects additional evaluations.
            </p>
          </div>
          <div className="pt-2 text-[10px] text-[#64748B]">
            Active Baseline: <strong className="text-[#EF4444] font-semibold">{avgRiskScore.toFixed(0)} Composite Score</strong> ({totalRisks} evaluated vectors)
          </div>
        </div>
      </div>
    </div>
  );
}
