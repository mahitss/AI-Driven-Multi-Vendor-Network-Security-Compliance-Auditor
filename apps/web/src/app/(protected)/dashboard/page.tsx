"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Activity,
  Flame,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Wrench,
  Bot,
  ChevronRight,
  ChevronDown,
  Server,
  Lock,
  HelpCircle,
  X,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import {
  fetchOverviewStats,
  fetchOverviewActivity,
  fetchFindings,
  fetchLatestAudit,
  Finding,
  OverviewStats,
  ActivityEvent,
} from "@/lib/api-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSystemHealth } from "@/lib/use-system-health";
import { cn } from "@/lib/utils";
import SecurityTelemetrySection from "@/components/telemetry/SecurityTelemetrySection";

// Grouped Finding Structure across Multi-Vendor Assets
interface AffectedAsset {
  finding_id: string;
  device_name: string;
  vendor: string;
  evidence?: string;
  source_lines?: number[];
  actual_value?: string;
  expected_value?: string;
  configuration_id: string;
  remediation?: string;
  audit_id: string;
}

interface ControlFindingGroup {
  group_key: string;
  control_id: string;
  title: string;
  severity: string;
  category: string;
  framework: string;
  description?: string;
  expected_value?: string;
  remediation?: string;
  affected_assets: AffectedAsset[];
}

export default function SecurityPostureDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [inspectedFinding, setInspectedFinding] = useState<{
    asset: AffectedAsset;
    control_id: string;
    title: string;
    framework: string;
    severity: string;
    category?: string;
    description?: string;
    expected_value?: string;
    remediation?: string;
  } | null>(null);
  const [showRiskExplanation, setShowRiskExplanation] = useState<boolean>(false);

  // Authoritative Backend Health & Connection State
  const {
    connectionState,
    isOnline,
    isOffline,
    isDegraded,
    isConnecting,
    refetch: refetchHealth,
  } = useSystemHealth();

  // 1. Authoritative Backend Posture Metrics (Scoped to authenticated user)
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    error: statsError,
    refetch: refetchStats,
    isRefetching: isStatsRefetching,
  } = useQuery({
    queryKey: ["dashboard-overview-stats", user?.id],
    queryFn: () => fetchOverviewStats(),
    enabled: !authLoading && !!user,
    staleTime: 15000,
  });

  // 2. Latest Completed User Audit (for instant restoration)
  const {
    data: latestAudit,
    isLoading: isLatestAuditLoading,
    refetch: refetchLatestAudit,
  } = useQuery({
    queryKey: ["dashboard-latest-audit", user?.id],
    queryFn: () => fetchLatestAudit(),
    enabled: !authLoading && !!user,
    staleTime: 15000,
  });

  // 3. Active Findings across Fleet (Status: FAIL, Scoped to user)
  const {
    data: rawFindings = [],
    isLoading: isFindingsLoading,
    isError: isFindingsError,
    refetch: refetchFindings,
  } = useQuery({
    queryKey: ["dashboard-active-findings", user?.id],
    queryFn: () => fetchFindings({ status: "FAIL" }),
    enabled: !authLoading && !!user,
    staleTime: 15000,
  });

  // 4. Real System Activity Log (Scoped to user)
  const {
    data: activityLogs = [],
    isLoading: isActivityLoading,
    isError: isActivityError,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ["dashboard-overview-activity", user?.id],
    queryFn: () => fetchOverviewActivity(10),
    enabled: !authLoading && !!user,
    staleTime: 15000,
  });

  // Compute Authoritative Page Operational Status Badge
  const badgeConfig = useMemo(() => {
    if (isOffline || isStatsError) {
      return {
        label: "OFFLINE",
        bg: "bg-[#EF4444]/10",
        text: "text-[#EF4444]",
        border: "border-[#EF4444]/25",
        dot: "bg-[#EF4444]",
      };
    }
    if (isDegraded || isFindingsError || isActivityError) {
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
  }, [isOffline, isStatsError, isDegraded, isFindingsError, isActivityError, isConnecting, isStatsLoading, stats]);

  // Deduplicate & Group Findings by Control ID / Title across Fleet
  const groupedFindings = useMemo(() => {
    const map = new Map<string, ControlFindingGroup>();

    rawFindings.forEach((f) => {
      const key = `${f.framework || "CIS"}__${f.control_id}__${f.title}__${f.severity}`;
      const asset: AffectedAsset = {
        finding_id: f.id,
        device_name: f.device_name || f.finding_metadata?.rule_id || "Configuration",
        vendor: f.vendor || "network-device",
        evidence: f.evidence,
        source_lines: f.finding_metadata?.source_lines,
        actual_value: f.actual_value,
        expected_value: f.expected_value,
        configuration_id: f.configuration_id || "",
        remediation: f.remediation,
        audit_id: f.audit_id,
      };

      if (!map.has(key)) {
        map.set(key, {
          group_key: key,
          control_id: f.control_id,
          title: f.title,
          severity: f.severity,
          category: f.category || "General",
          framework: f.framework || "CIS",
          description: f.description,
          expected_value: f.expected_value,
          remediation: f.remediation,
          affected_assets: [asset],
        });
      } else {
        const group = map.get(key)!;
        if (!group.affected_assets.some((a) => a.finding_id === f.id)) {
          group.affected_assets.push(asset);
        }
      }
    });

    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
    return Array.from(map.values()).sort((a, b) => {
      const orderA = (severityOrder[a.severity as keyof typeof severityOrder] ?? 5);
      const orderB = (severityOrder[b.severity as keyof typeof severityOrder] ?? 5);
      if (orderA !== orderB) return orderA - orderB;
      return b.affected_assets.length - a.affected_assets.length;
    });
  }, [rawFindings]);

  // Filter Grouped Findings by Selected Severity
  const filteredGroups = useMemo(() => {
    if (severityFilter === "ALL") return groupedFindings;
    return groupedFindings.filter((g) => g.severity.toUpperCase() === severityFilter);
  }, [groupedFindings, severityFilter]);

  const formatTimestamp = (ts?: string) => {
    if (!ts) return "Just now";
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "Recent";
    }
  };

  const vendorBreakdownSummary = useMemo(() => {
    if (!stats?.vendor_breakdown || Object.keys(stats.vendor_breakdown).length === 0) {
      return stats?.total_configurations ? `${stats.total_configurations} configured` : "0 assets registered";
    }
    return Object.entries(stats.vendor_breakdown)
      .map(([vendor, count]) => `${vendor.charAt(0).toUpperCase() + vendor.slice(1)} (${count})`)
      .join(", ");
  }, [stats]);

  return (
    <div className="max-w-7xl mx-auto space-y-3.5 select-none font-sans">
      {/* 1. Tactical Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2638] pb-3 bg-[#090B0F]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm sm:text-base font-bold text-[#F3F4F6] tracking-tight font-mono">
              SECURITY POSTURE &amp; TELEMETRY
            </h1>
            <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border font-semibold flex items-center gap-1.5", badgeConfig.bg, badgeConfig.text, badgeConfig.border)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", badgeConfig.dot)} />
              <span>{badgeConfig.label}</span>
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-0.5 font-sans">
            Deterministic compliance evaluation, risk intelligence, and remediation status across managed assets.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => {
              refetchHealth();
              refetchStats();
              refetchFindings();
              refetchActivity();
            }}
            disabled={isStatsRefetching}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#0D1117] hover:bg-[#141A24] border border-[#1E2638] hover:border-[#28354A] text-[#94A3B8] hover:text-[#F3F4F6] transition-colors"
            title="Refresh system state"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-[#94A3B8]", isStatsRefetching && "animate-spin")} />
            <span>{isStatsRefetching ? "SYNCING..." : "SYNC STATE"}</span>
          </button>
          <Link
            href="/agent"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111620] hover:bg-[#161D2A] border border-[#1E2638] hover:border-[#28354A] text-[#F3F4F6] transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span>AGENT CONSOLE</span>
          </Link>
          <Link
            href="/remediation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111620] hover:bg-[#161D2A] border border-[#1E2638] hover:border-[#28354A] text-[#F3F4F6] transition-colors"
          >
            <Wrench className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span>REMEDIATION</span>
          </Link>
        </div>
      </div>

      {/* 2. Key Posture Metrics Grid (5 KPI Cards) */}
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
                {isStatsError || !stats || stats.total_configurations === 0 ? "—" : `${stats.compliance_score.toFixed(1)}%`}
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
              {isStatsError ? "Evaluations unavailable" : isStatsLoading ? "Loading fleet..." : stats?.total_configurations ? `Evaluated on ${stats.total_configurations} config(s)` : "No configurations evaluated"}
            </p>
          </div>
          {/* Framework Breakdown Strip */}
          <div className="pt-2 border-t border-[#1E2638] flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
            <span>CIS {isStatsError || !stats?.total_configurations ? "—" : stats?.framework_scores?.CIS !== undefined ? `${Math.round(stats.framework_scores.CIS)}%` : "—"}</span>
            <span>NIST {isStatsError || !stats?.total_configurations ? "—" : stats?.framework_scores?.NIST !== undefined ? `${Math.round(stats.framework_scores.NIST)}%` : "—"}</span>
            <span>STIG {isStatsError || !stats?.total_configurations ? "—" : stats?.framework_scores?.STIG !== undefined ? `${Math.round(stats.framework_scores.STIG)}%` : "—"}</span>
            <span>ISO {isStatsError || !stats?.total_configurations ? "—" : stats?.framework_scores?.ISO !== undefined ? `${Math.round(stats.framework_scores.ISO)}%` : "—"}</span>
          </div>
        </div>

        {/* Metric 2: Risk Score */}
        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#94A3B8] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px]">Risk Score</span>
            <button
              onClick={() => setShowRiskExplanation(true)}
              className="text-[10px] text-[#93C5FD] hover:underline flex items-center gap-0.5 font-mono"
            >
              <HelpCircle className="w-3 h-3 text-[#64748B]" />
              <span>Formula</span>
            </button>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#F3F4F6] font-mono tracking-tight">
                {isStatsError || !stats || stats.total_configurations === 0 || stats.open_findings === 0 ? "—" : Math.round(stats.risk_score)}
              </span>
              <span className="text-xs text-[#64748B] font-mono">/ 100</span>
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 font-sans">
              {isStatsError ? "Risk model unavailable" : isStatsLoading ? "Calculating risks..." : stats?.open_findings ? `Weighted from ${stats.open_findings} finding(s)` : "0 active findings"}
            </p>
          </div>
          <div className="pt-2 border-t border-[#1E2638] flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
            <span className="text-[#EF4444]">Crit: {isStatsError ? "—" : stats?.severity_breakdown?.critical ?? 0}</span>
            <span className="text-[#F59E0B]">High: {isStatsError ? "—" : stats?.severity_breakdown?.high ?? 0}</span>
            <span className="text-[#94A3B8]">Med: {isStatsError ? "—" : stats?.severity_breakdown?.medium ?? 0}</span>
          </div>
        </div>

        {/* Metric 3: Critical Findings (P0) */}
        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#94A3B8] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px] text-[#EF4444]">Critical (P0)</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] font-semibold border border-[#EF4444]/20 font-mono">
              P0
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#EF4444] font-mono tracking-tight">
              {isStatsError ? "—" : stats?.severity_breakdown?.critical !== undefined ? stats.severity_breakdown.critical : isStatsLoading ? "..." : "0"}
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 font-sans">
              Cleartext protocols &amp; auth bypass
            </p>
          </div>
          <div className="pt-2 border-t border-[#1E2638] text-[10px] font-mono text-[#94A3B8] flex items-center justify-between">
            <span>High: {isStatsError ? "—" : stats?.severity_breakdown?.high ?? 0}</span>
            <Link href="/findings?severity=CRITICAL" className="text-[#93C5FD] hover:underline text-[10px]">
              Inspect →
            </Link>
          </div>
        </div>

        {/* Metric 4: Total Open Findings */}
        <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#94A3B8] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px]">Open Findings</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#F3F4F6] font-mono tracking-tight">
              {isStatsError ? "—" : stats?.open_findings !== undefined ? stats.open_findings : isStatsLoading ? "..." : "0"}
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 font-sans">
              Deterministic rule violations
            </p>
          </div>
          <div className="pt-2 border-t border-[#1E2638] text-[10px] font-mono text-[#94A3B8] flex items-center justify-between">
            <span>Audits: {isStatsError ? "—" : stats?.total_audits ?? 0}</span>
            <Link href="/findings" className="text-[#93C5FD] hover:underline text-[10px]">
              View all →
            </Link>
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
              {isStatsError ? "—" : stats?.total_configurations !== undefined ? stats.total_configurations : isStatsLoading ? "..." : "0"}
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 font-sans truncate" title={vendorBreakdownSummary}>
              {isStatsError ? "Inventory unavailable" : isStatsLoading ? "Scanning assets..." : vendorBreakdownSummary}
            </p>
          </div>
          <div className="pt-2 border-t border-[#1E2638] text-[10px] font-mono text-[#94A3B8] flex items-center justify-between">
            <span>Universal AST</span>
            <Link href="/configurations" className="text-[#93C5FD] hover:underline text-[10px]">
              Inventory →
            </Link>
          </div>
        </div>
      </div>

      {/* 2.5. Real Security Telemetry & Visual Analytics Suite */}
      <SecurityTelemetrySection />

      {/* 3. Main Operational Sections (Attention Queue + Activity Stream) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Column: Attention Queue (Grouped Deduplicated Controls) */}
        <div className="lg:col-span-8 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E2638] pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-mono font-semibold text-[#F3F4F6] uppercase tracking-wider">
                ACTIVE EXPOSURES &amp; FAILED CONTROLS
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] font-medium border border-[#EF4444]/20">
                {filteredGroups.length} failed
              </span>
            </div>

            {/* Severity Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#0D1117] border border-[#1E2638] p-0.5 rounded-lg text-xs">
              {(["ALL", "CRITICAL", "HIGH", "MEDIUM"] as const).map((sev) => (
                <button
                  key={`sev_tab_${sev}`}
                  onClick={() => setSeverityFilter(sev)}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors",
                    severityFilter === sev
                      ? "bg-[#141A24] text-[#F3F4F6] border border-[#28354A]"
                      : "text-[#94A3B8] hover:text-[#F3F4F6]"
                  )}
                >
                  {sev === "ALL" ? "ALL TIERS" : sev}
                </button>
              ))}
            </div>
          </div>

          {/* Attention Findings List */}
          <div className="space-y-2">
            {isFindingsLoading ? (
              <div className="p-8 text-center rounded-lg bg-[#0D1117] border border-[#1E2638] text-xs text-[#94A3B8] space-y-2 font-mono">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#94A3B8]" />
                <div>Loading compliance posture findings...</div>
              </div>
            ) : isFindingsError ? (
              <div className="p-8 text-center rounded-lg bg-[#0D1117] border border-[#EF4444]/30 text-xs text-[#EF4444] space-y-2 font-mono">
                <AlertCircle className="w-5 h-5 mx-auto text-[#EF4444]" />
                <div className="text-sm font-semibold text-[#F3F4F6]">FAILED CONTROLS UNAVAILABLE</div>
                <p className="text-[#94A3B8] max-w-sm mx-auto text-[11px] font-sans">
                  Unable to query active exposures and failed controls from the backend API.
                </p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-8 text-center rounded-lg bg-[#0D1117] border border-[#1E2638] text-xs text-[#94A3B8] space-y-1.5">
                <CheckCircle2 className="w-5 h-5 mx-auto text-[#10B981]" />
                <div className="text-sm font-medium text-[#F3F4F6] font-mono">
                  {stats?.total_configurations === 0
                    ? "No configurations ingested yet"
                    : "No matching findings in this severity tier"}
                </div>
                <p className="text-[#64748B] max-w-sm mx-auto text-xs font-sans">
                  {stats?.total_configurations === 0
                    ? "Upload network device configurations to start deterministic compliance auditing."
                    : "All evaluated rules in this tier have passed benchmark requirements."}
                </p>
                {stats?.total_configurations === 0 && (
                  <div className="pt-2">
                    <Link
                      href="/configurations?mode=ingest"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#141A24] hover:bg-[#1A2230] text-[#F3F4F6] border border-[#1E2638] hover:border-[#28354A] text-xs font-mono font-medium transition-colors"
                    >
                      <span>Upload Configuration</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              filteredGroups.map((group, groupIdx) => {
                const isExpanded = expandedGroupKey === group.group_key;
                const distinctAssetsCount = group.affected_assets.length;

                return (
                  <div
                    key={`ctrl_grp_${group.group_key}_${groupIdx}`}
                    className="rounded-lg bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] transition-colors overflow-hidden"
                  >
                    {/* Control Card Header */}
                    <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold border",
                              group.severity === "CRITICAL"
                                ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25"
                                : group.severity === "HIGH"
                                ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25"
                                : "bg-[#141A24] text-[#93C5FD] border-[#28354A]"
                            )}
                          >
                            {group.severity}
                          </span>
                          <span className="font-mono text-xs font-bold text-[#F3F4F6]">
                            {group.control_id}
                          </span>
                          <span className="text-[10px] font-mono text-[#64748B]">• {group.framework}</span>
                        </div>

                        <div className="text-xs font-semibold text-[#F3F4F6] truncate">
                          {group.title}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] font-mono">
                          <span className="text-[#64748B]">{group.category}</span>
                          <span>•</span>
                          <span className="text-[#F59E0B]">
                            {distinctAssetsCount} asset{distinctAssetsCount > 1 ? "s" : ""} affected
                          </span>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                        <button
                          onClick={() => setExpandedGroupKey(isExpanded ? null : group.group_key)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#111620] hover:bg-[#161D2A] border border-[#1E2638] text-[11px] font-mono text-[#94A3B8] hover:text-[#F3F4F6] transition-colors"
                        >
                          <span>{isExpanded ? "COLLAPSE" : "ASSETS"}</span>
                          <span className="text-[#93C5FD]">({distinctAssetsCount})</span>
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                        <Link
                          href={`/remediation?control=${group.control_id}`}
                          className="px-2.5 py-1 rounded-md bg-[#111620] hover:bg-[#161D2A] border border-[#1E2638] hover:border-[#28354A] text-[11px] font-mono text-[#93C5FD] font-semibold transition-colors"
                        >
                          PLAN FIX
                        </Link>
                      </div>
                    </div>

                    {/* Expandable Affected Assets Sub-rows */}
                    {isExpanded && (
                      <div className="border-t border-[#1E2638] bg-[#090B0F] divide-y divide-[#1E2638]">
                        {group.affected_assets.map((asset, idx) => (
                          <div
                            key={`${group.group_key}_${asset.finding_id}_${idx}`}
                            className="p-2.5 sm:px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <Server className="w-3.5 h-3.5 text-[#64748B]" />
                                <span className="font-mono text-xs font-semibold text-[#F3F4F6]">
                                  {asset.device_name}
                                </span>
                                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#0D1117] text-[#94A3B8] border border-[#1E2638]">
                                  {asset.vendor}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#64748B] font-mono truncate max-w-md">
                                {asset.evidence
                                  ? asset.evidence
                                  : asset.source_lines && asset.source_lines.length > 0
                                  ? `Observed line ${asset.source_lines[0]}`
                                  : "Non-compliant baseline state detected"}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0 font-mono text-[10px]">
                              <button
                                onClick={() =>
                                  setInspectedFinding({
                                    asset: asset,
                                    control_id: group.control_id,
                                    title: group.title,
                                    framework: group.framework,
                                    severity: group.severity,
                                    category: group.category,
                                    description: group.description,
                                    expected_value: group.expected_value,
                                    remediation: group.remediation,
                                  })
                                }
                                className="px-2.5 py-1 rounded bg-[#0D1117] hover:bg-[#141A24] border border-[#1E2638] text-[#94A3B8] hover:text-[#F3F4F6] transition-colors"
                              >
                                EVIDENCE
                              </button>
                              <Link
                                href={`/remediation?finding=${asset.finding_id}`}
                                className="px-2.5 py-1 rounded bg-[#141A24] hover:bg-[#1A2230] border border-[#1E2638] hover:border-[#28354A] text-[#93C5FD] font-semibold transition-colors"
                              >
                                REMEDIATE
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Real Activity Stream */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#1E2638] pb-2">
            <h2 className="text-xs font-mono font-semibold text-[#F3F4F6] uppercase tracking-wider">
              SYSTEM AUDIT TIMELINE
            </h2>
            <span className="text-[10px] text-[#10B981] font-medium flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> LIVE
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0D1117] border border-[#1E2638] space-y-2.5 text-xs">
            {isActivityLoading ? (
              <div className="py-6 text-center text-[#94A3B8] text-xs font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto mb-1 text-[#94A3B8]" />
                <span>Loading activity stream...</span>
              </div>
            ) : isActivityError ? (
              <div className="py-6 text-center text-[#EF4444] text-xs space-y-1 font-mono">
                <AlertCircle className="w-4 h-4 mx-auto text-[#EF4444]" />
                <div className="font-semibold uppercase tracking-wider text-[11px]">SYSTEM ACTIVITY UNAVAILABLE</div>
                <p className="text-[#94A3B8] text-[10px]">Unable to load real-time system events from backend.</p>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="py-6 text-center text-[#64748B] text-xs space-y-1 font-mono">
                <Activity className="w-4 h-4 mx-auto text-[#64748B]" />
                <div className="text-[#94A3B8] font-medium">No activity recorded</div>
                <p className="text-[10px] font-sans">System events and audit sessions will populate here.</p>
              </div>
            ) : (
              activityLogs.map((event, idx) => (
                <div key={`${event.id}_${idx}`} className="flex items-start gap-2.5 pb-2.5 border-b border-[#1E2638] last:border-0 last:pb-0">
                  <div
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-mono border",
                      event.severity === "SUCCESS"
                        ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20"
                        : event.severity === "WARNING"
                        ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                        : event.severity === "HIGH" || (event.severity as string) === "CRITICAL"
                        ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20"
                        : "bg-[#111620] text-[#94A3B8] border-[#1E2638]"
                    )}
                  >
                    {event.type.includes("AUDIT") ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : event.type.includes("AGENT") ? (
                      <Bot className="w-3 h-3" />
                    ) : event.type.includes("CONFIG") ? (
                      <Server className="w-3 h-3" />
                    ) : (
                      <Activity className="w-3 h-3" />
                    )}
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="font-semibold text-[#F3F4F6] text-xs truncate">
                      {event.title}
                    </div>
                    <div className="text-[#94A3B8] text-[10px] leading-tight font-sans">
                      {event.description}
                    </div>
                    <div className="text-[#64748B] text-[9px] font-mono flex items-center justify-between pt-0.5">
                      <span>{formatTimestamp(event.timestamp)}</span>
                      {event.target_url && (
                        <Link href={event.target_url} className="text-[#93C5FD] hover:underline flex items-center gap-0.5">
                          <span>View</span>
                          <ChevronRight className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="pt-2 border-t border-[#1E2638]">
              <Link
                href="/agent"
                className="w-full py-1.5 rounded-md bg-[#111620] hover:bg-[#161D2A] text-[#94A3B8] hover:text-[#F3F4F6] text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors border border-[#1E2638]"
              >
                <span>LAUNCH AUTONOMOUS ENGINEER</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Inspect Finding Evidence (Deterministic Traceability) */}
      {inspectedFinding && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl bg-[#0D1117] border border-[#1E2638] p-5 space-y-3.5 shadow-2xl font-mono">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1E2638]">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold border",
                    inspectedFinding.severity === "CRITICAL"
                      ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20"
                      : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                  )}
                >
                  {inspectedFinding.severity}
                </span>
                <span className="font-mono text-xs font-bold text-[#F3F4F6]">
                  {inspectedFinding.control_id}
                </span>
                <span className="text-xs text-[#64748B]">• {inspectedFinding.framework}</span>
              </div>
              <button
                onClick={() => setInspectedFinding(null)}
                className="text-[#64748B] hover:text-[#F3F4F6] text-xs p-1 rounded bg-[#090B0F]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div>
                <div className="text-[#64748B] text-[10px] uppercase font-mono">Finding Title</div>
                <div className="text-[#F3F4F6] font-semibold mt-0.5 text-xs">{inspectedFinding.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2 rounded bg-[#090B0F] border border-[#1E2638]">
                <div>
                  <div className="text-[#64748B] text-[9px] uppercase font-mono">Target Asset</div>
                  <div className="text-[#F3F4F6] font-mono text-xs mt-0.5">{inspectedFinding.asset.device_name}</div>
                </div>
                <div>
                  <div className="text-[#64748B] text-[9px] uppercase font-mono">Vendor Dialect</div>
                  <div className="text-[#94A3B8] font-mono text-xs mt-0.5 uppercase">{inspectedFinding.asset.vendor}</div>
                </div>
              </div>

              {/* Observed Configuration Evidence */}
              <div>
                <div className="text-[#64748B] text-[10px] font-mono uppercase flex items-center justify-between">
                  <span>Observed Configuration Evidence</span>
                  {inspectedFinding.asset.source_lines && inspectedFinding.asset.source_lines.length > 0 && (
                    <span className="text-[#93C5FD]">
                      Line {inspectedFinding.asset.source_lines.join(", ")}
                    </span>
                  )}
                </div>
                <pre className="mt-1 p-2.5 rounded bg-[#090B0F] border border-[#1E2638] font-mono text-[11px] text-[#EF4444] overflow-x-auto whitespace-pre-wrap">
                  {inspectedFinding.asset.evidence || "Non-compliant parameter value observed in device configuration baseline."}
                </pre>
              </div>

              {/* Expected Value & Remediation */}
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2 rounded bg-[#090B0F] border border-[#1E2638]">
                  <div className="text-[#64748B] text-[9px] uppercase">Observed Fact</div>
                  <div className="text-[#EF4444] text-[11px] mt-0.5 truncate">{inspectedFinding.asset.actual_value || "FAIL (Non-compliant)"}</div>
                </div>
                <div className="p-2 rounded bg-[#090B0F] border border-[#1E2638]">
                  <div className="text-[#64748B] text-[9px] uppercase">Expected Requirement</div>
                  <div className="text-[#10B981] text-[11px] mt-0.5 truncate">{inspectedFinding.expected_value || "Enforced in accordance with baseline"}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[#1E2638] font-mono">
              <button
                onClick={() => setInspectedFinding(null)}
                className="px-3 py-1 rounded bg-[#090B0F] hover:bg-[#141A24] border border-[#1E2638] text-[#94A3B8] text-xs font-medium"
              >
                CLOSE
              </button>
              <Link
                href={`/remediation?finding=${inspectedFinding.asset.finding_id}`}
                className="px-3 py-1 rounded bg-[#141A24] hover:bg-[#1A2230] border border-[#1E2638] hover:border-[#28354A] text-[#93C5FD] text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <span>REMEDIATE</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Explainable Risk Score Calculation */}
      {showRiskExplanation && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#0D1117] border border-[#1E2638] p-5 space-y-3.5 shadow-2xl font-mono">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1E2638]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="font-semibold text-xs text-[#F3F4F6] uppercase">DETERMINISTIC RISK SCORE CALCULATION</h3>
              </div>
              <button
                onClick={() => setShowRiskExplanation(false)}
                className="text-[#64748B] hover:text-[#F3F4F6] text-xs p-1 rounded bg-[#090B0F]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <p className="text-[#94A3B8] text-[11px]">
                NetVigil calculates risk deterministically using attack-surface weighting and severity multipliers across active configurations:
              </p>

              <div className="p-2.5 rounded bg-[#090B0F] border border-[#1E2638] space-y-1.5 font-mono text-[10px]">
                <div className="text-[#F3F4F6] font-bold">Deterministic Formula:</div>
                <div className="text-[#94A3B8]">
                  Risk Score = (0.70 × Severity Base) + 1.5 × (Exposure Mod + Impact Mod) + Correlation Bonus
                </div>
                <div className="text-[#64748B] text-[9px] pt-1 border-t border-[#1E2638]">
                  Base: Critical (90) • High (75) • Medium (50) • Low (25) | Exposure: Mgmt Plane (+6), Internet (+10)
                </div>
              </div>

              <div className="space-y-1 font-mono">
                <div className="text-[#64748B] text-[10px] uppercase">Current Evaluation Baseline</div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="p-2 rounded bg-[#111620] border border-[#EF4444]/20">
                    <div className="text-[9px] text-[#EF4444] uppercase">Critical (P0)</div>
                    <div className="font-mono text-xs font-bold text-[#EF4444] mt-0.5">{stats?.severity_breakdown?.critical || 0}</div>
                  </div>
                  <div className="p-2 rounded bg-[#111620] border border-[#F59E0B]/20">
                    <div className="text-[9px] text-[#F59E0B] uppercase">High (P1)</div>
                    <div className="font-mono text-xs font-bold text-[#F59E0B] mt-0.5">{stats?.severity_breakdown?.high || 0}</div>
                  </div>
                  <div className="p-2 rounded bg-[#111620] border border-[#28354A]">
                    <div className="text-[9px] text-[#93C5FD] uppercase">Medium (P2)</div>
                    <div className="font-mono text-xs font-bold text-[#93C5FD] mt-0.5">{stats?.severity_breakdown?.medium || 0}</div>
                  </div>
                  <div className="p-2 rounded bg-[#111620] border border-[#1E2638]">
                    <div className="text-[9px] text-[#94A3B8] uppercase">Low (P3)</div>
                    <div className="font-mono text-xs font-bold text-[#94A3B8] mt-0.5">{stats?.severity_breakdown?.low || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2.5 border-t border-[#1E2638] font-mono">
              <button
                onClick={() => setShowRiskExplanation(false)}
                className="px-3 py-1 rounded bg-[#090B0F] hover:bg-[#141A24] border border-[#1E2638] text-xs text-[#F3F4F6] font-medium"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
