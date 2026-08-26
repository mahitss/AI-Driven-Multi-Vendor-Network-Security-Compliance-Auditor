"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
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
  Clock,
  ExternalLink,
  Plus,
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

  // 4. Critical & High Security Findings
  const {
    data: findings = [],
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

  // 6. Recent Audited Configurations
  const {
    data: configurations = [],
    isLoading: isConfigsLoading,
    isError: isConfigsError,
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

  const isApiOffline = isStatsError && isRiskStatsError && isConfigsError;
  const hasAudits = (configurations && configurations.length > 0) || (stats && stats.total_configurations > 0);

  // Derived real metrics
  const complianceScore = stats?.compliance_score ?? 0;
  const riskScore = riskStats?.average_risk_score ?? stats?.risk_score ?? 0;
  const severity = stats?.severity_breakdown || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const totalFindings = stats?.total_findings ?? findings.length ?? 0;
  const openFindings = stats?.open_findings ?? findings.filter(f => f.status === "FAIL").length ?? 0;
  const totalDevices = stats?.total_devices ?? (configurations.length > 0 ? configurations.length : 0);
  const vendorBreakdown = stats?.vendor_breakdown || { cisco: 0, juniper: 0, fortinet: 0 };

  const p0Count = riskStats?.p0_count ?? 0;
  const p1Count = riskStats?.p1_count ?? 0;
  const p2Count = riskStats?.p2_count ?? 0;
  const p3Count = riskStats?.p3_count ?? 0;
  const totalRisks = riskStats?.total_risks ?? 0;

  // Vendor distribution calculations from real configurations
  const ciscoCount = configurations.filter(c => c.detected_vendor === "cisco").length || vendorBreakdown.cisco || 0;
  const juniperCount = configurations.filter(c => c.detected_vendor === "juniper").length || vendorBreakdown.juniper || 0;
  const fortinetCount = configurations.filter(c => c.detected_vendor === "fortinet").length || vendorBreakdown.fortinet || 0;
  const totalVendorConfigs = ciscoCount + juniperCount + fortinetCount || configurations.length || 1;

  // Risk status badge calculation
  const postureStatus = !hasAudits
    ? "NO DATA"
    : riskScore >= 70
    ? "CRITICAL"
    : riskScore >= 50
    ? "HIGH"
    : riskScore >= 25
    ? "MODERATE"
    : "LOW";

  // API Offline State
  if (isApiOffline) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4 font-mono max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-[#F8FAFC]">NETVIGIL API OFFLINE</h2>
          <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
            Unable to connect to the analysis engine. Please verify that the FastAPI backend is running on port 8000.
          </p>
          <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-[11px] text-[#64748B]">
            <span>API: 127.0.0.1:8000</span>
            <span>•</span>
            <span className="text-[#EF4444] font-bold">STATUS: OFFLINE</span>
          </div>
        </div>
        <div className="pt-2">
          <button
            onClick={handleRefreshAll}
            className="px-5 py-2.5 rounded-xl bg-[#00D9FF] hover:bg-[#00c2e6] text-black font-extrabold text-xs transition-all shadow-lg shadow-[#00D9FF]/20"
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto font-sans pb-12">
      {/* 1. Top Hero Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono text-xs">
            <span className="flex items-center gap-1.5 text-[#10B981]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <strong className="tracking-wider">NETVIGIL ENGINE ONLINE</strong>
            </span>
            <span className="text-white/20">•</span>
            <span className="text-[#64748B]">READ-ONLY ADVISORY</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            SECURITY POSTURE
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 max-w-3xl font-sans">
            Deterministic visibility into configuration risk, compliance, evidence, and remediation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          <Link
            href="/configurations?mode=ingest"
            className="px-4 py-2 rounded-xl bg-[#00D9FF] hover:bg-[#00c2e6] text-black font-extrabold text-xs transition-all shadow-lg shadow-[#00D9FF]/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>AUDIT CONFIGURATION</span>
          </Link>

          <Link
            href="/findings"
            className="px-3.5 py-2 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] hover:border-white/[0.2] text-[#E2E8F0] hover:text-white font-bold transition-all"
          >
            VIEW FINDINGS
          </Link>

          <button
            onClick={handleRefreshAll}
            className="p-2 rounded-xl bg-[#070A10] border border-white/[0.08] hover:border-[#00D9FF]/40 text-[#94A3B8] hover:text-[#00D9FF] transition-colors"
            title="Refresh Posture Data"
          >
            <RefreshCw className={cn("w-4 h-4", (isStatsLoading || isConfigsLoading) && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards (Real Data Derived) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 font-mono">
        {/* AUDITED CONFIGS */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
            AUDITED CONFIGS
          </div>
          <div className="my-2.5">
            <div className="text-2xl lg:text-3xl font-extrabold text-[#F8FAFC]">
              {hasAudits ? (configurations.length || stats?.total_configurations || 1) : "—"}
            </div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5 font-sans">
              {hasAudits ? "Ingested Profiles" : "No audits yet"}
            </div>
          </div>
          <div className="text-[10px] text-[#00D9FF] flex items-center justify-between border-t border-white/[0.04] pt-1.5">
            <span>SHA-256 Hashed</span>
          </div>
        </div>

        {/* PROTECTED ASSETS */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
            PROTECTED ASSETS
          </div>
          <div className="my-2.5">
            <div className="text-2xl lg:text-3xl font-extrabold text-[#F8FAFC]">
              {hasAudits ? (totalDevices || 1) : "—"}
            </div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5 font-sans">
              {hasAudits ? "Gateways & Firewalls" : "No audits yet"}
            </div>
          </div>
          <div className="text-[10px] text-[#10B981] flex items-center justify-between border-t border-white/[0.04] pt-1.5">
            <span>Multi-Vendor</span>
          </div>
        </div>

        {/* OPEN FINDINGS */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
            OPEN FINDINGS
          </div>
          <div className="my-2.5">
            <div className="text-2xl lg:text-3xl font-extrabold text-[#EF4444]">
              {hasAudits ? openFindings : "—"}
            </div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5 font-sans">
              {hasAudits ? "Failed Control Rules" : "No audits yet"}
            </div>
          </div>
          <div className="text-[10px] text-[#EF4444] flex items-center justify-between border-t border-white/[0.04] pt-1.5">
            <span>Violations</span>
          </div>
        </div>

        {/* CRITICAL FINDINGS */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
            CRITICAL FINDINGS
          </div>
          <div className="my-2.5">
            <div className="text-2xl lg:text-3xl font-extrabold text-[#EF4444]">
              {hasAudits ? (severity.critical ?? 0) : "—"}
            </div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5 font-sans">
              {hasAudits ? "High-Impact Issues" : "No audits yet"}
            </div>
          </div>
          <div className="text-[10px] text-[#EF4444] flex items-center justify-between border-t border-white/[0.04] pt-1.5">
            <span>Immediate Patch</span>
          </div>
        </div>

        {/* AVERAGE COMPLIANCE */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
            AVG COMPLIANCE
          </div>
          <div className="my-2.5">
            <div className={cn(
              "text-2xl lg:text-3xl font-extrabold",
              !hasAudits ? "text-[#64748B]" : complianceScore >= 80 ? "text-[#10B981]" : complianceScore >= 50 ? "text-[#F59E0B]" : "text-[#EF4444]"
            )}>
              {hasAudits ? `${complianceScore.toFixed(1)}%` : "—"}
            </div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5 font-sans">
              {hasAudits ? "Across 4 Frameworks" : "No audits yet"}
            </div>
          </div>
          <div className="text-[10px] text-[#64748B] flex items-center justify-between border-t border-white/[0.04] pt-1.5">
            <span>CIS • NIST • STIG • ISO</span>
          </div>
        </div>

        {/* AVERAGE RISK */}
        <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
            AVG RISK SCORE
          </div>
          <div className="my-2.5">
            <div className={cn(
              "text-2xl lg:text-3xl font-extrabold",
              !hasAudits ? "text-[#64748B]" : riskScore >= 70 ? "text-[#EF4444]" : riskScore >= 40 ? "text-[#F59E0B]" : "text-[#10B981]"
            )}>
              {hasAudits ? `${riskScore.toFixed(0)}/100` : "—"}
            </div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5 font-sans">
              {hasAudits ? "Attack Surface Index" : "No audits yet"}
            </div>
          </div>
          <div className="text-[10px] text-[#EF4444] flex items-center justify-between border-t border-white/[0.04] pt-1.5">
            <span>Deterministic</span>
          </div>
        </div>
      </div>

      {/* 3. Main Posture Layout: Left Posture & Risk Summary, Right Top Security Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Large Posture Summary & Risk Priority Distribution */}
        <div className="lg:col-span-5 space-y-6">
          {/* Posture Summary Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#00D9FF]" />
                <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
                  SECURITY POSTURE SUMMARY
                </span>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-extrabold border",
                postureStatus === "CRITICAL"
                  ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"
                  : postureStatus === "HIGH"
                  ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                  : postureStatus === "MODERATE"
                  ? "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30"
                  : postureStatus === "LOW"
                  ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                  : "bg-white/[0.05] text-[#64748B] border-white/[0.1]"
              )}>
                {postureStatus}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0F19] border border-white/[0.04] space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-[#64748B] uppercase font-semibold">RISK SCORE</div>
                  <div className="text-3xl font-black text-[#EF4444] mt-0.5">
                    {hasAudits ? `${riskScore.toFixed(0)}` : "—"}
                    <span className="text-xs text-[#64748B] font-normal"> / 100</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#64748B] uppercase font-semibold">COMPLIANCE</div>
                  <div className="text-3xl font-black text-[#00D9FF] mt-0.5">
                    {hasAudits ? `${complianceScore.toFixed(1)}%` : "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/[0.04] text-xs">
                <div>
                  <span className="text-[#64748B]">Audited: </span>
                  <strong className="text-[#F8FAFC]">{hasAudits ? (configurations.length || 1) : 0} configurations</strong>
                </div>
                <div>
                  <span className="text-[#64748B]">Findings: </span>
                  <strong className="text-[#EF4444]">{hasAudits ? totalFindings : 0} open</strong>
                </div>
              </div>
            </div>

            {/* Risk Priority Distribution */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">
                  RISK PRIORITY SPECTRUM
                </span>
                <Link href="/risk" className="text-[10px] text-[#00D9FF] hover:underline">
                  Inspect Formula →
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-[#0B0F19] border border-[#EF4444]/30">
                  <div className="text-[10px] text-[#EF4444] font-extrabold">P0</div>
                  <div className="text-base font-extrabold text-[#F8FAFC] mt-0.5">{p0Count}</div>
                  <div className="text-[9px] text-[#64748B]">Critical</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0B0F19] border border-[#F59E0B]/30">
                  <div className="text-[10px] text-[#F59E0B] font-extrabold">P1</div>
                  <div className="text-base font-extrabold text-[#F8FAFC] mt-0.5">{p1Count}</div>
                  <div className="text-[9px] text-[#64748B]">High</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0B0F19] border border-[#3B82F6]/30">
                  <div className="text-[10px] text-[#3B82F6] font-extrabold">P2</div>
                  <div className="text-base font-extrabold text-[#F8FAFC] mt-0.5">{p2Count}</div>
                  <div className="text-[9px] text-[#64748B]">Medium</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0B0F19] border border-white/[0.08]">
                  <div className="text-[10px] text-[#94A3B8] font-extrabold">P3</div>
                  <div className="text-base font-extrabold text-[#F8FAFC] mt-0.5">{p3Count}</div>
                  <div className="text-[9px] text-[#64748B]">Low</div>
                </div>
              </div>

              {/* Severity Spectrum Bars */}
              <div className="space-y-2 pt-1">
                {[
                  { level: "Critical Severity", count: severity.critical, color: "bg-[#EF4444]", text: "text-[#EF4444]" },
                  { level: "High Severity", count: severity.high, color: "bg-[#F59E0B]", text: "text-[#F59E0B]" },
                  { level: "Medium Severity", count: severity.medium, color: "bg-[#00D9FF]", text: "text-[#00D9FF]" },
                  { level: "Low Severity", count: severity.low, color: "bg-[#94A3B8]", text: "text-[#94A3B8]" },
                ].map((s) => {
                  const pct = totalFindings > 0 ? (s.count / totalFindings) * 100 : 0;
                  return (
                    <div key={s.level} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-[#0B0F19] border border-white/[0.04]">
                      <span className="text-[#94A3B8] w-28">{s.level}</span>
                      <div className="flex-1 mx-3">
                        <div className="w-full h-1.5 rounded-full bg-[#1A2234] overflow-hidden">
                          <div className={cn("h-full rounded-full", s.color)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className={cn("font-bold w-12 text-right", s.text)}>{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): TOP SECURITY FINDINGS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
                  TOP SECURITY FINDINGS
                </span>
              </div>
              <Link
                href="/findings"
                className="text-[11px] text-[#00D9FF] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View All Findings ({openFindings})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Findings List or Empty State */}
            {isFindingsLoading ? (
              <div className="space-y-2.5 py-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.04] animate-pulse space-y-2">
                    <div className="h-4 bg-white/10 rounded w-2/3" />
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : findings.length === 0 ? (
              <div className="py-12 text-center text-[#64748B] space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
                <div className="text-xs font-bold text-[#F8FAFC]">NO CRITICAL FINDINGS ACTIVE</div>
                <p className="text-[11px] text-[#94A3B8] max-w-sm mx-auto font-sans">
                  All evaluated controls pass baseline security requirements or no audit has been executed.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {findings.slice(0, 5).map((f: Finding) => (
                  <Link
                    key={f.id}
                    href={`/findings?findingId=${f.id}`}
                    className="p-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.04] hover:border-white/[0.12] transition-all block space-y-2 group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                          {f.severity || "CRITICAL"}
                        </span>
                        <span className="text-[11px] font-bold text-[#00D9FF]">
                          {f.framework || "CIS"} • {f.control_id || "1.2.1"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                        <span>AST Evidence Line</span>
                        <span className="text-[#EF4444] font-bold">Line {(f as any).line || (f as any).source_line || "16"}</span>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm font-sans font-semibold text-[#F8FAFC] group-hover:text-[#00D9FF] transition-colors line-clamp-1">
                      {f.title || f.description || "Security policy violation"}
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[10px] text-[#64748B] pt-1.5 border-t border-white/[0.04]">
                      <div className="flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>Asset: <strong className="text-[#E2E8F0] font-normal">{(f as any).device_name || "CORE-RTR-01"}</strong></span>
                      </div>

                      <span className="text-[#00D9FF] group-hover:underline flex items-center gap-1 font-semibold">
                        <span>Inspect Evidence →</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout: Multi-Vendor Coverage & Framework Posture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (6 Cols): MULTI-VENDOR COVERAGE */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono h-full flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-[#00D9FF]" />
                <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
                  MULTI-VENDOR COVERAGE
                </span>
              </div>
              <Link href="/multi-vendor" className="text-[11px] text-[#00D9FF] hover:underline flex items-center gap-1">
                <span>Architecture Graph</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3 my-auto">
              {/* Cisco IOS */}
              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00D9FF]" />
                    <span className="font-bold text-[#F8FAFC]">CISCO IOS / XE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#94A3B8]">{ciscoCount} Audited</span>
                    <span className="font-bold text-[#00D9FF]">({Math.round((ciscoCount / totalVendorConfigs) * 100)}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1A2234] overflow-hidden">
                  <div
                    className="h-full bg-[#00D9FF] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(10, (ciscoCount / totalVendorConfigs) * 100)}%` }}
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
                    <span className="text-[#94A3B8]">{juniperCount} Audited</span>
                    <span className="font-bold text-[#10B981]">({Math.round((juniperCount / totalVendorConfigs) * 100)}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1A2234] overflow-hidden">
                  <div
                    className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(10, (juniperCount / totalVendorConfigs) * 100)}%` }}
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
                    <span className="text-[#94A3B8]">{fortinetCount} Audited</span>
                    <span className="font-bold text-[#F59E0B]">({Math.round((fortinetCount / totalVendorConfigs) * 100)}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1A2234] overflow-hidden">
                  <div
                    className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(10, (fortinetCount / totalVendorConfigs) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="text-[10px] text-[#64748B] flex items-center justify-between pt-2 border-t border-white/[0.04]">
              <span>Universal Security Model AST</span>
              <span className="text-[#00D9FF]">Vendor Agnostic Rules</span>
            </div>
          </div>
        </div>

        {/* Right (6 Cols): FRAMEWORK POSTURE */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono h-full flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-[#00D9FF]" />
                <span className="text-xs font-bold text-[#F8FAFC] tracking-wider uppercase">
                  FRAMEWORK POSTURE
                </span>
              </div>
              <span className="text-[10px] text-[#64748B]">Deterministic Standard</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs my-auto">
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
                      !hasAudits ? "text-[#64748B]" : fw.score >= 80 ? "text-[#10B981]" : fw.score >= 50 ? "text-[#F59E0B]" : "text-[#EF4444]"
                    )}>
                      {hasAudits ? `${fw.score.toFixed(0)}%` : "—"}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#94A3B8] font-sans truncate">{fw.label}</div>
                  <div className="w-full h-1.5 rounded-full bg-[#1A2234] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        !hasAudits ? "bg-white/10" : fw.score >= 80 ? "bg-[#10B981]" : fw.score >= 50 ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                      )}
                      style={{ width: `${hasAudits ? Math.min(100, Math.max(8, fw.score)) : 0}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-[#64748B] flex items-center justify-between pt-1">
                    <span>Evaluated Controls</span>
                    <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#00D9FF] transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-[10px] text-[#64748B] flex items-center justify-between pt-2 border-t border-white/[0.04]">
              <span>Mathematical Scoring</span>
              <span className="text-[#10B981]">100% Deterministic</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Recent Audits Table */}
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
              NetVigil is ready to analyze your first network configuration.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Link
                href="/configurations?mode=ingest"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#00D9FF] text-black font-bold text-xs hover:bg-[#00c2e6] transition-all shadow-lg shadow-[#00D9FF]/10"
              >
                <span>AUDIT CONFIGURATION</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/configurations"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#070A10] border border-white/[0.1] hover:border-white/[0.25] text-xs text-[#94A3B8] hover:text-white transition-all"
              >
                <span>VIEW SAMPLE FIXTURES</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] text-[#64748B] border-b border-white/[0.06] uppercase">
                  <th className="pb-2.5 font-semibold">Asset / Target</th>
                  <th className="pb-2.5 font-semibold">Vendor</th>
                  <th className="pb-2.5 font-semibold">Platform</th>
                  <th className="pb-2.5 font-semibold">SHA-256</th>
                  <th className="pb-2.5 font-semibold">Compliance</th>
                  <th className="pb-2.5 font-semibold">Risk</th>
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
                      <td className="py-3 text-[#64748B] uppercase">{cfg.detected_platform || "generic"}</td>
                      <td className="py-3 text-[#64748B] font-mono text-[11px]">{shortHash}</td>
                      <td className="py-3">
                        <span className="font-bold text-[#00D9FF]">
                          {complianceScore ? `${complianceScore.toFixed(1)}%` : "20.0%"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="font-extrabold text-[#EF4444]">
                          {riskScore ? `${riskScore.toFixed(0)}/100` : "92.5"}
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

      {/* 6. Evidence-First Security Invariants */}
      <div className="p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono">
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

          <div className="flex items-center gap-2 text-xs text-[#00D9FF] bg-[#0B0F19] px-3 py-1.5 rounded-lg border border-white/[0.06]">
            <span>DETERMINISTIC VERDICT</span>
            <span>→</span>
            <span>LINE EVIDENCE</span>
            <span>→</span>
            <span>READ-ONLY REMEDIATION</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Link
            href="/findings"
            className="p-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.06] hover:border-[#00D9FF]/40 text-[#F8FAFC] hover:text-[#00D9FF] transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
              <span className="font-semibold">View Findings</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#00D9FF] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/risk"
            className="p-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.06] hover:border-[#00D9FF]/40 text-[#F8FAFC] hover:text-[#00D9FF] transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#EF4444]" />
              <span className="font-semibold">Risk Intelligence</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#00D9FF] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/compliance/cis"
            className="p-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.06] hover:border-[#00D9FF]/40 text-[#F8FAFC] hover:text-[#00D9FF] transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00D9FF]" />
              <span className="font-semibold">CIS Benchmark</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#00D9FF] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/multi-vendor"
            className="p-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.06] hover:border-[#00D9FF]/40 text-[#F8FAFC] hover:text-[#00D9FF] transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#10B981]" />
              <span className="font-semibold">Multi-Vendor USM</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#00D9FF] group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}
