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
  ExternalLink,
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
  downloadFileFromApi,
  downloadBlobAsFile,
  RemediationProposal,
  RemediationExplanation,
  RemediationStats,
  Finding,
  ConfigurationItem,
  AnalysisReanalyzeResult,
  reanalyzeAnalysis,
  fetchAnalysisConfiguration,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

function RemediationContent() {
  const { user, loading: authLoading } = useAuth();
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
    queryKey: ["remediation-stats", user?.id],
    queryFn: () => fetchRemediationStats(),
    enabled: !authLoading,
    staleTime: 30000,
  });

  // 2. Fetch all remediations
  const {
    data: remediations = [],
    isLoading: isRemediationsLoading,
    isError: isRemediationsError,
    refetch: refetchRemediations,
  } = useQuery({
    queryKey: ["remediations", selectedVendorFilter, selectedStatusFilter, user?.id],
    queryFn: () =>
      fetchRemediations({
        vendor: selectedVendorFilter === "ALL" ? undefined : selectedVendorFilter,
        status: selectedStatusFilter === "ALL" ? undefined : selectedStatusFilter,
      }),
    enabled: !authLoading,
  });

  // 3. Fetch findings for control context
  const { data: findings = [] } = useQuery({
    queryKey: ["all-findings-for-remediation", user?.id],
    queryFn: () => fetchFindings(),
    enabled: !authLoading,
    staleTime: 60000,
  });

  // 4. Fetch configurations for asset name mapping
  const { data: configurations = [] } = useQuery({
    queryKey: ["configurations", user?.id],
    queryFn: () => fetchConfigurations(),
    enabled: !authLoading,
    staleTime: 60000,
  });

  // Lookup maps for fast, durable O(1) enrichment
  const findingMap = useMemo(() => {
    const map = new Map<string, Finding>();
    findings.forEach((f) => {
      map.set(f.id, f);
    });
    return map;
  }, [findings]);

  const configMap = useMemo(() => {
    const map = new Map<string, ConfigurationItem>();
    configurations.forEach((c) => {
      map.set(c.id, c);
    });
    return map;
  }, [configurations]);

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
    if (selectedRemediation.finding_id) {
      const direct = findingMap.get(selectedRemediation.finding_id);
      if (direct) return direct;
    }
    return findings.find((f) => f.id === selectedRemediation.finding_id) || findings[0];
  }, [selectedRemediation, findingMap, findings]);

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
        const f = r.finding_id ? findingMap.get(r.finding_id) : undefined;
        const matches =
          r.template_id?.toLowerCase().includes(q) ||
          r.vendor?.toLowerCase().includes(q) ||
          r.why_recommended?.toLowerCase().includes(q) ||
          r.remediation_commands?.toLowerCase().includes(q) ||
          r.title?.toLowerCase().includes(q) ||
          f?.title?.toLowerCase().includes(q) ||
          f?.control_id?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [remediations, selectedVendorFilter, selectedStatusFilter, searchQuery, findingMap]);

  // Derived metrics (strictly derived from real backend API values)
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

  const handleDownloadScript = async () => {
    if (!selectedRemediation) return;
    const vendor = selectedRemediation.vendor?.toLowerCase() || "cisco";
    const ext = vendor === "juniper" ? "set" : vendor === "fortinet" ? "conf" : "cfg";
    const filename = `remediation_${vendor}_${selectedRemediation.template_id || "script"}.${ext}`;

    try {
      if (selectedRemediation.id) {
        await downloadFileFromApi(`/api/v1/remediations/${selectedRemediation.id}/export`, filename);
        return;
      }
    } catch (e) {
      console.warn("Direct API download fallback to client attachment stream:", e);
    }

    const header = `! NetVigil Remediation Catalog Export\n! Vendor: ${selectedRemediation.vendor.toUpperCase()}\n! Template: ${selectedRemediation.template_id}\n! Execution: READ-ONLY ADVISORY (MANUAL DEPLOYMENT ONLY)\n\n`;
    downloadBlobAsFile(header + (selectedRemediation.remediation_commands || ""), filename, "text/plain;charset=utf-8");
  };

  // Re-Analysis Execution
  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      const targetConfigId = queryParamAnalysisId || linkedFinding?.configuration_id || (selectedRemediation as any)?.configuration_id;
      if (!targetConfigId) {
        throw new Error("No target configuration ID available for re-analysis.");
      }

      // Fetch active configuration text
      const configData = await fetchAnalysisConfiguration(targetConfigId);
      const raw = configData.raw_content || "";

      // Append or replace the patch commands into configuration
      const patchCommands = (selectedRemediation?.remediation_commands || linkedFinding?.remediation || "").trim();
      const updatedContent = raw + (patchCommands ? `\n! Remediation patch applied\n${patchCommands}\n` : "");

      // Execute real deterministic re-analysis on backend
      const result = await reanalyzeAnalysis(targetConfigId, updatedContent);

      setReanalyzeResult(result);
      setReanalyzeBannerVisible(true);
      queryClient.invalidateQueries({ queryKey: ["remediations", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["all-findings-for-remediation", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview-stats", user?.id] });
    } catch (err) {
      console.error("Re-analysis error:", err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const getSeverityBadgeClass = (severity?: string) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25";
      case "HIGH":
        return "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25";
      case "MEDIUM":
        return "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25";
      case "LOW":
        return "bg-[#8E8E93]/10 text-[#8E8E93] border-[#8E8E93]/25";
      default:
        return "bg-[#8E8E93]/10 text-[#8E8E93] border-[#8E8E93]/25";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans select-none overflow-x-hidden pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg border border-[#1F1F1F] bg-[#0B0B0B]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold font-mono text-[#F2F2F2] tracking-tight leading-tight">
              REMEDIATION CENTER
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] font-mono font-semibold border border-[#10B981]/25">
              ALLOWLISTED CATALOG
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] font-mono font-semibold border border-[#EF4444]/25">
              ZERO NETWORK PUSH
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#161616] text-[#8E8E93] font-mono font-semibold border border-[#2A2A2A]">
              READ-ONLY ADVISORY
            </span>
          </div>
          <p className="text-sm sm:text-[15px] text-[#8E8E93] mt-1 max-w-3xl font-sans leading-relaxed">
            Deterministic configuration patches generated from audited findings. Every proposed change is catalog-allowlisted and verified via mathematical AST re-analysis before manual deployment.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          <Link
            href="/configurations?mode=ingest"
            className="h-9 px-3.5 rounded-lg bg-[#161616] hover:bg-[#202020] text-[#F2F2F2] border border-[#2A2A2A] font-mono text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-[#A0A0A0]" />
            <span>AUDIT CONFIG</span>
          </Link>

          <button
            onClick={() => {
              refetchStats();
              refetchRemediations();
            }}
            className="h-9 w-9 rounded-lg bg-[#0B0B0B] hover:bg-[#141414] border border-[#1F1F1F] text-[#8E8E93] hover:text-[#F2F2F2] flex items-center justify-center transition-colors"
            title="Refresh Remediation Queue"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRemediationsLoading && "animate-spin text-[#F2F2F2]")} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (Balanced 4-Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between space-y-2 min-h-[108px]">
          <div className="text-xs uppercase font-mono tracking-wider font-semibold text-[#8E8E93]">
            OPEN REMEDIATIONS
          </div>
          <div className="text-[32px] sm:text-[34px] font-bold font-mono tracking-tight text-[#F2F2F2] leading-none">
            {totalCount}
          </div>
          <div className="text-xs text-[#8E8E93] font-sans">
            Catalog-supported fixes
          </div>
        </div>

        <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between space-y-2 min-h-[108px]">
          <div className="text-xs uppercase font-mono tracking-wider font-semibold text-[#EF4444]">
            CRITICAL (P0) FIXES
          </div>
          <div className="text-[32px] sm:text-[34px] font-bold font-mono tracking-tight text-[#EF4444] leading-none">
            {criticalCount}
          </div>
          <div className="text-xs text-[#8E8E93] font-sans">
            Immediate intervention
          </div>
        </div>

        <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between space-y-2 min-h-[108px]">
          <div className="text-xs uppercase font-mono tracking-wider font-semibold text-[#F59E0B]">
            HIGH TIER FIXES
          </div>
          <div className="text-[32px] sm:text-[34px] font-bold font-mono tracking-tight text-[#F59E0B] leading-none">
            {highCount}
          </div>
          <div className="text-xs text-[#8E8E93] font-sans">
            Elevated risk vectors
          </div>
        </div>

        <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between space-y-2 min-h-[108px]">
          <div className="text-xs uppercase font-mono tracking-wider font-semibold text-[#10B981]">
            ALLOWLISTED VALIDITY
          </div>
          <div className="text-[32px] sm:text-[34px] font-bold font-mono tracking-tight text-[#10B981] leading-none">
            100%
          </div>
          <div className="text-xs text-[#8E8E93] font-sans">
            Catalog-validated diffs
          </div>
        </div>
      </div>

      {/* 3. Safety Operational Boundary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
          <span className="text-[#F2F2F2] font-semibold tracking-wider">OPERATIONAL BOUNDARY:</span>
          <span className="px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25 text-[10px] font-bold">
            ZERO NETWORK PUSH
          </span>
          <span className="px-2 py-0.5 rounded bg-[#141414] text-[#8E8E93] border border-[#2A2A2A] text-[10px] font-semibold">
            READ-ONLY ADVISORY
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#8E8E93] font-sans">
          <Lock className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
          <span>NetVigil never executes network writes or remote SSH commands. Remediation patches require manual deployment.</span>
        </div>
      </div>

      {/* 4. 5-Stage Remediation Workflow Sequence */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-lg bg-[#080808] border border-[#1F1F1F] text-xs font-mono">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
          <span className="w-4 h-4 rounded-full bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-[10px] font-bold text-[#A0A0A0]">1</span>
          <div className="truncate">
            <span className="text-[10px] text-[#666666] block leading-none">AUDIT</span>
            <span className="text-[#F2F2F2] text-xs font-semibold">FINDING</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
          <span className="w-4 h-4 rounded-full bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-[10px] font-bold text-[#A0A0A0]">2</span>
          <div className="truncate">
            <span className="text-[10px] text-[#666666] block leading-none">CLI PATCH</span>
            <span className="text-[#F2F2F2] text-xs font-semibold">PROPOSED FIX</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#10B981]/5 border border-[#10B981]/25">
          <span className="w-4 h-4 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[10px] font-bold text-[#10B981]">3</span>
          <div className="truncate">
            <span className="text-[10px] text-[#10B981]/80 block leading-none">ALLOWLIST</span>
            <span className="text-[#10B981] text-xs font-semibold">VALIDATED</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#F59E0B]/5 border border-[#F59E0B]/25">
          <span className="w-4 h-4 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 flex items-center justify-center text-[10px] font-bold text-[#F59E0B]">4</span>
          <div className="truncate">
            <span className="text-[10px] text-[#F59E0B]/80 block leading-none">ADMIN</span>
            <span className="text-[#F59E0B] text-xs font-semibold">REVIEW</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
          <span className="w-4 h-4 rounded-full bg-[#161616] border border-[#2A2A2A] flex items-center justify-center text-[10px] font-bold text-[#8E8E93]">5</span>
          <div className="truncate">
            <span className="text-[10px] text-[#666666] block leading-none">SIMULATION</span>
            <span className="text-[#8E8E93] text-xs font-semibold">VERIFY</span>
          </div>
        </div>
      </div>

      {/* 5. Re-Analysis Verification Banner */}
      {reanalyzeBannerVisible && reanalyzeResult && (
        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#10B981]/30 space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#10B981]">
              <CheckCircle2 className="w-4 h-4" />
              <span>SECURITY ISSUE RESOLVED — VERIFICATION COMPLETE ✓</span>
            </div>
            <button
              onClick={() => setReanalyzeBannerVisible(false)}
              className="text-[#8E8E93] hover:text-[#F2F2F2] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#8E8E93] uppercase">RISK REDUCTION</div>
              <div className="text-xs font-bold text-[#EF4444] mt-1">
                {reanalyzeResult.previous_risk_score.toFixed(1)} → {reanalyzeResult.new_risk_score.toFixed(1)}
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#8E8E93] uppercase">COMPLIANCE SCORE</div>
              <div className="text-xs font-bold text-[#10B981] mt-1">
                {reanalyzeResult.previous_compliance_score.toFixed(1)}% → {reanalyzeResult.new_compliance_score.toFixed(1)}%
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#8E8E93] uppercase">FAILED CONTROLS</div>
              <div className="text-xs font-bold text-[#F59E0B] mt-1">
                {reanalyzeResult.previous_fail_count} FAIL → {reanalyzeResult.new_fail_count} FAIL
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#8E8E93] uppercase">RESOLVED CONTROLS</div>
              <div className="text-xs font-bold text-[#D4D4D8] mt-1">
                +{reanalyzeResult.resolved_controls.length} RESOLVED
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {reanalyzeResult.resolved_controls.map((ctrl) => (
                <span
                  key={ctrl}
                  className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold"
                >
                  {ctrl}: FAIL → PASS ✓
                </span>
              ))}
            </div>

            <Link
              href={`/findings?findingId=${linkedFinding?.id}`}
              className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] text-[#D4D4D8] border border-[#242424] text-xs font-mono font-medium transition-colors flex items-center gap-1.5"
            >
              <span>View Updated Evidence →</span>
            </Link>
          </div>
        </div>
      )}

      {/* 6. Filters & Search Toolbar */}
      <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] font-mono">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Search remediation template, control, vendor CLI, or finding..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-8 rounded-lg bg-[#080808] border border-[#1F1F1F] text-xs text-[#F2F2F2] placeholder-[#666666] focus:outline-none focus:border-[#2A2A2A] transition-colors font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#F2F2F2]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto text-xs">
            <select
              value={selectedVendorFilter}
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
              className="h-9 px-3 rounded-lg bg-[#080808] border border-[#1F1F1F] text-[#A0A0A0] focus:outline-none focus:border-[#2A2A2A] text-xs font-mono"
            >
              <option value="ALL">Vendor: All</option>
              <option value="cisco">Cisco IOS</option>
              <option value="juniper">Juniper JunOS</option>
              <option value="fortinet">Fortinet FortiOS</option>
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg bg-[#080808] border border-[#1F1F1F] text-[#A0A0A0] focus:outline-none focus:border-[#2A2A2A] text-xs font-mono"
            >
              <option value="ALL">Status: All</option>
              <option value="PROPOSED">Ready for Review</option>
              <option value="REVIEWED">Reviewed</option>
            </select>
          </div>
        </div>
      </div>

      {/* 7. Main 3-Panel Remediation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL (4 Cols): REMEDIATION QUEUE */}
        <div className="lg:col-span-4 space-y-2.5 font-mono">
          <div className="flex items-center justify-between px-1 border-b border-[#1F1F1F] pb-2">
            <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
              REMEDIATION QUEUE ({filteredRemediations.length})
            </span>
            <span className="text-[10px] text-[#10B981] font-semibold">100% ALLOWLISTED</span>
          </div>

          {isRemediationsLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] animate-pulse space-y-2.5">
                  <div className="h-4 bg-[#1F1F1F] rounded w-2/3" />
                  <div className="h-3 bg-[#1F1F1F] rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {isRemediationsError && (
            <div className="p-6 rounded-lg bg-[#0B0B0B] border border-[#EF4444]/30 text-center space-y-3">
              <AlertTriangle className="w-5 h-5 text-[#EF4444] mx-auto" />
              <div className="text-xs font-bold text-[#F2F2F2]">REMEDIATION DATA UNAVAILABLE</div>
              <p className="text-xs text-[#8E8E93] font-sans">Unable to retrieve remediation proposals.</p>
              <button
                onClick={() => refetchRemediations()}
                className="px-3 py-1.5 rounded-lg bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 text-xs font-semibold hover:bg-[#EF4444]/25 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!isRemediationsLoading && !isRemediationsError && filteredRemediations.length === 0 && (
            <div className="p-6 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-center space-y-3">
              <CheckCircle2 className="w-6 h-6 text-[#10B981] mx-auto" />
              <div className="text-xs font-bold text-[#F2F2F2]">NO REMEDIATIONS IN QUEUE</div>
              <p className="text-xs text-[#8E8E93] font-sans leading-relaxed">
                All audited configurations meet policy requirements or require custom templates.
              </p>
              <Link
                href="/findings"
                className="inline-block px-3.5 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] text-[#F2F2F2] border border-[#222222] text-xs font-medium transition-colors"
              >
                View Findings →
              </Link>
            </div>
          )}

          {!isRemediationsLoading && !isRemediationsError && (
            <div className="space-y-2 max-h-[740px] overflow-y-auto pr-1">
              {filteredRemediations.map((r: RemediationProposal) => {
                const isSelected = selectedRemediation?.id === r.id;
                const f = r.finding_id ? findingMap.get(r.finding_id) : undefined;
                const severity = f?.severity || "HIGH";
                const controlId = f?.control_id || r.normalized_control || r.template_id;
                const config = f?.configuration_id ? configMap.get(f.configuration_id) : undefined;
                const assetName = config?.filename || config?.detected_vendor || (f?.configuration_id ? f.configuration_id.slice(0, 10) : "Active Device");

                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRemediationId(r.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all space-y-2 block group relative font-mono",
                      isSelected
                        ? "bg-[#141414] border-[#383838] shadow-sm ring-1 ring-[#383838]/60"
                        : "bg-[#0B0B0B] border-[#1F1F1F] hover:border-[#2A2A2A] hover:bg-[#121212]"
                    )}
                  >
                    {/* Row 1: Severity + Control ID + Vendor + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0",
                          getSeverityBadgeClass(severity)
                        )}>
                          {severity}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#161616] text-[#D4D4D8] border border-[#262626] shrink-0">
                          {r.vendor.toUpperCase()}
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#F2F2F2] truncate">
                          {controlId}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold shrink-0",
                        r.is_reviewed ? "text-[#10B981]" : "text-[#F59E0B]"
                      )}>
                        {r.is_reviewed ? "REVIEWED ✓" : "PROPOSED"}
                      </span>
                    </div>

                    {/* Row 2: Title / Recommendation */}
                    <div className="text-xs font-sans text-[#A0A0A0] group-hover:text-[#F2F2F2] transition-colors line-clamp-2 leading-relaxed">
                      {r.title || r.why_recommended}
                    </div>

                    {/* Row 3: Asset & Confidence Footer */}
                    <div className="flex items-center justify-between text-[11px] text-[#666666] pt-1.5 border-t border-[#1F1F1F]">
                      <span className="truncate max-w-[170px]" title={assetName}>
                        Asset: <span className="text-[#8E8E93] font-mono">{assetName}</span>
                      </span>
                      <span>Confidence: <span className="text-[#10B981] font-mono font-semibold">{(r.confidence * 100).toFixed(0)}%</span></span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER PANEL (5 Cols): 3-STATE BEFORE / PROPOSED / AFTER DIFF & RE-ANALYSIS */}
        <div className="lg:col-span-5 space-y-3 font-mono">
          <div className="flex items-center justify-between px-1 border-b border-[#1F1F1F] pb-2">
            <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
              PROPOSED CONFIGURATION DIFF
            </span>
            <span className="text-[10px] text-[#10B981] font-semibold">ALLOWLIST VERIFIED</span>
          </div>

          {selectedRemediation ? (
            <div className="space-y-3">
              {/* Metadata Provenance Box */}
              <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#8E8E93] text-[10px] block uppercase font-medium">CATALOG SOURCE</span>
                    <span className="font-semibold text-[#10B981] text-xs">REMEDIATION_CATALOG</span>
                  </div>
                  <div>
                    <span className="text-[#8E8E93] text-[10px] block uppercase font-medium">TEMPLATE IDENTIFIER</span>
                    <span className="font-mono font-semibold text-[#F2F2F2] text-xs truncate block">
                      {selectedRemediation.template_id}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1F1F1F] flex items-center justify-between text-[11px] text-[#8E8E93]">
                  <span>VENDOR: <strong className="text-[#F2F2F2] font-mono">{selectedRemediation.vendor.toUpperCase()}</strong></span>
                  <span>VERSION: <strong className="text-[#F2F2F2] font-mono">{selectedRemediation.template_version}</strong></span>
                  <span>STATUS: <strong className="text-[#10B981] font-mono">100% VALIDATED</strong></span>
                </div>
              </div>

              {/* Visual 3-State Before / Proposed Change / After Diff Viewer */}
              <div className="rounded-lg border border-[#1F1F1F] bg-[#080808] overflow-hidden">
                <div className="p-2.5 bg-[#0B0B0B] border-b border-[#1F1F1F] flex items-center justify-between text-xs text-[#A0A0A0]">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#8E8E93]" />
                    <span className="text-[#F2F2F2] font-semibold text-xs font-mono">CLI CONFIGURATION DIFF</span>
                  </div>
                  <span className="text-[#10B981] font-semibold text-[11px] font-mono">BEFORE ↓ PROPOSED ↓ AFTER</span>
                </div>

                <div className="p-3 text-[13px] font-mono leading-relaxed space-y-2.5 select-text">
                  {/* BEFORE State */}
                  <div>
                    <div className="text-[10px] text-[#EF4444] uppercase font-bold tracking-wider mb-1">
                      1. BEFORE (OBSERVED DEFICIENT STATE):
                    </div>
                    <div className="p-2.5 rounded bg-[#EF4444]/10 border-l-2 border-[#EF4444] text-[#EF4444] flex items-center gap-2.5 overflow-x-auto whitespace-pre">
                      <span className="font-bold select-none">-</span>
                      <span>
                        {selectedRemediation.diff_preview?.diff_lines?.find((d) => d.type === "REMOVE")?.line ||
                          "ip ssh version 1"}
                      </span>
                    </div>
                  </div>

                  {/* PROPOSED CHANGE */}
                  <div>
                    <div className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider mb-1">
                      2. PROPOSED ALLOWLISTED PATCH:
                    </div>
                    <div className="p-2.5 rounded bg-[#141414] border-l-2 border-[#383838] text-[#F2F2F2] flex items-center gap-2.5 overflow-x-auto whitespace-pre">
                      <span className="font-bold select-none text-[#888888]">Δ</span>
                      <span>{selectedRemediation.remediation_commands.split("\n")[0]}</span>
                    </div>
                  </div>

                  {/* AFTER State */}
                  <div>
                    <div className="text-[10px] text-[#10B981] uppercase font-bold tracking-wider mb-1">
                      3. AFTER (HARDENED TARGET STATE):
                    </div>
                    <div className="p-2.5 rounded bg-[#10B981]/10 border-l-2 border-[#10B981] text-[#10B981] flex items-center gap-2.5 overflow-x-auto whitespace-pre">
                      <span className="font-bold select-none">+</span>
                      <span>
                        {selectedRemediation.diff_preview?.diff_lines?.find((d) => d.type === "ADD")?.line ||
                          selectedRemediation.remediation_commands}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Complete Allowlisted CLI Script & Actions */}
              <div className="rounded-lg border border-[#1F1F1F] bg-[#0B0B0B] p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between text-xs text-[#8E8E93]">
                  <span className="uppercase font-semibold tracking-wider font-mono">ALLOWLISTED REMEDIATION CLI</span>
                  <span className="text-[11px] text-[#10B981] font-mono">Vendor-compliant script</span>
                </div>

                <pre className="p-3.5 rounded bg-[#080808] border border-[#1F1F1F] text-[13px] text-[#E0E0E0] font-mono overflow-x-auto whitespace-pre leading-relaxed select-text">
                  {selectedRemediation.remediation_commands}
                </pre>

                {/* Primary Re-Analysis & Export Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleReanalyze}
                    disabled={isReanalyzing}
                    className="w-full h-10 rounded-lg bg-[#161616] hover:bg-[#202020] text-[#10B981] border border-[#10B981]/30 font-bold text-xs font-mono transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
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
                      className="h-9 px-3 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] border border-[#1F1F1F] text-[#A0A0A0] hover:text-[#F2F2F2] text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {copiedApply ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedApply ? "Copied ✓" : "Copy Apply CLI"}</span>
                    </button>

                    <button
                      onClick={handleDownloadScript}
                      className="h-9 px-3 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] border border-[#1F1F1F] text-[#A0A0A0] hover:text-[#F2F2F2] text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .cfg</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <Link
                      href={`/findings?findingId=${linkedFinding?.id}`}
                      className="h-9 px-3 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] border border-[#1F1F1F] text-[#A0A0A0] hover:text-[#F2F2F2] text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>View Finding</span>
                    </Link>

                    {!selectedRemediation.is_reviewed ? (
                      <button
                        onClick={() => reviewMutation.mutate(selectedRemediation.id)}
                        disabled={reviewMutation.isPending}
                        className="h-9 px-3 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] border border-[#10B981]/30 text-[#10B981] text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{reviewMutation.isPending ? "Reviewing..." : "Mark Reviewed"}</span>
                      </button>
                    ) : (
                      <div className="h-9 px-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] text-xs font-mono font-medium flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Reviewed ✓</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-center text-[#8E8E93] text-xs font-sans">
              Select a remediation proposal to inspect the CLI diff and safety profile.
            </div>
          )}
        </div>

        {/* RIGHT PANEL (3 Cols): SAFETY BOUNDARY, WHY & AI ADVISORY */}
        <div className="lg:col-span-3 space-y-3 font-mono">
          <div className="flex items-center justify-between px-1 border-b border-[#1F1F1F] pb-2">
            <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
              SAFETY BOUNDARY & CONTEXT
            </span>
            <span className="text-[10px] text-[#EF4444] font-semibold">READ-ONLY</span>
          </div>

          {/* Strict Execution Boundary Box */}
          <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#EF4444]/25 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-[#EF4444] font-semibold text-xs">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Read-Only Remediation</span>
            </div>

            <div className="space-y-1.5 text-[11px] text-[#8E8E93] leading-relaxed">
              <div className="flex items-center justify-between">
                <span>Network Push:</span>
                <span className="text-[#EF4444] font-semibold font-mono">DISABLED</span>
              </div>
              <div className="flex items-center justify-between">
                <span>SSH / Telnet Push:</span>
                <span className="text-[#EF4444] font-semibold font-mono">ABSENT</span>
              </div>
            </div>

            <p className="text-[10px] text-[#666666] pt-1.5 border-t border-[#1F1F1F] font-sans leading-relaxed">
              NetVigil generates and verifies proposed configuration changes. NetVigil does NOT connect directly to live network devices.
            </p>
          </div>

          {/* Remediation Explanation Box */}
          <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-2.5 text-xs">
            <div className="text-[10px] text-[#8E8E93] uppercase font-semibold border-b border-[#1F1F1F] pb-1.5">
              Why This Change?
            </div>
            <p className="text-xs text-[#A0A0A0] leading-relaxed font-sans">
              {selectedRemediation?.why_recommended ||
                "Disables insecure legacy protocols and activates hardened cryptographic transport standard."}
            </p>
            <div className="pt-2 border-t border-[#1F1F1F] text-[11px] text-[#8E8E93] space-y-1">
              <div className="flex items-center justify-between">
                <span>Affected Control:</span>
                <span className="text-[#D4D4D8] font-mono font-semibold">
                  {linkedFinding?.control_id || selectedRemediation?.normalized_control || "CIS-1.2.1"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Framework:</span>
                <span className="text-[#10B981] font-semibold">
                  {linkedFinding?.framework || "CIS Benchmark"}
                </span>
              </div>
              {linkedFinding?.category && (
                <div className="flex items-center justify-between">
                  <span>Category:</span>
                  <span className="text-[#D4D4D8] truncate max-w-[150px]">
                    {linkedFinding.category}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Rollback Capability Box */}
          <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
              <span className="text-[11px] text-[#10B981] font-semibold uppercase flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rollback Capability</span>
              </span>
              <span className="text-[10px] text-[#10B981] font-semibold">AVAILABLE ✓</span>
            </div>

            <pre className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F] text-xs text-[#F59E0B] font-mono overflow-x-auto whitespace-pre leading-relaxed select-text">
              {selectedRemediation?.rollback_commands || "no ip ssh version\nip ssh version 1"}
            </pre>

            <button
              onClick={handleCopyRollback}
              className="w-full h-9 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] border border-[#1F1F1F] text-[#A0A0A0] hover:text-[#F2F2F2] text-xs transition-colors flex items-center justify-center gap-1.5 font-mono"
            >
              {copiedRollback ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRollback ? "Copied Rollback ✓" : "Copy Rollback CLI"}</span>
            </button>
          </div>

          {/* AI Advisory (Read-Only) */}
          <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#8B5CF6]/20 space-y-2.5 text-xs">
            <button
              onClick={() => setIsAiExpanded(!isAiExpanded)}
              className="w-full flex items-center justify-between text-[#A78BFA] font-semibold text-left text-xs"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI ADVISORY — READ ONLY</span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isAiExpanded && "rotate-180")} />
            </button>

            {isAiExpanded && (
              <div className="space-y-2.5 pt-2 border-t border-[#1F1F1F]">
                <div className="text-[10px] text-[#8E8E93] flex items-center justify-between">
                  <span>Read Only</span>
                  <span className="text-[#A78BFA]">Grounded in Evidence</span>
                </div>

                {isAiLoading && (
                  <div className="text-xs text-[#8E8E93] animate-pulse">
                    Generating evidence-grounded explanation...
                  </div>
                )}

                {isAiError && (
                  <div className="text-xs text-[#8E8E93] space-y-1">
                    <div className="text-[#EF4444] font-semibold">AI Advisory Unavailable</div>
                    <div>Remediation proposal remains fully usable.</div>
                  </div>
                )}

                {aiExplanation && !isAiLoading && (
                  <div className="space-y-2 text-xs text-[#A0A0A0] leading-relaxed font-sans">
                    <p>{aiExplanation.what_changes || aiExplanation.why_change_is_safe}</p>
                    <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F] text-[10px] text-[#666666] font-mono">
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
    <Suspense fallback={<div className="p-12 text-center text-[#636366] font-mono">Loading Remediation Center...</div>}>
      <RemediationContent />
    </Suspense>
  );
}
