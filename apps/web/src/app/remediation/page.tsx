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
  RotateCcw,
  Search,
} from "lucide-react";
import {
  fetchRemediations,
  fetchAuditRemediations,
  fetchRemediationStats,
  reviewRemediation,
  fetchAudits,
  RemediationProposal,
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
  const { data: stats, refetch: refetchStats } = useQuery({
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
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2.5 font-mono">
            <Wrench className="w-5 h-5 text-[#22C55E]" />
            <span>Vendor-Specific Remediation Center</span>
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Verified static remediation templates, configuration diffs, and post-change verification steps for Cisco, Juniper, and Fortinet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchStats();
              refetchRemediations();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#242424] text-xs font-mono transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#A3A3A3] uppercase font-semibold">Total Fixes</div>
            <div className="text-2xl font-bold text-[#F5F5F5] mt-1">{stats?.total_proposals ?? 0}</div>
          </div>
          <FileCode className="w-5 h-5 text-[#666666]" />
        </div>

        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#22C55E]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#22C55E] uppercase font-semibold">Verified Templates</div>
            <div className="text-2xl font-bold text-[#22C55E] mt-1">{stats?.available_count ?? 0}</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
        </div>

        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00D9FF]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#00D9FF] uppercase font-semibold">Reviewed by Admin</div>
            <div className="text-2xl font-bold text-[#00D9FF] mt-1">{stats?.reviewed_count ?? 0}</div>
          </div>
          <ShieldCheck className="w-5 h-5 text-[#00D9FF]" />
        </div>

        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#F59E0B]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#F59E0B] uppercase font-semibold">Manual Required</div>
            <div className="text-2xl font-bold text-[#F59E0B] mt-1">{stats?.not_available_count ?? 0}</div>
          </div>
          <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
          <div className="flex flex-wrap items-center gap-2">
            {/* Vendor Filter */}
            <div className="flex items-center gap-1 bg-[#0D0D0D] border border-[#1A1A1A] p-1 rounded-md text-xs">
              {["ALL", "cisco", "juniper", "fortinet"].map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedVendorFilter(v)}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase transition-colors",
                    selectedVendorFilter === v
                      ? "bg-[#141414] text-[#22C55E] border border-[#22C55E]/40"
                      : "text-[#A3A3A3] hover:text-[#F5F5F5]"
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
              className="p-1.5 rounded-md bg-[#0D0D0D] border border-[#1A1A1A] text-xs text-[#00D9FF] focus:outline-none focus:border-[#00D9FF]"
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
            <Search className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search remediation control..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-md bg-[#0D0D0D] border border-[#1A1A1A] text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#22C55E]/50 w-full sm:w-64 font-mono"
            />
          </div>
        </div>

        {/* Remediation Cards List */}
        {isRemediationsLoading ? (
          <div className="py-16 text-center text-[#666666] font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#22C55E]" />
            <span>Loading verified remediation templates...</span>
          </div>
        ) : filteredRemediations.length === 0 ? (
          <div className="py-16 text-center text-[#666666] font-mono text-xs">
            No remediation proposals found matching selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRemediations.map((proposal) => {
              const cardTab = activeCardTab[proposal.id] || "commands";

              return (
                <div
                  key={proposal.id}
                  className="p-5 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] hover:border-[#22C55E]/40 transition-all space-y-4 font-mono text-xs"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#111111] text-[#22C55E] border border-[#22C55E]/30 font-bold uppercase text-[10px]">
                        {proposal.vendor}
                      </span>

                      <span className="px-2 py-0.5 rounded bg-[#111111] text-[#00D9FF] border border-[#1A1A1A] text-[10px]">
                        {proposal.normalized_control}
                      </span>

                      <span className="text-[10px] text-[#666666] font-sans">
                        Template: <strong>{proposal.template_id}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {proposal.is_reviewed ? (
                        <span className="px-2 py-0.5 rounded bg-[#111111] text-[#00D9FF] border border-[#00D9FF]/30 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#00D9FF]" />
                          <span>Reviewed by {proposal.reviewed_by?.split("@")[0]}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-[#111111] text-[#A3A3A3] border border-[#1A1A1A] text-[10px]">
                          Review Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#F5F5F5] tracking-tight">{proposal.title}</h3>
                    <p className="text-xs text-[#A3A3A3] font-sans">{proposal.why_recommended}</p>
                  </div>

                  {/* Card Inner Tabs */}
                  <div className="flex items-center gap-1 border-b border-[#1A1A1A] pb-1.5 text-[11px]">
                    <button
                      onClick={() => setActiveCardTab((prev) => ({ ...prev, [proposal.id]: "commands" }))}
                      className={cn(
                        "px-2.5 py-1 rounded transition-colors flex items-center gap-1",
                        cardTab === "commands" ? "bg-[#141414] text-[#22C55E] font-bold border border-[#22C55E]/30" : "text-[#A3A3A3] hover:text-[#F5F5F5]"
                      )}
                    >
                      <Terminal className="w-3 h-3" />
                      <span>Remediation CLI</span>
                    </button>

                    <button
                      onClick={() => setActiveCardTab((prev) => ({ ...prev, [proposal.id]: "diff" }))}
                      className={cn(
                        "px-2.5 py-1 rounded transition-colors flex items-center gap-1",
                        cardTab === "diff" ? "bg-[#141414] text-[#22C55E] font-bold border border-[#22C55E]/30" : "text-[#A3A3A3] hover:text-[#F5F5F5]"
                      )}
                    >
                      <FileCode className="w-3 h-3" />
                      <span>Visual Diff</span>
                    </button>

                    <button
                      onClick={() => setActiveCardTab((prev) => ({ ...prev, [proposal.id]: "impact" }))}
                      className={cn(
                        "px-2.5 py-1 rounded transition-colors flex items-center gap-1",
                        cardTab === "impact" ? "bg-[#141414] text-[#22C55E] font-bold border border-[#22C55E]/30" : "text-[#A3A3A3] hover:text-[#F5F5F5]"
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
                          cardTab === "rollback" ? "bg-[#141414] text-[#EF4444] font-bold border border-[#EF4444]/30" : "text-[#A3A3A3] hover:text-[#F5F5F5]"
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
                      <pre className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A] text-[#22C55E] text-xs font-mono overflow-x-auto select-text leading-relaxed">
                        {proposal.remediation_commands}
                      </pre>
                    </div>
                  )}

                  {/* Tab Content 2: Visual Configuration Diff */}
                  {cardTab === "diff" && (
                    <div className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A] space-y-2 text-xs font-mono">
                      {proposal.diff_preview?.diff_lines && proposal.diff_preview.diff_lines.length > 0 ? (
                        <div className="space-y-1">
                          {proposal.diff_preview.diff_lines.map((d, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "p-1.5 rounded flex items-center justify-between border",
                                d.type === "REMOVE" ? "bg-[#141414] text-[#EF4444] border-[#EF4444]/30" : "bg-[#141414] text-[#22C55E] border-[#22C55E]/30"
                              )}
                            >
                              <span className="font-semibold">{d.type === "REMOVE" ? "- " : "+ "}{d.line}</span>
                              <span className="text-[10px] text-[#666666]">{d.description}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[#666666] py-2 text-center">Direct declarative hardening (no baseline removal required).</div>
                      )}
                    </div>
                  )}

                  {/* Tab Content 3: Impact & Verification */}
                  {cardTab === "impact" && (
                    <div className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A] space-y-3 font-sans text-xs">
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-[#F59E0B] uppercase font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Potential Operational Impact:</span>
                        </div>
                        <p className="text-[#D4D4D4]">{proposal.potential_impact}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-[#00D9FF] uppercase font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Post-Change Verification Commands:</span>
                        </div>
                        <pre className="p-2 rounded bg-[#0A0A0A] border border-[#1A1A1A] font-mono text-[#00D9FF] text-[11px] whitespace-pre-wrap select-text">
                          {proposal.verification_steps}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Tab Content 4: Rollback */}
                  {cardTab === "rollback" && proposal.rollback_commands && (
                    <div className="relative">
                      <pre className="p-3.5 rounded-lg bg-[#050505] border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono overflow-x-auto select-text leading-relaxed">
                        {proposal.rollback_commands}
                      </pre>
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1A1A1A]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyCommands(proposal.id, proposal.remediation_commands)}
                        className="px-3 py-1.5 rounded bg-[#0B0B0B] hover:bg-[#141414] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#1A1A1A] text-xs font-mono flex items-center gap-1.5 transition-colors"
                      >
                        {copiedId === proposal.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                            <span className="text-[#22C55E] font-semibold">Copied CLI!</span>
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
                        className="px-3 py-1.5 rounded bg-[#0B0B0B] hover:bg-[#141414] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#1A1A1A] text-xs font-mono flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Script</span>
                      </button>
                    </div>

                    {!proposal.is_reviewed && (
                      <button
                        onClick={() => reviewMutation.mutate(proposal.id)}
                        disabled={reviewMutation.isPending}
                        className="px-3.5 py-1.5 rounded bg-[#0B0B0B] border border-[#22C55E]/50 hover:border-[#22C55E] hover:bg-[#141414] text-[#22C55E] text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
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
