"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Download,
  Terminal,
  FileCode,
  ShieldCheck,
  Layers,
  ArrowRight,
  Filter,
  Search,
  Eye,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  fetchRemediations,
  fetchAuditRemediations,
  fetchRemediationStats,
  reviewRemediation,
  fetchAudits,
  RemediationProposal,
  RemediationStats,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function RemediationCenterPage() {
  const queryClient = useQueryClient();

  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [selectedAuditId, setSelectedAuditId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCardTab, setActiveCardTab] = useState<Record<string, "commands" | "diff" | "impact" | "rollback">>({});

  // Queries
  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["remediation-stats"],
    queryFn: () => fetchRemediationStats(),
  });

  const { data: audits = [] } = useQuery({
    queryKey: ["audits"],
    queryFn: () => fetchAudits(),
  });

  const { data: remediations = [], isLoading: isRemediationsLoading, refetch: refetchRemediations } = useQuery({
    queryKey: ["remediations", selectedAuditId, selectedVendorFilter, selectedStatusFilter],
    queryFn: () => {
      if (selectedAuditId !== "ALL") {
        return fetchAuditRemediations(selectedAuditId, {
          vendor: selectedVendorFilter === "ALL" ? undefined : selectedVendorFilter,
          status: selectedStatusFilter === "ALL" ? undefined : selectedStatusFilter,
        });
      }
      return fetchRemediations({
        vendor: selectedVendorFilter === "ALL" ? undefined : selectedVendorFilter,
        status: selectedStatusFilter === "ALL" ? undefined : selectedStatusFilter,
      });
    },
  });

  // Mutation for Review
  const reviewMutation = useMutation({
    mutationFn: (id: string) => reviewRemediation(id, { reviewer_email: "sec-admin@ntro.gov.in" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remediations"] });
      queryClient.invalidateQueries({ queryKey: ["remediation-stats"] });
    },
  });

  const handleCopyCommands = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadScript = (proposal: RemediationProposal) => {
    const ext = proposal.vendor === "juniper" ? "set" : "cfg";
    const filename = `remediation_${proposal.vendor}_${proposal.template_id}.${ext}`;
    const blob = new Blob([proposal.remediation_commands], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredRemediations = remediations.filter((r) => {
    const matchesSearch =
      searchQuery === "" ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.normalized_control.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.remediation_commands.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Wrench className="w-5 h-5 text-emerald-400" />
            <span>Vendor-Specific Remediation Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verified static remediation templates, configuration diffs, and post-change verification steps for Cisco, Juniper, and Fortinet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchStats();
              refetchRemediations();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-300 hover:text-white text-xs font-mono transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Fixes</div>
            <div className="text-2xl font-bold text-white mt-1">{stats?.total_proposals ?? 0}</div>
          </div>
          <FileCode className="w-5 h-5 text-slate-400" />
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-400 uppercase font-semibold">Verified Templates</div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{stats?.available_count ?? 0}</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-cyan-400 uppercase font-semibold">Reviewed by Admin</div>
            <div className="text-2xl font-bold text-cyan-300 mt-1">{stats?.reviewed_count ?? 0}</div>
          </div>
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
        </div>

        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-amber-400 uppercase font-semibold">Manual Required</div>
            <div className="text-2xl font-bold text-amber-300 mt-1">{stats?.not_available_count ?? 0}</div>
          </div>
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Vendor Filter */}
            <div className="flex items-center gap-1 bg-[#0b101c] border border-white/10 p-1 rounded-md text-xs font-mono">
              {["ALL", "cisco", "juniper", "fortinet"].map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedVendorFilter(v)}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase transition-colors",
                    selectedVendorFilter === v
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Audit Filter */}
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
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search remediation control..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-md bg-[#0b101c] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 w-full sm:w-64 font-mono"
            />
          </div>
        </div>

        {/* Remediation Cards List */}
        {isRemediationsLoading ? (
          <div className="py-16 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading verified remediation templates...</span>
          </div>
        ) : filteredRemediations.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-mono text-xs">
            No remediation proposals found matching selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRemediations.map((proposal) => {
              const cardTab = activeCardTab[proposal.id] || "commands";

              return (
                <div
                  key={proposal.id}
                  className="p-5 rounded-xl bg-[#090d16] border border-white/10 hover:border-emerald-500/30 transition-all space-y-4 font-mono text-xs"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-bold uppercase text-[10px]">
                        {proposal.vendor}
                      </span>

                      <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-white/5 text-[10px]">
                        {proposal.normalized_control}
                      </span>

                      <span className="text-[10px] text-slate-400 font-sans">
                        Template: <strong>{proposal.template_id}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {proposal.is_reviewed ? (
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                          <span>Reviewed by {proposal.reviewed_by?.split("@")[0]}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10 text-[10px]">
                          Review Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white tracking-tight">{proposal.title}</h3>
                    <p className="text-xs text-slate-300 font-sans">{proposal.why_recommended}</p>
                  </div>

                  {/* Card Inner Tabs */}
                  <div className="flex items-center gap-1 border-b border-white/10 pb-1.5 text-[11px]">
                    <button
                      onClick={() => setActiveCardTab((prev) => ({ ...prev, [proposal.id]: "commands" }))}
                      className={cn(
                        "px-2.5 py-1 rounded transition-colors flex items-center gap-1",
                        cardTab === "commands" ? "bg-emerald-950 text-emerald-300 font-bold" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      <Terminal className="w-3 h-3" />
                      <span>Remediation CLI</span>
                    </button>

                    <button
                      onClick={() => setActiveCardTab((prev) => ({ ...prev, [proposal.id]: "diff" }))}
                      className={cn(
                        "px-2.5 py-1 rounded transition-colors flex items-center gap-1",
                        cardTab === "diff" ? "bg-emerald-950 text-emerald-300 font-bold" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      <FileCode className="w-3 h-3" />
                      <span>Visual Diff</span>
                    </button>

                    <button
                      onClick={() => setActiveCardTab((prev) => ({ ...prev, [proposal.id]: "impact" }))}
                      className={cn(
                        "px-2.5 py-1 rounded transition-colors flex items-center gap-1",
                        cardTab === "impact" ? "bg-emerald-950 text-emerald-300 font-bold" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Impact & Verification</span>
                    </button>

                    {proposal.rollback_commands && (
                      <button
                        onClick={() => setActiveCardTab((prev) => ({ ...prev, [proposal.id]: "rollback" }))}
                        className={cn(
                          "px-2.5 py-1 rounded transition-colors flex items-center gap-1",
                          cardTab === "rollback" ? "bg-emerald-950 text-emerald-300 font-bold" : "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Rollback</span>
                      </button>
                    )}
                  </div>

                  {/* Tab Content 1: CLI Commands */}
                  {cardTab === "commands" && (
                    <div className="relative">
                      <pre className="p-3.5 rounded-lg bg-[#04060c] border border-white/10 text-emerald-400 text-xs font-mono overflow-x-auto select-text leading-relaxed">
                        {proposal.remediation_commands}
                      </pre>
                    </div>
                  )}

                  {/* Tab Content 2: Visual Configuration Diff */}
                  {cardTab === "diff" && (
                    <div className="p-3.5 rounded-lg bg-[#04060c] border border-white/10 space-y-2 text-xs font-mono">
                      {proposal.diff_preview?.diff_lines && proposal.diff_preview.diff_lines.length > 0 ? (
                        <div className="space-y-1">
                          {proposal.diff_preview.diff_lines.map((d, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "p-1.5 rounded flex items-center justify-between",
                                d.type === "REMOVE" ? "bg-rose-950/40 text-rose-300 border border-rose-800/30" : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/30"
                              )}
                            >
                              <span className="font-semibold">{d.type === "REMOVE" ? "- " : "+ "}{d.line}</span>
                              <span className="text-[10px] text-slate-500">{d.description}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-500 py-2 text-center">Direct declarative hardening (no baseline removal required).</div>
                      )}
                    </div>
                  )}

                  {/* Tab Content 3: Impact & Verification */}
                  {cardTab === "impact" && (
                    <div className="p-3.5 rounded-lg bg-[#04060c] border border-white/10 space-y-3 font-sans text-xs">
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-amber-400 uppercase font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Potential Operational Impact:</span>
                        </div>
                        <p className="text-slate-300">{proposal.potential_impact}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-cyan-400 uppercase font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Post-Change Verification Commands:</span>
                        </div>
                        <pre className="p-2 rounded bg-slate-900 border border-white/5 font-mono text-cyan-300 text-[11px] whitespace-pre-wrap select-text">
                          {proposal.verification_steps}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Tab Content 4: Rollback */}
                  {cardTab === "rollback" && proposal.rollback_commands && (
                    <div className="relative">
                      <pre className="p-3.5 rounded-lg bg-[#04060c] border border-rose-900/30 text-rose-300 text-xs font-mono overflow-x-auto select-text leading-relaxed">
                        {proposal.rollback_commands}
                      </pre>
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyCommands(proposal.id, proposal.remediation_commands)}
                        className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors"
                      >
                        {copiedId === proposal.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied CLI!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Commands</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownloadScript(proposal)}
                        className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Script</span>
                      </button>
                    </div>

                    {!proposal.is_reviewed && (
                      <button
                        onClick={() => reviewMutation.mutate(proposal.id)}
                        disabled={reviewMutation.isPending}
                        className="px-3.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Reviewed</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
