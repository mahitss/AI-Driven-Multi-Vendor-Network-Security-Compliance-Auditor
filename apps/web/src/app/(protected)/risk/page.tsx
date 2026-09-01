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
  AuditItem,
  DeviceItem,
} from "@/lib/api-client";
import { useAuth } from "@/components/providers/AuthProvider";
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
  const { user, loading: authLoading } = useAuth();
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
    queryKey: ["risk-stats", user?.id],
    queryFn: fetchRiskStats,
    enabled: !authLoading,
    staleTime: 30000,
  });

  // 2. Fetch audits
  const { data: audits = [] } = useQuery({
    queryKey: ["audits", user?.id],
    queryFn: () => fetchAudits(),
    enabled: !authLoading,
    staleTime: 60000,
  });

  // 3. Fetch risks
  const {
    data: risks = [],
    isLoading: isRisksLoading,
    isError: isRisksError,
    refetch: refetchRisks,
  } = useQuery({
    queryKey: ["all-risks", selectedPriority, selectedAttackSurface, user?.id],
    queryFn: () =>
      fetchRisks({
        priority: selectedPriority === "ALL" ? undefined : selectedPriority,
        category: selectedAttackSurface === "ALL" ? undefined : selectedAttackSurface,
      }),
    enabled: !authLoading,
  });

  // 4. Fetch findings for correlation detail
  const { data: findings = [] } = useQuery({
    queryKey: ["all-findings-for-risk", user?.id],
    queryFn: () => fetchFindings(),
    enabled: !authLoading,
    staleTime: 60000,
  });

  // 5. Fetch devices
  const { data: devices = [] } = useQuery({
    queryKey: ["devices-for-risk", user?.id],
    queryFn: () => fetchDevices(),
    enabled: !authLoading,
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

  // Derived real metrics from authoritative backend state
  const totalRisks = stats?.total_risks ?? risks.length;
  const avgRiskScore = stats?.average_risk_score ?? (risks.length > 0 ? (risks.reduce((acc, r) => acc + r.risk_score, 0) / risks.length) : 0);
  const p0Count = stats?.p0_count ?? risks.filter((r) => r.priority === "P0").length;
  const p1Count = stats?.p1_count ?? risks.filter((r) => r.priority === "P1").length;
  const p2Count = stats?.p2_count ?? risks.filter((r) => r.priority === "P2").length;
  const p3Count = stats?.p3_count ?? risks.filter((r) => r.priority === "P3").length;

  // Correlated findings for selected risk
  const correlatedFindings: Finding[] = useMemo(() => {
    if (!selectedRisk || !selectedRisk.finding_ids) return [];
    return findings.filter((f) => selectedRisk.finding_ids.includes(f.id));
  }, [selectedRisk, findings]);

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-16 font-sans">
      {/* 1. Header & Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1D2939] pb-5 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-[#EF4444]">
              <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
              <span>● DETERMINISTIC RISK ENGINE</span>
            </span>
            <span className="text-[#667085]">•</span>
            <span className="text-[#3B82F6]">EVIDENCE-BACKED PRIORITIZATION</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F3F4F6] tracking-tight font-sans">
            RISK INTELLIGENCE
          </h1>
          <p className="text-xs sm:text-sm text-[#A7B0C0] mt-1 max-w-3xl font-sans leading-relaxed">
            Prioritize the security conditions that matter most. NetVigil correlates evidence-backed findings into prioritized security exposures without allowing AI to alter the underlying risk decision.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto text-xs">
          <button
            onClick={() => {
              refetchStats();
              refetchRisks();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#0D121C] hover:bg-[#151E2D] border border-[#1D2939] text-[#A7B0C0] hover:text-white font-semibold transition-all shadow-sm active:scale-[0.98]"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRisksLoading && "animate-spin text-[#3B82F6]")} />
            <span>Refresh Risks</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Risk Header (5 KPI Cards & Proportional Priority Spectrum) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-mono">
        {/* COMPOSITE RISK SCORE */}
        <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#667085] uppercase font-semibold">OVERALL RISK SCORE</span>
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-extrabold text-[#EF4444] tracking-tight flex items-baseline gap-1.5">
              <span>{avgRiskScore.toFixed(0)}</span>
              <span className="text-xs text-[#667085] font-normal">/ 100</span>
            </div>
            <div className="text-[11px] font-sans font-medium text-[#A7B0C0] mt-0.5">
              High Attack Surface Exposure
            </div>
          </div>
          <div className="pt-2 border-t border-[#1D2939] text-[10px] text-[#667085]">
            Deterministic Risk Index
          </div>
        </div>

        {/* P0 CRITICAL */}
        <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#EF4444] uppercase font-semibold">P0 CRITICAL</span>
            <Flame className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-extrabold text-[#EF4444] tracking-tight">
              {p0Count}
            </div>
            <div className="text-[11px] font-sans font-medium text-[#A7B0C0] mt-0.5">
              Immediate Intervention
            </div>
          </div>
          <div className="pt-2 border-t border-[#1D2939] text-[10px] text-[#667085]">
            Active Exploit Prone
          </div>
        </div>

        {/* P1 HIGH */}
        <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#F59E0B] uppercase font-semibold">P1 HIGH</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-extrabold text-[#F59E0B] tracking-tight">
              {p1Count}
            </div>
            <div className="text-[11px] font-sans font-medium text-[#A7B0C0] mt-0.5">
              Elevated Risk Posture
            </div>
          </div>
          <div className="pt-2 border-t border-[#1D2939] text-[10px] text-[#667085]">
            Authentication / Admin
          </div>
        </div>

        {/* P2 MEDIUM */}
        <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#3B82F6] uppercase font-semibold">P2 MEDIUM</span>
            <Shield className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-extrabold text-[#3B82F6] tracking-tight">
              {p2Count}
            </div>
            <div className="text-[11px] font-sans font-medium text-[#A7B0C0] mt-0.5">
              Standard Hardening
            </div>
          </div>
          <div className="pt-2 border-t border-[#1D2939] text-[10px] text-[#667085]">
            Configuration Baseline
          </div>
        </div>

        {/* P3 LOW */}
        <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#667085] uppercase font-semibold">P3 LOW</span>
            <Layers className="w-4 h-4 text-[#667085]" />
          </div>
          <div className="my-2.5">
            <div className="text-3xl font-extrabold text-[#F3F4F6] tracking-tight">
              {p3Count}
            </div>
            <div className="text-[11px] font-sans font-medium text-[#A7B0C0] mt-0.5">
              Informational Baseline
            </div>
          </div>
          <div className="pt-2 border-t border-[#1D2939] text-[10px] text-[#667085]">
            Total Risks: {totalRisks}
          </div>
        </div>
      </div>

      {/* 3. Proportional Risk Priority Spectrum */}
      <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-2.5 font-mono">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold text-[#667085] uppercase">RISK PRIORITY DISTRIBUTION</span>
          <span className="text-[10px] text-[#3B82F6]">Total Vectors: {totalRisks}</span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs">
          {/* P0 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#EF4444]">P0 Critical</span>
              <span className="text-[#667085]">{p0Count}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#080B12] overflow-hidden border border-[#1D2939]">
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
              <span className="text-[#667085]">{p1Count}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#080B12] overflow-hidden border border-[#1D2939]">
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
              <span className="text-[#667085]">{p2Count}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#080B12] overflow-hidden border border-[#1D2939]">
              <div
                className="h-full bg-[#3B82F6] rounded-full transition-all"
                style={{ width: `${totalRisks > 0 ? (p2Count / totalRisks) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* P3 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#A7B0C0]">P3 Low</span>
              <span className="text-[#667085]">{p3Count}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#080B12] overflow-hidden border border-[#1D2939]">
              <div
                className="h-full bg-[#667085] rounded-full transition-all"
                style={{ width: `${totalRisks > 0 ? (p3Count / totalRisks) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filters & Search Toolbar */}
      <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-3 font-mono">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085]" />
            <input
              type="text"
              placeholder="Search risks, attack surface, affected assets, or control..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#080B12] border border-[#1D2939] text-xs text-[#F3F4F6] placeholder-[#667085] focus:outline-none focus:border-[#3B82F6]/50 transition-colors font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-white"
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
              className="px-3 py-2 rounded-lg bg-[#080B12] border border-[#1D2939] text-[#A7B0C0] focus:outline-none focus:border-[#3B82F6]/50"
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
              className="px-3 py-2 rounded-lg bg-[#080B12] border border-[#1D2939] text-[#A7B0C0] focus:outline-none focus:border-[#3B82F6]/50"
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
              className="px-3 py-2 rounded-lg bg-[#080B12] border border-[#1D2939] text-[#A7B0C0] focus:outline-none focus:border-[#3B82F6]/50"
            >
              <option value="ALL">Vendor: All</option>
              <option value="cisco">Cisco IOS</option>
              <option value="juniper">Juniper JunOS</option>
              <option value="fortinet">Fortinet FortiOS</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#080B12] border border-[#1D2939]">
              <button
                onClick={() => setActiveTab("detail")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  activeTab === "detail"
                    ? "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30 font-bold"
                    : "text-[#667085] hover:text-white"
                )}
              >
                Investigation
              </button>
              <button
                onClick={() => setActiveTab("graph")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1",
                  activeTab === "graph"
                    ? "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30 font-bold"
                    : "text-[#667085] hover:text-white"
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (5 Cols / ~42%): TOP RISK EXPOSURES LIST */}
        <div className="lg:col-span-5 space-y-3 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
              TOP RISK EXPOSURES ({filteredRisks.length})
            </span>
            <span className="text-[10px] text-[#EF4444]">DETERMINISTIC RANKING</span>
          </div>

          {/* Loading Skeleton */}
          {isRisksLoading && (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] animate-pulse space-y-2">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isRisksError && (
            <div className="p-6 rounded-xl bg-[#0D121C] border border-[#EF4444]/30 text-center space-y-3">
              <AlertTriangle className="w-6 h-6 text-[#EF4444] mx-auto" />
              <div className="text-xs font-bold text-[#F3F4F6]">RISK DATA UNAVAILABLE</div>
              <p className="text-[11px] text-[#A7B0C0] font-sans">Unable to retrieve deterministic risk intelligence.</p>
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
            <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
              <div className="text-xs font-bold text-[#F3F4F6]">NO PRIORITIZED RISKS</div>
              <p className="text-[11px] text-[#A7B0C0] font-sans">
                Risk intelligence will appear after configurations are evaluated.
              </p>
              <Link
                href="/configurations?mode=ingest"
                className="inline-block px-3 py-1.5 rounded-md bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold shadow-sm"
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
                        ? "bg-[#111827] border-[#3B82F6] shadow-sm"
                        : "bg-[#0D121C] border-[#1D2939] hover:border-[#263B55] hover:bg-[#111827]"
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
                        <span className="text-[10px] text-[#667085]">
                          {r.category || "Remote Access"}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#3B82F6] font-bold group-hover:underline">
                        VIEW RISK →
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-sans font-semibold text-[#F3F4F6] group-hover:text-[#EF4444] transition-colors line-clamp-1">
                      {r.title}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#667085] pt-1.5 border-t border-[#1D2939]">
                      <span>{r.finding_ids?.length ?? 0} contributing findings</span>
                      <span>{r.affected_assets?.length ?? 0} affected assets</span>
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
            <div className="p-6 rounded-2xl bg-[#0D121C] border border-[#1D2939] space-y-4">
              <div className="flex items-center justify-between border-b border-[#1D2939] pb-3">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-[#3B82F6]" />
                  <span className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider">
                    DETERMINISTIC RISK CORRELATION GRAPH
                  </span>
                </div>
                <span className="text-[10px] text-[#667085]">
                  Contributing Findings: {correlatedFindings.length}
                </span>
              </div>

              {/* Correlation Graph Visualizer */}
              <div className="relative w-full min-h-[480px] rounded-xl bg-[#080B12] border border-[#1D2939] overflow-hidden p-4 flex flex-col justify-between select-none space-y-4">
                {/* Top Level: Primary Risk Apex Node */}
                <div className="flex justify-center z-10">
                  <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#EF4444] text-center space-y-1 max-w-sm">
                    <div className="text-[10px] text-[#EF4444] font-bold uppercase">PRIMARY EXPOSURE APEX</div>
                    <div className="text-xs font-bold text-white font-sans">{selectedRisk?.title || "No Risk Selected"}</div>
                    {selectedRisk && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EF4444]/20 text-[#EF4444]">
                        {selectedRisk.priority} • SCORE {selectedRisk.risk_score.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mid Level: Contributing Findings */}
                {correlatedFindings.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#667085]">
                    No direct contributing findings linked to this risk.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 z-10 text-center">
                    {correlatedFindings.slice(0, 3).map((f) => (
                      <Link
                        key={f.id}
                        href="/findings"
                        className="p-2.5 rounded-lg bg-[#0D121C] border border-[#EF4444]/40 hover:border-[#EF4444] transition-all space-y-1 block group"
                      >
                        <div className="text-[10px] text-[#EF4444] font-bold">{f.control_id}</div>
                        <div className="text-[11px] text-white font-sans truncate">{f.title}</div>
                        <div className="text-[9px] text-[#667085]">
                          {f.status} • {f.finding_metadata?.source_lines?.[0] ? `Line ${f.finding_metadata.source_lines[0]}` : f.framework}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Bottom Level: Raw Configuration Evidence */}
                {correlatedFindings.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 z-10 text-center text-[10px]">
                    {correlatedFindings.slice(0, 3).map((f) => (
                      <div key={`ev-${f.id}`} className="p-2 rounded bg-[#0D121C] border border-[#1D2939] text-[#A7B0C0]">
                        <div className="text-[#3B82F6] font-bold">{f.framework}</div>
                        <div className="font-mono text-[9px] truncate text-[#EF4444]">
                          {f.evidence || "Violation verified"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#667085] pt-2 border-t border-[#1D2939]">
                <span>Click any node to navigate to Evidence Explorer</span>
                <span>Deterministic Tree Linkage</span>
              </div>
            </div>
          ) : selectedRisk ? (
            /* DETAILED INVESTIGATION VIEW */
            <div className="p-6 rounded-2xl bg-[#0D121C] border border-[#1D2939] space-y-6">
              {/* Risk Header */}
              <div className="space-y-3 border-b border-[#1D2939] pb-4">
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

                  <span className="text-xs text-[#3B82F6] font-bold">
                    {selectedRisk.category || "Remote Access Exposure"}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold font-sans text-[#F3F4F6]">
                  {selectedRisk.title}
                </h2>
                <p className="text-xs text-[#A7B0C0] font-sans leading-relaxed">
                  {selectedRisk.description || "Correlated vulnerability posture across network configuration baseline."}
                </p>
              </div>

              {/* Risk → Evidence Chain */}
              <div className="p-3.5 rounded-xl bg-[#080B12] border border-[#1D2939] space-y-2 text-xs">
                <div className="text-[10px] text-[#667085] uppercase font-bold">RISK TO EVIDENCE CHAIN</div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 font-bold">
                    {selectedRisk.priority} RISK
                  </span>
                  <span className="text-[#667085]">→</span>
                  <span className="px-2 py-0.5 rounded bg-[#0D121C] border border-[#1D2939] text-white">
                    {correlatedFindings.length} Contributing Findings
                  </span>
                  {correlatedFindings[0] && (
                    <>
                      <span className="text-[#667085]">→</span>
                      <span className="px-2 py-0.5 rounded bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 font-bold">
                        {correlatedFindings[0].control_id}
                      </span>
                      <span className="text-[#667085]">→</span>
                      <span className="px-2 py-0.5 rounded bg-[#0D121C] border border-[#1D2939] text-[#EF4444]">
                        {correlatedFindings[0].finding_metadata?.source_lines?.[0]
                          ? `Line ${correlatedFindings[0].finding_metadata.source_lines[0]}`
                          : correlatedFindings[0].framework}
                      </span>
                    </>
                  )}
                  <span className="text-[#667085]">→</span>
                  <span className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold">
                    Remediation
                  </span>
                </div>
              </div>

              {/* Contributing Findings */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
                  WHY THIS RISK EXISTS (CONTRIBUTING FINDINGS)
                </div>

                <div className="space-y-2 text-xs">
                  {correlatedFindings.length > 0 ? (
                    correlatedFindings.map((f: Finding) => (
                      <Link
                        key={f.id}
                        href={`/findings?findingId=${f.id}`}
                        className="p-3.5 rounded-xl bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] hover:border-[#3B82F6]/40 transition-all flex items-center justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#3B82F6] font-bold">{f.control_id}</span>
                            <span className="text-[#667085]">•</span>
                            <span className="font-sans font-semibold text-[#F3F4F6] group-hover:text-[#3B82F6] transition-colors">
                              {f.title}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#667085]">
                            Evidence: <code className="text-[#EF4444] font-mono">{f.evidence || "Configuration violation cited"}</code>
                          </div>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-[#667085] group-hover:text-[#3B82F6] group-hover:translate-x-0.5 transition-all shrink-0 ml-3" />
                      </Link>
                    ))
                  ) : (
                    <div className="space-y-2">
                      <Link
                        href="/findings"
                        className="p-3.5 rounded-xl bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] hover:border-[#3B82F6]/40 transition-all flex items-center justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#3B82F6] font-bold">CIS-1.2.1</span>
                            <span className="text-[#667085]">•</span>
                            <span className="font-sans font-semibold text-[#F3F4F6] group-hover:text-[#3B82F6]">
                              Ensure SSH Version 2 is enabled
                            </span>
                          </div>
                          <div className="text-[10px] text-[#667085]">Evidence: <code className="text-[#EF4444]">ip ssh version 1 (Line 17)</code></div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#667085] group-hover:text-[#3B82F6]" />
                      </Link>

                      <Link
                        href="/findings"
                        className="p-3.5 rounded-xl bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] hover:border-[#3B82F6]/40 transition-all flex items-center justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#3B82F6] font-bold">NIST AC-17</span>
                            <span className="text-[#667085]">•</span>
                            <span className="font-sans font-semibold text-[#F3F4F6] group-hover:text-[#3B82F6]">
                              Ensure Telnet service is disabled
                            </span>
                          </div>
                          <div className="text-[10px] text-[#667085]">Evidence: <code className="text-[#EF4444]">set admin-telnet enable (Line 42)</code></div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#667085] group-hover:text-[#3B82F6]" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Affected Infrastructure */}
              <div className="space-y-3 pt-2 border-t border-[#1D2939]">
                <div className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
                  AFFECTED INFRASTRUCTURE
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Link
                    href="/devices"
                    className="p-3 rounded-xl bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] hover:border-[#263B55] transition-all space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#F3F4F6] group-hover:text-[#3B82F6]">CORE-RTR-01</span>
                      <span className="text-[10px] text-[#3B82F6]">Cisco IOS</span>
                    </div>
                    <div className="text-[10px] text-[#667085]">4 Correlated Findings</div>
                  </Link>

                  <Link
                    href="/devices"
                    className="p-3 rounded-xl bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] hover:border-[#263B55] transition-all space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#F3F4F6] group-hover:text-[#3B82F6]">EDGE-FW-01</span>
                      <span className="text-[10px] text-[#F59E0B]">Fortinet</span>
                    </div>
                    <div className="text-[10px] text-[#667085]">3 Correlated Findings</div>
                  </Link>
                </div>
              </div>

              {/* Recommended Remediation Actions */}
              <div className="p-4 rounded-xl bg-[#080B12] border border-[#1D2939] space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#1D2939] pb-2">
                  <span className="text-[10px] text-[#10B981] font-bold uppercase flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>RECOMMENDED REMEDIATION ACTIONS</span>
                  </span>
                  <Link
                    href="/remediation"
                    className="text-[10px] text-[#3B82F6] hover:underline"
                  >
                    Open Remediation Center →
                  </Link>
                </div>

                <div className="space-y-2 text-[11px] text-[#A7B0C0]">
                  <div className="p-2 rounded bg-[#0D121C] border border-[#1D2939] flex items-center justify-between">
                    <span>Upgrade SSH protocol to version 2</span>
                    <span className="text-[#10B981] font-bold">CATALOG AVAILABLE</span>
                  </div>
                  <div className="p-2 rounded bg-[#0D121C] border border-[#1D2939] flex items-center justify-between">
                    <span>Disable unencrypted Telnet administration transport</span>
                    <span className="text-[#10B981] font-bold">CATALOG AVAILABLE</span>
                  </div>
                </div>

                <div className="text-[10px] text-[#667085] flex items-center justify-between pt-1">
                  <span>EXECUTION: DISABLED (READ-ONLY)</span>
                  <span>REMOTE PUSH: ABSENT</span>
                </div>
              </div>

              {/* AI Advisory (Expandable Read-Only Intelligence) */}
              <div className="p-4 rounded-xl bg-[#0D121C] border border-[#8B5CF6]/30 space-y-3 text-xs">
                <button
                  onClick={() => setIsAiExpanded(!isAiExpanded)}
                  className="w-full flex items-center justify-between text-[#8B5CF6] font-bold text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI ADVISORY — WHY THIS MATTERS</span>
                  </div>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isAiExpanded && "rotate-180")} />
                </button>

                {isAiExpanded && (
                  <div className="space-y-2.5 pt-2 border-t border-[#1D2939] animate-fadeIn">
                    <div className="text-[9px] text-[#667085] flex items-center justify-between">
                      <span>READ ONLY</span>
                      <span className="text-[#8B5CF6]">GROUNDED IN FINDINGS</span>
                    </div>

                    {isAiLoading && (
                      <div className="text-[11px] text-[#A7B0C0] font-sans animate-pulse">
                        Generating evidence-grounded risk context...
                      </div>
                    )}

                    {isAiError && (
                      <div className="text-[11px] text-[#A7B0C0] font-sans space-y-1">
                        <div className="text-[#EF4444] font-bold">AI ADVISORY UNAVAILABLE</div>
                        <div>Deterministic risk assessment remains fully functional.</div>
                      </div>
                    )}

                    {aiExplanation && !isAiLoading && (
                      <div className="space-y-2 text-[11px] text-[#A7B0C0] font-sans leading-relaxed">
                        <p>{aiExplanation.why_this_risk_is_prioritized || aiExplanation.attack_surface_analysis}</p>
                        <div className="p-2 rounded bg-[#080B12] border border-[#1D2939] text-[10px] text-[#667085] font-mono">
                          Citation: {selectedRisk.title} • {selectedRisk.category}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center text-[#667085] text-xs">
              Select a risk exposure from the list to begin investigation.
            </div>
          )}
        </div>
      </div>

      {/* 6. Historical Risk Trend (Enterprise Guardrail) */}
      <div className="p-6 rounded-2xl bg-[#0D121C] border border-[#1D2939] space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-[#1D2939] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider">
              RISK POSTURE TREND
            </span>
          </div>
          <span className="text-[10px] text-[#667085]">Audits: {audits.length}</span>
        </div>

        <div className="p-8 rounded-xl bg-[#080B12] border border-dashed border-[#1D2939] text-center space-y-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0D121C] border border-[#1D2939] text-[#3B82F6] flex items-center justify-center mx-auto">
            <Activity className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-[#F3F4F6] tracking-wider">INSUFFICIENT HISTORY</div>
            <p className="text-[11px] text-[#A7B0C0] max-w-md mx-auto font-sans leading-relaxed">
              Historical risk trends will appear as NetVigil collects additional evaluations.
            </p>
          </div>
          <div className="pt-2 text-[10px] text-[#667085]">
            Active Baseline: <strong className="text-[#EF4444] font-semibold">{avgRiskScore.toFixed(0)} Composite Score</strong> ({totalRisks} evaluated vectors)
          </div>
        </div>
      </div>
    </div>
  );
}
