"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import {
  fetchRisks,
  fetchAuditRisks,
  fetchRiskStats,
  fetchAuditRiskGraph,
  fetchAudits,
  RiskItem,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function RiskIntelligencePage() {
  const [selectedAuditId, setSelectedAuditId] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeView, setActiveView] = useState<"list" | "graph">("list");
  const [selectedRiskDetail, setSelectedRiskDetail] = useState<RiskItem | null>(null);

  // Queries
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["risk-stats"],
    queryFn: () => fetchRiskStats(),
  });

  const { data: audits = [] } = useQuery({
    queryKey: ["audits"],
    queryFn: () => fetchAudits(),
  });

  const {
    data: risks = [],
    isLoading: isRisksLoading,
    isError: isRisksError,
    error: risksError,
    refetch: refetchRisks,
  } = useQuery({
    queryKey: ["risks", selectedAuditId, selectedPriority, selectedCategory],
    queryFn: () => {
      if (selectedAuditId !== "ALL") {
        return fetchAuditRisks(selectedAuditId, {
          priority: selectedPriority === "ALL" ? undefined : selectedPriority,
          category: selectedCategory === "ALL" ? undefined : selectedCategory,
        });
      }
      return fetchRisks({
        priority: selectedPriority === "ALL" ? undefined : selectedPriority,
        category: selectedCategory === "ALL" ? undefined : selectedCategory,
      });
    },
  });

  const { data: graphData, isLoading: isGraphLoading } = useQuery({
    queryKey: ["risk-graph", selectedAuditId],
    queryFn: () => {
      const targetAuditId = selectedAuditId !== "ALL" ? selectedAuditId : audits[0]?.id;
      if (!targetAuditId) return null;
      return fetchAuditRiskGraph(targetAuditId);
    },
    enabled: activeView === "graph" && audits.length > 0,
  });

  const filteredRisks = risks.filter((r) => {
    const matchesSearch =
      searchQuery === "" ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2.5 font-mono">
            <Flame className="w-5 h-5 text-[#EF4444]" />
            <span>Risk Intelligence & Prioritization</span>
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Deterministic risk classification, multi-finding correlation, and attack surface exposure mapping across audited assets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchStats();
              refetchRisks();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#242424] text-xs font-mono transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col justify-between">
          <div className="text-[10px] text-[#A3A3A3] uppercase font-semibold">Avg NetVigil Risk</div>
          <div className="text-2xl font-bold text-[#F5F5F5] mt-1 flex items-baseline gap-1">
            <span className={cn(
              (stats?.average_risk_score ?? 0) >= 75 ? "text-[#EF4444]" :
              (stats?.average_risk_score ?? 0) >= 50 ? "text-[#F59E0B]" : "text-[#22C55E]"
            )}>
              {stats?.average_risk_score?.toFixed(0) ?? 0}
            </span>
            <span className="text-xs text-[#666666]">/ 100</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#EF4444]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#EF4444] uppercase font-semibold">P0 Immediate</div>
            <div className="text-2xl font-bold text-[#EF4444] mt-1">{stats?.p0_count ?? 0}</div>
          </div>
          <ShieldAlert className="w-5 h-5 text-[#EF4444]" />
        </div>

        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#F59E0B]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#F59E0B] uppercase font-semibold">P1 High</div>
            <div className="text-2xl font-bold text-[#F59E0B] mt-1">{stats?.p1_count ?? 0}</div>
          </div>
          <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
        </div>

        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#3B82F6]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#3B82F6] uppercase font-semibold">P2 Medium</div>
            <div className="text-2xl font-bold text-[#3B82F6] mt-1">{stats?.p2_count ?? 0}</div>
          </div>
          <Layers className="w-5 h-5 text-[#3B82F6]" />
        </div>

        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#666666] uppercase font-semibold">P3 Low / Info</div>
            <div className="text-2xl font-bold text-[#D4D4D4] mt-1">{stats?.p3_count ?? 0}</div>
          </div>
          <Shield className="w-5 h-5 text-[#666666]" />
        </div>
      </div>

      {/* Controls & View Switcher */}
      <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
          {/* Audit & Priority Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedAuditId}
              onChange={(e) => setSelectedAuditId(e.target.value)}
              className="p-1.5 rounded-md bg-[#0D0D0D] border border-[#1A1A1A] text-xs text-[#00D9FF] focus:outline-none focus:border-[#00D9FF]"
            >
              <option value="ALL">All Audited Sessions</option>
              {audits.map((a) => (
                <option key={a.id} value={a.id}>
                  Audit {a.id.slice(0, 8)}... (Score: {a.score ?? 0}%)
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-[#0D0D0D] border border-[#1A1A1A] p-1 rounded-md text-xs">
              {["ALL", "P0", "P1", "P2", "P3"].map((pri) => (
                <button
                  key={pri}
                  onClick={() => setSelectedPriority(pri)}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors",
                    selectedPriority === pri
                      ? "bg-[#141414] text-[#EF4444] border border-[#EF4444]/40"
                      : "text-[#A3A3A3] hover:text-[#F5F5F5]"
                  )}
                >
                  {pri}
                </button>
              ))}
            </div>
          </div>

          {/* View Toggle & Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search risks or themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-md bg-[#0D0D0D] border border-[#1A1A1A] text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#EF4444]/50 w-full sm:w-56"
              />
            </div>

            <div className="flex items-center bg-[#0D0D0D] border border-[#1A1A1A] p-1 rounded-md text-xs">
              <button
                onClick={() => setActiveView("list")}
                className={cn(
                  "px-3 py-1 rounded text-[11px] font-semibold transition-colors",
                  activeView === "list" ? "bg-[#141414] text-[#F5F5F5] border border-[#1A1A1A]" : "text-[#A3A3A3] hover:text-[#F5F5F5]"
                )}
              >
                Risk List
              </button>
              <button
                onClick={() => setActiveView("graph")}
                className={cn(
                  "px-3 py-1 rounded text-[11px] font-semibold transition-colors",
                  activeView === "graph" ? "bg-[#141414] text-[#F5F5F5] border border-[#1A1A1A]" : "text-[#A3A3A3] hover:text-[#F5F5F5]"
                )}
              >
                Attack Graph
              </button>
            </div>
          </div>
        </div>

        {/* View 1: Risk List */}
        {activeView === "list" && (
          <div className="space-y-3 pt-2">
            {isRisksError ? (
              <div className="p-8 rounded-xl bg-[#0A0A0A] border border-[#EF4444]/30 text-center space-y-3 font-mono">
                <div className="w-8 h-8 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mx-auto">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">DATA SOURCE UNAVAILABLE</div>
                  <div className="text-[11px] text-[#EF4444] mt-1">
                    {risksError instanceof Error ? risksError.message : "Failed to retrieve prioritized risk intelligence."}
                  </div>
                </div>
                <button
                  onClick={() => refetchRisks()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0D0D0D] hover:bg-[#141414] text-[#EF4444] border border-[#EF4444]/40 text-xs font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Request</span>
                </button>
              </div>
            ) : isRisksLoading ? (
              <div className="py-12 text-center text-[#666666] font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#EF4444]" />
                <span>Computing prioritized risk intelligence...</span>
              </div>
            ) : filteredRisks.length === 0 ? (
              <div className="py-12 text-center text-[#666666] font-mono text-xs">
                No security risks found matching selected filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredRisks.map((risk) => (
                  <div
                    key={risk.id}
                    className="p-4 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] hover:border-[#EF4444]/40 transition-colors space-y-3 font-mono text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                            risk.priority === "P0" && "bg-[#141414] text-[#EF4444] border-[#EF4444]/40",
                            risk.priority === "P1" && "bg-[#141414] text-[#F59E0B] border-[#F59E0B]/40",
                            risk.priority === "P2" && "bg-[#141414] text-[#3B82F6] border-[#3B82F6]/40",
                            risk.priority === "P3" && "bg-[#141414] text-[#A3A3A3] border-[#1A1A1A]"
                          )}
                        >
                          {risk.priority} • {risk.severity}
                        </span>

                        <span className="px-2 py-0.5 rounded bg-[#111111] text-[#A3A3A3] border border-[#1A1A1A] text-[10px]">
                          {risk.category}
                        </span>

                        <span className="px-2 py-0.5 rounded bg-[#111111] text-[#00D9FF] border border-[#00D9FF]/30 text-[10px]">
                          Exposure: {risk.exposure.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#A3A3A3]">NetVigil Risk Score:</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded font-bold text-xs border",
                          risk.risk_score >= 90 ? "bg-[#141414] text-[#EF4444] border-[#EF4444]/50" :
                          risk.risk_score >= 75 ? "bg-[#141414] text-[#F59E0B] border-[#F59E0B]/50" :
                          "bg-[#141414] text-[#3B82F6] border-[#3B82F6]/50"
                        )}>
                          {risk.risk_score.toFixed(0)} / 100
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-[#F5F5F5] tracking-tight">{risk.title}</h3>
                      <p className="text-xs text-[#A3A3A3] font-sans leading-relaxed">{risk.description}</p>
                    </div>

                    {risk.evidence_summary && (
                      <div className="p-2.5 rounded bg-[#050505] border border-[#1A1A1A] text-[11px] text-[#A3A3A3] space-y-1">
                        <div className="text-[10px] uppercase font-semibold text-[#666666]">Contributing Evidence:</div>
                        <pre className="text-[#00D9FF] text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                          {risk.evidence_summary}
                        </pre>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A]">
                      <span className="text-[10px] text-[#666666]">
                        Contributing Findings: <strong>{risk.finding_ids?.length ?? 1}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRiskDetail(risk)}
                          className="px-3 py-1 rounded bg-[#111111] hover:bg-[#141414] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#1A1A1A] text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>

                        <Link
                          href="/remediation"
                          className="px-3 py-1 rounded bg-[#0B0B0B] border border-[#EF4444]/40 hover:border-[#EF4444] text-[#EF4444] text-[11px] flex items-center gap-1 transition-colors font-semibold"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>View Remediation Fix</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View 2: Deterministic Attack / Risk Graph */}
        {activeView === "graph" && (
          <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A] font-mono text-xs">
              <div className="flex items-center gap-2 text-[#00D9FF] font-bold">
                <Activity className="w-4 h-4" />
                <span>Deterministic Risk Relationship Graph</span>
              </div>
              <span className="text-[10px] text-[#666666]">
                Nodes: {graphData?.summary?.nodes_count ?? 0} • Edges: {graphData?.summary?.edges_count ?? 0}
              </span>
            </div>

            {isGraphLoading ? (
              <div className="py-16 text-center text-[#666666] font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#00D9FF]" />
                <span>Rendering relationship graph...</span>
              </div>
            ) : !graphData || graphData.nodes.length === 0 ? (
              <div className="py-16 text-center text-[#666666] font-mono text-xs">
                No graph data available for current audit session.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual Tree Display */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
                  {/* Column 1: Asset */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">1. Target Device</div>
                    {graphData.nodes.filter((n) => n.type === "DEVICE").map((n) => (
                      <div key={n.id} className="p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] space-y-1">
                        <div className="flex items-center gap-1.5 text-[#00D9FF] font-bold">
                          <Server className="w-3.5 h-3.5" />
                          <span>{n.data.label}</span>
                        </div>
                        <div className="text-[10px] text-[#666666]">{n.data.subtitle}</div>
                      </div>
                    ))}
                  </div>

                  {/* Column 2: Exposure */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">2. Attack Surface</div>
                    {graphData.nodes.filter((n) => n.type === "EXPOSURE").map((n) => (
                      <div key={n.id} className="p-3 rounded-lg bg-[#0A0A0A] border border-[#8B5CF6]/30 space-y-1">
                        <div className="text-[#8B5CF6] font-bold">{n.data.label}</div>
                        <div className="text-[10px] text-[#666666]">{n.data.subtitle}</div>
                      </div>
                    ))}
                  </div>

                  {/* Column 3: Correlated Risk */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">3. Security Risk</div>
                    {graphData.nodes.filter((n) => n.type === "RISK").map((n) => (
                      <div key={n.id} className="p-3 rounded-lg bg-[#0A0A0A] border border-[#EF4444]/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[#EF4444] font-bold">{n.data.priority}</span>
                          <span className="text-[10px] text-[#EF4444]">Score: {n.data.risk_score}</span>
                        </div>
                        <div className="text-[#F5F5F5] text-[11px] font-semibold">{n.data.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Column 4: Contributing Findings */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">4. Failed Controls</div>
                    {graphData.nodes.filter((n) => n.type === "FINDING").map((n) => (
                      <div key={n.id} className="p-3 rounded-lg bg-[#050505] border border-[#1A1A1A] space-y-1">
                        <div className="text-[#F59E0B] font-bold">{n.data.label}</div>
                        <div className="text-[10px] text-[#666666] line-clamp-1">{n.data.subtitle}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inspect Detail Modal */}
      {selectedRiskDetail && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden font-mono text-xs animate-in fade-in duration-150">
            <div className="p-4 border-b border-[#1A1A1A] bg-[#0B0B0B] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#EF4444] font-bold">
                <Flame className="w-4 h-4" />
                <span>Risk Intelligence Detail</span>
              </div>
              <button onClick={() => setSelectedRiskDetail(null)} className="p-1 text-[#666666] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#141414] text-[#EF4444] border border-[#EF4444]/40 font-bold">
                    {selectedRiskDetail.priority} • {selectedRiskDetail.severity}
                  </span>
                  <span className="text-[#A3A3A3]">Score: <strong>{selectedRiskDetail.risk_score}</strong></span>
                </div>
                <h2 className="text-sm font-bold text-[#F5F5F5] mt-1">{selectedRiskDetail.title}</h2>
              </div>

              <div className="p-3 rounded bg-[#050505] border border-[#1A1A1A] space-y-1 font-sans">
                <div className="text-[10px] font-mono text-[#666666] uppercase font-semibold">Risk Context:</div>
                <p className="text-[#D4D4D4] text-xs leading-relaxed">{selectedRiskDetail.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
                  <span className="text-[#666666] uppercase text-[10px]">Impact:</span>
                  <div className="text-[#F5F5F5] font-bold">{selectedRiskDetail.impact}</div>
                </div>

                <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A]">
                  <span className="text-[#666666] uppercase text-[10px]">Exposure:</span>
                  <div className="text-[#00D9FF] font-bold">{selectedRiskDetail.exposure}</div>
                </div>
              </div>

              {selectedRiskDetail.evidence_summary && (
                <div className="space-y-1">
                  <span className="text-[#666666] text-[10px] uppercase font-semibold">Evidence:</span>
                  <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A] text-[#00D9FF] text-[11px] whitespace-pre-wrap select-text">
                    {selectedRiskDetail.evidence_summary}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#1A1A1A] bg-[#070707] flex items-center justify-between">
              <button
                onClick={() => setSelectedRiskDetail(null)}
                className="px-3.5 py-1.5 rounded bg-[#0D0D0D] hover:bg-[#141414] text-[#A3A3A3] border border-[#1A1A1A]"
              >
                Close
              </button>

              <Link
                href="/remediation"
                className="px-4 py-1.5 rounded bg-[#0B0B0B] border border-[#EF4444]/40 hover:border-[#EF4444] text-[#EF4444] font-semibold flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Go to Remediation Center</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
