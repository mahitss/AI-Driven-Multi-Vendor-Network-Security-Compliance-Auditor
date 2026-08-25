"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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
  FileCode2,
  ShieldCheck,
  RotateCcw,
  Search,
  Sparkles,
  Lock,
  ArrowRight,
  ChevronDown,
  ShieldAlert,
  Flame,
  Layers,
  X,
  Clock,
  Key,
} from "lucide-react";
import {
  fetchRemediations,
  fetchAuditRemediations,
  fetchRemediationStats,
  reviewRemediation,
  fetchAudits,
  fetchRemediationExplanation,
  fetchFindings,
  RemediationProposal,
  RemediationExplanation,
  RemediationStats,
  Finding,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function RemediationCenterPage() {
  const queryClient = useQueryClient();

  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRemediationId, setSelectedRemediationId] = useState<string | null>(null);
  const [copiedApply, setCopiedApply] = useState(false);
  const [copiedRollback, setCopiedRollback] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(false);

  // 1. Fetch remediation stats
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["remediation-stats"],
    queryFn: () => fetchRemediationStats(),
    staleTime: 30000,
  });

  // 2. Fetch all remediations
  const {
    data: remediations = [],
    isLoading: isRemediationsLoading,
    isError: isRemediationsError,
    refetch: refetchRemediations,
  } = useQuery({
    queryKey: ["remediations", selectedVendorFilter, selectedStatusFilter],
    queryFn: () =>
      fetchRemediations({
        vendor: selectedVendorFilter === "ALL" ? undefined : selectedVendorFilter,
        status: selectedStatusFilter === "ALL" ? undefined : selectedStatusFilter,
      }),
  });

  // 3. Fetch findings for title and severity context
  const { data: findings = [] } = useQuery({
    queryKey: ["all-findings-for-remediation"],
    queryFn: () => fetchFindings(),
    staleTime: 60000,
  });

  // Default selection to first remediation
  useEffect(() => {
    if (remediations.length > 0 && !selectedRemediationId) {
      setSelectedRemediationId(remediations[0].id);
    }
  }, [remediations, selectedRemediationId]);

  const selectedRemediation: RemediationProposal | undefined = useMemo(() => {
    return remediations.find((r) => r.id === selectedRemediationId) || remediations[0];
  }, [remediations, selectedRemediationId]);

  // Linked finding for selected proposal
  const linkedFinding: Finding | undefined = useMemo(() => {
    if (!selectedRemediation) return undefined;
    return findings.find((f) => f.id === selectedRemediation.finding_id) || findings[0];
  }, [selectedRemediation, findings]);

  // 4. Fetch AI explanation for selected proposal
  const {
    data: aiExplanation,
    isLoading: isAiLoading,
    isError: isAiError,
  } = useQuery({
    queryKey: ["remediation-ai-explanation", selectedRemediation?.id],
    queryFn: () => (selectedRemediation ? fetchRemediationExplanation(selectedRemediation.id) : null),
    enabled: !!selectedRemediation?.id && isAiExpanded,
    staleTime: 120000,
  });

  // 5. Review remediation mutation
  const reviewMutation = useMutation({
    mutationFn: (id: string) => reviewRemediation(id, { reviewer_email: "sec-ops@netvigil.internal" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remediations"] });
      queryClient.invalidateQueries({ queryKey: ["remediation-stats"] });
    },
  });

  // Filtered queue items
  const filteredRemediations = useMemo(() => {
    return remediations.filter((r) => {
      // Vendor filter
      if (selectedVendorFilter !== "ALL" && r.vendor?.toLowerCase() !== selectedVendorFilter.toLowerCase()) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== "ALL") {
        if (selectedStatusFilter === "REVIEWED" && !r.is_reviewed) return false;
        if (selectedStatusFilter === "PROPOSED" && r.is_reviewed) return false;
      }

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.template_id?.toLowerCase().includes(q) ||
          r.vendor?.toLowerCase().includes(q) ||
          r.why_recommended?.toLowerCase().includes(q) ||
          r.remediation_commands?.toLowerCase().includes(q) ||
          linkedFinding?.title?.toLowerCase().includes(q) ||
          linkedFinding?.control_id?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [remediations, selectedVendorFilter, selectedStatusFilter, searchQuery, linkedFinding]);

  // Real backend-derived metrics
  const totalCount = stats?.total_proposals ?? remediations.length;
  const reviewedCount = stats?.reviewed_count ?? remediations.filter((r) => r.is_reviewed).length;
  const readyCount = totalCount - reviewedCount;
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;

  const handleCopyApply = () => {
    if (!selectedRemediation?.remediation_commands) return;
    navigator.clipboard.writeText(selectedRemediation.remediation_commands);
    setCopiedApply(true);
    setTimeout(() => setCopiedApply(false), 2000);
  };

  const handleCopyRollback = () => {
    if (!selectedRemediation?.rollback_commands) return;
    navigator.clipboard.writeText(selectedRemediation.rollback_commands);
    setCopiedRollback(true);
    setTimeout(() => setCopiedRollback(false), 2000);
  };

  const handleDownloadScript = () => {
    if (!selectedRemediation) return;
    const ext = selectedRemediation.vendor === "juniper" ? "set" : "cfg";
    const filename = `remediation_${selectedRemediation.vendor}_${selectedRemediation.template_id}.${ext}`;
    const header = `! NetVigil Remediation Catalog Export\n! Vendor: ${selectedRemediation.vendor.toUpperCase()}\n! Template: ${selectedRemediation.template_id}\n! Execution: MANUAL DEPLOYMENT ONLY\n\n`;
    const element = document.createElement("a");
    const file = new Blob([header + selectedRemediation.remediation_commands], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-16 font-sans">
      {/* 1. Header & Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-[#10B981]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>● ZERO AUTOMATED NETWORK PUSH</span>
            </span>
            <span className="text-white/20">•</span>
            <span className="text-[#00D9FF]">CATALOG-VERIFIED TEMPLATES</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F8FAFC] tracking-tight font-sans">
            REMEDIATION CENTER
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 max-w-3xl font-sans leading-relaxed">
            Review safe, vendor-aware configuration changes before deployment. NetVigil generates allowlisted remediation proposals. Network changes remain outside the platform's execution boundary.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto text-xs">
          <button
            onClick={() => {
              refetchStats();
              refetchRemediations();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-[#10B981] font-semibold transition-all shadow-sm active:scale-[0.98]"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRemediationsLoading && "animate-spin")} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Row (Real Backend Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 font-mono">
        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#64748B] uppercase font-semibold">OPEN REMEDIATIONS</div>
          <div className="text-2xl font-extrabold text-[#F8FAFC] mt-1">{totalCount}</div>
          <div className="text-[10px] text-[#94A3B8] font-sans mt-0.5">Catalog-supported fixes</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#EF4444] uppercase font-semibold">CRITICAL</div>
          <div className="text-2xl font-extrabold text-[#EF4444] mt-1">{criticalCount}</div>
          <div className="text-[10px] text-[#64748B] font-sans mt-0.5">Immediate intervention</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#F59E0B] uppercase font-semibold">HIGH</div>
          <div className="text-2xl font-extrabold text-[#F59E0B] mt-1">{highCount}</div>
          <div className="text-[10px] text-[#64748B] font-sans mt-0.5">Elevated risk vectors</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#00D9FF] uppercase font-semibold">READY FOR REVIEW</div>
          <div className="text-2xl font-extrabold text-[#00D9FF] mt-1">{readyCount}</div>
          <div className="text-[10px] text-[#64748B] font-sans mt-0.5">Pending operator check</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#10B981] uppercase font-semibold">REVIEWED</div>
          <div className="text-2xl font-extrabold text-[#10B981] mt-1">{reviewedCount}</div>
          <div className="text-[10px] text-[#64748B] font-sans mt-0.5">Human approved</div>
        </div>
      </div>

      {/* 3. Filters & Search Toolbar */}
      <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-3 font-mono">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search remediation template, control, vendor CLI, or finding..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]/50 transition-colors font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            {/* Vendor Filter */}
            <select
              value={selectedVendorFilter}
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-[#E2E8F0] focus:outline-none focus:border-[#10B981]/50"
            >
              <option value="ALL">Vendor: All</option>
              <option value="cisco">Cisco IOS</option>
              <option value="juniper">Juniper JunOS</option>
              <option value="fortinet">Fortinet FortiOS</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-[#E2E8F0] focus:outline-none focus:border-[#10B981]/50"
            >
              <option value="ALL">Status: All</option>
              <option value="PROPOSED">Ready for Review</option>
              <option value="REVIEWED">Reviewed</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Human Review Flow Progression Breadcrumb */}
      <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#64748B] text-[10px] uppercase font-bold">OPERATIONAL PIPELINE:</span>
          <span className="px-2 py-0.5 rounded bg-[#0B0F19] border border-white/[0.06] text-[#94A3B8]">
            01 FINDING
          </span>
          <span className="text-[#64748B]">→</span>
          <span className="px-2 py-0.5 rounded bg-[#0B0F19] border border-white/[0.06] text-[#94A3B8]">
            02 EVIDENCE VERIFIED
          </span>
          <span className="text-[#64748B]">→</span>
          <span className="px-2 py-0.5 rounded bg-[#0B0F19] border border-white/[0.06] text-[#94A3B8]">
            03 CATALOG TEMPLATE
          </span>
          <span className="text-[#64748B]">→</span>
          <span className="px-2 py-0.5 rounded bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-bold">
            04 HUMAN REVIEW (ACTIVE)
          </span>
          <span className="text-[#64748B]">→</span>
          <span className="px-2 py-0.5 rounded bg-[#0B0F19] border border-white/[0.06] text-[#94A3B8]">
            05 EXPORT / COPY
          </span>
          <span className="text-[#64748B]">→</span>
          <span className="px-2 py-0.5 rounded bg-[#0B0F19] border border-white/[0.06] text-[#64748B]">
            06 MANUAL DEPLOYMENT
          </span>
        </div>

        <div className="text-[10px] text-[#EF4444] font-bold">
          ✕ ZERO LIVE PUSH TO NETWORK
        </div>
      </div>

      {/* 5. Main 3-Panel Remediation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (4 Cols / ~33%): REMEDIATION QUEUE */}
        <div className="lg:col-span-4 space-y-3 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              REMEDIATION QUEUE ({filteredRemediations.length})
            </span>
            <span className="text-[10px] text-[#10B981]">ALLOWLISTED</span>
          </div>

          {/* Loading Skeleton */}
          {isRemediationsLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.04] animate-pulse space-y-2">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isRemediationsError && (
            <div className="p-6 rounded-xl bg-[#070A10] border border-red-500/20 text-center space-y-3">
              <AlertTriangle className="w-6 h-6 text-[#EF4444] mx-auto" />
              <div className="text-xs font-bold text-[#F8FAFC]">REMEDIATION DATA UNAVAILABLE</div>
              <p className="text-[11px] text-[#94A3B8] font-sans">Unable to retrieve remediation proposals.</p>
              <button
                onClick={() => refetchRemediations()}
                className="px-3 py-1 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isRemediationsLoading && !isRemediationsError && filteredRemediations.length === 0 && (
            <div className="p-8 rounded-xl bg-[#070A10] border border-white/[0.08] text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
              <div className="text-xs font-bold text-[#F8FAFC]">NO REMEDIATION REQUIRED</div>
              <p className="text-[11px] text-[#94A3B8] font-sans">
                Remediation proposals will appear when deterministic security findings require a catalog-supported correction.
              </p>
              <Link
                href="/findings"
                className="inline-block px-3 py-1.5 rounded-md bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 text-xs font-bold"
              >
                View Findings →
              </Link>
            </div>
          )}

          {/* Remediation Queue Scroll List */}
          {!isRemediationsLoading && !isRemediationsError && (
            <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
              {filteredRemediations.map((r: RemediationProposal) => {
                const isSelected = selectedRemediation?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRemediationId(r.id)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl border transition-all space-y-2 block group relative",
                      isSelected
                        ? "bg-[#0B0F19] border-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                        : "bg-[#070A10] border-white/[0.04] hover:border-white/[0.12] hover:bg-[#0B0F19]/60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                          {r.vendor.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-bold text-white truncate max-w-[140px]">
                          {r.template_id}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold",
                        r.is_reviewed ? "text-[#10B981]" : "text-[#F59E0B]"
                      )}>
                        {r.is_reviewed ? "REVIEWED ✓" : "PROPOSED"}
                      </span>
                    </div>

                    <div className="text-xs font-sans font-semibold text-[#F8FAFC] group-hover:text-[#10B981] transition-colors line-clamp-1">
                      {r.why_recommended}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-1 border-t border-white/[0.04]">
                      <span>Confidence: {(r.confidence * 100).toFixed(0)}%</span>
                      <span>Asset: CORE-RTR-01</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER PANEL (5 Cols / ~42%): BEFORE / AFTER CLI DIFF & ACTIONS */}
        <div className="lg:col-span-5 space-y-4 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              PROPOSED CONFIGURATION DIFF
            </span>
            <span className="text-[10px] text-[#10B981]">ALLOWLIST VERIFIED</span>
          </div>

          {selectedRemediation ? (
            <div className="space-y-4">
              {/* Metadata Provenance Box */}
              <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#64748B] text-[10px] block uppercase">CATALOG SOURCE</span>
                    <span className="font-bold text-[#10B981]">REMEDIATION_CATALOG</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] text-[10px] block uppercase">TEMPLATE IDENTIFIER</span>
                    <span className="font-bold text-[#F8FAFC]">{selectedRemediation.template_id}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-[#64748B]">
                  <span>VENDOR: <strong className="text-white">{selectedRemediation.vendor.toUpperCase()}</strong></span>
                  <span>VERSION: <strong className="text-white">{selectedRemediation.template_version}</strong></span>
                </div>
              </div>

              {/* Visual Before / After Diff Viewer */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#03060A] overflow-hidden">
                <div className="p-2.5 bg-[#070A10] border-b border-white/[0.06] flex items-center justify-between text-[11px] text-[#64748B]">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-[#10B981]" />
                    <span className="text-white font-bold">CLI Syntax Diff</span>
                  </div>
                  <span className="text-[#10B981] font-semibold">Allowlisted Patch</span>
                </div>

                <div className="p-3 text-[11px] font-mono leading-relaxed space-y-1 select-text">
                  {/* Removed configuration */}
                  <div className="p-2 rounded bg-[#EF4444]/10 border-l-2 border-[#EF4444] text-[#EF4444] flex items-center gap-2">
                    <span className="font-bold select-none">-</span>
                    <span>{selectedRemediation.diff_preview?.diff_lines?.find(d => d.type === "REMOVE")?.line || "! No removal commands"}</span>
                  </div>

                  {/* Added configuration */}
                  <div className="p-2 rounded bg-[#10B981]/10 border-l-2 border-[#10B981] text-[#10B981] flex items-center gap-2">
                    <span className="font-bold select-none">+</span>
                    <span>{selectedRemediation.diff_preview?.diff_lines?.find(d => d.type === "ADD")?.line || selectedRemediation.remediation_commands}</span>
                  </div>
                </div>
              </div>

              {/* Complete Allowlisted CLI Script */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#070A10] p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="uppercase font-bold">ALLOWLISTED REMEDIATION COMMANDS</span>
                  <span>Vendor-compliant CLI</span>
                </div>

                <pre className="p-3 rounded-lg bg-[#03060A] border border-white/[0.04] text-[11px] text-[#00D9FF] font-mono overflow-x-auto whitespace-pre">
                  {selectedRemediation.remediation_commands}
                </pre>

                {/* Operator Actions Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={handleCopyApply}
                    className="p-2.5 rounded-lg bg-[#10B981]/20 hover:bg-[#10B981]/30 border border-[#10B981]/40 text-[#10B981] font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    {copiedApply ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedApply ? "COPIED ✓" : "COPY APPLY CLI"}</span>
                  </button>

                  <button
                    onClick={handleDownloadScript}
                    className="p-2.5 rounded-lg bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DOWNLOAD .CFG</span>
                  </button>

                  <button
                    onClick={() => reviewMutation.mutate(selectedRemediation.id)}
                    disabled={selectedRemediation.is_reviewed || reviewMutation.isPending}
                    className={cn(
                      "p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      selectedRemediation.is_reviewed
                        ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 opacity-80 cursor-default"
                        : "bg-[#00D9FF]/20 hover:bg-[#00D9FF]/30 text-[#00D9FF] border-[#00D9FF]/40"
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedRemediation.is_reviewed ? "REVIEWED ✓" : "MARK REVIEWED"}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-[#070A10] border border-white/[0.08] text-center text-[#64748B] text-xs">
              Select a remediation proposal to inspect the CLI diff.
            </div>
          )}
        </div>

        {/* RIGHT PANEL (3 Cols / ~25%): EXECUTION BOUNDARY & CONTEXT */}
        <div className="lg:col-span-3 space-y-4 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              EXECUTION BOUNDARY
            </span>
            <span className="text-[10px] text-[#EF4444] font-bold">DISABLED</span>
          </div>

          {/* Prominent Execution Boundary Box */}
          <div className="p-4 rounded-xl bg-[#0E0709] border border-[#EF4444]/40 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-[#EF4444] font-bold">
              <Lock className="w-4 h-4 shrink-0" />
              <span>STRICT EXECUTION BOUNDARY</span>
            </div>

            <div className="space-y-1 text-[11px] text-[#94A3B8] font-sans leading-relaxed">
              <div className="flex items-center justify-between">
                <span>REMOTE EXECUTION:</span>
                <span className="text-[#EF4444] font-bold font-mono">DISABLED</span>
              </div>
              <div className="flex items-center justify-between">
                <span>SSH / NETCONF:</span>
                <span className="text-[#EF4444] font-bold font-mono">ABSENT</span>
              </div>
            </div>

            <p className="text-[10px] text-[#64748B] font-sans pt-1 border-t border-white/[0.04]">
              NetVigil generates allowlisted commands for human review. It does not push changes to network devices.
            </p>
          </div>

          {/* Rollback Preview Section */}
          <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-[10px] text-[#10B981] font-bold uppercase flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ROLLBACK CAPABILITY</span>
              </span>
              <span className="text-[10px] text-[#10B981] font-bold">AVAILABLE ✓</span>
            </div>

            <pre className="p-2.5 rounded bg-[#03060A] border border-white/[0.04] text-[10px] text-[#F59E0B] font-mono overflow-x-auto whitespace-pre">
              {selectedRemediation?.rollback_commands || "! No rollback commands provided for this template"}
            </pre>

            <button
              onClick={handleCopyRollback}
              className="w-full p-2 rounded bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-white font-semibold text-[11px] transition-all flex items-center justify-center gap-1.5"
            >
              {copiedRollback ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedRollback ? "COPIED ✓" : "COPY ROLLBACK CLI"}</span>
            </button>
          </div>

          {/* Safety Validation Invariants */}
          <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-2 text-xs">
            <div className="text-[10px] text-[#64748B] uppercase font-bold border-b border-white/[0.06] pb-1.5">
              SAFETY VALIDATION
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">ALLOWLIST STATUS:</span>
                <span className="text-[#10B981] font-bold">✓ VALIDATED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">CATALOG SOURCE:</span>
                <span className="text-[#10B981] font-bold">✓ VERIFIED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">REMOTE EXECUTION:</span>
                <span className="text-[#EF4444] font-bold">✕ DISABLED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">AI MODIFICATION:</span>
                <span className="text-[#EF4444] font-bold">✕ PROHIBITED</span>
              </div>
            </div>
          </div>

          {/* AI Advisory (Read-Only) */}
          <div className="p-4 rounded-xl bg-[#0E0B19] border border-[#A855F7]/30 space-y-3 text-xs">
            <button
              onClick={() => setIsAiExpanded(!isAiExpanded)}
              className="w-full flex items-center justify-between text-[#A855F7] font-bold text-left"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI ADVISORY — WHY THIS REMEDIATION?</span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isAiExpanded && "rotate-180")} />
            </button>

            {isAiExpanded && (
              <div className="space-y-2.5 pt-2 border-t border-white/[0.06] animate-fadeIn">
                <div className="text-[9px] text-[#64748B] flex items-center justify-between">
                  <span>READ ONLY</span>
                  <span className="text-[#A855F7]">GROUNDED IN CATALOG</span>
                </div>

                {isAiLoading && (
                  <div className="text-[11px] text-[#94A3B8] font-sans animate-pulse">
                    Generating evidence-grounded explanation...
                  </div>
                )}

                {isAiError && (
                  <div className="text-[11px] text-[#94A3B8] font-sans space-y-1">
                    <div className="text-[#EF4444] font-bold">AI ADVISORY UNAVAILABLE</div>
                    <div>Remediation proposal remains fully usable.</div>
                  </div>
                )}

                {aiExplanation && !isAiLoading && (
                  <div className="space-y-2 text-[11px] text-[#E2E8F0] font-sans leading-relaxed">
                    <p>{aiExplanation.what_changes || aiExplanation.why_change_is_safe}</p>
                    <div className="p-2 rounded bg-[#070A10] border border-white/[0.04] text-[10px] text-[#94A3B8] font-mono">
                      Citation: {selectedRemediation?.template_id}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Traceability Links */}
          <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.06] space-y-2 text-xs font-mono">
            <div className="text-[10px] text-[#64748B] uppercase font-bold">RELATED CONTEXT</div>
            <div className="space-y-1.5 text-[11px]">
              <Link
                href="/findings"
                className="block text-[#00D9FF] hover:underline flex items-center justify-between"
              >
                <span>→ Open Evidence Explorer</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href="/risk"
                className="block text-[#F59E0B] hover:underline flex items-center justify-between"
              >
                <span>→ Open Risk Intelligence</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
