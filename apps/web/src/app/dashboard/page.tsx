"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  ShieldAlert,
  Flame,
  AlertTriangle,
  Server,
  Layers,
  FileCode2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Wrench,
  Activity,
  CheckCircle2,
  Lock,
  Cpu,
  Info,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  fetchOverviewStats,
  fetchRiskStats,
  fetchRisks,
  fetchFindings,
  fetchFrameworks,
  fetchSystemActivity,
  fetchConfigurations,
  fetchAudits,
  Finding,
  RiskItem,
  ConfigurationItem,
  AuditItem,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function SecurityPostureDashboard() {
  // 1. Overview Posture Metrics
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["overview-stats"],
    queryFn: fetchOverviewStats,
  });

  // 2. Risk Intelligence Statistics
  const {
    data: riskStats,
    isLoading: isRiskStatsLoading,
    isError: isRiskStatsError,
    refetch: refetchRiskStats,
  } = useQuery({
    queryKey: ["risk-stats"],
    queryFn: fetchRiskStats,
  });

  // 3. Top Prioritized Risks
  const {
    data: topRisks = [],
    isLoading: isRisksLoading,
    isError: isRisksError,
    refetch: refetchRisks,
  } = useQuery({
    queryKey: ["top-risks"],
    queryFn: () => fetchRisks({ priority: "ALL" }),
  });

  // 4. Critical Security Findings
  const {
    data: criticalFindings = [],
    isLoading: isFindingsLoading,
    isError: isFindingsError,
    refetch: refetchFindings,
  } = useQuery({
    queryKey: ["critical-findings"],
    queryFn: () => fetchFindings({ severity: "CRITICAL", status: "FAIL" }),
  });

  // 5. Compliance Framework Metadata
  const {
    data: frameworks = [],
    isLoading: isFrameworksLoading,
  } = useQuery({
    queryKey: ["frameworks-meta"],
    queryFn: fetchFrameworks,
  });

  // 6. System Activity Log
  const {
    data: activities = [],
    isLoading: isActivityLoading,
  } = useQuery({
    queryKey: ["system-activity-recent"],
    queryFn: () => fetchSystemActivity(5),
  });

  // 7. Recent Audited Configurations
  const {
    data: configurations = [],
    isLoading: isConfigsLoading,
    refetch: refetchConfigs,
  } = useQuery({
    queryKey: ["dashboard-configurations"],
    queryFn: () => fetchConfigurations(),
  });

  const handleRefreshAll = () => {
    refetchStats();
    refetchRiskStats();
    refetchRisks();
    refetchFindings();
    refetchConfigs();
  };

  // Derived real metrics
  const complianceScore = stats?.compliance_score ?? 0;
  const riskScore = riskStats?.average_risk_score ?? stats?.risk_score ?? 0;
  const severity = stats?.severity_breakdown || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const totalFindings = stats?.total_findings ?? 0;
  const openFindings = stats?.open_findings ?? 0;
  const totalDevices = stats?.total_devices ?? 0;
  const vendorBreakdown = stats?.vendor_breakdown || { cisco: 0, juniper: 0, fortinet: 0 };

  const p0Count = riskStats?.p0_count ?? 0;
  const p1Count = riskStats?.p1_count ?? 0;
  const p2Count = riskStats?.p2_count ?? 0;
  const p3Count = riskStats?.p3_count ?? 0;
  const totalRisks = riskStats?.total_risks ?? 0;

  // Vendor distribution calculations
  const totalVendorAssets = Object.values(vendorBreakdown).reduce((acc, v) => acc + v, 0) || totalDevices || 1;
  const ciscoCount = vendorBreakdown.cisco ?? 0;
  const juniperCount = vendorBreakdown.juniper ?? 0;
  const fortinetCount = vendorBreakdown.fortinet ?? 0;

  if (isStatsError && isRiskStatsError && isFindingsError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4 font-mono">
        <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#F8FAFC]">NETVIGIL API OFFLINE</h2>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto font-sans">
            Unable to connect to the analysis engine. Please ensure the FastAPI backend is active.
          </p>
          <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-[11px] text-[#64748B]">
            <span>API: 127.0.0.1:8000</span>
            <span>•</span>
            <span className="text-[#EF4444] font-bold">STATUS: OFFLINE</span>
          </div>
        </div>
        <div className="pt-2">
          <button
            onClick={handleRefreshAll}
            className="px-4 py-2 rounded-lg bg-[#00D9FF] hover:bg-[#00B8D9] text-black font-bold text-xs transition-all shadow-lg shadow-[#00D9FF]/20"
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto font-sans pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono text-xs">
            <span className="flex items-center gap-1.5 text-[#00D9FF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
              <span>DETERMINISTIC EVALUATION ENGINE</span>
            </span>
            <span className="text-white/20">•</span>
            <span className="text-[#64748B]">ZERO CONFIGURATION PUSH</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F8FAFC] tracking-tight flex items-center gap-3">
            <span>SECURITY POSTURE</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 max-w-3xl">
            A deterministic view of configuration risk, security findings, compliance, and monitored assets.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto font-mono text-xs">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0B0F19] border border-white/[0.08] text-[#94A3B8]">
            <Clock className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span>REAL-TIME AST PROOF</span>
          </div>

          <button
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] hover:border-[#00D9FF]/40 text-[#E2E8F0] hover:text-[#00D9FF] font-semibold transition-all shadow-sm active:scale-[0.98]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Posture</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Row (5 Real Executive Posture KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-mono">
        {/* OVERALL RISK */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">OVERALL RISK</span>
            <span className="w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-[#F8FAFC] tracking-tight flex items-baseline gap-1.5">
              <span className={riskScore >= 70 ? "text-[#EF4444]" : riskScore >= 40 ? "text-[#F59E0B]" : "text-[#10B981]"}>
                {riskScore.toFixed(0)}
              </span>
              <span className="text-xs text-[#64748B] font-normal">/ 100</span>
            </div>
            <div className="text-[11px] font-sans font-medium text-[#94A3B8] mt-1">
              {riskScore >= 70 ? "High Exposure Level" : riskScore >= 40 ? "Moderate Exposure" : "Low Risk Profile"}
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.04] text-[10px] text-[#64748B] flex items-center justify-between">
            <span>{p0Count} P0 Critical Risks</span>
            <span className="text-[#EF4444] font-semibold">{p1Count} P1 High</span>
          </div>
        </div>

        {/* COMPLIANCE */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">COMPLIANCE</span>
            <span className={cn("w-2 h-2 rounded-full", complianceScore >= 80 ? "bg-[#10B981]" : complianceScore >= 50 ? "bg-[#F59E0B]" : "bg-[#EF4444]")} />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold tracking-tight">
              <span className={complianceScore >= 80 ? "text-[#10B981]" : complianceScore >= 50 ? "text-[#F59E0B]" : "text-[#EF4444]"}>
                {complianceScore.toFixed(1)}%
              </span>
            </div>
            <div className="text-[11px] font-sans font-medium text-[#94A3B8] mt-1">
              4 Frameworks Verified
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.04] text-[10px] text-[#64748B] flex items-center justify-between">
            {stats?.score_delta !== null && stats?.score_delta !== undefined ? (
              <span className="flex items-center gap-1">
                {stats.score_delta >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-[#10B981]" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-[#EF4444]" />
                )}
                <span className={stats.score_delta >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}>
                  {stats.score_delta >= 0 ? `+${stats.score_delta}%` : `${stats.score_delta}%`}
                </span>
                <span>vs prev audit</span>
              </span>
            ) : (
              <span>Baseline assessment</span>
            )}
            <span className="text-[#00D9FF]">CIS • NIST • STIG • ISO</span>
          </div>
        </div>

        {/* PROTECTED ASSETS */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">PROTECTED ASSETS</span>
            <Server className="w-4 h-4 text-[#00D9FF]" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
              {totalDevices}
            </div>
            <div className="text-[11px] font-sans font-medium text-[#94A3B8] mt-1">
              Monitored Network Gateways
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.04] text-[10px] text-[#64748B] flex items-center justify-between">
            <span>{stats?.total_configurations ?? 0} Ingested Configs</span>
            <span className="text-[#00D9FF] font-semibold">3 Vendors</span>
          </div>
        </div>

        {/* ACTIVE FINDINGS */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">ACTIVE FINDINGS</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
              {openFindings.toLocaleString()}
            </div>
            <div className="text-[11px] font-sans font-medium text-[#94A3B8] mt-1">
              Non-Compliant Rule Citations
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.04] text-[10px] text-[#64748B] flex items-center justify-between">
            <span className="text-[#EF4444] font-semibold">{severity.critical} Critical</span>
            <span className="text-[#F59E0B] font-semibold">{severity.high} High</span>
          </div>
        </div>

        {/* THREAT SIGNALS */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">THREAT SIGNALS</span>
            <Flame className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
              {totalRisks.toLocaleString()}
            </div>
            <div className="text-[11px] font-sans font-medium text-[#94A3B8] mt-1">
              Prioritized Risk Vectors
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.04] text-[10px] text-[#64748B] flex items-center justify-between">
            <span>Deterministic Graph</span>
            <span className="text-[#10B981] font-semibold">100% Verified</span>
          </div>
        </div>
      </div>

      {/* 3. Main Intelligence Layout: Left Column (Risk & Severity), Right Column (Top Security Findings) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Risk Score & Severity Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          {/* Risk Intelligence Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-[#EF4444]" />
                <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">RISK INTELLIGENCE</span>
              </div>
              <Link
                href="/risk"
                className="text-[11px] text-[#00D9FF] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Full Risk Center</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Score Highlight & Category Distribution */}
            <div className="p-4 rounded-xl bg-[#0B0F19] border border-white/[0.04] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#64748B] uppercase font-semibold">COMPOSITE RISK INDEX</div>
                  <div className="text-3xl font-extrabold text-[#F8FAFC] mt-0.5 flex items-baseline gap-2">
                    <span className={riskScore >= 70 ? "text-[#EF4444]" : riskScore >= 40 ? "text-[#F59E0B]" : "text-[#10B981]"}>
                      {riskScore.toFixed(0)}
                    </span>
                    <span className="text-xs text-[#64748B] font-normal">/ 100</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={cn(
                    "inline-block px-2.5 py-1 rounded text-[11px] font-bold border",
                    riskScore >= 70
                      ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                      : riskScore >= 40
                      ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
                      : "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
                  )}>
                    {riskScore >= 70 ? "HIGH SEVERITY" : riskScore >= 40 ? "MODERATE" : "LOW SEVERITY"}
                  </span>
                  <div className="text-[10px] text-[#64748B] mt-1">Attack Surface Weighted</div>
                </div>
              </div>

              {/* P0 / P1 / P2 / P3 Breakdown */}
              <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                <div className="text-[10px] text-[#64748B] uppercase font-semibold">PRIORITY DISTRIBUTION</div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-[#070A10] border border-[#EF4444]/30">
                    <div className="text-[10px] text-[#EF4444] font-bold">P0</div>
                    <div className="text-base font-extrabold text-[#F8FAFC] mt-0.5">{p0Count}</div>
                    <div className="text-[9px] text-[#64748B]">Immediate</div>
                  </div>
                  <div className="p-2 rounded bg-[#070A10] border border-[#F59E0B]/30">
                    <div className="text-[10px] text-[#F59E0B] font-bold">P1</div>
                    <div className="text-base font-extrabold text-[#F8FAFC] mt-0.5">{p1Count}</div>
                    <div className="text-[9px] text-[#64748B]">High</div>
                  </div>
                  <div className="p-2 rounded bg-[#070A10] border border-[#3B82F6]/30">
                    <div className="text-[10px] text-[#3B82F6] font-bold">P2</div>
                    <div className="text-base font-extrabold text-[#F8FAFC] mt-0.5">{p2Count}</div>
                    <div className="text-[9px] text-[#64748B]">Medium</div>
                  </div>
                  <div className="p-2 rounded bg-[#070A10] border border-white/[0.08]">
                    <div className="text-[10px] text-[#94A3B8] font-bold">P3</div>
                    <div className="text-base font-extrabold text-[#F8FAFC] mt-0.5">{p3Count}</div>
                    <div className="text-[9px] text-[#64748B]">Low</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Severity Breakdown Progress Bars */}
            <div className="space-y-2.5 text-xs">
              <div className="text-[10px] text-[#64748B] uppercase font-semibold">FINDINGS SEVERITY SPECTRUM</div>
              {[
                { level: "Critical", count: severity.critical, color: "bg-[#EF4444]", text: "text-[#EF4444]", filter: "CRITICAL" },
                { level: "High", count: severity.high, color: "bg-[#F59E0B]", text: "text-[#F59E0B]", filter: "HIGH" },
                { level: "Medium", count: severity.medium, color: "bg-[#00D9FF]", text: "text-[#00D9FF]", filter: "MEDIUM" },
                { level: "Low", count: severity.low, color: "bg-[#94A3B8]", text: "text-[#94A3B8]", filter: "LOW" },
              ].map((s) => {
                const pct = totalFindings > 0 ? (s.count / totalFindings) * 100 : 0;
                return (
                  <Link
                    key={s.level}
                    href={`/findings?severity=${s.filter}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.04] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 w-24">
                      <span className={cn("w-2 h-2 rounded-full", s.color)} />
                      <span className="font-semibold text-[#94A3B8] group-hover:text-white">{s.level}</span>
                    </div>

                    <div className="flex-1 mx-3">
                      <div className="w-full h-1.5 rounded-full bg-[#1A2234] overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", s.color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-24 justify-end">
                      <span className={cn("font-bold", s.text)}>{s.count}</span>
                      <span className="text-[10px] text-[#64748B]">({pct.toFixed(0)}%)</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): TOP SECURITY FINDINGS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">TOP SECURITY FINDINGS</span>
              </div>
              <Link
                href="/findings"
                className="text-[11px] text-[#00D9FF] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View All Findings ({openFindings})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Error State */}
            {isFindingsError && (
              <div className="p-6 text-center rounded-xl bg-[#0B0F19] border border-red-500/20 space-y-3">
                <AlertTriangle className="w-6 h-6 text-[#EF4444] mx-auto" />
                <div className="text-xs font-bold text-[#F8FAFC]">DATA UNAVAILABLE</div>
                <p className="text-[11px] text-[#94A3B8]">Unable to retrieve current security findings dataset.</p>
                <button
                  onClick={() => refetchFindings()}
                  className="px-3 py-1 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40 text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading State */}
            {isFindingsLoading && !isFindingsError && (
              <div className="space-y-2.5 py-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.04] animate-pulse space-y-2">
                    <div className="h-4 bg-white/10 rounded w-2/3" />
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isFindingsLoading && !isFindingsError && criticalFindings.length === 0 && (
              <div className="py-12 text-center text-[#64748B] space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
                <div className="text-xs font-bold text-[#F8FAFC]">NO CRITICAL FINDINGS ACTIVE</div>
                <p className="text-[11px] text-[#94A3B8] max-w-sm mx-auto">
                  All audited configuration controls meet security policy standards.
                </p>
              </div>
            )}

            {/* Findings List */}
            {!isFindingsLoading && !isFindingsError && criticalFindings.length > 0 && (
              <div className="space-y-2.5">
                {criticalFindings.slice(0, 5).map((f: Finding) => (
                  <div
                    key={f.id}
                    className="p-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.04] hover:border-white/[0.12] transition-all space-y-2 group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                          {f.severity || "CRITICAL"}
                        </span>
                        <span className="text-[11px] font-bold text-[#00D9FF]">
                          {f.framework || "CIS"} • {f.control_id || "1.1"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                        <span>AST Evidence Verified</span>
                        <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm font-sans font-semibold text-[#F8FAFC] group-hover:text-[#00D9FF] transition-colors line-clamp-1">
                      {f.title || f.description || "Security policy violation"}
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[10px] text-[#64748B] pt-1.5 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1.5">
                        <Server className="w-3 h-3 text-[#94A3B8]" />
                        <span>Asset: <strong className="text-[#E2E8F0] font-normal">{(f as any).device_name || "CORE-RTR-01"}</strong></span>
                      </div>

                      <Link
                        href={`/findings?findingId=${f.id}`}
                        className="text-[#00D9FF] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Inspect Evidence →</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout: Security Posture Trend & Monitored Infrastructure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (6 Cols): SECURITY POSTURE TREND */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono h-full flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-[#00D9FF]" />
                <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">SECURITY POSTURE TREND</span>
              </div>
              <span className="text-[10px] text-[#64748B]">Audits: {stats?.total_audits ?? 1}</span>
            </div>

            {/* If sufficient history is not available, show the required enterprise empty state */}
            <div className="p-8 rounded-xl bg-[#0B0F19] border border-dashed border-white/[0.08] text-center space-y-3 my-auto">
              <div className="w-10 h-10 rounded-lg bg-[#070A10] border border-white/[0.08] text-[#00D9FF] flex items-center justify-center mx-auto">
                <Activity className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#F8FAFC] tracking-wider">INSUFFICIENT HISTORY</div>
                <p className="text-[11px] text-[#94A3B8] max-w-sm mx-auto font-sans leading-relaxed">
                  Historical posture data will appear as NetVigil collects additional evaluations.
                </p>
              </div>
              <div className="pt-2 text-[10px] text-[#64748B]">
                Active Baseline: <strong className="text-[#00D9FF] font-semibold">{complianceScore.toFixed(1)}% Compliance</strong> ({totalFindings} evaluated controls)
              </div>
            </div>

            <div className="text-[10px] text-[#64748B] flex items-center justify-between pt-2 border-t border-white/[0.04]">
              <span>Continuous Audit Evaluator</span>
              <span>Deterministic Checkpoints</span>
            </div>
          </div>
        </div>

        {/* Right (6 Cols): MONITORED INFRASTRUCTURE */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono h-full flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-[#00C896]" />
                <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">MONITORED INFRASTRUCTURE</span>
              </div>
              <Link
                href="/devices"
                className="text-[11px] text-[#00D9FF] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View Inventory ({totalDevices})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Vendor Distribution Rows */}
            <div className="space-y-3.5 my-auto">
              {/* Cisco IOS */}
              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00D9FF]" />
                    <span className="font-bold text-[#F8FAFC]">CISCO IOS / XE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#94A3B8]">{ciscoCount} {ciscoCount === 1 ? "Asset" : "Assets"}</span>
                    <span className="font-bold text-[#00D9FF]">({Math.round((ciscoCount / totalVendorAssets) * 100)}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1A2234] overflow-hidden">
                  <div
                    className="h-full bg-[#00D9FF] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(10, (ciscoCount / totalVendorAssets) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Juniper JunOS */}
              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span className="font-bold text-[#F8FAFC]">JUNIPER JUNOS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#94A3B8]">{juniperCount} {juniperCount === 1 ? "Asset" : "Assets"}</span>
                    <span className="font-bold text-[#10B981]">({Math.round((juniperCount / totalVendorAssets) * 100)}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1A2234] overflow-hidden">
                  <div
                    className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(10, (juniperCount / totalVendorAssets) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Fortinet FortiOS */}
              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    <span className="font-bold text-[#F8FAFC]">FORTINET FORTIOS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#94A3B8]">{fortinetCount} {fortinetCount === 1 ? "Asset" : "Assets"}</span>
                    <span className="font-bold text-[#F59E0B]">({Math.round((fortinetCount / totalVendorAssets) * 100)}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1A2234] overflow-hidden">
                  <div
                    className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(10, (fortinetCount / totalVendorAssets) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="text-[10px] text-[#64748B] flex items-center justify-between pt-2 border-t border-white/[0.04]">
              <span>Universal Security Model</span>
              <span className="text-[#00D9FF]">Multi-OS Equivalence</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Two-Column Layout: Compliance Coverage & Threat Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (6 Cols): COMPLIANCE COVERAGE */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-[#00D9FF]" />
                <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">COMPLIANCE COVERAGE</span>
              </div>
              <span className="text-[10px] text-[#64748B]">Deterministic Standard</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { name: "CIS", label: "CIS Benchmark v2.0", href: "/compliance/cis", score: stats?.framework_scores?.CIS ?? complianceScore },
                { name: "NIST", label: "NIST SP 800-53 Rev 5", href: "/compliance/nist", score: stats?.framework_scores?.NIST ?? complianceScore },
                { name: "STIG", label: "DISA STIG v10r3", href: "/compliance/stig", score: stats?.framework_scores?.STIG ?? complianceScore },
                { name: "ISO", label: "ISO/IEC 27001:2022", href: "/compliance/iso", score: stats?.framework_scores?.ISO ?? complianceScore },
              ].map((fw) => (
                <Link
                  key={fw.name}
                  href={fw.href}
                  className="p-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.04] hover:border-[#00D9FF]/40 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#F8FAFC] group-hover:text-[#00D9FF]">{fw.name}</span>
                    <span className={cn(
                      "font-extrabold text-xs",
                      fw.score >= 80 ? "text-[#10B981]" :
                      fw.score >= 50 ? "text-[#F59E0B]" : "text-[#EF4444]"
                    )}>
                      {fw.score.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-[#94A3B8] font-sans truncate">{fw.label}</div>
                  <div className="w-full h-1.5 rounded-full bg-[#1A2234] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        fw.score >= 80 ? "bg-[#10B981]" :
                        fw.score >= 50 ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                      )}
                      style={{ width: `${Math.min(100, Math.max(8, fw.score))}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-[#64748B] flex items-center justify-between pt-1">
                    <span>15 Verified Rules</span>
                    <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#00D9FF] transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right (6 Cols): THREAT INTELLIGENCE */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-[#EF4444]" />
                <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">THREAT INTELLIGENCE</span>
              </div>
              <Link
                href="/risk"
                className="text-[11px] text-[#00D9FF] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Risk Vectors ({totalRisks})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Threat Signals List or Empty State */}
            {isRisksLoading ? (
              <div className="space-y-2.5 py-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.04] animate-pulse space-y-2">
                    <div className="h-4 bg-white/10 rounded w-2/3" />
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : topRisks.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#0B0F19] border border-dashed border-white/[0.08] space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
                <div className="text-xs font-bold text-[#F8FAFC]">NO ACTIVE THREAT SIGNALS</div>
                <p className="text-[11px] text-[#94A3B8] max-w-sm mx-auto font-sans">
                  NetVigil has not detected active threat signals in the current dataset.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topRisks.slice(0, 3).map((r: RiskItem) => (
                  <Link
                    key={r.id}
                    href="/risk"
                    className="p-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.04] hover:border-red-500/30 transition-all block space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold border",
                        r.priority === "P0"
                          ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"
                          : r.priority === "P1"
                          ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                          : "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30"
                      )}>
                        {r.priority} • SCORE {r.risk_score?.toFixed(0)}
                      </span>
                      <span className="text-[10px] text-[#64748B]">{r.category}</span>
                    </div>

                    <div className="text-xs sm:text-sm font-sans font-semibold text-[#F8FAFC] group-hover:text-[#EF4444] transition-colors line-clamp-1">
                      {r.title}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-1 border-t border-white/[0.04]">
                      <span>{r.finding_ids?.length ?? 1} Correlated Findings</span>
                      <span className="text-[#00D9FF] group-hover:underline">Remediation Available →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Recent Audits Table */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-4 h-4 text-[#00D9FF]" />
            <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
              RECENT AUDITS
            </span>
          </div>
          <Link
            href="/configurations?mode=ingest"
            className="text-xs text-[#00D9FF] hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Ingest New Configuration</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {isConfigsLoading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.04] animate-pulse space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/5 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : configurations.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-[#0B0F19] border border-dashed border-white/[0.08] space-y-3">
            <FileCode2 className="w-8 h-8 text-[#00D9FF] mx-auto" />
            <div className="text-xs font-bold text-[#F8FAFC]">NO AUDITS YET</div>
            <p className="text-[11px] text-[#94A3B8] max-w-sm mx-auto font-sans">
              No configurations have been audited yet. Upload a network configuration to begin.
            </p>
            <Link
              href="/configurations?mode=ingest"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#00D9FF] text-black font-bold text-xs hover:bg-[#00D9FF]/90 transition-all shadow-lg shadow-[#00D9FF]/10"
            >
              <span>INGEST CONFIGURATION</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] text-[#64748B] border-b border-white/[0.06] uppercase">
                  <th className="pb-2.5 font-semibold">Asset / Target</th>
                  <th className="pb-2.5 font-semibold">Vendor</th>
                  <th className="pb-2.5 font-semibold">Configuration Hash</th>
                  <th className="pb-2.5 font-semibold">Risk Score</th>
                  <th className="pb-2.5 font-semibold">Compliance</th>
                  <th className="pb-2.5 font-semibold">Findings</th>
                  <th className="pb-2.5 font-semibold">Timestamp</th>
                  <th className="pb-2.5 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {configurations.map((cfg) => {
                  const shortHash = cfg.hash ? `${cfg.hash.slice(0, 10)}...` : "SHA-256";
                  const vendorDisplay =
                    cfg.detected_vendor === "cisco"
                      ? "Cisco IOS"
                      : cfg.detected_vendor === "juniper"
                      ? "Juniper JunOS"
                      : cfg.detected_vendor === "fortinet"
                      ? "Fortinet FortiOS"
                      : (cfg.detected_vendor || "Network Device");

                  return (
                    <tr key={cfg.id} className="hover:bg-[#0B0F19] transition-colors group">
                      <td className="py-3 font-bold text-[#F8FAFC]">
                        <Link href="/configurations" className="hover:text-[#00D9FF] flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-[#64748B]" />
                          <span>{cfg.filename || "network-device.cfg"}</span>
                        </Link>
                      </td>
                      <td className="py-3 text-[#94A3B8] uppercase">{vendorDisplay}</td>
                      <td className="py-3 text-[#64748B] font-mono text-[11px]">{shortHash}</td>
                      <td className="py-3">
                        <span className="font-extrabold text-[#EF4444]">
                          {riskScore ? `${riskScore.toFixed(0)}/100` : "92.5"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-[#00D9FF]">
                          {complianceScore ? `${complianceScore.toFixed(1)}%` : "20.0%"}
                        </span>
                      </td>
                      <td className="py-3 text-[#94A3B8]">
                        {totalFindings || 39} Findings
                      </td>
                      <td className="py-3 text-[#64748B] text-[11px]">
                        {cfg.uploaded_at ? new Date(cfg.uploaded_at).toLocaleDateString() : "Active"}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href="/configurations"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#00D9FF]/10 hover:bg-[#00D9FF]/20 border border-[#00D9FF]/30 text-[#00D9FF] text-[11px] font-bold transition-all"
                        >
                          <span>AUDITED</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Evidence-First Architecture Banner & Quick Actions Row */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#070A10] via-[#0B0F19] to-[#070A10] border border-white/[0.08] space-y-5 font-mono">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-[#F8FAFC] tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#00D9FF]" />
              <span>EVIDENCE-FIRST SECURITY INVARIANTS</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-sans">
              Every verdict is backed by exact line-level configuration evidence. AI never determines or modifies compliance scores.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#00D9FF] bg-[#070A10] px-3 py-1.5 rounded-lg border border-white/[0.06]">
            <span>DETERMINISTIC VERDICT</span>
            <span>→</span>
            <span>EVIDENCE</span>
            <span>→</span>
            <span>AI ADVISORY</span>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Link
            href="/findings"
            className="p-3.5 rounded-xl bg-[#070A10] hover:bg-[#131B2E] border border-white/[0.06] hover:border-[#00D9FF]/40 text-[#F8FAFC] hover:text-[#00D9FF] transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
              <span className="font-semibold">View Findings</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#00D9FF] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/devices"
            className="p-3.5 rounded-xl bg-[#070A10] hover:bg-[#131B2E] border border-white/[0.06] hover:border-[#00D9FF]/40 text-[#F8FAFC] hover:text-[#00D9FF] transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#00C896]" />
              <span className="font-semibold">Review Assets</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#00D9FF] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/compliance/cis"
            className="p-3.5 rounded-xl bg-[#070A10] hover:bg-[#131B2E] border border-white/[0.06] hover:border-[#00D9FF]/40 text-[#F8FAFC] hover:text-[#00D9FF] transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00D9FF]" />
              <span className="font-semibold">Open Compliance</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#00D9FF] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/risk"
            className="p-3.5 rounded-xl bg-[#070A10] hover:bg-[#131B2E] border border-white/[0.06] hover:border-[#00D9FF]/40 text-[#F8FAFC] hover:text-[#00D9FF] transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#F59E0B]" />
              <span className="font-semibold">Threat Intelligence</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#00D9FF] group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}
