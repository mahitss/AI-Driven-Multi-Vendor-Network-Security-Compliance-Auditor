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

  const hasTelemetryData = !!telemetry?.audit_trends && telemetry.audit_trends.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-4 select-none font-sans">
      {/* 1. Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2638] pb-3.5 bg-[#090B0F]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-[#F3F4F6] tracking-tight font-mono">
              SECURITY POSTURE
            </h1>
            <span
              className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded border font-semibold flex items-center gap-1.5",
                statusBadge.bg,
                statusBadge.text,
                statusBadge.border
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", statusBadge.dot)} />
              <span>{statusBadge.label}</span>
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-0.5 font-sans">
            Continuous compliance evaluation, risk scoring, and security posture across evaluated assets.
          </p>
        </div>
      </div>

      {/* 2. Core Metrics (5 KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Metric 1: Fleet Compliance */}
        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#94A3B8] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px]">Fleet Compliance</span>
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#F3F4F6] font-mono tracking-tight">
                {isStatsError || !stats || stats.total_configurations === 0
                  ? "—"
                  : `${stats.compliance_score.toFixed(1)}%`}
              </span>
              {!isStatsError && stats && stats.total_configurations > 0 && stats.score_delta !== null && stats.score_delta !== undefined ? (
                <span
                  className={cn(
                    "text-[10px] font-mono font-medium flex items-center gap-0.5",
                    stats.score_delta >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                  )}
                >
                  {stats.score_delta >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(stats.score_delta).toFixed(1)}%
                </span>
              ) : !isStatsError && stats && stats.total_configurations > 0 ? (
                <span className="text-[10px] text-[#64748B] font-mono">Baseline</span>
              ) : null}
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 font-sans">
              {isStatsError
                ? "Evaluations unavailable"
                : stats?.total_configurations
                ? `Evaluated on ${stats.total_configurations} config(s)`
                : "No configurations evaluated"}
            </p>
          </div>
        </div>

        {/* Metric 2: Risk Score */}
        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#94A3B8] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px]">Risk Score</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#F3F4F6] font-mono tracking-tight">
                {isStatsError || !stats || stats.total_configurations === 0 || stats.open_findings === 0
                  ? "—"
                  : Math.round(stats.risk_score)}
              </span>
              <span className="text-xs text-[#64748B] font-mono">/ 100</span>
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 font-sans">
              {isStatsError
                ? "Risk model unavailable"
                : stats?.open_findings
                ? `Weighted from ${stats.open_findings} finding(s)`
                : "0 active findings"}
            </p>
          </div>
        </div>

        {/* Metric 3: Critical Findings */}
        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#94A3B8] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px] text-[#EF4444]">Critical Findings</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] font-semibold border border-[#EF4444]/20 font-mono">
              P0
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#EF4444] font-mono tracking-tight">
              {isStatsError ? "—" : stats?.severity_breakdown?.critical ?? 0}
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 font-sans">
              High severity exposures
            </p>
          </div>
        </div>

        {/* Metric 4: Open Findings */}
        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#94A3B8] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px]">Open Findings</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#F3F4F6] font-mono tracking-tight">
              {isStatsError ? "—" : stats?.open_findings ?? 0}
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 font-sans">
              Rule violations across fleet
            </p>
          </div>
        </div>

        {/* Metric 5: Managed Assets */}
        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#94A3B8] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px]">Managed Assets</span>
            <Server className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#F3F4F6] font-mono tracking-tight">
              {isStatsError ? "—" : stats?.total_configurations ?? 0}
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 font-sans">
              Evaluated configurations
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Security Telemetry Activity */}
      <div className="space-y-2">
        {isTelemetryLoading ? (
          <div className="p-8 rounded-lg bg-[#0D1117] border border-[#1E2638] text-center font-mono text-xs text-[#94A3B8] space-y-2">
            <div className="text-xs font-semibold text-[#F3F4F6]">SYNCING SECURITY TELEMETRY...</div>
            <p className="text-[11px] text-[#64748B] font-sans">
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
          <div className="p-8 rounded-xl bg-[#0D1117] border border-[#1E2638] text-center font-mono text-xs space-y-2.5">
            <Info className="w-6 h-6 text-[#64748B] mx-auto" />
            <div className="text-sm font-bold text-[#F3F4F6]">NO TELEMETRY DATA</div>
            <p className="text-[11px] text-[#64748B] max-w-sm mx-auto font-sans">
              No audit execution records found. Ingest device configurations and run compliance audits to generate time-series telemetry.
            </p>
            <div className="pt-1">
              <Link
                href="/configurations?mode=ingest"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141A24] hover:bg-[#1A2230] text-[#F3F4F6] border border-[#1E2638] hover:border-[#28354A] text-xs font-semibold transition-colors"
              >
                <span>Ingest Configurations</span>
                <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 4. Findings Summary (Left) & Remediation Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Column (7 Cols): Findings Summary */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="p-4 sm:p-5 rounded-xl bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] transition-colors space-y-4 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1E2638] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#94A3B8]" />
                  <span className="text-xs font-semibold text-[#F3F4F6] uppercase tracking-wider">
                    FINDINGS SUMMARY
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] font-sans mt-0.5">
                  Severity distribution and priority failed security controls.
                </p>
              </div>

              <Link
                href="/findings"
                className="text-[#93C5FD] hover:underline text-xs flex items-center gap-1 font-semibold"
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
                  <div key={item.label} className="p-2 rounded-lg bg-[#090B0F] border border-[#1E2638] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-[#F3F4F6] text-[11px]">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F3F4F6] text-xs">{item.count}</span>
                        {stats && stats.open_findings > 0 && (
                          <span className="text-[10px] text-[#64748B]">({pct}%)</span>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-1 rounded-full bg-[#161D2A] overflow-hidden">
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
            <div className="pt-2 border-t border-[#1E2638] space-y-2">
              <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">
                Priority Exposures
              </span>

              {topPriorityFindings.length === 0 ? (
                <div className="p-4 text-center rounded-lg bg-[#090B0F] border border-[#1E2638] text-xs text-[#94A3B8] space-y-1">
                  <CheckCircle2 className="w-4 h-4 mx-auto text-[#10B981]" />
                  <div className="text-[#F3F4F6] font-medium text-xs">No active violations detected</div>
                  <p className="text-[10px] text-[#64748B] font-sans">All evaluated controls comply with target standards.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {topPriorityFindings.map((f, idx) => (
                    <Link
                      key={`finding_top_${f.id}_${idx}`}
                      href={`/findings?control=${f.control_id}`}
                      className="p-2.5 rounded-lg bg-[#090B0F] hover:bg-[#141A24] border border-[#1E2638] hover:border-[#28354A] flex items-center justify-between gap-2 text-xs transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-[9px] font-mono px-1 py-0.2 rounded font-semibold border",
                              f.severity === "CRITICAL"
                                ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25"
                                : f.severity === "HIGH"
                                ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25"
                                : "bg-[#141A24] text-[#93C5FD] border-[#28354A]"
                            )}
                          >
                            {f.severity}
                          </span>
                          <span className="font-bold text-[#F3F4F6] text-xs truncate max-w-[260px]">
                            {f.control_id}: {f.title}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {f.device_name || "Asset"} • {f.framework || "CIS"}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Remediation Summary */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="p-4 sm:p-5 rounded-xl bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] transition-colors space-y-4 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1E2638] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-[#94A3B8]" />
                  <span className="text-xs font-semibold text-[#F3F4F6] uppercase tracking-wider">
                    REMEDIATION STATUS
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] font-sans mt-0.5">
                  Hardening patch proposals and verification status.
                </p>
              </div>

              <Link
                href="/remediation"
                className="text-[#93C5FD] hover:underline text-xs flex items-center gap-1 font-semibold"
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
                  <div key={seg.label} className="p-2 rounded-lg bg-[#090B0F] border border-[#1E2638] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="font-semibold text-[#F3F4F6] text-[11px]">{seg.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F3F4F6] text-xs">{seg.count}</span>
                        <span className="text-[10px] text-[#64748B]">({pct}%)</span>
                      </div>
                    </div>

                    <div className="w-full h-1 rounded-full bg-[#161D2A] overflow-hidden">
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
            <div className="pt-2 border-t border-[#1E2638]">
              <Link
                href="/remediation"
                className="w-full py-2 rounded-lg bg-[#141A24] hover:bg-[#1A2230] border border-[#1E2638] hover:border-[#28354A] text-[#F3F4F6] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>OPEN REMEDIATION CENTER</span>
                <ExternalLink className="w-3 h-3 text-[#93C5FD]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
