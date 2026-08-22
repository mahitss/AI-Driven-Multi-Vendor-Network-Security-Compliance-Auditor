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
} from "lucide-react";
import {
  fetchOverviewStats,
  fetchSystemActivity,
  fetchRisks,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function OverviewDashboardPage() {
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["overview-stats"],
    queryFn: fetchOverviewStats,
  });

  const { data: activities = [], isLoading: isActivityLoading } = useQuery({
    queryKey: ["system-activity"],
    queryFn: () => fetchSystemActivity(8),
  });

  const { data: topRisks = [], isLoading: isRisksLoading } = useQuery({
    queryKey: ["top-risks"],
    queryFn: () => fetchRisks({ priority: "ALL" }),
  });

  const complianceScore = stats?.compliance_score ?? 0;
  const riskScore = stats?.risk_score ?? 0;
  const severity = stats?.severity_breakdown || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const totalFindings = (stats?.open_findings ?? 0) || 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2.5 font-mono">
            <Shield className="w-5 h-5 text-[#00D9FF]" />
            <span>NETVIGIL SECURITY POSTURE</span>
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Deterministic multi-vendor network security assessment, risk prioritization, and compliance posture monitoring.
          </p>
        </div>

        <button
          onClick={() => refetchStats()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#242424] text-xs font-mono transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Top Section: Real Executive Posture KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
        {/* Overall Compliance */}
        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col justify-between">
          <div className="text-[10px] text-[#A3A3A3] uppercase font-semibold">Overall Compliance</div>
          <div className="text-2xl font-bold text-[#F5F5F5] mt-1 flex items-baseline gap-1">
            <span className={cn(
              complianceScore >= 80 ? "text-[#22C55E]" :
              complianceScore >= 60 ? "text-[#F59E0B]" : "text-[#EF4444]"
            )}>
              {complianceScore.toFixed(0)}%
            </span>
          </div>
          <div className="text-[10px] text-[#666666] mt-2 flex items-center gap-1">
            {stats?.score_delta !== null && stats?.score_delta !== undefined ? (
              <>
                {stats.score_delta >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-[#22C55E]" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-[#EF4444]" />
                )}
                <span className={stats.score_delta >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"}>
                  {stats.score_delta >= 0 ? `+${stats.score_delta}%` : `${stats.score_delta}%`}
                </span>
                <span>vs prev audit</span>
              </>
            ) : (
              <span>First baseline assessment</span>
            )}
          </div>
        </div>

        {/* NetVigil Risk Score */}
        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col justify-between">
          <div className="text-[10px] text-[#A3A3A3] uppercase font-semibold">NetVigil Risk Score</div>
          <div className="text-2xl font-bold text-[#F5F5F5] mt-1 flex items-baseline gap-1">
            <span className={cn(
              riskScore >= 75 ? "text-[#EF4444]" :
              riskScore >= 50 ? "text-[#F59E0B]" : "text-[#22C55E]"
            )}>
              {riskScore.toFixed(0)}
            </span>
            <span className="text-xs text-[#666666]">/ 100</span>
          </div>
          <div className="text-[10px] text-[#666666] mt-2">
            {riskScore >= 75 ? "High Risk Exposure" : riskScore >= 50 ? "Moderate Exposure" : "Low Risk Profile"}
          </div>
        </div>

        {/* Devices Audited */}
        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col justify-between">
          <div className="text-[10px] text-[#A3A3A3] uppercase font-semibold">Audited Devices</div>
          <div className="text-2xl font-bold text-[#F5F5F5] mt-1 flex items-center justify-between">
            <span>{stats?.total_devices ?? 0}</span>
            <Server className="w-5 h-5 text-[#666666]" />
          </div>
          <div className="text-[10px] text-[#666666] mt-2">
            {stats?.total_configurations ?? 0} Ingested Configs
          </div>
        </div>

        {/* Open Findings */}
        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col justify-between">
          <div className="text-[10px] text-[#A3A3A3] uppercase font-semibold">Open Findings</div>
          <div className="text-2xl font-bold text-[#F5F5F5] mt-1 flex items-center justify-between">
            <span className="text-[#F59E0B]">{stats?.open_findings ?? 0}</span>
            <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div className="text-[10px] text-[#666666] mt-2">
            Across {stats?.total_audits ?? 0} Audits
          </div>
        </div>

        {/* Critical Findings */}
        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#EF4444]/40 flex flex-col justify-between">
          <div className="text-[10px] text-[#EF4444] uppercase font-semibold">Critical Findings</div>
          <div className="text-2xl font-bold text-[#EF4444] mt-1 flex items-center justify-between">
            <span>{severity.critical}</span>
            <ShieldAlert className="w-5 h-5 text-[#EF4444]" />
          </div>
          <Link
            href="/findings?severity=CRITICAL"
            className="text-[10px] text-[#EF4444] hover:underline mt-2 flex items-center gap-1 font-semibold"
          >
            <span>Inspect Criticals</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        </div>
      </div>

      {/* Main 2-Column Split: Frameworks & Severity on Left, Risks & Activity on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Framework Coverage & Severity Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          {/* Framework Performance Coverage Cards */}
          <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#F5F5F5]">
                <Layers className="w-4 h-4 text-[#00D9FF]" />
                <span>COMPLIANCE FRAMEWORK CONTROL COVERAGE</span>
              </div>
              <span className="text-[10px] text-[#666666] font-mono">NetVigil Deterministic Assessment</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              {[
                { name: "CIS", label: "CIS Benchmarks", href: "/compliance/cis", score: stats?.framework_scores?.CIS ?? complianceScore },
                { name: "NIST", label: "NIST SP 800-53", href: "/compliance/nist", score: stats?.framework_scores?.NIST ?? complianceScore },
                { name: "STIG", label: "DISA STIG", href: "/compliance/stig", score: stats?.framework_scores?.STIG ?? complianceScore },
                { name: "ISO", label: "ISO/IEC 27001", href: "/compliance/iso", score: stats?.framework_scores?.ISO ?? complianceScore },
              ].map((fw) => (
                <Link
                  key={fw.name}
                  href={fw.href}
                  className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] hover:border-[#00D9FF]/40 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#A3A3A3] group-hover:text-white">{fw.name}</span>
                    <span className={cn(
                      "font-bold text-xs",
                      fw.score >= 80 ? "text-[#22C55E]" :
                      fw.score >= 60 ? "text-[#F59E0B]" : "text-[#EF4444]"
                    )}>
                      {fw.score.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        fw.score >= 80 ? "bg-[#22C55E]" :
                        fw.score >= 60 ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                      )}
                      style={{ width: `${Math.min(100, Math.max(5, fw.score))}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#666666] flex items-center justify-between">
                    <span>Coverage</span>
                    <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-[#00D9FF] transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Severity Distribution Breakdown */}
          <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#F5F5F5]">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                <span>FINDINGS SEVERITY DISTRIBUTION</span>
              </div>
              <Link href="/findings" className="text-[11px] font-mono text-[#00D9FF] hover:underline flex items-center gap-1">
                <span>View All Findings</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              {[
                { level: "Critical", count: severity.critical, color: "bg-[#EF4444]", text: "text-[#EF4444]", filter: "CRITICAL" },
                { level: "High", count: severity.high, color: "bg-[#F59E0B]", text: "text-[#F59E0B]", filter: "HIGH" },
                { level: "Medium", count: severity.medium, color: "bg-[#00D9FF]", text: "text-[#00D9FF]", filter: "MEDIUM" },
                { level: "Low", count: severity.low, color: "bg-[#8A8A8A]", text: "text-[#A3A3A3]", filter: "LOW" },
                { level: "Info", count: severity.info, color: "bg-[#555555]", text: "text-[#666666]", filter: "INFO" },
              ].map((s) => {
                const pct = totalFindings > 0 ? (s.count / totalFindings) * 100 : 0;
                return (
                  <Link
                    key={s.level}
                    href={`/findings?severity=${s.filter}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] hover:border-[#242424] transition-colors group"
                  >
                    <div className="flex items-center gap-3 w-32">
                      <span className={cn("w-2 h-2 rounded-full", s.color)} />
                      <span className="font-semibold text-[#A3A3A3] group-hover:text-[#F5F5F5]">{s.level}</span>
                    </div>

                    <div className="flex-1 mx-4">
                      <div className="w-full h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                        <div className={cn("h-full rounded-full", s.color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-20 justify-end">
                      <span className={cn("font-bold", s.text)}>{s.count}</span>
                      <span className="text-[10px] text-[#666666]">({pct.toFixed(0)}%)</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Top Real Risks & Activity Stream */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top Real Risks */}
          <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#F5F5F5]">
                <Flame className="w-4 h-4 text-[#EF4444]" />
                <span>TOP PRIORITIZED RISKS</span>
              </div>
              <Link href="/risk" className="text-[11px] font-mono text-[#EF4444] hover:underline flex items-center gap-1">
                <span>Risk Center</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {isRisksLoading ? (
              <div className="py-8 text-center text-[#666666] font-mono text-xs">Loading risks...</div>
            ) : topRisks.length === 0 ? (
              <div className="py-8 text-center text-[#666666] font-mono text-xs space-y-1">
                <div>No open security risks identified.</div>
                <div className="text-[10px] text-[#444444]">Run a compliance audit to compute risk intelligence.</div>
              </div>
            ) : (
              <div className="space-y-2.5 font-mono text-xs">
                {topRisks.slice(0, 4).map((risk) => (
                  <Link
                    key={risk.id}
                    href="/risk"
                    className="p-3 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] hover:border-[#EF4444]/40 transition-all block space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                        risk.priority === "P0" ? "bg-[#141414] text-[#EF4444] border-[#EF4444]/40" :
                        risk.priority === "P1" ? "bg-[#141414] text-[#F59E0B] border-[#F59E0B]/40" :
                        "bg-[#111111] text-[#3B82F6] border-[#3B82F6]/40"
                      )}>
                        {risk.priority} • Score {risk.risk_score.toFixed(0)}
                      </span>
                      <span className="text-[10px] text-[#666666]">{risk.category}</span>
                    </div>
                    <div className="text-[#F5F5F5] font-semibold line-clamp-1 group-hover:text-[#EF4444] transition-colors">
                      {risk.title}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#666666] pt-1 border-t border-[#1A1A1A]">
                      <span>Findings: {risk.finding_ids?.length ?? 1}</span>
                      <span className="text-[#00D9FF] group-hover:underline">Remediation Available →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Real System Activity Log */}
          <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#F5F5F5]">
                <Activity className="w-4 h-4 text-[#22C55E]" />
                <span>RECENT AUDIT & SYSTEM ACTIVITY</span>
              </div>
              <span className="text-[10px] text-[#666666] font-mono">Live Timeline</span>
            </div>

            {isActivityLoading ? (
              <div className="py-8 text-center text-[#666666] font-mono text-xs">Loading activity...</div>
            ) : activities.length === 0 ? (
              <div className="py-8 text-center text-[#666666] font-mono text-xs space-y-1">
                <div>No recent system activity recorded.</div>
                <div className="text-[10px] text-[#444444]">Ingest a configuration to trigger security workflows.</div>
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {activities.map((act) => (
                  <Link
                    key={act.id}
                    href={act.target_url}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#111111] transition-colors group"
                  >
                    <div className="mt-1">
                      {act.type === "AUDIT_COMPLETED" ? (
                        <Shield className="w-3.5 h-3.5 text-[#22C55E]" />
                      ) : act.type === "CONFIG_INGESTED" ? (
                        <FileCode2 className="w-3.5 h-3.5 text-[#00D9FF]" />
                      ) : act.type === "TRAINING_ACTION" ? (
                        <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                      ) : (
                        <Wrench className="w-3.5 h-3.5 text-[#EF4444]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[#F5F5F5] text-xs font-semibold truncate group-hover:text-[#00D9FF] transition-colors">
                        {act.title}
                      </div>
                      <div className="text-[10px] text-[#A3A3A3] truncate">{act.description}</div>
                    </div>
                    <div className="text-[10px] text-[#666666] whitespace-nowrap">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
