"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Check,
  Filter,
  Search,
  ChevronRight,
  Terminal,
  FileCode2,
  RefreshCw,
  Clock,
  Key,
  Lock,
  Layers,
  Sparkles,
  X,
  ExternalLink,
  BookOpen,
  Info,
} from "lucide-react";
import {
  fetchAudits,
  fetchAuditDetail,
  fetchConfigurations,
  createAudit,
  AuditItem,
  AuditDetail,
  Finding,
  ConfigurationItem,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function AuditsPage() {
  const queryClient = useQueryClient();

  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [activeFrameworkFilter, setActiveFrameworkFilter] = useState<string>("ALL");
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<string>("ALL");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [selectedConfigForAudit, setSelectedConfigForAudit] = useState<string>("");
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(["CIS", "NIST", "STIG", "ISO"]);
  const [inspectingFinding, setInspectingFinding] = useState<Finding | null>(null);

  // Fetch audits history
  const {
    data: audits = [],
    isLoading: isAuditsLoading,
    refetch: refetchAudits,
  } = useQuery({
    queryKey: ["audits"],
    queryFn: () => fetchAudits(),
  });

  // Fetch configurations for audit launcher
  const { data: configurations = [] } = useQuery({
    queryKey: ["configurations"],
    queryFn: () => fetchConfigurations(),
  });

  // Set default selected audit when loaded
  useEffect(() => {
    if (audits.length > 0 && !selectedAuditId) {
      setSelectedAuditId(audits[0].id);
    }
  }, [audits, selectedAuditId]);

  // Fetch selected audit detail
  const { data: auditDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["audit-detail", selectedAuditId],
    queryFn: () => (selectedAuditId ? fetchAuditDetail(selectedAuditId) : null),
    enabled: !!selectedAuditId,
  });

  // Create audit mutation
  const createAuditMutation = useMutation({
    mutationFn: (payload: { configuration_id: string; frameworks: string[] }) => createAudit(payload),
    onSuccess: (data) => {
      setIsLaunchModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      queryClient.invalidateQueries({ queryKey: ["overview-stats"] });
      setSelectedAuditId(data.audit_id);
    },
  });

  const handleLaunchAudit = () => {
    if (!selectedConfigForAudit && configurations.length > 0) {
      createAuditMutation.mutate({
        configuration_id: configurations[0].id,
        frameworks: selectedFrameworks,
      });
    } else if (selectedConfigForAudit) {
      createAuditMutation.mutate({
        configuration_id: selectedConfigForAudit,
        frameworks: selectedFrameworks,
      });
    }
  };

  const toggleFrameworkSelection = (fw: string) => {
    if (selectedFrameworks.includes(fw)) {
      if (selectedFrameworks.length > 1) {
        setSelectedFrameworks(selectedFrameworks.filter((f) => f !== fw));
      }
    } else {
      setSelectedFrameworks([...selectedFrameworks, fw]);
    }
  };

  // Filtered findings
  const findings = auditDetail?.findings || [];
  const filteredFindings = findings.filter((f) => {
    const matchesFw = activeFrameworkFilter === "ALL" || f.framework === activeFrameworkFilter;
    const matchesSev = activeSeverityFilter === "ALL" || f.severity === activeSeverityFilter;
    const matchesStatus = activeStatusFilter === "ALL" || f.status === activeStatusFilter;
    const matchesSearch =
      searchQuery === "" ||
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.control_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFw && matchesSev && matchesStatus && matchesSearch;
  });

  const currentScore = auditDetail?.score ?? 0;
  const fwScores = auditDetail?.framework_scores || {};
  const sevStats = auditDetail?.severity_breakdown || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>Multi-Framework Compliance Engine</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic security baseline audits evaluating configurations against CIS, NIST SP 800-53, DISA STIG,
            and ISO/IEC 27001.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => refetchAudits()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-300 hover:text-white text-xs font-mono transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isAuditsLoading && "animate-spin")} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              if (configurations.length > 0) {
                setSelectedConfigForAudit(configurations[0].id);
              }
              setIsLaunchModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>New Compliance Audit</span>
          </button>
        </div>
      </div>

      {audits.length === 0 ? (
        /* Empty State */
        <div className="p-12 rounded-xl bg-slate-900/40 border border-white/5 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">No Compliance Audits Executed</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Run a deterministic compliance audit against an ingested configuration to evaluate CIS, NIST, DISA STIG,
              and ISO 27001 baseline checks.
            </p>
          </div>
          <button
            onClick={() => {
              if (configurations.length > 0) {
                setSelectedConfigForAudit(configurations[0].id);
              }
              setIsLaunchModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Initial Audit</span>
          </button>
        </div>
      ) : (
        /* Main Audit Workspace */
        <div className="space-y-6">
          {/* Audit Session Selector Bar */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-mono text-slate-400 whitespace-nowrap">Audit Session:</span>
              <div className="flex items-center gap-1.5">
                {audits.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAuditId(a.id)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap flex items-center gap-1.5",
                      selectedAuditId === a.id
                        ? "bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-semibold"
                        : "bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-transparent"
                    )}
                  >
                    <span>ID: {a.id.slice(0, 8)}...</span>
                    {a.score !== null && a.score !== undefined && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[10px] font-bold",
                          a.score >= 80 ? "text-emerald-400" : a.score >= 60 ? "text-amber-400" : "text-rose-400"
                        )}
                      >
                        {a.score.toFixed(0)}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {auditDetail && (
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3 self-end md:self-auto">
                <span>
                  Executed:{" "}
                  <strong className="text-slate-300">
                    {new Date(auditDetail.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </strong>
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold uppercase">{auditDetail.status}</span>
              </div>
            )}
          </div>

          {/* Compliance Posture Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Overall Score Card */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-[#0c1322] to-[#080d18] border border-cyan-500/20 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  NetVigil Compliance Score
                </div>
                <div className="text-xs text-slate-500 font-mono">Deterministic Multi-Framework Average</div>
              </div>

              <div className="my-4 flex items-baseline gap-2 font-mono">
                <span
                  className={cn(
                    "text-4xl font-black tracking-tight",
                    currentScore >= 80 ? "text-emerald-400" : currentScore >= 60 ? "text-amber-400" : "text-rose-400"
                  )}
                >
                  {currentScore.toFixed(0)}
                </span>
                <span className="text-slate-500 text-sm font-semibold">/ 100</span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    currentScore >= 80 ? "bg-emerald-400" : currentScore >= 60 ? "bg-amber-400" : "bg-rose-400"
                  )}
                  style={{ width: `${currentScore}%` }}
                />
              </div>
            </div>

            {/* Framework Breakdown Cards (3 cols) */}
            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: "CIS", label: "CIS Benchmark", sub: "v2.0.0 Consensus" },
                { key: "NIST", label: "NIST SP 800-53", sub: "Rev 5 Federal" },
                { key: "STIG", label: "DISA STIG", sub: "DoD Hardening" },
                { key: "ISO", label: "ISO 27001", sub: "Annex A Controls" },
              ].map((fw) => {
                const fwData = fwScores[fw.key];
                const scoreVal = fwData ? fwData.score : 0;
                return (
                  <div
                    key={fw.key}
                    onClick={() => setActiveFrameworkFilter(activeFrameworkFilter === fw.key ? "ALL" : fw.key)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between",
                      activeFrameworkFilter === fw.key
                        ? "bg-cyan-950/40 border-cyan-500/60 shadow-md shadow-cyan-950/20"
                        : "bg-slate-900/60 border-white/5 hover:border-white/20 hover:bg-slate-900/80"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">{fw.key}</span>
                        {fwData && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {fwData.passed_count}/{fwData.total_applicable}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">{fw.label}</div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xl font-bold font-mono text-cyan-300">{scoreVal.toFixed(0)}%</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{fw.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Severity Badges Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-rose-400 uppercase font-semibold">Critical Findings</div>
                <div className="text-lg font-bold text-rose-300 mt-0.5">{sevStats.critical}</div>
              </div>
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>

            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-amber-400 uppercase font-semibold">High Findings</div>
                <div className="text-lg font-bold text-amber-300 mt-0.5">{sevStats.high}</div>
              </div>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>

            <div className="p-3 rounded-lg bg-yellow-950/20 border border-yellow-800/30 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-yellow-400 uppercase font-semibold">Medium Findings</div>
                <div className="text-lg font-bold text-yellow-300 mt-0.5">{sevStats.medium}</div>
              </div>
              <Info className="w-5 h-5 text-yellow-400" />
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Low / Informational</div>
                <div className="text-lg font-bold text-slate-300 mt-0.5">{sevStats.low + sevStats.info}</div>
              </div>
              <ShieldCheck className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          {/* Findings Explorer */}
          <div className="p-5 rounded-xl bg-slate-900/40 border border-white/5 space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-white font-mono flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Findings ({filteredFindings.length})</span>
                </span>

                {/* Framework Filters */}
                <div className="flex items-center gap-1 bg-[#0b101c] border border-white/10 p-1 rounded-md text-xs font-mono">
                  {["ALL", "CIS", "NIST", "STIG", "ISO"].map((fw) => (
                    <button
                      key={fw}
                      onClick={() => setActiveFrameworkFilter(fw)}
                      className={cn(
                        "px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors",
                        activeFrameworkFilter === fw
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {fw}
                    </button>
                  ))}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-[#0b101c] border border-white/10 p-1 rounded-md text-xs font-mono">
                  {["ALL", "FAIL", "PASS", "UNKNOWN"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setActiveStatusFilter(st)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold uppercase transition-colors",
                        activeStatusFilter === st
                          ? st === "FAIL"
                            ? "bg-rose-950 text-rose-300 border border-rose-800/40"
                            : st === "PASS"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                            : "bg-cyan-950 text-cyan-300 border border-cyan-800/40"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search finding or control..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-md bg-[#0b101c] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-full sm:w-64 font-mono"
                />
              </div>
            </div>

            {/* Findings Table */}
            {isDetailLoading ? (
              <div className="py-16 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading compliance findings...</span>
              </div>
            ) : filteredFindings.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50" />
                <div className="text-xs font-medium text-slate-400">No matching findings</div>
                <p className="text-[11px] text-slate-500">
                  Try adjusting your framework, severity, or status filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Framework & Control</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Actual vs Expected</th>
                      <th className="py-2.5 px-3 text-right">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredFindings.map((f) => {
                      const isPass = f.status === "PASS";
                      const isFail = f.status === "FAIL";
                      const isUnknown = f.status === "UNKNOWN";

                      return (
                        <tr
                          key={f.id}
                          onClick={() => setInspectingFinding(f)}
                          className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border",
                                isPass && "bg-emerald-950/80 text-emerald-400 border-emerald-800/40",
                                isFail && "bg-rose-950/80 text-rose-400 border-rose-800/40",
                                isUnknown && "bg-amber-950/80 text-amber-400 border-amber-800/40"
                              )}
                            >
                              {isPass && <CheckCircle2 className="w-3 h-3" />}
                              {isFail && <XCircle className="w-3 h-3" />}
                              {isUnknown && <HelpCircle className="w-3 h-3" />}
                              <span>{f.status}</span>
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono">
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase",
                                f.severity === "CRITICAL" && "text-rose-400",
                                f.severity === "HIGH" && "text-amber-400",
                                f.severity === "MEDIUM" && "text-yellow-400",
                                f.severity === "LOW" && "text-cyan-400",
                                f.severity === "INFO" && "text-slate-400"
                              )}
                            >
                              {f.severity}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                                {f.framework}
                              </span>
                              <span className="text-slate-300 font-semibold">{f.control_id}</span>
                            </div>
                            {f.category && (
                              <div className="text-[10px] text-slate-500 mt-0.5">{f.category}</div>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">
                              {f.title}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {f.description}
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-[11px]">
                            <div className="space-y-0.5">
                              <div className="text-slate-400">
                                Actual: <span className="text-cyan-300">{f.actual_value}</span>
                              </div>
                              <div className="text-slate-500">
                                Expected: <span className="text-slate-300">{f.expected_value}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingFinding(f);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-white/5 hover:border-cyan-800/40 text-[11px] font-mono transition-colors"
                            >
                              <Terminal className="w-3 h-3 text-cyan-400" />
                              <span>Evidence</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-Over Finding Evidence & Provenance Inspector Drawer */}
      {inspectingFinding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="bg-[#0a0f1d] border-l border-white/10 w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 bg-slate-900/90 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border",
                      inspectingFinding.status === "PASS" && "bg-emerald-950 text-emerald-400 border-emerald-800/40",
                      inspectingFinding.status === "FAIL" && "bg-rose-950 text-rose-400 border-rose-800/40",
                      inspectingFinding.status === "UNKNOWN" && "bg-amber-950 text-amber-400 border-amber-800/40"
                    )}
                  >
                    {inspectingFinding.status}
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {inspectingFinding.framework} • {inspectingFinding.control_id}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{inspectingFinding.title}</h3>
              </div>

              <button
                onClick={() => setInspectingFinding(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-mono">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5">
                  <div className="text-[10px] text-slate-500 uppercase">Severity Level</div>
                  <div
                    className={cn(
                      "text-xs font-bold mt-1 uppercase",
                      inspectingFinding.severity === "CRITICAL" && "text-rose-400",
                      inspectingFinding.severity === "HIGH" && "text-amber-400",
                      inspectingFinding.severity === "MEDIUM" && "text-yellow-400",
                      inspectingFinding.severity === "LOW" && "text-cyan-400"
                    )}
                  >
                    {inspectingFinding.severity}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5">
                  <div className="text-[10px] text-slate-500 uppercase">Category Domain</div>
                  <div className="text-xs font-bold text-slate-300 mt-1">
                    {inspectingFinding.category || "General"}
                  </div>
                </div>
              </div>

              {/* Verified Document Citation */}
              {inspectingFinding.finding_metadata?.source && (
                <div className="p-3.5 rounded-lg bg-slate-900/60 border border-cyan-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-cyan-400 text-[11px] font-semibold">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Verified Official Citation</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">
                    Document: <strong>{inspectingFinding.finding_metadata.source.document}</strong>
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    Reference: {inspectingFinding.finding_metadata.source.reference} (v
                    {inspectingFinding.finding_metadata.source.version})
                  </div>
                </div>
              )}

              {/* Value Comparison */}
              <div className="p-3.5 rounded-lg bg-slate-900/80 border border-white/5 space-y-2">
                <div className="text-[10px] text-slate-500 uppercase">Deterministic Value Evaluation</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-[#060911] border border-white/5">
                    <div className="text-slate-500 text-[10px]">Actual Extracted Value:</div>
                    <div className="text-cyan-300 font-bold mt-0.5">{inspectingFinding.actual_value}</div>
                  </div>
                  <div className="p-2 rounded bg-[#060911] border border-white/5">
                    <div className="text-slate-500 text-[10px]">Expected Baseline Value:</div>
                    <div className="text-emerald-400 font-bold mt-0.5">{inspectingFinding.expected_value}</div>
                  </div>
                </div>
              </div>

              {/* Verbatim Configuration Evidence Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                    <Terminal className="w-3 h-3" />
                    <span>Verbatim Configuration Evidence</span>
                  </span>
                  {inspectingFinding.finding_metadata?.source_lines && (
                    <span className="text-slate-400">
                      Line(s):{" "}
                      <strong className="text-cyan-300">
                        {inspectingFinding.finding_metadata.source_lines.join(", ")}
                      </strong>
                    </span>
                  )}
                </div>

                <pre className="p-3.5 rounded-lg bg-[#060911] border border-white/10 text-[11px] font-mono text-cyan-200 overflow-x-auto leading-relaxed select-text">
                  {inspectingFinding.evidence || "[No direct line evidence — evaluated from default baseline]"}
                </pre>
              </div>

              {/* Technical Risk Explanation */}
              {inspectingFinding.description && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">Why It Matters (Technical Impact)</div>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans bg-slate-900/40 p-3 rounded-lg border border-white/5">
                    {inspectingFinding.description}
                  </p>
                </div>
              )}

              {/* Remediation Hint */}
              {inspectingFinding.remediation && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">Remediation Reference</div>
                  <div className="p-2.5 rounded bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-xs">
                    {inspectingFinding.remediation}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-900/90 flex items-center justify-end">
              <button
                onClick={() => setInspectingFinding(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Compliance Audit Launcher Modal */}
      {isLaunchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c121e] border border-cyan-500/30 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-white/10 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-cyan-400 fill-current" />
                <h3 className="text-sm font-bold text-white">Execute Compliance Audit</h3>
              </div>
              <button
                onClick={() => setIsLaunchModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Select Configuration Target:</label>
                <select
                  value={selectedConfigForAudit}
                  onChange={(e) => setSelectedConfigForAudit(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#070b12] border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-cyan-500/50"
                >
                  {configurations.map((cfg) => (
                    <option key={cfg.id} value={cfg.id}>
                      {cfg.original_filename} ({cfg.detected_vendor} - {cfg.hash.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-slate-300 font-semibold">Target Compliance Frameworks:</label>
                <div className="grid grid-cols-2 gap-2">
                  {["CIS", "NIST", "STIG", "ISO"].map((fw) => {
                    const isSelected = selectedFrameworks.includes(fw);
                    return (
                      <button
                        key={fw}
                        type="button"
                        onClick={() => toggleFrameworkSelection(fw)}
                        className={cn(
                          "p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors",
                          isSelected
                            ? "bg-cyan-950/80 border-cyan-600 text-cyan-200"
                            : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-300"
                        )}
                      >
                        <span className="font-bold">{fw}</span>
                        <div
                          className={cn(
                            "w-4 h-4 rounded flex items-center justify-center border",
                            isSelected ? "bg-cyan-500 border-cyan-400 text-black" : "border-slate-600"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Deterministic rules will evaluate the canonical Universal Security Model. Zero unverified LLM trust.
              </p>
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsLaunchModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunchAudit}
                disabled={createAuditMutation.isPending || configurations.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold font-mono disabled:opacity-50 transition-colors"
              >
                {createAuditMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating Rules...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
