"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Activity,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Eye,
  Wrench,
  Bot,
  Layers,
  ChevronRight,
  ChevronDown,
  Check,
  Server,
  Lock,
  FileCode,
  Sliders,
  HelpCircle,
  X,
  ExternalLink,
  ShieldCheck,
  Terminal,
  AlertCircle,
} from "lucide-react";
import {
  fetchOverviewStats,
  fetchOverviewActivity,
  fetchFindings,
  fetchAudits,
  fetchConfigurations,
  Finding,
  OverviewStats,
  ActivityEvent,
} from "@/lib/api-client";
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

  // 1. Authoritative Backend Posture Metrics
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    error: statsError,
    refetch: refetchStats,
    isRefetching: isStatsRefetching,
  } = useQuery({
    queryKey: ["dashboard-overview-stats"],
    queryFn: () => fetchOverviewStats(),
    staleTime: 15000,
  });

  // 2. Active Findings across Fleet (Status: FAIL)
  const {
    data: rawFindings = [],
    isLoading: isFindingsLoading,
    isError: isFindingsError,
    refetch: refetchFindings,
  } = useQuery({
    queryKey: ["dashboard-active-findings"],
    queryFn: () => fetchFindings({ status: "FAIL" }),
    staleTime: 15000,
  });

  // 3. Real System Activity Log
  const {
    data: activityLogs = [],
    isLoading: isActivityLoading,
    isError: isActivityError,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ["dashboard-overview-activity"],
    queryFn: () => fetchOverviewActivity(10),
    staleTime: 15000,
  });

  // Compute Authoritative Page Operational Status Badge
  const badgeConfig = useMemo(() => {
    if (isOffline || isStatsError) {
      return {
        label: "[ OFFLINE ]",
        bg: "bg-[#EF4444]/10",
        text: "text-[#EF4444]",
        border: "border-[#EF4444]/25",
        pulse: "bg-[#EF4444]",
      };
    }
    if (isDegraded || isFindingsError || isActivityError) {
      return {
        label: "[ TELEMETRY DEGRADED ]",
        bg: "bg-[#F59E0B]/10",
        text: "text-[#F59E0B]",
        border: "border-[#F59E0B]/25",
        pulse: "bg-[#F59E0B]",
      };
    }
    if (isConnecting || (isStatsLoading && !stats)) {
      return {
        label: "[ CONNECTING ]",
        bg: "bg-[#3B82F6]/10",
        text: "text-[#3B82F6]",
        border: "border-[#3B82F6]/25",
        pulse: "bg-[#3B82F6] animate-pulse",
      };
    }
    return {
      label: "[ OPERATIONAL ]",
      bg: "bg-[#10B981]/10",
      text: "text-[#10B981]",
      border: "border-[#10B981]/25",
      pulse: "bg-[#10B981] tactical-pulse-green",
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
        // Avoid duplicate findings on the exact same asset
        if (!group.affected_assets.some((a) => a.finding_id === f.id)) {
          group.affected_assets.push(asset);
        }
      }
    });

    // Sort by severity (CRITICAL > HIGH > MEDIUM > LOW) and affected assets count
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

  const toggleGroupExpand = (key: string) => {
    setExpandedGroupKey((prev) => (prev === key ? null : key));
  };

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
    <div className="max-w-7xl mx-auto space-y-5">
      {/* 1. Tactical Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1D2939] pb-3.5 bg-[#080B12]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold text-[#F3F4F6] tracking-tight font-mono">
              SECURITY POSTURE & TELEMETRY
            </h1>
            <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border font-semibold flex items-center gap-1.5", badgeConfig.bg, badgeConfig.text, badgeConfig.border)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", badgeConfig.pulse)} />
              <span>{badgeConfig.label}</span>
            </span>
          </div>
          <p className="text-xs text-[#A7B0C0] mt-1 font-sans">
            Deterministic compliance evaluation, risk intelligence, and autonomous remediation status across managed assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchHealth();
              refetchStats();
              refetchFindings();
              refetchActivity();
            }}
            disabled={isStatsRefetching}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#0D121C] hover:bg-[#151E2D] border border-[#1D2939] text-[#A7B0C0] hover:text-[#F3F4F6] text-xs font-mono font-medium transition-colors"
            title="Refresh system state"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-[#3B82F6]", isStatsRefetching && "animate-spin")} />
            <span>{isStatsRefetching ? "SYNCING..." : "SYNC STATE"}</span>
          </button>
          <Link
            href="/agent"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-mono font-medium transition-colors shadow-sm"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AGENT CONSOLE</span>
          </Link>
          <Link
            href="/remediation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0D121C] hover:bg-[#151E2D] border border-[#1D2939] text-[#A7B0C0] hover:text-[#F3F4F6] text-xs font-mono font-medium transition-colors"
          >
            <Wrench className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>REMEDIATION</span>
          </Link>
        </div>
      </div>

      {/* 2. Key Posture Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {/* Metric 1: Fleet Compliance */}
        <div className="p-3.5 rounded bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A7B0C0] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px]">Fleet Compliance</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-[#F3F4F6] font-mono tracking-tight">
                {isStatsError ? "—" : stats?.compliance_score !== undefined ? `${stats.compliance_score.toFixed(1)}%` : isStatsLoading ? "..." : "—"}
              </span>
              {!isStatsError && stats?.score_delta !== null && stats?.score_delta !== undefined ? (
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
                  {Math.abs(stats.score_delta).toFixed(1)}% vs prior
                </span>
              ) : !isStatsError && stats ? (
                <span className="text-[10px] text-[#667085] font-mono">Baseline audit</span>
              ) : null}
            </div>
            <p className="text-[10px] text-[#667085] mt-1 font-mono">
              {isStatsError ? "Evaluations unavailable" : isStatsLoading ? "Loading fleet..." : `Evaluated on ${stats?.total_configurations || 0} config(s)`}
            </p>
          </div>
          {/* Framework Breakdown Strip */}
          <div className="pt-2 border-t border-[#1D2939] flex items-center justify-between text-[9px] font-mono text-[#A7B0C0]">
            <span>CIS {isStatsError ? "—" : stats?.framework_scores?.CIS !== undefined ? `${Math.round(stats.framework_scores.CIS)}%` : isStatsLoading ? "..." : "—"}</span>
            <span>NIST {isStatsError ? "—" : stats?.framework_scores?.NIST !== undefined ? `${Math.round(stats.framework_scores.NIST)}%` : isStatsLoading ? "..." : "—"}</span>
            <span>STIG {isStatsError ? "—" : stats?.framework_scores?.STIG !== undefined ? `${Math.round(stats.framework_scores.STIG)}%` : isStatsLoading ? "..." : "—"}</span>
            <span>ISO {isStatsError ? "—" : stats?.framework_scores?.ISO !== undefined ? `${Math.round(stats.framework_scores.ISO)}%` : isStatsLoading ? "..." : "—"}</span>
          </div>
        </div>

        {/* Metric 2: Risk Score */}
        <div className="p-3.5 rounded bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A7B0C0] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px]">Risk Score</span>
            <button
              onClick={() => setShowRiskExplanation(true)}
              className="text-[10px] text-[#3B82F6] hover:underline flex items-center gap-0.5"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Formula</span>
            </button>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-[#F3F4F6] font-mono tracking-tight">
                {isStatsError ? "—" : stats?.risk_score !== undefined ? Math.round(stats.risk_score) : isStatsLoading ? "..." : "—"}
              </span>
              <span className="text-xs text-[#667085] font-mono">/ 100</span>
            </div>
            <p className="text-[10px] text-[#667085] mt-1 font-mono">
              {isStatsError ? "Risk model unavailable" : isStatsLoading ? "Calculating risks..." : `Attack-surface weighted from ${stats?.open_findings || 0} finding(s)`}
            </p>
          </div>
          <div className="pt-2 border-t border-[#1D2939] flex items-center justify-between text-[9px] font-mono text-[#A7B0C0]">
            <span className="text-[#EF4444]">Crit: {isStatsError ? "—" : stats?.severity_breakdown?.critical !== undefined ? stats.severity_breakdown.critical : isStatsLoading ? "..." : "—"}</span>
            <span className="text-[#F59E0B]">High: {isStatsError ? "—" : stats?.severity_breakdown?.high !== undefined ? stats.severity_breakdown.high : isStatsLoading ? "..." : "—"}</span>
            <span className="text-[#60A5FA]">Med: {isStatsError ? "—" : stats?.severity_breakdown?.medium !== undefined ? stats.severity_breakdown.medium : isStatsLoading ? "..." : "—"}</span>
          </div>
        </div>

        {/* Metric 3: Critical Findings (P0) */}
        <div className="p-3.5 rounded bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A7B0C0] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px]">Critical (P0)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#EF4444]/10 text-[#EF4444] font-semibold border border-[#EF4444]/20 font-mono">
              P0 PRIORITY
            </span>
          </div>
          <div>
            <div className="text-2xl font-semibold text-[#EF4444] font-mono tracking-tight">
              {isStatsError ? "—" : stats?.severity_breakdown?.critical !== undefined ? stats.severity_breakdown.critical : isStatsLoading ? "..." : "—"}
            </div>
            <p className="text-[10px] text-[#667085] mt-1 font-mono">
              Cleartext protocols & auth bypass
            </p>
          </div>
          <div className="pt-2 border-t border-[#1D2939] text-[10px] font-mono text-[#A7B0C0] flex items-center justify-between">
            <span>High: {isStatsError ? "—" : stats?.severity_breakdown?.high !== undefined ? stats.severity_breakdown.high : isStatsLoading ? "..." : "—"}</span>
            <Link href="/findings?severity=CRITICAL" className="text-[#3B82F6] hover:underline text-[10px]">
              Inspect →
            </Link>
          </div>
        </div>

        {/* Metric 4: Total Open Findings */}
        <div className="p-3.5 rounded bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A7B0C0] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px]">Open Findings</span>
            <span className="text-[10px] font-mono text-[#667085]">Fleet Active</span>
          </div>
          <div>
            <div className="text-2xl font-semibold text-[#F3F4F6] font-mono tracking-tight">
              {isStatsError ? "—" : stats?.open_findings !== undefined ? stats.open_findings : isStatsLoading ? "..." : "—"}
            </div>
            <p className="text-[10px] text-[#667085] mt-1 font-mono">
              Deterministic non-compliant checks
            </p>
          </div>
          <div className="pt-2 border-t border-[#1D2939] text-[10px] font-mono text-[#A7B0C0] flex items-center justify-between">
            <span>Audits: {isStatsError ? "—" : stats?.total_audits !== undefined ? stats.total_audits : isStatsLoading ? "..." : "—"}</span>
            <Link href="/findings" className="text-[#3B82F6] hover:underline text-[10px]">
              View all →
            </Link>
          </div>
        </div>

        {/* Metric 5: Managed Assets */}
        <div className="p-3.5 rounded bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-colors flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A7B0C0] font-mono">
            <span className="font-medium uppercase tracking-wider text-[11px]">Managed Assets</span>
            <Server className="w-3.5 h-3.5 text-[#3B82F6]" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-[#F3F4F6] font-mono tracking-tight">
              {isStatsError ? "—" : stats?.total_configurations !== undefined ? stats.total_configurations : isStatsLoading ? "..." : "—"}
            </div>
            <p className="text-[10px] text-[#667085] mt-1 font-mono truncate" title={vendorBreakdownSummary}>
              {isStatsError ? "Inventory unavailable" : isStatsLoading ? "Scanning assets..." : vendorBreakdownSummary}
            </p>
          </div>
          <div className="pt-2 border-t border-[#1D2939] text-[10px] font-mono text-[#A7B0C0] flex items-center justify-between">
            <span>Universal AST Engine</span>
            <Link href="/configurations" className="text-[#3B82F6] hover:underline text-[10px]">
              Inventory →
            </Link>
          </div>
        </div>
      </div>

      {/* 2.5. Real Security Telemetry & Visual Analytics Suite */}
      <SecurityTelemetrySection />

      {/* 3. Main Operational Sections (Attention Queue + Activity Stream) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Attention Queue (Grouped Deduplicated Controls) */}
        <div className="lg:col-span-8 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1D2939] pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-mono font-semibold text-[#F3F4F6] uppercase tracking-wider">
                ACTIVE EXPOSURES & FAILED CONTROLS
              </h2>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#EF4444]/10 text-[#EF4444] font-medium border border-[#EF4444]/20">
                {filteredGroups.length} Unique Failed Controls
              </span>
            </div>

            {/* Severity Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#0D121C] border border-[#1D2939] p-0.5 rounded text-xs">
              {(["ALL", "CRITICAL", "HIGH", "MEDIUM"] as const).map((sev) => (
                <button
                  key={`sev_tab_${sev}`}
                  onClick={() => setSeverityFilter(sev)}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors",
                    severityFilter === sev
                      ? "bg-[#111827] text-[#F3F4F6] border border-[#263B55]"
                      : "text-[#A7B0C0] hover:text-[#F3F4F6]"
                  )}
                >
                  {sev === "ALL" ? "ALL TIERS" : sev}
                </button>
              ))}
            </div>
          </div>

          {/* Attention Findings List */}
          <div className="space-y-1.5">
            {isFindingsLoading ? (
              <div className="p-8 text-center rounded bg-[#0D121C] border border-[#1D2939] text-xs text-[#A7B0C0] space-y-2 font-mono">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#3B82F6]" />
                <div>Loading live compliance posture findings...</div>
              </div>
            ) : isFindingsError ? (
              <div className="p-8 text-center rounded bg-[#0D121C] border border-[#EF4444]/30 text-xs text-[#EF4444] space-y-2 font-mono">
                <AlertCircle className="w-5 h-5 mx-auto text-[#EF4444]" />
                <div className="text-sm font-semibold text-[#F3F4F6]">FAILED CONTROLS UNAVAILABLE</div>
                <p className="text-[#A7B0C0] max-w-sm mx-auto text-[11px] font-sans">
                  Unable to query active exposures and failed controls from the backend API.
                </p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-8 text-center rounded bg-[#0D121C] border border-[#1D2939] text-xs text-[#A7B0C0] space-y-1.5">
                <CheckCircle2 className="w-5 h-5 mx-auto text-[#10B981]" />
                <div className="text-sm font-medium text-[#F3F4F6] font-mono">
                  {stats?.total_configurations === 0
                    ? "No configurations ingested yet"
                    : "No matching findings in this severity tier"}
                </div>
                <p className="text-[#667085] max-w-sm mx-auto text-xs">
                  {stats?.total_configurations === 0
                    ? "Upload network device configurations to start deterministic compliance auditing."
                    : "All evaluated rules in this tier have passed benchmark requirements."}
                </p>
                {stats?.total_configurations === 0 && (
                  <div className="pt-2">
                    <Link
                      href="/configurations"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-mono font-medium"
                    >
                      <span>Upload Configuration</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
                    className="rounded bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-colors overflow-hidden"
                  >
                    {/* Control Card Header */}
                    <div className="p-2.5 sm:px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold border",
                              group.severity === "CRITICAL"
                                ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25"
                                : group.severity === "HIGH"
                                ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25"
                                : "bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]/25"
                            )}
                          >
                            {group.severity}
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#3B82F6]">
                            {group.control_id}
                          </span>
                          <span className="text-[10px] font-mono text-[#667085]">• {group.framework}</span>
                        </div>

                        <div className="text-xs font-medium text-[#F3F4F6] truncate">
                          {group.title}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-[#A7B0C0] font-mono">
                          <span className="text-[#667085]">{group.category}</span>
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
                          className="flex items-center gap-1 px-2 py-1 rounded bg-[#111827] hover:bg-[#151E2D] border border-[#1D2939] text-[11px] font-mono text-[#A7B0C0] hover:text-[#F3F4F6] transition-colors"
                        >
                          <span>{isExpanded ? "COLLAPSE" : "ASSETS"}</span>
                          <span className="text-[#3B82F6]">({distinctAssetsCount})</span>
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                        <Link
                          href={`/remediation?control=${group.control_id}`}
                          className="px-2 py-1 rounded bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 border border-[#3B82F6]/30 text-[11px] font-mono text-[#3B82F6] font-medium transition-colors"
                        >
                          PLAN FIX
                        </Link>
                      </div>
                    </div>

                    {/* Expandable Affected Assets Sub-rows */}
                    {isExpanded && (
                      <div className="border-t border-[#1D2939] bg-[#080B12] divide-y divide-[#1D2939]">
                        {group.affected_assets.map((asset, idx) => (
                          <div
                            key={`${group.group_key}_${asset.finding_id}_${idx}`}
                            className="p-2 sm:px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <Server className="w-3 h-3 text-[#667085]" />
                                <span className="font-mono text-xs font-medium text-[#F3F4F6]">
                                  {asset.device_name}
                                </span>
                                <span className="text-[9px] uppercase font-mono px-1 rounded bg-[#0D121C] text-[#A7B0C0] border border-[#1D2939]">
                                  {asset.vendor}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#667085] font-mono truncate max-w-md">
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
                                className="px-2 py-0.5 rounded bg-[#0D121C] hover:bg-[#111827] border border-[#1D2939] text-[#A7B0C0] hover:text-[#F3F4F6] transition-colors"
                              >
                                INSPECT EVIDENCE
                              </button>
                              <Link
                                href={`/remediation?finding=${asset.finding_id}`}
                                className="px-2 py-0.5 rounded bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 border border-[#3B82F6]/30 text-[#3B82F6] transition-colors"
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
          <div className="flex items-center justify-between border-b border-[#1D2939] pb-2">
            <h2 className="text-xs font-mono font-semibold text-[#F3F4F6] uppercase tracking-wider">
              SYSTEM AUDIT TIMELINE
            </h2>
            <span className="text-[9px] text-[#10B981] font-medium flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] tactical-pulse-green" /> LIVE
            </span>
          </div>

          <div className="p-3 rounded bg-[#0D121C] border border-[#1D2939] space-y-2.5 text-xs">
            {isActivityLoading ? (
              <div className="py-6 text-center text-[#A7B0C0] text-xs font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto mb-1 text-[#3B82F6]" />
                <span>Loading activity stream...</span>
              </div>
            ) : isActivityError ? (
              <div className="py-6 text-center text-[#EF4444] text-xs space-y-1 font-mono">
                <AlertCircle className="w-4 h-4 mx-auto text-[#EF4444]" />
                <div className="font-semibold uppercase tracking-wider text-[11px]">SYSTEM ACTIVITY UNAVAILABLE</div>
                <p className="text-[#A7B0C0] text-[10px]">Unable to load real-time system events from backend.</p>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="py-6 text-center text-[#667085] text-xs space-y-1 font-mono">
                <Clock className="w-4 h-4 mx-auto text-[#667085]" />
                <div className="text-[#A7B0C0] font-medium">No activity recorded</div>
                <p className="text-[10px]">System events and audit sessions will populate here.</p>
              </div>
            ) : (
              activityLogs.map((event, idx) => (
                <div key={`${event.id}_${idx}`} className="flex items-start gap-2.5 pb-2.5 border-b border-[#1D2939] last:border-0 last:pb-0">
                  <div
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-mono border",
                      event.severity === "SUCCESS"
                        ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20"
                        : event.severity === "WARNING"
                        ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                        : event.severity === "HIGH" || (event.severity as string) === "CRITICAL"
                        ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20"
                        : "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20"
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
                    <div className="font-medium text-[#F3F4F6] text-xs truncate">
                      {event.title}
                    </div>
                    <div className="text-[#A7B0C0] text-[10px] leading-tight">
                      {event.description}
                    </div>
                    <div className="text-[#667085] text-[9px] font-mono flex items-center justify-between pt-0.5">
                      <span>{formatTimestamp(event.timestamp)}</span>
                      {event.target_url && (
                        <Link href={event.target_url} className="text-[#3B82F6] hover:underline flex items-center gap-0.5">
                          <span>View</span>
                          <ChevronRight className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="pt-2 border-t border-[#1D2939]">
              <Link
                href="/agent"
                className="w-full py-1.5 rounded bg-[#111827] hover:bg-[#151E2D] text-[#3B82F6] text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors border border-[#1D2939]"
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
          <div className="w-full max-w-xl rounded bg-[#0D121C] border border-[#1D2939] p-4 space-y-3 shadow-2xl font-mono">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1D2939]">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold border",
                    inspectedFinding.severity === "CRITICAL"
                      ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20"
                      : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                  )}
                >
                  {inspectedFinding.severity}
                </span>
                <span className="font-mono text-xs font-semibold text-[#F3F4F6]">
                  {inspectedFinding.control_id}
                </span>
                <span className="text-xs text-[#667085]">• {inspectedFinding.framework}</span>
              </div>
              <button
                onClick={() => setInspectedFinding(null)}
                className="text-[#667085] hover:text-[#F3F4F6] text-xs p-1 rounded bg-[#080B12]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-sans">
              <div>
                <div className="text-[#667085] text-[10px] uppercase font-mono">Finding Title</div>
                <div className="text-[#F3F4F6] font-medium mt-0.5 text-xs">{inspectedFinding.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2 rounded bg-[#080B12] border border-[#1D2939]">
                <div>
                  <div className="text-[#667085] text-[9px] uppercase font-mono">Target Asset</div>
                  <div className="text-[#F3F4F6] font-mono text-xs mt-0.5">{inspectedFinding.asset.device_name}</div>
                </div>
                <div>
                  <div className="text-[#667085] text-[9px] uppercase font-mono">Vendor Dialect</div>
                  <div className="text-[#3B82F6] font-mono text-xs mt-0.5 uppercase">{inspectedFinding.asset.vendor}</div>
                </div>
              </div>

              {/* Observed Configuration Evidence */}
              <div>
                <div className="text-[#667085] text-[10px] font-mono uppercase flex items-center justify-between">
                  <span>Observed Configuration Evidence</span>
                  {inspectedFinding.asset.source_lines && inspectedFinding.asset.source_lines.length > 0 && (
                    <span className="text-[#3B82F6]">
                      Source Line: {inspectedFinding.asset.source_lines.join(", ")}
                    </span>
                  )}
                </div>
                <pre className="mt-1 p-2 rounded bg-[#080B12] border border-[#1D2939] font-mono text-[11px] text-[#EF4444] overflow-x-auto whitespace-pre-wrap">
                  {inspectedFinding.asset.evidence || "Non-compliant parameter value observed in device configuration baseline."}
                </pre>
              </div>

              {/* Expected Value & Remediation */}
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2 rounded bg-[#080B12] border border-[#1D2939]">
                  <div className="text-[#667085] text-[9px] uppercase">Observed Fact</div>
                  <div className="text-[#EF4444] text-[11px] mt-0.5 truncate">{inspectedFinding.asset.actual_value || "FAIL (Non-compliant)"}</div>
                </div>
                <div className="p-2 rounded bg-[#080B12] border border-[#1D2939]">
                  <div className="text-[#667085] text-[9px] uppercase">Expected Requirement</div>
                  <div className="text-[#10B981] text-[11px] mt-0.5 truncate">{inspectedFinding.expected_value || "Enforced in accordance with baseline"}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[#1D2939] font-mono">
              <button
                onClick={() => setInspectedFinding(null)}
                className="px-2.5 py-1 rounded bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] text-[#A7B0C0] text-xs font-medium"
              >
                CLOSE
              </button>
              <Link
                href={`/remediation?finding=${inspectedFinding.asset.finding_id}`}
                className="px-3 py-1 rounded bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <span>REMEDIATE FINDING</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Explainable Risk Score Calculation */}
      {showRiskExplanation && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded bg-[#0D121C] border border-[#1D2939] p-4 space-y-3 shadow-2xl font-mono">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1D2939]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="font-semibold text-xs text-[#F3F4F6] uppercase">DETERMINISTIC RISK SCORE CALCULATION</h3>
              </div>
              <button
                onClick={() => setShowRiskExplanation(false)}
                className="text-[#667085] hover:text-[#F3F4F6] text-xs p-1 rounded bg-[#080B12]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-sans">
              <p className="text-[#A7B0C0] text-[11px]">
                NetVigil calculates risk deterministically using attack-surface weighting and severity multipliers across active configurations:
              </p>

              <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939] space-y-1.5 font-mono text-[10px]">
                <div className="text-[#3B82F6] font-bold">Deterministic Formula:</div>
                <div className="text-[#A7B0C0]">
                  Risk Score = (0.70 × Severity Base) + 1.5 × (Exposure Mod + Impact Mod) + Correlation Bonus
                </div>
                <div className="text-[#667085] text-[9px] pt-1 border-t border-[#1D2939]">
                  Base: Critical (90) • High (75) • Medium (50) • Low (25) | Exposure: Mgmt Plane (+6), Internet (+10)
                </div>
              </div>

              <div className="space-y-1 font-mono">
                <div className="text-[#667085] text-[10px] uppercase">Current Evaluation Baseline</div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="p-1.5 rounded bg-[#111827] border border-[#EF4444]/20">
                    <div className="text-[9px] text-[#EF4444] uppercase">Critical (P0)</div>
                    <div className="font-mono text-xs font-bold text-[#EF4444] mt-0.5">{stats?.severity_breakdown?.critical || 0}</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#111827] border border-[#F59E0B]/20">
                    <div className="text-[9px] text-[#F59E0B] uppercase">High (P1)</div>
                    <div className="font-mono text-xs font-bold text-[#F59E0B] mt-0.5">{stats?.severity_breakdown?.high || 0}</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#111827] border border-[#3B82F6]/20">
                    <div className="text-[9px] text-[#60A5FA] uppercase">Medium (P2)</div>
                    <div className="font-mono text-xs font-bold text-[#60A5FA] mt-0.5">{stats?.severity_breakdown?.medium || 0}</div>
                  </div>
                  <div className="p-1.5 rounded bg-[#111827] border border-[#1D2939]">
                    <div className="text-[9px] text-[#A7B0C0] uppercase">Low (P3)</div>
                    <div className="font-mono text-xs font-bold text-[#A7B0C0] mt-0.5">{stats?.severity_breakdown?.low || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2.5 border-t border-[#1D2939] font-mono">
              <button
                onClick={() => setShowRiskExplanation(false)}
                className="px-3 py-1 rounded bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] text-xs text-[#F3F4F6] font-medium"
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
