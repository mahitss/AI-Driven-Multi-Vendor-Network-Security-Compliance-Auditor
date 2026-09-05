"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Activity,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Server,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Info,
  Wrench,
  ExternalLink,
} from "lucide-react";
import {
  fetchOverviewStats,
  fetchFindings,
  fetchSecurityTelemetry,
  fetchAudits,
  Finding,
} from "@/lib/api-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSystemHealth } from "@/lib/use-system-health";
import { cn } from "@/lib/utils";
import SecurityTrendLineChart from "@/components/telemetry/SecurityTrendLineChart";

export default function SecurityPostureDashboard() {
  const { user, loading: authLoading } = useAuth();

  // Authoritative Backend Health & Connection State
  const { isOnline, isOffline, isDegraded, isConnecting } = useSystemHealth();

  // 1. Authoritative Backend Posture Metrics (Scoped to authenticated user)
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useQuery({
    queryKey: ["dashboard-overview-stats", user?.id],
    queryFn: () => fetchOverviewStats(),
    enabled: !authLoading && !!user,
    staleTime: 15000,
  });

  // 2. Active Findings across Fleet (Status: FAIL, Scoped to user)
  const {
    data: rawFindings = [],
    isLoading: isFindingsLoading,
  } = useQuery({
    queryKey: ["dashboard-active-findings", user?.id],
    queryFn: () => fetchFindings({ status: "FAIL" }),
    enabled: !authLoading && !!user,
    staleTime: 15000,
  });

  // 3. Security Telemetry Data
  const {
    data: telemetry,
    isLoading: isTelemetryLoading,
  } = useQuery({
    queryKey: ["dashboard-security-telemetry", user?.id],
    queryFn: fetchSecurityTelemetry,
    enabled: !authLoading && !!user,
    staleTime: 15000,
  });

  // 4. Completed Audits (authoritative fleet presence)
  const { data: audits = [] } = useQuery({
    queryKey: ["audits", user?.id],
    queryFn: () => fetchAudits(),
    enabled: !authLoading && !!user,
    staleTime: 15000,
  });

  // Operational Status Badge Config
  const statusBadge = useMemo(() => {
    if (isOffline || isStatsError) {
      return {
        label: "OFFLINE",
        bg: "bg-[#EF4444]/10",
        text: "text-[#EF4444]",
        border: "border-[#EF4444]/25",
        dot: "bg-[#EF4444]",
      };
    }
    if (isDegraded) {
      return {
        label: "DEGRADED",
        bg: "bg-[#F59E0B]/10",
        text: "text-[#F59E0B]",
        border: "border-[#F59E0B]/25",
        dot: "bg-[#F59E0B]",
      };
    }
    if (isConnecting || (isStatsLoading && !stats)) {
      return {
        label: "CONNECTING",
        bg: "bg-[#3B82F6]/10",
        text: "text-[#93C5FD]",
        border: "border-[#3B82F6]/25",
        dot: "bg-[#3B82F6] animate-pulse",
      };
    }
    return {
      label: "OPERATIONAL",
      bg: "bg-[#10B981]/10",
      text: "text-[#10B981]",
      border: "border-[#10B981]/25",
      dot: "bg-[#10B981]",
    };
  }, [isOffline, isStatsError, isDegraded, isConnecting, isStatsLoading, stats]);

  // Top Priority Findings (Limited to top 4 unique controls)
  const topPriorityFindings = useMemo(() => {
    const map = new Map<string, Finding>();
    rawFindings.forEach((f) => {
      const key = `${f.framework || "CIS"}_${f.control_id}_${f.severity}`;
      if (!map.has(key)) {
        map.set(key, f);
      }
    });

    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
    return Array.from(map.values())
      .sort((a, b) => {
        const ordA = severityOrder[a.severity as keyof typeof severityOrder] ?? 5;
        const ordB = severityOrder[b.severity as keyof typeof severityOrder] ?? 5;
        return ordA - ordB;
      })
      .slice(0, 4);
  }, [rawFindings]);

  // Severity Breakdown Totals for Summary
  const severityBreakdown = useMemo(() => {
    return [
      { label: "Critical (P0)", count: stats?.severity_breakdown?.critical ?? 0, color: "#EF4444" },
      { label: "High (P1)", count: stats?.severity_breakdown?.high ?? 0, color: "#F59E0B" },
      { label: "Medium (P2)", count: stats?.severity_breakdown?.medium ?? 0, color: "#38BDF8" },
      { label: "Low (P3)", count: stats?.severity_breakdown?.low ?? 0, color: "#10B981" },
    ];
  }, [stats]);

  const maxSeverityVal = Math.max(...severityBreakdown.map((s) => s.count), 1);

  // Remediation segments for summary
  const remediationSegments = useMemo(() => {
    const dist = telemetry?.remediation_distribution || { verified: 0, applied: 0, reviewed: 0, available: 0, total: 0 };
    return [
      { label: "Verified Safe", count: dist.verified, color: "#10B981" },
      { label: "Applied Patches", count: dist.applied, color: "#38BDF8" },
      { label: "Reviewed & Approved", count: dist.reviewed, color: "#A855F7" },
      { label: "Available Templates", count: dist.available, color: "#F59E0B" },
    ];
  }, [telemetry]);

  const totalRemediationActionable = Math.max(
    (telemetry?.remediation_distribution?.total || 0),
    (telemetry?.remediation_distribution?.applied || 0),
    1
  );

  const hasCompletedAudits = (stats?.total_audits ?? 0) > 0 || (stats?.managed_assets ?? 0) > 0 || (stats?.total_configurations ?? 0) > 0 || audits.length > 0;
  const hasTelemetryData = !!telemetry?.audit_trends && telemetry.audit_trends.length > 0;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 select-none font-sans">
      {/* 1. Clean Header with Fleet vs Latest Audit Distinction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold text-[#F2F2F2] tracking-tight font-mono leading-none">
              SECURITY POSTURE
            </h1>
            <span
              className={cn(
                "text-xs font-mono px-2.5 py-1 rounded-md border font-semibold inline-flex items-center gap-1.5 tracking-wide",
                statusBadge.bg,
                statusBadge.text,
                statusBadge.border
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", statusBadge.dot)} />
              <span>{statusBadge.label}</span>
            </span>
          </div>
          <p className="text-sm sm:text-[15px] text-[#8E8E93] mt-1.5 font-sans">
            Continuous compliance evaluation, risk scoring, and security posture across evaluated assets.
          </p>
        </div>

        {/* Latest Audit vs Fleet Posture indicator */}
        {(stats as any)?.latest_audit && (
          <Link
            href="/audits"
            title={`Inspect latest audit: ${(stats as any).latest_audit.filename}`}
            className="flex items-center gap-2 self-start sm:self-auto group"
          >
            <span className="text-xs font-mono px-3 py-1.5 rounded-md bg-[#121212] group-hover:bg-[#161616] text-[#8E8E93] border border-[#242424] group-hover:border-[#333333] flex items-center gap-2.5 shadow-xs transition-colors">
              <span className="text-[#A0A0A0] font-semibold tracking-wider text-[11px]">LATEST AUDIT:</span>
              <span className="text-[#F2F2F2] font-medium truncate max-w-[160px] text-xs">
                {(stats as any).latest_audit.filename}
              </span>
              <span
                className={cn(
                  "font-bold px-2 py-0.5 rounded text-xs",
                  (stats as any).latest_audit.score >= 80
                    ? "bg-[#10B981]/15 text-[#10B981]"
                    : (stats as any).latest_audit.score >= 60
                    ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                    : "bg-[#EF4444]/15 text-[#EF4444]"
                )}
              >
                {(stats as any).latest_audit.score.toFixed(1)}%
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#666666] group-hover:text-[#F2F2F2] transition-colors" />
            </span>
          </Link>
        )}
      </div>

      {/* 2. Core Metrics (5 KPI Cards - Fleet Posture Aggregate) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-stretch">
        {/* Metric 1: Fleet Compliance */}
        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between text-[#8E8E93] font-mono">
            <span className="font-medium uppercase tracking-wider text-[13px]">Fleet Compliance</span>
            <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-[32px] font-bold text-[#F2F2F2] font-mono tracking-tight leading-none">
                {isStatsError || !stats || !hasCompletedAudits || typeof stats.compliance_score !== "number"
                  ? "—"
                  : `${stats.compliance_score.toFixed(1)}%`}
              </span>
              {!isStatsError && stats && hasCompletedAudits && stats.score_delta !== null && stats.score_delta !== undefined ? (
                <span
                  className={cn(
                    "text-xs font-mono font-medium flex items-center gap-0.5",
                    stats.score_delta >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                  )}
                >
                  {stats.score_delta >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(stats.score_delta).toFixed(1)}%
                </span>
              ) : !isStatsError && stats && hasCompletedAudits ? (
                <span className="text-xs text-[#666666] font-mono">Fleet Avg</span>
              ) : null}
            </div>
            <p className="text-[13px] text-[#8E8E93] font-sans leading-snug">
              {isStatsError
                ? "Evaluations unavailable"
                : hasCompletedAudits
                ? `Fleet aggregate across ${(stats as any)?.managed_assets ?? stats?.total_configurations ?? 1} asset(s)`
                : "No completed audits"}
            </p>
          </div>
        </div>

        {/* Metric 2: Risk Score */}
        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between text-[#8E8E93] font-mono">
            <span className="font-medium uppercase tracking-wider text-[13px]">Risk Score</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-[32px] font-bold text-[#F2F2F2] font-mono tracking-tight leading-none">
                {isStatsError || !stats || !hasCompletedAudits || typeof stats.risk_score !== "number"
                  ? "—"
                  : Math.round(stats.risk_score)}
              </span>
              <span className="text-sm text-[#666666] font-mono">/ 100</span>
            </div>
            <p className="text-[13px] text-[#8E8E93] font-sans leading-snug">
              {isStatsError
                ? "Risk model unavailable"
                : (stats?.open_findings ?? 0) > 0
                ? `Fleet aggregate across ${stats?.open_findings} open finding(s)`
                : "0 active exposure"}
            </p>
          </div>
        </div>

        {/* Metric 3: Critical Findings */}
        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between font-mono">
            <span className="font-medium uppercase tracking-wider text-[13px] text-[#EF4444]">Critical Findings</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#EF4444]/10 text-[#EF4444] font-semibold border border-[#EF4444]/20 font-mono shrink-0">
              P0
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-[32px] font-bold text-[#EF4444] font-mono tracking-tight leading-none">
              {isStatsError ? "—" : stats?.severity_breakdown?.critical ?? 0}
            </div>
            <p className="text-[13px] text-[#8E8E93] font-sans leading-snug">
              Critical (P0) active exposures
            </p>
          </div>
        </div>

        {/* Metric 4: Open Findings */}
        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between text-[#8E8E93] font-mono">
            <span className="font-medium uppercase tracking-wider text-[13px]">Open Findings</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-[32px] font-bold text-[#F2F2F2] font-mono tracking-tight leading-none">
              {isStatsError ? "—" : stats?.open_findings ?? 0}
            </div>
            <p className="text-[13px] text-[#8E8E93] font-sans leading-snug">
              Active failed controls across fleet
            </p>
          </div>
        </div>

        {/* Metric 5: Managed Assets */}
        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between text-[#8E8E93] font-mono">
            <span className="font-medium uppercase tracking-wider text-[13px]">Managed Assets</span>
            <Server className="w-4 h-4 text-[#8E8E93] shrink-0" />
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-[32px] font-bold text-[#F2F2F2] font-mono tracking-tight leading-none">
              {isStatsError ? "—" : (stats as any)?.managed_assets ?? stats?.total_configurations ?? 0}
            </div>
            <p className="text-[13px] text-[#8E8E93] font-sans leading-snug">
              Evaluated configuration assets
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Security Telemetry Activity */}
      <div className="space-y-2">
        {isTelemetryLoading ? (
          <div className="p-8 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-center font-mono text-xs text-[#8E8E93] space-y-2">
            <div className="text-xs font-semibold text-[#F2F2F2]">SYNCING SECURITY TELEMETRY...</div>
            <p className="text-[11px] text-[#666666] font-sans">
              Querying compliance trajectories and time-series execution points.
            </p>
          </div>
        ) : hasTelemetryData ? (
          <SecurityTrendLineChart
            trends={telemetry?.audit_trends || []}
            hasSufficientHistory={telemetry?.has_sufficient_history ?? false}
            isLoading={isTelemetryLoading}
          />
        ) : (
          <div className="p-8 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-center font-mono text-xs space-y-2.5">
            <Info className="w-6 h-6 text-[#666666] mx-auto" />
            <div className="text-sm font-bold text-[#F2F2F2]">
              {hasCompletedAudits ? "AUDIT TELEMETRY UNAVAILABLE" : "NO TELEMETRY DATA"}
            </div>
            <p className="text-[11px] text-[#666666] max-w-sm mx-auto font-sans">
              {hasCompletedAudits
                ? "Time-series trend records are syncing or unavailable for completed audit sessions."
                : "No audit execution records found. Ingest device configurations and run compliance audits to generate time-series telemetry."}
            </p>
            <div className="pt-1">
              <Link
                href={hasCompletedAudits ? "/audits" : "/configurations?mode=ingest"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#141414] hover:bg-[#1A1A1A] text-[#F2F2F2] border border-[#1F1F1F] hover:border-[#2A2A2A] text-xs font-semibold transition-colors font-mono"
              >
                <span>{hasCompletedAudits ? "View Security Audits" : "Ingest Configurations"}</span>
                <ChevronRight className="w-3 h-3 text-[#8E8E93]" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 4. Findings Summary (Left) & Remediation Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Column (7 Cols): Findings Summary */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="p-4 sm:p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors space-y-4 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#8E8E93]" />
                  <span className="text-sm sm:text-base font-semibold text-[#F2F2F2] uppercase tracking-wider font-mono">
                    FINDINGS SUMMARY
                  </span>
                </div>
                <p className="text-[13px] text-[#8E8E93] font-sans mt-0.5">
                  Severity distribution and priority failed security controls.
                </p>
              </div>

              <Link
                href="/findings"
                className="text-[#A0A0A0] hover:text-[#F2F2F2] text-xs flex items-center gap-1 font-semibold transition-colors font-mono"
              >
                <span>All Findings</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Severity Distribution Bars */}
            <div className="space-y-2">
              {severityBreakdown.map((item) => {
                const pct = Math.round((item.count / Math.max(stats?.open_findings || 1, 1)) * 100);
                const barWidth = Math.max((item.count / maxSeverityVal) * 100, 2);
                return (
                  <div key={item.label} className="p-2.5 rounded-md bg-[#080808] border border-[#1F1F1F] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-[#F2F2F2] text-[13px]">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F2F2F2] text-xs">{item.count}</span>
                        {stats && stats.open_findings > 0 && (
                          <span className="text-xs text-[#666666]">({pct}%)</span>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#141414] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top Failed Controls List */}
            <div className="pt-2.5 border-t border-[#1F1F1F] space-y-2">
              <span className="text-xs text-[#8E8E93] uppercase tracking-wider font-semibold font-mono">
                Priority Exposures
              </span>

              {topPriorityFindings.length === 0 ? (
                <div className="p-4 text-center rounded-md bg-[#080808] border border-[#1F1F1F] text-xs text-[#8E8E93] space-y-1">
                  <CheckCircle2 className="w-4 h-4 mx-auto text-[#10B981]" />
                  <div className="text-[#F2F2F2] font-medium text-xs">No active violations detected</div>
                  <p className="text-xs text-[#666666] font-sans">All evaluated controls comply with target standards.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {topPriorityFindings.map((f, idx) => (
                    <Link
                      key={`finding_top_${f.id}_${idx}`}
                      href={`/findings?control=${f.control_id}`}
                      className="p-2.5 rounded-md bg-[#080808] hover:bg-[#121212] border border-[#1F1F1F] hover:border-[#2A2A2A] flex items-center justify-between gap-2 text-xs transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-[10px] font-mono px-1.5 py-0.5 rounded-md font-semibold border",
                              f.severity === "CRITICAL"
                                ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25"
                                : f.severity === "HIGH"
                                ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25"
                                : "bg-[#141414] text-[#A0A0A0] border-[#242424]"
                            )}
                          >
                            {f.severity}
                          </span>
                          <span className="font-bold text-[#F2F2F2] text-xs sm:text-[13px] truncate max-w-[260px]">
                            {f.control_id}: {f.title}
                          </span>
                        </div>
                        <div className="text-xs text-[#666666]">
                          {f.device_name || "Asset"} • {f.framework || "CIS"}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#666666] shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Remediation Summary */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="p-4 sm:p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors space-y-4 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#8E8E93]" />
                  <span className="text-sm sm:text-base font-semibold text-[#F2F2F2] uppercase tracking-wider font-mono">
                    REMEDIATION STATUS
                  </span>
                </div>
                <p className="text-[13px] text-[#8E8E93] font-sans mt-0.5">
                  Hardening patch proposals and verification status.
                </p>
              </div>

              <Link
                href="/remediation"
                className="text-[#A0A0A0] hover:text-[#F2F2F2] text-xs flex items-center gap-1 font-semibold transition-colors font-mono"
              >
                <span>Remediate</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Remediation Lifecycle Breakdown */}
            <div className="space-y-2">
              {remediationSegments.map((seg) => {
                const pct = Math.round((seg.count / totalRemediationActionable) * 100);
                return (
                  <div key={seg.label} className="p-2.5 rounded-md bg-[#080808] border border-[#1F1F1F] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="font-semibold text-[#F2F2F2] text-[13px]">{seg.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F2F2F2] text-xs">{seg.count}</span>
                        <span className="text-xs text-[#666666]">({pct}%)</span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-[#141414] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: seg.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Banner */}
            <div className="pt-2.5 border-t border-[#1F1F1F]">
              <Link
                href="/remediation"
                className="w-full py-2.5 rounded-md bg-[#141414] hover:bg-[#1A1A1A] border border-[#242424] hover:border-[#2A2A2A] text-[#F2F2F2] text-xs font-semibold flex items-center justify-center gap-2 transition-colors font-mono"
              >
                <span>OPEN REMEDIATION CENTER</span>
                <ExternalLink className="w-3 h-3 text-[#A0A0A0]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
