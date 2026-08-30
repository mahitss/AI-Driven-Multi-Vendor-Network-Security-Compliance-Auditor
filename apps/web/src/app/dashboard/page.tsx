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
import { cn } from "@/lib/utils";

// Grouped Finding Structure across Multi-Vendor Assets
interface AffectedAsset {
  finding_id: string;
  device_name: string;
  vendor: string;
  evidence?: string;
  source_lines?: number[];
  actual_value?: string;
  expected_value?: string;
  configuration_id?: string;
  remediation?: string;
  audit_id: string;
}

interface ControlFindingGroup {
  group_key: string;
  control_id: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  category: string;
  framework: string;
  description?: string;
  expected_value?: string;
  remediation?: string;
  affected_assets: AffectedAsset[];
}

export default function DashboardPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [expandedControlId, setExpandedControlId] = useState<string | null>(null);
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

  // 1. Authoritative Backend Posture Metrics
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["dashboard-overview-stats"],
    queryFn: () => fetchOverviewStats(),
    staleTime: 15000,
  });

  // 2. Active Findings across Fleet (Status: FAIL)
  const {
    data: rawFindings = [],
    isLoading: isFindingsLoading,
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
  } = useQuery({
    queryKey: ["dashboard-overview-activity"],
    queryFn: () => fetchOverviewActivity(10),
    staleTime: 15000,
  });

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
        configuration_id: f.configuration_id,
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
      const orderA = severityOrder[a.severity] ?? 5;
      const orderB = severityOrder[b.severity] ?? 5;
      if (orderA !== orderB) return orderA - orderB;
      return b.affected_assets.length - a.affected_assets.length;
    });
  }, [rawFindings]);

  // Filtered Attention Groups
  const filteredGroups = useMemo(() => {
    if (severityFilter === "ALL") return groupedFindings;
    return groupedFindings.filter((g) => g.severity === severityFilter);
  }, [groupedFindings, severityFilter]);

  // Format Timestamps Operationally
  const formatTimestamp = (tsString?: string) => {
    if (!tsString) return "Recorded";
    try {
      const date = new Date(tsString.includes("Z") || tsString.includes("+") ? tsString : `${tsString}Z`);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return tsString;
    }
  };

  // Vendor Breakdown Text
  const vendorBreakdownSummary = useMemo(() => {
    if (!stats?.vendor_breakdown || Object.keys(stats.vendor_breakdown).length === 0) {
      return stats?.total_configurations ? `${stats.total_configurations} configured` : "0 assets registered";
    }
    return Object.entries(stats.vendor_breakdown)
      .map(([vendor, count]) => `${vendor.charAt(0).toUpperCase() + vendor.slice(1)} (${count})`)
      .join(", ");
  }, [stats]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#181a22] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-[#f0f3f8] tracking-tight">Security Posture</h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
              OPERATIONAL
            </span>
          </div>
          <p className="text-xs text-[#8b95a8] mt-1">
            Deterministic compliance evaluation, risk intelligence, and autonomous remediation status across managed assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchStats();
              refetchFindings();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#12141a] hover:bg-[#181a22] border border-[#181a22] text-[#8b95a8] hover:text-[#f0f3f8] text-xs font-medium transition-colors"
            title="Refresh system state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync State</span>
          </button>
          <Link
            href="/agent"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Autonomous Agent</span>
          </Link>
          <Link
            href="/remediation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#12141a] hover:bg-[#181a22] border border-[#181a22] text-[#c5cbd8] hover:text-[#f0f3f8] text-xs font-medium transition-colors"
          >
            <Wrench className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span>Remediation Center</span>
          </Link>
        </div>
      </div>

      {/* 2. Key Posture Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Metric 1: Fleet Compliance */}
        <div className="p-4 rounded bg-[#0d0e12] border border-[#181a22] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8b95a8]">
            <span className="font-medium">Fleet Compliance</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-[#f0f3f8] font-mono">
                {stats?.compliance_score !== undefined ? `${stats.compliance_score.toFixed(1)}%` : "—"}
              </span>
              {stats?.score_delta !== null && stats?.score_delta !== undefined ? (
                <span
                  className={cn(
                    "text-[11px] font-medium flex items-center gap-0.5",
                    stats.score_delta >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
                  )}
                >
                  {stats.score_delta >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(stats.score_delta).toFixed(1)}% vs prior audit
                </span>
              ) : (
                <span className="text-[10px] text-[#5d677a]">No previous audit</span>
              )}
            </div>
            <p className="text-[11px] text-[#5d677a] mt-1">
              Calculated across {stats?.total_configurations || 0} configuration(s)
            </p>
          </div>
          {/* Framework Breakdown Strip */}
          <div className="pt-2 border-t border-[#181a22] flex items-center justify-between text-[10px] font-mono text-[#8b95a8]">
            <span>CIS {stats?.framework_scores?.CIS !== undefined ? `${Math.round(stats.framework_scores.CIS)}%` : "—"}</span>
            <span>NIST {stats?.framework_scores?.NIST !== undefined ? `${Math.round(stats.framework_scores.NIST)}%` : "—"}</span>
            <span>STIG {stats?.framework_scores?.STIG !== undefined ? `${Math.round(stats.framework_scores.STIG)}%` : "—"}</span>
            <span>ISO {stats?.framework_scores?.ISO !== undefined ? `${Math.round(stats.framework_scores.ISO)}%` : "—"}</span>
          </div>
        </div>

        {/* Metric 2: Risk Score */}
        <div className="p-4 rounded bg-[#0d0e12] border border-[#181a22] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8b95a8]">
            <span className="font-medium">Risk Score</span>
            <button
              onClick={() => setShowRiskExplanation(true)}
              className="text-[10px] text-[#0ea5e9] hover:underline flex items-center gap-0.5"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Calculation</span>
            </button>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-[#f0f3f8] font-mono">
                {stats?.risk_score !== undefined ? Math.round(stats.risk_score) : "—"}
              </span>
              <span className="text-xs text-[#5d677a]">/ 100</span>
            </div>
            <p className="text-[11px] text-[#5d677a] mt-1">
              Attack-surface weighted from {stats?.open_findings || 0} finding(s)
            </p>
          </div>
          <div className="pt-2 border-t border-[#181a22] flex items-center justify-between text-[10px] text-[#8b95a8]">
            <span>Critical: {stats?.severity_breakdown?.critical || 0}</span>
            <span>High: {stats?.severity_breakdown?.high || 0}</span>
            <span>Medium: {stats?.severity_breakdown?.medium || 0}</span>
          </div>
        </div>

        {/* Metric 3: Critical Findings (P0) */}
        <div className="p-4 rounded bg-[#0d0e12] border border-[#181a22] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8b95a8]">
            <span className="font-medium">Critical Findings</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ef4444]/10 text-[#ef4444] font-semibold border border-[#ef4444]/20">
              P0 PRIORITY
            </span>
          </div>
          <div>
            <div className="text-2xl font-semibold text-[#ef4444] font-mono">
              {stats?.severity_breakdown?.critical || 0}
            </div>
            <p className="text-[11px] text-[#5d677a] mt-1">
              Cleartext protocols & insecure authentication
            </p>
          </div>
          <div className="pt-2 border-t border-[#181a22] text-[10px] text-[#8b95a8] flex items-center justify-between">
            <span>High: {stats?.severity_breakdown?.high || 0}</span>
            <Link href="/findings?severity=CRITICAL" className="text-[#0ea5e9] hover:underline">
              Inspect →
            </Link>
          </div>
        </div>

        {/* Metric 4: Total Open Findings */}
        <div className="p-4 rounded bg-[#0d0e12] border border-[#181a22] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8b95a8]">
            <span className="font-medium">Open Findings</span>
            <span className="text-[10px] text-[#8b95a8]">Across Fleet</span>
          </div>
          <div>
            <div className="text-2xl font-semibold text-[#f0f3f8] font-mono">
              {stats?.open_findings || 0}
            </div>
            <p className="text-[11px] text-[#5d677a] mt-1">
              Active non-compliant control checks
            </p>
          </div>
          <div className="pt-2 border-t border-[#181a22] text-[10px] text-[#8b95a8] flex items-center justify-between">
            <span>Total Audits: {stats?.total_audits || 0}</span>
            <Link href="/findings" className="text-[#0ea5e9] hover:underline">
              View all →
            </Link>
          </div>
        </div>

        {/* Metric 5: Managed Assets */}
        <div className="p-4 rounded bg-[#0d0e12] border border-[#181a22] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8b95a8]">
            <span className="font-medium">Managed Assets</span>
            <Server className="w-3.5 h-3.5 text-[#0ea5e9]" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-[#f0f3f8] font-mono">
              {stats?.total_configurations || 0}
            </div>
            <p className="text-[11px] text-[#5d677a] mt-1 truncate" title={vendorBreakdownSummary}>
              {vendorBreakdownSummary}
            </p>
          </div>
          <div className="pt-2 border-t border-[#181a22] text-[10px] text-[#8b95a8] flex items-center justify-between">
            <span>Universal AST Engine</span>
            <Link href="/configurations" className="text-[#0ea5e9] hover:underline">
              Inventory →
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Main Operational Sections (Attention Queue + Activity Stream) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Attention Queue (Grouped Deduplicated Controls) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#f0f3f8]">Requires Attention</h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ef4444]/10 text-[#ef4444] font-medium border border-[#ef4444]/20">
                {filteredGroups.length} Unique Failed Controls
              </span>
            </div>

            {/* Severity Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#0d0e12] border border-[#181a22] p-0.5 rounded text-xs">
              {(["ALL", "CRITICAL", "HIGH", "MEDIUM"] as const).map((sev) => (
                <button
                  key={`sev_tab_${sev}`}
                  onClick={() => setSeverityFilter(sev)}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors",
                    severityFilter === sev
                      ? "bg-[#181a22] text-[#f0f3f8]"
                      : "text-[#8b95a8] hover:text-[#f0f3f8]"
                  )}
                >
                  {sev === "ALL" ? "All Tiers" : sev}
                </button>
              ))}
            </div>
          </div>

          {/* Attention Findings List */}
          <div className="space-y-2">
            {isFindingsLoading ? (
              <div className="p-8 text-center rounded bg-[#0d0e12] border border-[#181a22] text-xs text-[#8b95a8] space-y-2">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#0ea5e9]" />
                <div>Loading live compliance posture findings...</div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-8 text-center rounded bg-[#0d0e12] border border-[#181a22] text-xs text-[#8b95a8] space-y-1.5">
                <CheckCircle2 className="w-5 h-5 mx-auto text-[#10b981]" />
                <div className="text-sm font-medium text-[#f0f3f8]">
                  {stats?.total_configurations === 0
                    ? "No configurations ingested yet"
                    : "No matching findings in this severity tier"}
                </div>
                <p className="text-[#5d677a] max-w-sm mx-auto">
                  {stats?.total_configurations === 0
                    ? "Upload network device configurations to start deterministic compliance auditing."
                    : "All evaluated rules in this tier have passed benchmark requirements."}
                </p>
                {stats?.total_configurations === 0 && (
                  <div className="pt-2">
                    <Link
                      href="/configurations"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#0ea5e9] text-white text-xs font-medium"
                    >
                      <span>Upload Configuration</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              filteredGroups.map((group, groupIdx) => {
                const isExpanded = expandedControlId === group.group_key;
                const distinctAssetsCount = group.affected_assets.length;

                return (
                  <div
                    key={`ctrl_grp_${group.group_key}_${groupIdx}`}
                    className="rounded bg-[#0d0e12] border border-[#181a22] hover:border-[#222632] transition-colors overflow-hidden"
                  >
                    {/* Control Card Header */}
                    <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border",
                              group.severity === "CRITICAL"
                                ? "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20"
                                : group.severity === "HIGH"
                                ? "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20"
                                : "bg-[#0ea5e9]/10 text-[#0ea5e9] border-[#0ea5e9]/20"
                            )}
                          >
                            {group.severity}
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#0ea5e9]">
                            {group.control_id}
                          </span>
                          <span className="text-[11px] text-[#5d677a]">• {group.framework}</span>
                        </div>

                        <div className="text-xs font-medium text-[#f0f3f8] truncate">
                          {group.title}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#8b95a8]">
                          <span className="text-[#5d677a]">{group.category}</span>
                          <span>•</span>
                          <span className="font-mono text-[#f59e0b]">
                            {distinctAssetsCount} asset{distinctAssetsCount > 1 ? "s" : ""} affected
                          </span>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        <button
                          onClick={() => setExpandedControlId(isExpanded ? null : group.group_key)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#12141a] hover:bg-[#181a22] border border-[#181a22] text-xs text-[#8b95a8] hover:text-[#f0f3f8] font-medium transition-colors"
                        >
                          <span>{isExpanded ? "Collapse" : "Assets"}</span>
                          <span className="font-mono text-[10px] text-[#0ea5e9]">({distinctAssetsCount})</span>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <Link
                          href={`/remediation?control=${group.control_id}`}
                          className="px-2.5 py-1 rounded bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 text-xs text-[#0ea5e9] font-medium transition-colors"
                        >
                          Plan Fix
                        </Link>
                      </div>
                    </div>

                    {/* Expandable Affected Assets Sub-rows */}
                    {isExpanded && (
                      <div className="border-t border-[#181a22] bg-[#08090b] divide-y divide-[#181a22]">
                        {group.affected_assets.map((asset, idx) => (
                          <div
                            key={`${group.group_key}_${asset.finding_id}_${idx}`}
                            className="p-2.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <Server className="w-3 h-3 text-[#5d677a]" />
                                <span className="font-mono text-xs font-medium text-[#f0f3f8]">
                                  {asset.device_name}
                                </span>
                                <span className="text-[10px] uppercase font-mono px-1 rounded bg-[#12141a] text-[#8b95a8] border border-[#181a22]">
                                  {asset.vendor}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#5d677a] font-mono truncate max-w-md">
                                {asset.evidence
                                  ? asset.evidence
                                  : asset.source_lines && asset.source_lines.length > 0
                                  ? `Observed line ${asset.source_lines[0]}`
                                  : "Non-compliant baseline state detected"}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
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
                                className="px-2 py-0.5 rounded bg-[#12141a] hover:bg-[#181a22] border border-[#181a22] text-[11px] text-[#8b95a8] hover:text-[#f0f3f8] transition-colors"
                              >
                                Inspect Evidence
                              </button>
                              <Link
                                href={`/remediation?finding=${asset.finding_id}`}
                                className="px-2 py-0.5 rounded bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 text-[11px] text-[#0ea5e9] transition-colors"
                              >
                                Remediate
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
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#f0f3f8]">System Activity</h2>
            <span className="text-[10px] text-[#10b981] font-medium flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> LIVE FEED
            </span>
          </div>

          <div className="p-3.5 rounded bg-[#0d0e12] border border-[#181a22] space-y-3 text-xs">
            {isActivityLoading ? (
              <div className="py-6 text-center text-[#8b95a8] text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto mb-1 text-[#0ea5e9]" />
                <span>Loading activity stream...</span>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="py-6 text-center text-[#5d677a] text-xs space-y-1">
                <Clock className="w-4 h-4 mx-auto text-[#5d677a]" />
                <div className="text-[#8b95a8] font-medium">No activity recorded</div>
                <p className="text-[11px]">System events and audit sessions will populate here.</p>
              </div>
            ) : (
              activityLogs.map((event, idx) => (
                <div key={`${event.id}_${idx}`} className="flex items-start gap-2.5 pb-2.5 border-b border-[#181a22] last:border-0 last:pb-0">
                  <div
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-mono",
                      event.severity === "SUCCESS"
                        ? "bg-[#10b981]/10 text-[#10b981]"
                        : event.severity === "WARNING"
                        ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                        : event.severity === "HIGH" || (event.severity as string) === "CRITICAL"
                        ? "bg-[#ef4444]/10 text-[#ef4444]"
                        : "bg-[#0ea5e9]/10 text-[#0ea5e9]"
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
                    <div className="font-medium text-[#f0f3f8] text-xs truncate">
                      {event.title}
                    </div>
                    <div className="text-[#8b95a8] text-[11px] leading-tight">
                      {event.description}
                    </div>
                    <div className="text-[#5d677a] text-[10px] font-mono flex items-center justify-between pt-0.5">
                      <span>{formatTimestamp(event.timestamp)}</span>
                      {event.target_url && (
                        <Link href={event.target_url} className="text-[#0ea5e9] hover:underline flex items-center gap-0.5">
                          <span>View</span>
                          <ChevronRight className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="pt-2 border-t border-[#181a22]">
              <Link
                href="/agent"
                className="w-full py-1.5 rounded bg-[#12141a] hover:bg-[#181a22] text-[#0ea5e9] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-[#181a22]"
              >
                <span>Launch Autonomous Engineer</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Inspect Finding Evidence (Deterministic Traceability) */}
      {inspectedFinding && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded bg-[#0d0e12] border border-[#222632] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#181a22]">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border",
                    inspectedFinding.severity === "CRITICAL"
                      ? "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20"
                      : "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20"
                  )}
                >
                  {inspectedFinding.severity}
                </span>
                <span className="font-mono text-xs font-semibold text-[#f0f3f8]">
                  {inspectedFinding.control_id}
                </span>
                <span className="text-xs text-[#5d677a]">• {inspectedFinding.framework}</span>
              </div>
              <button
                onClick={() => setInspectedFinding(null)}
                className="text-[#8b95a8] hover:text-[#f0f3f8] text-xs p-1 rounded bg-[#12141a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[#5d677a] text-[11px]">Finding Title</div>
                <div className="text-[#f0f3f8] font-medium mt-0.5">{inspectedFinding.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-[#050608] border border-[#181a22]">
                <div>
                  <div className="text-[#5d677a] text-[10px] uppercase font-mono">Target Asset</div>
                  <div className="text-[#f0f3f8] font-mono text-xs mt-0.5">{inspectedFinding.asset.device_name}</div>
                </div>
                <div>
                  <div className="text-[#5d677a] text-[10px] uppercase font-mono">Vendor Dialect</div>
                  <div className="text-[#0ea5e9] font-mono text-xs mt-0.5 uppercase">{inspectedFinding.asset.vendor}</div>
                </div>
              </div>

              {/* Observed Configuration Evidence */}
              <div>
                <div className="text-[#5d677a] text-[11px] flex items-center justify-between">
                  <span>Observed Configuration Evidence</span>
                  {inspectedFinding.asset.source_lines && inspectedFinding.asset.source_lines.length > 0 && (
                    <span className="font-mono text-[#0ea5e9]">
                      Source Line: {inspectedFinding.asset.source_lines.join(", ")}
                    </span>
                  )}
                </div>
                <pre className="mt-1 p-2.5 rounded bg-[#050608] border border-[#181a22] font-mono text-[11px] text-[#ef4444] overflow-x-auto whitespace-pre-wrap">
                  {inspectedFinding.asset.evidence || "Non-compliant parameter value observed in device configuration baseline."}
                </pre>
              </div>

              {/* Expected Value & Remediation */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-[#050608] border border-[#181a22]">
                  <div className="text-[#5d677a] text-[10px] uppercase font-mono">Observed Fact</div>
                  <div className="font-mono text-[#ef4444] mt-0.5">{inspectedFinding.asset.actual_value || "FAIL (Non-compliant)"}</div>
                </div>
                <div className="p-2 rounded bg-[#050608] border border-[#181a22]">
                  <div className="text-[#5d677a] text-[10px] uppercase font-mono">Expected Requirement</div>
                  <div className="font-mono text-[#10b981] mt-0.5">{inspectedFinding.expected_value || "Enforced in accordance with baseline"}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#181a22]">
              <button
                onClick={() => setInspectedFinding(null)}
                className="px-3 py-1.5 rounded bg-[#12141a] hover:bg-[#181a22] border border-[#181a22] text-[#8b95a8] text-xs font-medium"
              >
                Close
              </button>
              <Link
                href={`/remediation?finding=${inspectedFinding.asset.finding_id}`}
                className="px-3 py-1.5 rounded bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-medium transition-colors flex items-center gap-1"
              >
                <span>Remediate Finding</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Explainable Risk Score Calculation */}
      {showRiskExplanation && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded bg-[#0d0e12] border border-[#222632] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#181a22]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#f59e0b]" />
                <h3 className="font-semibold text-sm text-[#f0f3f8]">Deterministic Risk Score Calculation</h3>
              </div>
              <button
                onClick={() => setShowRiskExplanation(false)}
                className="text-[#8b95a8] hover:text-[#f0f3f8] text-xs p-1 rounded bg-[#12141a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#8b95a8]">
                NetVigil calculates risk deterministically using attack-surface weighting and severity multipliers across active configurations:
              </p>

              <div className="p-3 rounded bg-[#050608] border border-[#181a22] space-y-2 font-mono text-[11px]">
                <div className="text-[#0ea5e9] font-semibold">Deterministic Formula:</div>
                <div className="text-[#c5cbd8]">
                  Risk Score = (0.70 × Severity Base) + 1.5 × (Exposure Mod + Impact Mod) + Correlation Bonus
                </div>
                <div className="text-[#5d677a] text-[10px] pt-1 border-t border-[#181a22]">
                  Base: Critical (90) • High (75) • Medium (50) • Low (25) | Exposure: Mgmt Plane (+6), Internet (+10)
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[#5d677a] text-[11px] uppercase font-mono">Current Evaluation Baseline</div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded bg-[#12141a] border border-[#ef4444]/20">
                    <div className="text-[10px] text-[#ef4444] uppercase">Critical (P0)</div>
                    <div className="font-mono text-sm font-semibold text-[#ef4444] mt-0.5">{stats?.severity_breakdown?.critical || 0}</div>
                  </div>
                  <div className="p-2 rounded bg-[#12141a] border border-[#f59e0b]/20">
                    <div className="text-[10px] text-[#f59e0b] uppercase">High (P1)</div>
                    <div className="font-mono text-sm font-semibold text-[#f59e0b] mt-0.5">{stats?.severity_breakdown?.high || 0}</div>
                  </div>
                  <div className="p-2 rounded bg-[#12141a] border border-[#0ea5e9]/20">
                    <div className="text-[10px] text-[#0ea5e9] uppercase">Medium (P2)</div>
                    <div className="font-mono text-sm font-semibold text-[#0ea5e9] mt-0.5">{stats?.severity_breakdown?.medium || 0}</div>
                  </div>
                  <div className="p-2 rounded bg-[#12141a] border border-[#181a22]">
                    <div className="text-[10px] text-[#8b95a8] uppercase">Low (P3)</div>
                    <div className="font-mono text-sm font-semibold text-[#8b95a8] mt-0.5">{stats?.severity_breakdown?.low || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#181a22]">
              <button
                onClick={() => setShowRiskExplanation(false)}
                className="px-4 py-1.5 rounded bg-[#12141a] hover:bg-[#181a22] text-xs text-[#f0f3f8] font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
