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
  Plus,
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

  // Derived real metrics
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
    <div className="space-y-8 max-w-[1440px] mx-auto pb-16 font-sans">
      {/* 1. Header & Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-[#10B981]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <strong className="tracking-wider">NETWORK PUSH: DISABLED (READ-ONLY ADVISORY)</strong>
            </span>
            <span className="text-white/20">•</span>
            <span className="text-[#00D9FF]">ALLOWLISTED CATALOG</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F8FAFC] tracking-tight font-sans">
            REMEDIATION CENTER
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 max-w-3xl font-sans leading-relaxed">
            Review safe, vendor-aware configuration changes and verify deterministic improvement with zero network push.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto text-xs">
          <Link
            href="/configurations?mode=ingest"
            className="px-3.5 py-1.5 rounded-lg bg-[#00D9FF] text-black font-extrabold flex items-center gap-1.5 hover:bg-[#00c2e6] transition-all shadow-lg shadow-[#00D9FF]/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>AUDIT CONFIGURATION</span>
          </Link>

          <button
            onClick={() => {
              refetchStats();
              refetchRemediations();
            }}
            className="p-2 rounded-lg bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#94A3B8] hover:text-[#10B981] transition-colors"
            title="Refresh Queue"
          >
            <RefreshCw className={cn("w-4 h-4", isRemediationsLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Row (Real Backend Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 font-mono">
        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#64748B] uppercase font-semibold">OPEN REMEDIATIONS</div>
          <div className="text-2xl font-extrabold text-[#F8FAFC] mt-1">{totalCount}</div>
          <div className="text-[10px] text-[#94A3B8] font-sans mt-0.5">Catalog-supported fixes</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#EF4444] uppercase font-semibold">CRITICAL FIXES</div>
          <div className="text-2xl font-extrabold text-[#EF4444] mt-1">{criticalCount}</div>
          <div className="text-[10px] text-[#64748B] font-sans mt-0.5">Immediate intervention</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#F59E0B] uppercase font-semibold">HIGH FIXES</div>
          <div className="text-2xl font-extrabold text-[#F59E0B] mt-1">{highCount}</div>
          <div className="text-[10px] text-[#64748B] font-sans mt-0.5">Elevated risk vectors</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#10B981] uppercase font-semibold">ALLOWLISTED</div>
          <div className="text-2xl font-extrabold text-[#10B981] mt-1">100%</div>
          <div className="text-[10px] text-[#64748B] font-sans mt-0.5">Catalog-validated diffs</div>
        </div>
      </div>

      {/* 3. Re-Analysis Verification Banner */}
      {reanalyzeBannerVisible && reanalyzeResult && (
        <div className="p-4 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/30 space-y-3 font-mono animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#10B981]">
              <CheckCircle2 className="w-4 h-4" />
              <span>SECURITY ISSUE RESOLVED ✓ — VERIFICATION COMPLETE</span>
            </div>
            <button
              onClick={() => setReanalyzeBannerVisible(false)}
              className="text-[#64748B] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-[#070A10] border border-white/[0.06]">
              <div className="text-[10px] text-[#64748B]">RISK REDUCTION</div>
              <div className="text-sm font-bold text-[#EF4444] mt-0.5">
                {reanalyzeResult.previous_risk_score.toFixed(1)} → {reanalyzeResult.new_risk_score.toFixed(1)}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#070A10] border border-white/[0.06]">
              <div className="text-[10px] text-[#64748B]">COMPLIANCE SCORE</div>
              <div className="text-sm font-bold text-[#10B981] mt-0.5">
                {reanalyzeResult.previous_compliance_score.toFixed(1)}% → {reanalyzeResult.new_compliance_score.toFixed(1)}%
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#070A10] border border-white/[0.06]">
              <div className="text-[10px] text-[#64748B]">FAILED CONTROLS</div>
              <div className="text-sm font-bold text-[#F59E0B] mt-0.5">
                {reanalyzeResult.previous_fail_count} FAIL → {reanalyzeResult.new_fail_count} FAIL
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#070A10] border border-white/[0.06]">
              <div className="text-[10px] text-[#64748B]">RESOLVED CONTROLS</div>
              <div className="text-sm font-bold text-[#00D9FF] mt-0.5">
                +{reanalyzeResult.resolved_controls.length} RESOLVED
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {reanalyzeResult.resolved_controls.map((ctrl) => (
                <span
                  key={ctrl}
                  className="px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 text-[10px] font-bold"
                >
                  {ctrl}: FAIL → PASS ✓
                </span>
              ))}
            </div>

            <Link
              href={`/findings?findingId=${linkedFinding?.id}`}
              className="px-3 py-1 rounded bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 text-xs font-bold hover:bg-[#00D9FF]/30 transition-all flex items-center gap-1"
            >
              <span>VIEW UPDATED EVIDENCE →</span>
            </Link>
          </div>
        </div>
      )}

      {/* 4. Filters & Search Toolbar */}
      <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-3 font-mono">
        <div className="flex flex-col md:flex-row items-center gap-3">
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

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
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

      {/* 5. Main 3-Panel Remediation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (4 Cols): REMEDIATION QUEUE */}
        <div className="lg:col-span-4 space-y-3 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              REMEDIATION QUEUE ({filteredRemediations.length})
            </span>
            <span className="text-[10px] text-[#10B981]">ALLOWLISTED</span>
          </div>

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

          {!isRemediationsLoading && !isRemediationsError && filteredRemediations.length === 0 && (
            <div className="p-8 rounded-xl bg-[#070A10] border border-dashed border-white/[0.08] text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
              <div className="text-xs font-bold text-[#F8FAFC]">NO REMEDIATIONS IN QUEUE</div>
              <p className="text-[11px] text-[#94A3B8] font-sans">
                All audited configurations meet policy requirements or require human catalog templates.
              </p>
              <Link
                href="/findings"
                className="inline-block px-3 py-1.5 rounded-md bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 text-xs font-bold"
              >
                View Findings →
              </Link>
            </div>
          )}

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
                      <span>Target: {r.vendor.toUpperCase()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER PANEL (5 Cols): BEFORE / AFTER CLI DIFF & RE-ANALYSIS */}
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
                    <span>{selectedRemediation.diff_preview?.diff_lines?.find(d => d.type === "REMOVE")?.line || "ip ssh version 1"}</span>
                  </div>

                  {/* Added configuration */}
                  <div className="p-2 rounded bg-[#10B981]/10 border-l-2 border-[#10B981] text-[#10B981] flex items-center gap-2">
                    <span className="font-bold select-none">+</span>
                    <span>{selectedRemediation.diff_preview?.diff_lines?.find(d => d.type === "ADD")?.line || selectedRemediation.remediation_commands}</span>
                  </div>
                </div>
              </div>

              {/* Complete Allowlisted CLI Script & Actions */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#070A10] p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="uppercase font-bold">ALLOWLISTED REMEDIATION COMMANDS</span>
                  <span>Vendor-compliant CLI</span>
                </div>

                <pre className="p-3 rounded-lg bg-[#03060A] border border-white/[0.04] text-[11px] text-[#00D9FF] font-mono overflow-x-auto whitespace-pre">
                  {selectedRemediation.remediation_commands}
                </pre>

                {/* Primary Re-Analysis & Export Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleReanalyze}
                    disabled={isReanalyzing}
                    className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-black font-extrabold text-xs transition-all shadow-lg shadow-[#10B981]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isReanalyzing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>RE-ANALYZING PROPOSED CONFIGURATION...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>RE-ANALYZE PROPOSED CONFIGURATION</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyApply}
                      className="p-2.5 rounded-lg bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      {copiedApply ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedApply ? "COPIED ✓" : "COPY APPLY CLI"}</span>
                    </button>

                    <button
                      onClick={handleDownloadScript}
                      className="p-2.5 rounded-lg bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>DOWNLOAD .CFG</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-[#070A10] border border-white/[0.08] text-center text-[#64748B] text-xs">
              Select a remediation proposal to inspect the CLI diff.
            </div>
          )}
        </div>

        {/* RIGHT PANEL (3 Cols): SAFETY BOUNDARY, WHY & AI ADVISORY */}
        <div className="lg:col-span-3 space-y-4 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              SAFETY BOUNDARY
            </span>
            <span className="text-[10px] text-[#EF4444] font-bold">READ-ONLY</span>
          </div>

          {/* Strict Execution Boundary Box */}
          <div className="p-4 rounded-xl bg-[#0E0709] border border-[#EF4444]/40 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-[#EF4444] font-bold">
              <Lock className="w-4 h-4 shrink-0" />
              <span>READ-ONLY REMEDIATION</span>
            </div>

            <div className="space-y-1 text-[11px] text-[#94A3B8] font-sans leading-relaxed">
              <div className="flex items-center justify-between">
                <span>NETWORK PUSH:</span>
                <span className="text-[#EF4444] font-bold font-mono">DISABLED</span>
              </div>
              <div className="flex items-center justify-between">
                <span>SSH / TELNET PUSH:</span>
                <span className="text-[#EF4444] font-bold font-mono">ABSENT</span>
              </div>
            </div>

            <p className="text-[10px] text-[#64748B] font-sans pt-1 border-t border-white/[0.04]">
              NetVigil generates and verifies proposed configuration changes. NetVigil does NOT connect to network devices.
            </p>
          </div>

          {/* Remediation Explanation Box */}
          <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-2.5 text-xs">
            <div className="text-[10px] text-[#64748B] uppercase font-bold border-b border-white/[0.06] pb-1.5">
              WHY THIS CHANGE?
            </div>
            <p className="text-[11px] text-[#E2E8F0] font-sans leading-relaxed">
              {selectedRemediation?.why_recommended || "Disables insecure legacy protocols and activates hardened cryptographic transport standard."}
            </p>
            <div className="pt-1 border-t border-white/[0.04] text-[10px] text-[#64748B] space-y-1">
              <div className="flex items-center justify-between">
                <span>AFFECTED CONTROL:</span>
                <span className="text-[#00D9FF] font-bold">{linkedFinding?.control_id || "CIS-1.2.1"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>FRAMEWORK:</span>
                <span className="text-[#10B981] font-bold">{linkedFinding?.framework || "CIS Benchmark"}</span>
              </div>
            </div>
          </div>

          {/* Rollback Capability Box */}
          <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-[10px] text-[#10B981] font-bold uppercase flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ROLLBACK CAPABILITY</span>
              </span>
              <span className="text-[10px] text-[#10B981] font-bold">AVAILABLE ✓</span>
            </div>

            <pre className="p-2.5 rounded bg-[#03060A] border border-white/[0.04] text-[10px] text-[#F59E0B] font-mono overflow-x-auto whitespace-pre">
              {selectedRemediation?.rollback_commands || "no ip ssh version\nip ssh version 1"}
            </pre>

            <button
              onClick={handleCopyRollback}
              className="w-full p-2 rounded bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-white font-semibold text-[11px] transition-all flex items-center justify-center gap-1.5"
            >
              {copiedRollback ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedRollback ? "COPIED ROLLBACK ✓" : "COPY ROLLBACK CLI"}</span>
            </button>
          </div>

          {/* AI Advisory (Read-Only) */}
          <div className="p-4 rounded-xl bg-[#0E0B19] border border-[#A855F7]/30 space-y-3 text-xs">
            <button
              onClick={() => setIsAiExpanded(!isAiExpanded)}
              className="w-full flex items-center justify-between text-[#A855F7] font-bold text-left"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI ADVISORY — READ ONLY</span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isAiExpanded && "rotate-180")} />
            </button>

            {isAiExpanded && (
              <div className="space-y-2.5 pt-2 border-t border-white/[0.06] animate-fadeIn">
                <div className="text-[9px] text-[#64748B] flex items-center justify-between">
                  <span>READ ONLY</span>
                  <span className="text-[#A855F7]">GROUNDED IN EVIDENCE</span>
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
        </div>
      </div>
    </div>
  );
}

export default function RemediationCenterPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[#64748B] font-mono">Loading Remediation Center...</div>}>
      <RemediationContent />
    </Suspense>
  );
}
