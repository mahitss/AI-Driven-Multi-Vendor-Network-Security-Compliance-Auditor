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
  Filter,
  Search,
  Server,
  Eye,
  Wrench,
  ChevronRight,
  Shield,
  Activity,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  fetchRisks,
  fetchAuditRisks,
  fetchRiskStats,
  fetchAuditRiskGraph,
  fetchAudits,
  RiskItem,
  RiskStats,
  RiskGraph,
  AuditItem,
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
  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["risk-stats"],
    queryFn: () => fetchRiskStats(),
  });

  const { data: audits = [] } = useQuery({
    queryKey: ["audits"],
    queryFn: () => fetchAudits(),
  });

  const { data: risks = [], isLoading: isRisksLoading, refetch: refetchRisks } = useQuery({
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-rose-500" />
            <span>Risk Intelligence & Prioritization</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic risk classification, multi-finding correlation, and attack surface exposure mapping across audited assets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchStats();
              refetchRisks();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-300 hover:text-white text-xs font-mono transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Avg NetVigil Risk</div>
          <div className="text-2xl font-bold text-white mt-1 flex items-baseline gap-1">
            <span className={cn(
              (stats?.average_risk_score ?? 0) >= 75 ? "text-rose-400" :
              (stats?.average_risk_score ?? 0) >= 50 ? "text-amber-400" : "text-emerald-400"
            )}>
              {stats?.average_risk_score?.toFixed(0) ?? 0}
            </span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-rose-400 uppercase font-semibold">P0 Immediate</div>
            <div className="text-2xl font-bold text-rose-300 mt-1">{stats?.p0_count ?? 0}</div>
          </div>
          <ShieldAlert className="w-5 h-5 text-rose-500" />
        </div>

        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-amber-400 uppercase font-semibold">P1 High</div>
            <div className="text-2xl font-bold text-amber-300 mt-1">{stats?.p1_count ?? 0}</div>
          </div>
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>

        <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-blue-400 uppercase font-semibold">P2 Medium</div>
            <div className="text-2xl font-bold text-blue-300 mt-1">{stats?.p2_count ?? 0}</div>
          </div>
          <Layers className="w-5 h-5 text-blue-400" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">P3 Low / Info</div>
            <div className="text-2xl font-bold text-slate-300 mt-1">{stats?.p3_count ?? 0}</div>
          </div>
          <Shield className="w-5 h-5 text-slate-400" />
        </div>
      </div>

      {/* Controls & View Switcher */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Audit & Priority Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedAuditId}
              onChange={(e) => setSelectedAuditId(e.target.value)}
              className="p-1.5 rounded-md bg-[#0b101c] border border-white/10 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Audited Sessions</option>
              {audits.map((a) => (
                <option key={a.id} value={a.id}>
                  Audit {a.id.slice(0, 8)}... (Score: {a.score ?? 0}%)
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-[#0b101c] border border-white/10 p-1 rounded-md text-xs font-mono">
              {["ALL", "P0", "P1", "P2", "P3"].map((pri) => (
                <button
                  key={pri}
                  onClick={() => setSelectedPriority(pri)}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors",
                    selectedPriority === pri
                      ? "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                      : "text-slate-400 hover:text-slate-200"
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
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search risks or themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-md bg-[#0b101c] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/50 w-full sm:w-56 font-mono"
              />
            </div>

            <div className="flex items-center bg-[#0b101c] border border-white/10 p-1 rounded-md text-xs font-mono">
              <button
                onClick={() => setActiveView("list")}
                className={cn(
                  "px-3 py-1 rounded text-[11px] font-semibold transition-colors",
                  activeView === "list" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                Risk List
              </button>
              <button
                onClick={() => setActiveView("graph")}
                className={cn(
                  "px-3 py-1 rounded text-[11px] font-semibold transition-colors",
                  activeView === "graph" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
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
            {isRisksLoading ? (
              <div className="py-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Computing prioritized risk intelligence...</span>
              </div>
            ) : filteredRisks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-mono text-xs">
                No security risks found matching selected filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredRisks.map((risk) => (
                  <div
                    key={risk.id}
                    className="p-4 rounded-xl bg-[#090d16] border border-white/5 hover:border-rose-500/30 transition-colors space-y-3 font-mono text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                            risk.priority === "P0" && "bg-rose-950 text-rose-300 border-rose-800/40",
                            risk.priority === "P1" && "bg-amber-950 text-amber-300 border-amber-800/40",
                            risk.priority === "P2" && "bg-blue-950 text-blue-300 border-blue-800/40",
                            risk.priority === "P3" && "bg-slate-800 text-slate-300 border-white/10"
                          )}
                        >
                          {risk.priority} • {risk.severity}
                        </span>

                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-white/5 text-[10px]">
                          {risk.category}
                        </span>

                        <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/30 text-[10px]">
                          Exposure: {risk.exposure.replace("_", " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">NetVigil Risk Score:</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded font-bold text-xs border",
                          risk.risk_score >= 90 ? "bg-rose-950/80 text-rose-300 border-rose-800/50" :
                          risk.risk_score >= 75 ? "bg-amber-950/80 text-amber-300 border-amber-800/50" :
                          "bg-blue-950/80 text-blue-300 border-blue-800/50"
                        )}>
                          {risk.risk_score.toFixed(0)} / 100
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white tracking-tight">{risk.title}</h3>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed">{risk.description}</p>
                    </div>

                    {risk.evidence_summary && (
                      <div className="p-2.5 rounded bg-[#050810] border border-white/5 text-[11px] text-slate-400 space-y-1">
                        <div className="text-[10px] uppercase font-semibold text-slate-500">Contributing Evidence:</div>
                        <pre className="text-cyan-300 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                          {risk.evidence_summary}
                        </pre>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[10px] text-slate-500">
                        Contributing Findings: <strong>{risk.finding_ids?.length ?? 1}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRiskDetail(risk)}
                          className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>

                        <Link
                          href="/remediation"
                          className="px-3 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/40 text-[11px] flex items-center gap-1 transition-colors font-semibold"
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
          <div className="p-4 rounded-xl bg-[#070b14] border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 font-mono text-xs">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Activity className="w-4 h-4" />
                <span>Deterministic Risk Relationship Graph</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Nodes: {graphData?.summary?.nodes_count ?? 0} • Edges: {graphData?.summary?.edges_count ?? 0}
              </span>
            </div>

            {isGraphLoading ? (
              <div className="py-16 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Rendering relationship graph...</span>
              </div>
            ) : !graphData || graphData.nodes.length === 0 ? (
              <div className="py-16 text-center text-slate-500 font-mono text-xs">
                No graph data available for current audit session.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual Tree Display */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
                  {/* Column 1: Asset */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. Target Device</div>
                    {graphData.nodes.filter((n) => n.type === "DEVICE").map((n) => (
                      <div key={n.id} className="p-3 rounded-lg bg-slate-900 border border-white/10 space-y-1">
                        <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                          <Server className="w-3.5 h-3.5" />
                          <span>{n.data.label}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">{n.data.subtitle}</div>
                      </div>
                    ))}
                  </div>

                  {/* Column 2: Exposure */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. Attack Surface</div>
                    {graphData.nodes.filter((n) => n.type === "EXPOSURE").map((n) => (
                      <div key={n.id} className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-700/30 space-y-1">
                        <div className="text-indigo-300 font-bold">{n.data.label}</div>
                        <div className="text-[10px] text-slate-400">{n.data.subtitle}</div>
                      </div>
                    ))}
                  </div>

                  {/* Column 3: Correlated Risk */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3. Security Risk</div>
                    {graphData.nodes.filter((n) => n.type === "RISK").map((n) => (
                      <div key={n.id} className="p-3 rounded-lg bg-rose-950/40 border border-rose-700/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-rose-300 font-bold">{n.data.priority}</span>
                          <span className="text-[10px] text-rose-400">Score: {n.data.risk_score}</span>
                        </div>
                        <div className="text-slate-200 text-[11px] font-semibold">{n.data.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Column 4: Contributing Findings */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">4. Failed Controls</div>
                    {graphData.nodes.filter((n) => n.type === "FINDING").map((n) => (
                      <div key={n.id} className="p-3 rounded-lg bg-[#050810] border border-white/5 space-y-1">
                        <div className="text-amber-300 font-bold">{n.data.label}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{n.data.subtitle}</div>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c121e] border border-rose-500/30 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden font-mono text-xs animate-in fade-in duration-150">
            <div className="p-4 border-b border-white/10 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-300 font-bold">
                <Flame className="w-4 h-4" />
                <span>Risk Intelligence Detail</span>
              </div>
              <button onClick={() => setSelectedRiskDetail(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/40 font-bold">
                    {selectedRiskDetail.priority} • {selectedRiskDetail.severity}
                  </span>
                  <span className="text-slate-400">Score: <strong>{selectedRiskDetail.risk_score}</strong></span>
                </div>
                <h2 className="text-sm font-bold text-white mt-1">{selectedRiskDetail.title}</h2>
              </div>

              <div className="p-3 rounded bg-[#060911] border border-white/10 space-y-1 font-sans">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Risk Context:</div>
                <p className="text-slate-200 text-xs leading-relaxed">{selectedRiskDetail.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-slate-900 border border-white/5">
                  <span className="text-slate-500 uppercase text-[10px]">Impact:</span>
                  <div className="text-slate-200 font-bold">{selectedRiskDetail.impact}</div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-white/5">
                  <span className="text-slate-500 uppercase text-[10px]">Exposure:</span>
                  <div className="text-cyan-300 font-bold">{selectedRiskDetail.exposure}</div>
                </div>
              </div>

              {selectedRiskDetail.evidence_summary && (
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Evidence:</span>
                  <div className="p-2 rounded bg-[#060911] border border-white/10 text-cyan-300 text-[11px] whitespace-pre-wrap select-text">
                    {selectedRiskDetail.evidence_summary}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between">
              <button
                onClick={() => setSelectedRiskDetail(null)}
                className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Close
              </button>

              <Link
                href="/remediation"
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5"
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
