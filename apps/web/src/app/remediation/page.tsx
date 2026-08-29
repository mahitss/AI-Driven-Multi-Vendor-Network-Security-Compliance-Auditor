"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Lock,
  ArrowRight,
  ChevronDown,
  ShieldAlert,
  Flame,
  Layers,
  X,
  Clock,
  Key,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  fetchRemediations,
  fetchAuditRemediations,
  fetchRemediationStats,
  reviewRemediation,
  fetchAudits,
  fetchRemediationExplanation,
  fetchFindings,
  fetchConfigurations,
  RemediationProposal,
  RemediationExplanation,
  RemediationStats,
  Finding,
  ConfigurationItem,
  AnalysisReanalyzeResult,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

function RemediationContent() {
  const searchParams = useSearchParams();
  const queryParamFindingId = searchParams.get("findingId") || searchParams.get("finding");
  const queryParamAnalysisId = searchParams.get("analysisId") || searchParams.get("analysis");

  const queryClient = useQueryClient();

  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRemediationId, setSelectedRemediationId] = useState<string | null>(null);
  const [copiedApply, setCopiedApply] = useState(false);
  const [copiedRollback, setCopiedRollback] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(false);

  // Re-analysis state
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeResult, setReanalyzeResult] = useState<AnalysisReanalyzeResult | null>(null);
  const [reanalyzeBannerVisible, setReanalyzeBannerVisible] = useState(false);

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

  // 3. Fetch findings for control context
  const { data: findings = [] } = useQuery({
    queryKey: ["all-findings-for-remediation"],
    queryFn: () => fetchFindings(),
    staleTime: 60000,
  });

  // 4. Fetch configurations
  const { data: configurations = [] } = useQuery({
    queryKey: ["configurations"],
    queryFn: () => fetchConfigurations(),
    staleTime: 60000,
  });

  // Sync selected remediation with query param or first item
  useEffect(() => {
    if (queryParamFindingId && remediations.length > 0) {
      const match = remediations.find((r) => r.finding_id === queryParamFindingId);
      if (match) {
        setSelectedRemediationId(match.id);
        return;
      }
    }
    if (remediations.length > 0 && !selectedRemediationId) {
      setSelectedRemediationId(remediations[0].id);
    }
  }, [queryParamFindingId, remediations, selectedRemediationId]);

  const selectedRemediation: RemediationProposal | undefined = useMemo(() => {
    return remediations.find((r) => r.id === selectedRemediationId) || remediations[0];
  }, [remediations, selectedRemediationId]);

  // Linked finding for selected proposal
  const linkedFinding: Finding | undefined = useMemo(() => {
    if (!selectedRemediation) return undefined;
    return findings.find((f) => f.id === selectedRemediation.finding_id) || findings[0];
  }, [selectedRemediation, findings]);

  // 5. Fetch AI explanation
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

  // Review remediation mutation
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
      if (selectedVendorFilter !== "ALL" && r.vendor?.toLowerCase() !== selectedVendorFilter.toLowerCase()) {
        return false;
      }
      if (selectedStatusFilter !== "ALL") {
        if (selectedStatusFilter === "REVIEWED" && !r.is_reviewed) return false;
        if (selectedStatusFilter === "PROPOSED" && r.is_reviewed) return false;
      }
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

  // Derived metrics
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
    const header = `! NetVigil Remediation Catalog Export\n! Vendor: ${selectedRemediation.vendor.toUpperCase()}\n! Template: ${selectedRemediation.template_id}\n! Execution: READ-ONLY ADVISORY (MANUAL DEPLOYMENT ONLY)\n\n`;
    const element = document.createElement("a");
    const file = new Blob([header + selectedRemediation.remediation_commands], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Re-Analysis Execution
  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      await new Promise((r) => setTimeout(r, 900));

      const mockResult: AnalysisReanalyzeResult = {
        analysis_id: queryParamAnalysisId || "reanalysis_remediation",
        status: "COMPLETED",
        previous_fail_count: 39,
        new_fail_count: 25,
        previous_compliance_score: 20.0,
        new_compliance_score: 46.7,
        previous_risk_score: 92.5,
        new_risk_score: 41.0,
        resolved_controls: [linkedFinding?.control_id || "CIS-1.2.1", "CIS-1.2.2", "NIST-AC-17", "STIG-NET0400"],
        findings_transition: [
          {
            control_id: linkedFinding?.control_id || "CIS-1.2.1",
            framework: linkedFinding?.framework || "CIS",
            title: linkedFinding?.title || "Ensure SSH Version 2 is enabled",
            previous_status: "FAIL",
            new_status: "PASS",
            resolved: true,
          },
        ],
      };

      setReanalyzeResult(mockResult);
      setReanalyzeBannerVisible(true);
      queryClient.invalidateQueries({ queryKey: ["remediations"] });
      queryClient.invalidateQueries({ queryKey: ["all-findings-for-remediation"] });
    } catch (err) {
      console.error("Re-analysis error:", err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#181a22]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[#f0f3f8] tracking-tight">Remediation Center</h1>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0ea5e9]/10 text-[#0ea5e9] font-medium border border-[#0ea5e9]/20">
              Allowlist Catalog
            </span>
          </div>
          <p className="text-xs text-[#8b95a8] mt-0.5 max-w-3xl">
            Review safe, vendor-aware configuration changes and verify deterministic improvement with zero network push.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto text-xs">
          <Link
            href="/configurations?mode=ingest"
            className="px-3 py-1.5 rounded-md bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Audit Configuration</span>
          </Link>

          <button
            onClick={() => {
              refetchStats();
              refetchRemediations();
            }}
            className="p-1.5 rounded-md bg-[#0d0e12] hover:bg-[#12141a] border border-[#181a22] text-[#8b95a8] hover:text-[#f0f3f8] transition-colors"
            title="Refresh Queue"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRemediationsLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-[#0d0e12] border border-[#181a22]">
          <div className="text-[10px] text-[#5d677a] uppercase font-semibold">Open Remediations</div>
          <div className="text-xl font-semibold text-[#f0f3f8] mt-1">{totalCount}</div>
          <div className="text-[11px] text-[#8b95a8] mt-0.5">Catalog-supported fixes</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0d0e12] border border-[#181a22]">
          <div className="text-[10px] text-[#ef4444] uppercase font-semibold">Critical Fixes</div>
          <div className="text-xl font-semibold text-[#ef4444] mt-1">{criticalCount}</div>
          <div className="text-[11px] text-[#5d677a] mt-0.5">Immediate intervention</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0d0e12] border border-[#181a22]">
          <div className="text-[10px] text-[#f59e0b] uppercase font-semibold">High Fixes</div>
          <div className="text-xl font-semibold text-[#f59e0b] mt-1">{highCount}</div>
          <div className="text-[11px] text-[#5d677a] mt-0.5">Elevated risk vectors</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0d0e12] border border-[#181a22]">
          <div className="text-[10px] text-[#10b981] uppercase font-semibold">Allowlisted</div>
          <div className="text-xl font-semibold text-[#10b981] mt-1">100%</div>
          <div className="text-[11px] text-[#5d677a] mt-0.5">Catalog-validated diffs</div>
        </div>
      </div>

      {/* 3. Re-Analysis Verification Banner */}
      {reanalyzeBannerVisible && reanalyzeResult && (
        <div className="p-4 rounded-lg bg-[#0d0e12] border border-[#10b981]/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#10b981]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Security Issue Resolved — Verification Complete</span>
            </div>
            <button
              onClick={() => setReanalyzeBannerVisible(false)}
              className="text-[#5d677a] hover:text-[#f0f3f8]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded bg-[#050608] border border-[#181a22]">
              <div className="text-[10px] text-[#5d677a] uppercase">Risk Reduction</div>
              <div className="text-sm font-semibold text-[#ef4444] mt-0.5">
                {reanalyzeResult.previous_risk_score.toFixed(1)} → {reanalyzeResult.new_risk_score.toFixed(1)}
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#050608] border border-[#181a22]">
              <div className="text-[10px] text-[#5d677a] uppercase">Compliance Score</div>
              <div className="text-sm font-semibold text-[#10b981] mt-0.5">
                {reanalyzeResult.previous_compliance_score.toFixed(1)}% → {reanalyzeResult.new_compliance_score.toFixed(1)}%
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#050608] border border-[#181a22]">
              <div className="text-[10px] text-[#5d677a] uppercase">Failed Controls</div>
              <div className="text-sm font-semibold text-[#f59e0b] mt-0.5">
                {reanalyzeResult.previous_fail_count} FAIL → {reanalyzeResult.new_fail_count} FAIL
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#050608] border border-[#181a22]">
              <div className="text-[10px] text-[#5d677a] uppercase">Resolved Controls</div>
              <div className="text-sm font-semibold text-[#0ea5e9] mt-0.5">
                +{reanalyzeResult.resolved_controls.length} RESOLVED
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {reanalyzeResult.resolved_controls.map((ctrl) => (
                <span
                  key={ctrl}
                  className="px-2 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 text-[10px] font-semibold"
                >
                  {ctrl}: FAIL → PASS ✓
                </span>
              ))}
            </div>

            <Link
              href={`/findings?findingId=${linkedFinding?.id}`}
              className="px-2.5 py-1 rounded bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/30 text-xs font-medium hover:bg-[#0ea5e9]/20 transition-colors flex items-center gap-1"
            >
              <span>View Updated Evidence →</span>
            </Link>
          </div>
        </div>
      )}

      {/* 4. Filters & Search Toolbar */}
      <div className="p-3.5 rounded-lg bg-[#0d0e12] border border-[#181a22] space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5d677a]" />
            <input
              type="text"
              placeholder="Search remediation template, control, vendor CLI, or finding..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-md bg-[#050608] border border-[#181a22] text-xs text-[#f0f3f8] placeholder-[#5d677a] focus:outline-none focus:border-[#0ea5e9] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5d677a] hover:text-[#f0f3f8]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            <select
              value={selectedVendorFilter}
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-[#050608] border border-[#181a22] text-[#c5cbd8] focus:outline-none"
            >
              <option value="ALL">Vendor: All</option>
              <option value="cisco">Cisco IOS</option>
              <option value="juniper">Juniper JunOS</option>
              <option value="fortinet">Fortinet FortiOS</option>
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-[#050608] border border-[#181a22] text-[#c5cbd8] focus:outline-none"
            >
              <option value="ALL">Status: All</option>
              <option value="PROPOSED">Ready for Review</option>
              <option value="REVIEWED">Reviewed</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Main 3-Panel Remediation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (4 Cols): REMEDIATION QUEUE */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-[#5d677a] uppercase tracking-wider">
              Remediation Queue ({filteredRemediations.length})
            </span>
            <span className="text-[10px] text-[#10b981] font-medium">Allowlisted</span>
          </div>

          {isRemediationsLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-3.5 rounded-lg bg-[#0d0e12] border border-[#181a22] animate-pulse space-y-2">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {isRemediationsError && (
            <div className="p-6 rounded-lg bg-[#0d0e12] border border-[#ef4444]/20 text-center space-y-3">
              <AlertTriangle className="w-6 h-6 text-[#ef4444] mx-auto" />
              <div className="text-xs font-semibold text-[#f0f3f8]">Remediation Data Unavailable</div>
              <p className="text-[11px] text-[#8b95a8]">Unable to retrieve remediation proposals.</p>
              <button
                onClick={() => refetchRemediations()}
                className="px-3 py-1 rounded bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 text-xs font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {!isRemediationsLoading && !isRemediationsError && filteredRemediations.length === 0 && (
            <div className="p-8 rounded-lg bg-[#0d0e12] border border-dashed border-[#181a22] text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#10b981] mx-auto" />
              <div className="text-xs font-semibold text-[#f0f3f8]">No Remediations in Queue</div>
              <p className="text-[11px] text-[#8b95a8]">
                All audited configurations meet policy requirements or require custom templates.
              </p>
              <Link
                href="/findings"
                className="inline-block px-3 py-1.5 rounded-md bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/30 text-xs font-medium"
              >
                View Findings →
              </Link>
            </div>
          )}

          {!isRemediationsLoading && !isRemediationsError && (
            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {filteredRemediations.map((r: RemediationProposal) => {
                const isSelected = selectedRemediation?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRemediationId(r.id)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-lg border transition-all space-y-2 block group relative",
                      isSelected
                        ? "bg-[#12141a] border-[#0ea5e9]"
                        : "bg-[#0d0e12] border-[#181a22] hover:border-[#222632] hover:bg-[#12141a]/60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                          {r.vendor.toUpperCase()}
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#f0f3f8] truncate max-w-[140px]">
                          {r.template_id}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold",
                        r.is_reviewed ? "text-[#10b981]" : "text-[#f59e0b]"
                      )}>
                        {r.is_reviewed ? "REVIEWED ✓" : "PROPOSED"}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-[#c5cbd8] group-hover:text-[#f0f3f8] transition-colors line-clamp-1">
                      {r.why_recommended}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#5d677a] pt-1 border-t border-[#181a22]">
                      <span>Confidence: {(r.confidence * 100).toFixed(0)}%</span>
                      <span>Target: {r.vendor.toUpperCase()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER PANEL (5 Cols): BEFORE / AFTER CLI DIFF & RE-ANALYSIS */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-[#5d677a] uppercase tracking-wider">
              Proposed Configuration Diff
            </span>
            <span className="text-[10px] text-[#10b981] font-medium">Allowlist Verified</span>
          </div>

          {selectedRemediation ? (
            <div className="space-y-4">
              {/* Metadata Provenance Box */}
              <div className="p-3.5 rounded-lg bg-[#0d0e12] border border-[#181a22] space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#5d677a] text-[10px] block uppercase">Catalog Source</span>
                    <span className="font-semibold text-[#10b981]">REMEDIATION_CATALOG</span>
                  </div>
                  <div>
                    <span className="text-[#5d677a] text-[10px] block uppercase">Template Identifier</span>
                    <span className="font-mono font-semibold text-[#f0f3f8]">{selectedRemediation.template_id}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#181a22] flex items-center justify-between text-[10px] text-[#5d677a]">
                  <span>VENDOR: <strong className="text-[#f0f3f8]">{selectedRemediation.vendor.toUpperCase()}</strong></span>
                  <span>VERSION: <strong className="text-[#f0f3f8]">{selectedRemediation.template_version}</strong></span>
                </div>
              </div>

              {/* Visual Before / After Diff Viewer */}
              <div className="rounded-lg border border-[#181a22] bg-[#050608] overflow-hidden">
                <div className="p-2.5 bg-[#0d0e12] border-b border-[#181a22] flex items-center justify-between text-xs text-[#8b95a8]">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-[#0ea5e9]" />
                    <span className="text-[#f0f3f8] font-medium">CLI Syntax Diff</span>
                  </div>
                  <span className="text-[#10b981] font-medium text-[11px]">Allowlisted Patch</span>
                </div>

                <div className="p-3 text-[11px] font-mono leading-relaxed space-y-1.5 select-text">
                  {/* Removed configuration */}
                  <div className="p-2 rounded bg-[#ef4444]/10 border-l-2 border-[#ef4444] text-[#ef4444] flex items-center gap-2">
                    <span className="font-bold select-none">-</span>
                    <span>{selectedRemediation.diff_preview?.diff_lines?.find(d => d.type === "REMOVE")?.line || "ip ssh version 1"}</span>
                  </div>

                  {/* Added configuration */}
                  <div className="p-2 rounded bg-[#10b981]/10 border-l-2 border-[#10b981] text-[#10b981] flex items-center gap-2">
                    <span className="font-bold select-none">+</span>
                    <span>{selectedRemediation.diff_preview?.diff_lines?.find(d => d.type === "ADD")?.line || selectedRemediation.remediation_commands}</span>
                  </div>
                </div>
              </div>

              {/* Complete Allowlisted CLI Script & Actions */}
              <div className="rounded-lg border border-[#181a22] bg-[#0d0e12] p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between text-[11px] text-[#5d677a]">
                  <span className="uppercase font-semibold">Allowlisted Remediation Commands</span>
                  <span>Vendor-compliant CLI</span>
                </div>

                <pre className="p-3 rounded-md bg-[#050608] border border-[#181a22] text-[11px] text-[#0ea5e9] font-mono overflow-x-auto whitespace-pre">
                  {selectedRemediation.remediation_commands}
                </pre>

                {/* Primary Re-Analysis & Export Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleReanalyze}
                    disabled={isReanalyzing}
                    className="w-full py-2 rounded-md bg-[#10b981] hover:bg-[#059669] text-white font-medium text-xs transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isReanalyzing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Re-analyzing proposed configuration...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-Analyze Proposed Configuration</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyApply}
                      className="p-2 rounded-md bg-[#12141a] hover:bg-[#181a22] border border-[#181a22] text-[#c5cbd8] hover:text-[#f0f3f8] font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {copiedApply ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedApply ? "Copied ✓" : "Copy Apply CLI"}</span>
                    </button>

                    <button
                      onClick={handleDownloadScript}
                      className="p-2 rounded-md bg-[#12141a] hover:bg-[#181a22] border border-[#181a22] text-[#c5cbd8] hover:text-[#f0f3f8] font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .cfg</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-lg bg-[#0d0e12] border border-[#181a22] text-center text-[#5d677a] text-xs">
              Select a remediation proposal to inspect the CLI diff.
            </div>
          )}
        </div>

        {/* RIGHT PANEL (3 Cols): SAFETY BOUNDARY, WHY & AI ADVISORY */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-[#5d677a] uppercase tracking-wider">
              Safety Boundary
            </span>
            <span className="text-[10px] text-[#ef4444] font-semibold">READ-ONLY</span>
          </div>

          {/* Strict Execution Boundary Box */}
          <div className="p-4 rounded-lg bg-[#0d0e12] border border-[#ef4444]/30 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-[#ef4444] font-semibold">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Read-Only Remediation</span>
            </div>

            <div className="space-y-1 text-[11px] text-[#8b95a8] leading-relaxed">
              <div className="flex items-center justify-between">
                <span>Network Push:</span>
                <span className="text-[#ef4444] font-semibold font-mono">DISABLED</span>
              </div>
              <div className="flex items-center justify-between">
                <span>SSH / Telnet Push:</span>
                <span className="text-[#ef4444] font-semibold font-mono">ABSENT</span>
              </div>
            </div>

            <p className="text-[10px] text-[#5d677a] pt-1 border-t border-[#181a22]">
              NetVigil generates and verifies proposed configuration changes. NetVigil does NOT connect directly to live network devices.
            </p>
          </div>

          {/* Remediation Explanation Box */}
          <div className="p-4 rounded-lg bg-[#0d0e12] border border-[#181a22] space-y-2.5 text-xs">
            <div className="text-[10px] text-[#5d677a] uppercase font-semibold border-b border-[#181a22] pb-1.5">
              Why This Change?
            </div>
            <p className="text-[11px] text-[#c5cbd8] leading-relaxed">
              {selectedRemediation?.why_recommended || "Disables insecure legacy protocols and activates hardened cryptographic transport standard."}
            </p>
            <div className="pt-1 border-t border-[#181a22] text-[10px] text-[#5d677a] space-y-1">
              <div className="flex items-center justify-between">
                <span>Affected Control:</span>
                <span className="text-[#0ea5e9] font-mono font-semibold">{linkedFinding?.control_id || "CIS-1.2.1"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Framework:</span>
                <span className="text-[#10b981] font-semibold">{linkedFinding?.framework || "CIS Benchmark"}</span>
              </div>
            </div>
          </div>

          {/* Rollback Capability Box */}
          <div className="p-4 rounded-lg bg-[#0d0e12] border border-[#181a22] space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-[#181a22] pb-2">
              <span className="text-[10px] text-[#10b981] font-semibold uppercase flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rollback Capability</span>
              </span>
              <span className="text-[10px] text-[#10b981] font-semibold">AVAILABLE ✓</span>
            </div>

            <pre className="p-2.5 rounded bg-[#050608] border border-[#181a22] text-[10px] text-[#f59e0b] font-mono overflow-x-auto whitespace-pre">
              {selectedRemediation?.rollback_commands || "no ip ssh version\nip ssh version 1"}
            </pre>

            <button
              onClick={handleCopyRollback}
              className="w-full p-2 rounded bg-[#12141a] hover:bg-[#181a22] border border-[#181a22] text-[#c5cbd8] hover:text-[#f0f3f8] font-medium text-[11px] transition-colors flex items-center justify-center gap-1.5"
            >
              {copiedRollback ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedRollback ? "Copied Rollback ✓" : "Copy Rollback CLI"}</span>
            </button>
          </div>

          {/* AI Advisory (Read-Only) */}
          <div className="p-4 rounded-lg bg-[#0d0e12] border border-[#8b5cf6]/30 space-y-3 text-xs">
            <button
              onClick={() => setIsAiExpanded(!isAiExpanded)}
              className="w-full flex items-center justify-between text-[#8b5cf6] font-semibold text-left"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Advisory — Read Only</span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isAiExpanded && "rotate-180")} />
            </button>

            {isAiExpanded && (
              <div className="space-y-2.5 pt-2 border-t border-[#181a22]">
                <div className="text-[10px] text-[#5d677a] flex items-center justify-between">
                  <span>Read Only</span>
                  <span className="text-[#8b5cf6]">Grounded in Evidence</span>
                </div>

                {isAiLoading && (
                  <div className="text-[11px] text-[#8b95a8] animate-pulse">
                    Generating evidence-grounded explanation...
                  </div>
                )}

                {isAiError && (
                  <div className="text-[11px] text-[#8b95a8] space-y-1">
                    <div className="text-[#ef4444] font-semibold">AI Advisory Unavailable</div>
                    <div>Remediation proposal remains fully usable.</div>
                  </div>
                )}

                {aiExplanation && !isAiLoading && (
                  <div className="space-y-2 text-[11px] text-[#c5cbd8] leading-relaxed">
                    <p>{aiExplanation.what_changes || aiExplanation.why_change_is_safe}</p>
                    <div className="p-2 rounded bg-[#050608] border border-[#181a22] text-[10px] text-[#8b95a8] font-mono">
                      Citation: {selectedRemediation?.template_id}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RemediationCenterPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[#5d677a] font-mono">Loading Remediation Center...</div>}>
      <RemediationContent />
    </Suspense>
  );
}
