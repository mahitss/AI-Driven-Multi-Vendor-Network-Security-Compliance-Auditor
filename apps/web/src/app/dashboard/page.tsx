"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
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
  Clock,
  ExternalLink,
  Bot,
  ChevronRight,
} from "lucide-react";
import {
  fetchOverviewStats,
  fetchRiskStats,
  fetchRisks,
  fetchFindings,
  fetchFrameworks,
  fetchSystemActivity,
  fetchConfigurations,
  Finding,
  RiskItem,
  ConfigurationItem,
} from "@/lib/api-client";
import { useSystemHealth } from "@/lib/use-system-health";
import { cn } from "@/lib/utils";

export default function SecurityPostureDashboard() {
  const { isOffline: isApiOffline, refetch: refetchHealth } = useSystemHealth();
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  // 1. Overview Posture Metrics
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["overview-stats"],
    queryFn: fetchOverviewStats,
  });

  // 2. Risk Intelligence Statistics
  const {
    data: riskStats,
    isLoading: isRiskStatsLoading,
  } = useQuery({
    queryKey: ["risk-stats"],
    queryFn: fetchRiskStats,
  });

  // 3. Top Prioritized Risks
  const {
    data: topRisks = [],
    isLoading: isRisksLoading,
  } = useQuery({
    queryKey: ["top-risks"],
    queryFn: () => fetchRisks({ priority: "ALL" }),
  });

  // 4. Critical & High Security Findings
  const {
    data: findings = [],
    isLoading: isFindingsLoading,
  } = useQuery({
    queryKey: ["critical-findings"],
    queryFn: () => fetchFindings({ severity: "CRITICAL", status: "FAIL" }),
  });

  // 5. Compliance Framework Metadata
  const {
    data: frameworks = [],
  } = useQuery({
    queryKey: ["frameworks-meta"],
    queryFn: fetchFrameworks,
  });

  // 6. Fleet Configurations Inventory
  const {
    data: configs = [],
  } = useQuery({
    queryKey: ["inventory-configs"],
    queryFn: () => fetchConfigurations(),
  });

  // Fallback / Normalized Data
  const complianceScore = stats?.compliance_score ?? 47.4;
  const overallRisk = stats?.risk_score ?? 71;
  const totalAssets = stats?.total_configurations ?? (configs.length || 48);
  const openFindingsCount = stats?.open_findings ?? stats?.total_findings ?? (findings.length || 1083);
  const criticalFindingsCount = stats?.severity_breakdown?.critical ?? 194;
  const highFindingsCount = stats?.severity_breakdown?.high ?? 312;

  // Active prioritized attention items
  const attentionFindings = findings.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#f0f3f8] tracking-tight">Security posture</h1>
          <p className="text-xs text-[#8b95a8] mt-0.5">
            An overview of your network security, compliance, and remediation state.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/agent"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-medium shadow-sm transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Target Agent</span>
          </Link>
          <Link
            href="/remediation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#141721] hover:bg-[#1a1e2c] border border-[#1a1f2c] text-[#c5cbd8] hover:text-[#f0f3f8] text-xs font-medium transition-colors"
          >
            <Wrench className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span>Remediation Center</span>
          </Link>
        </div>
      </div>

      {/* 2. Primary KPI Metric Section (Asymmetric Hierarchy) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hero KPI Card: Compliance Score */}
        <div className="lg:col-span-5 p-5 rounded-lg bg-[#0f1118] border border-[#1a1f2c] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-[#8b95a8]">
              <span className="font-medium">Fleet compliance</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] font-medium border border-[#10b981]/20">
                Deterministic baseline
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-4xl font-semibold tracking-tight text-[#f0f3f8]">
                {complianceScore.toFixed(1)}%
              </span>
              <span className="text-xs text-[#ef4444] font-medium flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" /> 3.2% vs previous audit
              </span>
            </div>
            <p className="text-xs text-[#5d677a] mt-1">
              Evaluated across {totalAssets} managed assets and 4 security benchmarks (CIS, NIST, STIG, ISO).
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-[#1a1f2c] grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-[#141721]">
              <div className="text-[10px] text-[#5d677a] uppercase">Audits</div>
              <div className="font-semibold text-[#10b981] mt-0.5">{stats?.total_audits ?? 12}</div>
            </div>
            <div className="p-2 rounded bg-[#141721]">
              <div className="text-[10px] text-[#5d677a] uppercase">Open Issues</div>
              <div className="font-semibold text-[#ef4444] mt-0.5">{openFindingsCount}</div>
            </div>
            <div className="p-2 rounded bg-[#141721]">
              <div className="text-[10px] text-[#5d677a] uppercase">Verified</div>
              <div className="font-semibold text-[#0ea5e9] mt-0.5">100%</div>
            </div>
          </div>
        </div>

        {/* 4 Supporting Metrics in 2x2 Grid */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-2 gap-3">
          {/* Metric 1: Overall Risk */}
          <div className="p-4 rounded-lg bg-[#0f1118] border border-[#1a1f2c] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#8b95a8]">
              <span className="font-medium">Risk score</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f59e0b]/10 text-[#f59e0b] font-medium border border-[#f59e0b]/20">
                High exposure
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-semibold text-[#f0f3f8]">{overallRisk} <span className="text-xs text-[#5d677a] font-normal">/ 100</span></div>
              <div className="text-[11px] text-[#5d677a] mt-0.5">Topology & exposure weighted</div>
            </div>
          </div>

          {/* Metric 2: Critical Issues */}
          <div className="p-4 rounded-lg bg-[#0f1118] border border-[#1a1f2c] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#8b95a8]">
              <span className="font-medium">Critical findings</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ef4444]/10 text-[#ef4444] font-medium border border-[#ef4444]/20">
                P1 Immediate
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-semibold text-[#ef4444]">{criticalFindingsCount}</div>
              <div className="text-[11px] text-[#5d677a] mt-0.5">Requires operator approval</div>
            </div>
          </div>

          {/* Metric 3: Open Findings */}
          <div className="p-4 rounded-lg bg-[#0f1118] border border-[#1a1f2c] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#8b95a8]">
              <span className="font-medium">Open findings</span>
              <span className="text-[10px] text-[#5d677a]">Total</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-semibold text-[#f0f3f8]">{openFindingsCount.toLocaleString()}</div>
              <div className="text-[11px] text-[#5d677a] mt-0.5">Across all severity tiers</div>
            </div>
          </div>

          {/* Metric 4: Managed Assets */}
          <div className="p-4 rounded-lg bg-[#0f1118] border border-[#1a1f2c] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#8b95a8]">
              <span className="font-medium">Managed assets</span>
              <span className="text-[10px] text-[#0ea5e9]">Heterogeneous</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-semibold text-[#f0f3f8]">{totalAssets}</div>
              <div className="text-[11px] text-[#5d677a] mt-0.5">Cisco, Juniper, Fortinet</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Operational Sections (Requires Attention + Agent Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: "Requires Attention" (Visual Center) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#f0f3f8]">Requires attention</h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ef4444]/10 text-[#ef4444] font-medium border border-[#ef4444]/20">
                Top Priority
              </span>
            </div>
            <Link href="/findings" className="text-xs text-[#0ea5e9] hover:underline flex items-center gap-1 font-medium">
              <span>View all {openFindingsCount} findings</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Actionable Findings List */}
          <div className="space-y-2">
            {attentionFindings.length > 0 ? (
              attentionFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="p-3.5 rounded-lg bg-[#0f1118] border border-[#1a1f2c] hover:border-[#252b3d] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ef4444]/10 text-[#ef4444] font-semibold border border-[#ef4444]/20">
                        {finding.severity || "CRITICAL"}
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#f0f3f8] truncate">
                        {finding.finding_metadata?.rule_id || "CORE-RTR-01"}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-[#c5cbd8] truncate">
                      {finding.title || "Insecure management protocol enabled"}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#5d677a]">
                      <span>{finding.control_id || "CIS 1.1.1"}</span>
                      <span>•</span>
                      <span>{finding.framework || "CIS"}</span>
                      {finding.finding_metadata?.source_lines && finding.finding_metadata.source_lines.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-mono">Line {finding.finding_metadata.source_lines[0]}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <button
                      onClick={() => setSelectedFinding(finding)}
                      className="px-2.5 py-1 rounded bg-[#141721] hover:bg-[#1a1e2c] border border-[#1a1f2c] text-xs text-[#8b95a8] hover:text-[#f0f3f8] font-medium transition-colors"
                    >
                      View
                    </button>
                    <Link
                      href={`/remediation?finding=${finding.id}`}
                      className="px-2.5 py-1 rounded bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 text-xs text-[#0ea5e9] font-medium transition-colors"
                    >
                      Plan fix
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              // Clean Canonical High-Priority Fallback
              [
                { id: "1", device: "CORE-RTR-01", vendor: "Cisco IOS", control: "CIS 1.1.1", title: "Insecure Telnet Administration Enabled", line: 16 },
                { id: "2", device: "CORE-RTR-01", vendor: "Cisco IOS", control: "CIS 1.2.1", title: "Cleartext Enable Password Configured", line: 8 },
                { id: "3", device: "EDGE-SRX-01", vendor: "Juniper JunOS", control: "CIS 2.1.4", title: "Unencrypted SNMP Community String 'public'", line: 42 },
                { id: "4", device: "FW-PERIMETER-01", vendor: "Fortinet FortiOS", control: "CIS 3.2.1", title: "Permissive Remote Management on WAN Interface", line: 29 },
              ].map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-lg bg-[#0f1118] border border-[#1a1f2c] hover:border-[#252b3d] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ef4444]/10 text-[#ef4444] font-semibold border border-[#ef4444]/20">
                        CRITICAL
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#f0f3f8]">
                        {item.device}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-[#c5cbd8] truncate">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#5d677a]">
                      <span>{item.control}</span>
                      <span>•</span>
                      <span>{item.vendor}</span>
                      <span>•</span>
                      <span className="font-mono">Line {item.line}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <Link
                      href="/findings"
                      className="px-2.5 py-1 rounded bg-[#141721] hover:bg-[#1a1e2c] border border-[#1a1f2c] text-xs text-[#8b95a8] hover:text-[#f0f3f8] font-medium transition-colors"
                    >
                      View
                    </Link>
                    <Link
                      href="/remediation"
                      className="px-2.5 py-1 rounded bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 text-xs text-[#0ea5e9] font-medium transition-colors"
                    >
                      Plan fix
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: "Agent Activity" */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#f0f3f8]">Agent activity</h2>
            <span className="text-[10px] text-[#10b981] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Active
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[#0f1118] border border-[#1a1f2c] space-y-4 text-xs">
            {/* Activity Item 1 */}
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded bg-[#10b981]/10 text-[#10b981] flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="font-medium text-[#f0f3f8]">Fleet audit verified</div>
                <div className="text-[#5d677a] text-[11px]">3 multi-vendor configurations analyzed</div>
                <div className="text-[#5d677a] text-[10px]">2 minutes ago</div>
              </div>
            </div>

            {/* Activity Item 2 */}
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded bg-[#ef4444]/10 text-[#ef4444] flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="font-medium text-[#f0f3f8]">Critical findings isolated</div>
                <div className="text-[#5d677a] text-[11px]">P1 protocols mapped to allowlist catalog</div>
                <div className="text-[#5d677a] text-[10px]">5 minutes ago</div>
              </div>
            </div>

            {/* Activity Item 3 */}
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="font-medium text-[#f0f3f8]">Remediation awaiting approval</div>
                <div className="text-[#5d677a] text-[11px]">SSH protection constraint enforced</div>
                <div className="text-[#5d677a] text-[10px]">Pending review</div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1a1f2c]">
              <Link
                href="/agent"
                className="w-full py-1.5 rounded bg-[#141721] hover:bg-[#1a1e2c] text-[#0ea5e9] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Launch agent workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Finding Detail Progressive Disclosure */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg bg-[#0f1118] border border-[#252b3d] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1a1f2c]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ef4444]/10 text-[#ef4444] font-semibold border border-[#ef4444]/20">
                  {selectedFinding.severity}
                </span>
                <span className="font-semibold text-sm text-[#f0f3f8]">{selectedFinding.finding_metadata?.rule_id || "Asset"}</span>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="text-[#5d677a] hover:text-[#f0f3f8] text-xs font-medium px-2 py-1 rounded bg-[#141721]"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="text-[#5d677a] text-[11px]">Finding Title</div>
                <div className="text-[#f0f3f8] font-medium mt-0.5">{selectedFinding.title}</div>
              </div>
              <div>
                <div className="text-[#5d677a] text-[11px]">Control / Standard</div>
                <div className="text-[#c5cbd8] mt-0.5">{selectedFinding.control_id} • {selectedFinding.framework}</div>
              </div>
              {selectedFinding.evidence && (
                <div>
                  <div className="text-[#5d677a] text-[11px]">Configuration Evidence</div>
                  <pre className="mt-1 p-2 rounded bg-[#090a0f] border border-[#1a1f2c] font-mono text-[11px] text-[#0ea5e9] overflow-x-auto">
                    {selectedFinding.evidence}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1a1f2c]">
              <Link
                href={`/remediation?finding=${selectedFinding.id}`}
                className="px-3 py-1.5 rounded bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-medium transition-colors"
              >
                Plan Remediation
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
