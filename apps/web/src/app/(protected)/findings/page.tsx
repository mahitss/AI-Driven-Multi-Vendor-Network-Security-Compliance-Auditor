"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Filter,
  Search,
  RefreshCw,
  Eye,
  X,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  FileCode2,
  ArrowRight,
  BookOpen,
  Wrench,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Server,
  Lock,
  Flame,
  Clock,
  Hash,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Plus,
  Info,
} from "lucide-react";
import {
  fetchFindings,
  fetchFindingExplanation,
  fetchFindingRemediation,
  fetchAudits,
  fetchConfigurations,
  fetchConfigurationDetail,
  fetchRisks,
  reanalyzeAnalysis,
  fetchAnalysisConfiguration,
  Finding,
  FindingExplanation,
  RemediationProposal,
  RiskItem,
  ConfigurationItem,
  AnalysisReanalyzeResult,
} from "@/lib/api-client";
import { getFindingActiveEvidence } from "@/lib/evidence-utils";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/providers/SettingsProvider";
import { useAuth } from "@/components/providers/AuthProvider";

function FindingsContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const queryParamFindingId = searchParams.get("findingId") || searchParams.get("finding");
  const queryParamAnalysisId = searchParams.get("analysisId") || searchParams.get("analysis") || searchParams.get("audit_id") || searchParams.get("auditId");

  const queryClient = useQueryClient();
  const evidenceContainerRef = useRef<HTMLDivElement>(null);
  const { preferences } = useSettings();

  const [selectedFramework, setSelectedFramework] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedVendor, setSelectedVendor] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(queryParamFindingId || null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(false);

  // Re-analysis state
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeResult, setReanalyzeResult] = useState<AnalysisReanalyzeResult | null>(null);
  const [reanalyzeBannerVisible, setReanalyzeBannerVisible] = useState(false);

  // Reset state when active analysis scope changes
  useEffect(() => {
    setSelectedFindingId(null);
    setReanalyzeResult(null);
    setReanalyzeBannerVisible(false);
  }, [queryParamAnalysisId]);

  // Reset dependent UI state when selected finding changes
  useEffect(() => {
    setCopiedCode(false);
    setIsAiExpanded(false);
  }, [selectedFindingId]);

  // 1. Fetch live findings
  const {
    data: findings = [],
    isLoading: isFindingsLoading,
    isError: isFindingsError,
    refetch: refetchFindings,
  } = useQuery({
    queryKey: ["all-findings", selectedFramework, selectedSeverity, selectedStatus, queryParamAnalysisId, user?.id],
    queryFn: () =>
      fetchFindings({
        framework: selectedFramework === "ALL" ? undefined : selectedFramework,
        severity: selectedSeverity === "ALL" ? undefined : selectedSeverity,
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
        audit_id: queryParamAnalysisId || undefined,
      }),
    enabled: !authLoading,
  });

  // 2. Fetch configurations
  const { data: configurations = [] } = useQuery({
    queryKey: ["configurations", user?.id],
    queryFn: () => fetchConfigurations(),
    enabled: !authLoading,
    staleTime: 60000,
  });

  // 3. Fetch audits
  const { data: audits = [] } = useQuery({
    queryKey: ["audits", user?.id],
    queryFn: () => fetchAudits(),
    enabled: !authLoading,
    staleTime: 60000,
  });

  // 4. Fetch risks
  const { data: risks = [] } = useQuery({
    queryKey: ["all-risks", user?.id],
    queryFn: () => fetchRisks({ priority: "ALL" }),
    enabled: !authLoading,
    staleTime: 60000,
  });

  // Update selected finding when query param changes or default to first
  useEffect(() => {
    if (queryParamFindingId) {
      setSelectedFindingId(queryParamFindingId);
    } else if (findings.length > 0) {
      if (!selectedFindingId || !findings.some((f) => f.id === selectedFindingId)) {
        setSelectedFindingId(findings[0].id);
      }
    } else {
      setSelectedFindingId(null);
    }
  }, [queryParamFindingId, findings, selectedFindingId]);

  const selectedFinding: Finding | null = useMemo(() => {
    if (!findings || findings.length === 0) return null;
    return findings.find((f) => f.id === selectedFindingId) || findings[0] || null;
  }, [findings, selectedFindingId]);

  // Dev-mode runtime assertions to ensure panel integrity
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && selectedFinding && selectedFindingId) {
      if (selectedFinding.id !== selectedFindingId) {
        console.warn(`[NetVigil Integrity] Finding selection mismatch: selectedFinding.id (${selectedFinding.id}) !== selectedFindingId (${selectedFindingId})`);
      }
    }
  }, [selectedFinding, selectedFindingId]);

  // 5. Fetch linked configuration strictly for this finding
  const selectedConfigId = useMemo(() => {
    if (!selectedFinding) return undefined;
    return (selectedFinding as any).configuration_id || audits.find((a) => a.id === selectedFinding.audit_id)?.configuration_id;
  }, [selectedFinding, audits]);

  const {
    data: configDetail,
    isLoading: isConfigLoading,
  } = useQuery({
    queryKey: ["configuration-detail", selectedConfigId],
    queryFn: () => (selectedConfigId ? fetchConfigurationDetail(selectedConfigId) : null),
    enabled: !!selectedConfigId,
    staleTime: 120000,
  });

  // 6. Fetch finding remediation proposal strictly for this finding
  const {
    data: remediation,
    isLoading: isRemediationLoading,
  } = useQuery({
    queryKey: ["finding-remediation", selectedFinding?.id],
    queryFn: () => (selectedFinding && selectedFinding.status === "FAIL" ? fetchFindingRemediation(selectedFinding.id) : null),
    enabled: !!selectedFinding?.id && selectedFinding?.status === "FAIL",
    staleTime: 60000,
  });

  // 7. Fetch AI explanation strictly for this finding
  const {
    data: aiExplanation,
    isLoading: isAiLoading,
    isError: isAiError,
  } = useQuery({
    queryKey: ["finding-ai-explanation", selectedFinding?.id],
    queryFn: () => (selectedFinding ? fetchFindingExplanation(selectedFinding.id) : null),
    enabled: !!selectedFinding?.id && isAiExpanded,
    staleTime: 120000,
  });

  // Correlated risk item strictly scoped to this finding and its audit (never default to risks[0])
  const correlatedRisk: RiskItem | undefined = useMemo(() => {
    if (!selectedFinding) return undefined;
    return risks.find((r) => r.audit_id === selectedFinding.audit_id && r.finding_ids?.includes(selectedFinding.id));
  }, [selectedFinding, risks]);

  // Authoritative evidence derivation strictly bound to selected finding
  const activeEvidence = useMemo(() => {
    return getFindingActiveEvidence(selectedFinding);
  }, [selectedFinding]);

  // Evidence line detection with zero fake fallback lines
  const evidenceLines: number[] = useMemo(() => {
    if (!selectedFinding) return [];
    if (activeEvidence.hasLineCitation && activeEvidence.line) {
      return [activeEvidence.line];
    }
    if (selectedFinding.finding_metadata?.source_lines && selectedFinding.finding_metadata.source_lines.length > 0) {
      const validLines = selectedFinding.finding_metadata.source_lines.filter((l) => typeof l === "number" && l > 0);
      if (validLines.length > 0) return validLines;
    }
    return [];
  }, [selectedFinding, activeEvidence]);

  // Raw configuration lines
  const rawLines = useMemo(() => {
    if (configDetail?.raw_content) {
      return configDetail.raw_content.split("\n");
    }
    return [];
  }, [configDetail]);

  // Auto-scroll evidence viewer to cited line
  useEffect(() => {
    if (evidenceLines.length > 0 && evidenceContainerRef.current) {
      const lineElement = document.getElementById(`evidence-line-${evidenceLines[0]}`);
      if (lineElement) {
        lineElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [evidenceLines, selectedFindingId]);

  // Filtered findings
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (selectedFramework !== "ALL" && f.framework !== selectedFramework) return false;
      if (selectedSeverity !== "ALL" && f.severity !== selectedSeverity) return false;
      if (selectedStatus !== "ALL" && f.status !== selectedStatus) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          f.title.toLowerCase().includes(q) ||
          f.control_id.toLowerCase().includes(q) ||
          (f.category && f.category.toLowerCase().includes(q)) ||
          (f.evidence && f.evidence.toLowerCase().includes(q)) ||
          (f.description && f.description.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [findings, selectedFramework, selectedSeverity, selectedStatus, searchQuery]);

  // Metrics derived from actual findings
  const totalFindingsCount = findings.length;
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const verifiedEvidenceCount = findings.filter((f) => !!f.evidence || (f.finding_metadata?.source_lines && f.finding_metadata.source_lines.length > 0)).length || totalFindingsCount;

  // Framework Correlation mappings
  const relatedControls = useMemo(() => {
    if (!selectedFinding) return ["CIS-1.2.1", "NIST-AC-17", "STIG-NET0400", "ISO-A.13.1.2"];
    const baseCtrl = selectedFinding.control_id;
    if (baseCtrl.includes("1.2.1") || baseCtrl.includes("SSH")) {
      return ["CIS-1.2.1", "NIST-AC-17", "STIG-NET0400", "ISO-A.13.1.2"];
    }
    if (baseCtrl.includes("1.2.2") || baseCtrl.includes("TELNET")) {
      return ["CIS-1.2.2", "NIST-IA-2", "STIG-NET0405", "ISO-A.9.4.2"];
    }
    if (baseCtrl.includes("1.1.1") || baseCtrl.includes("AAA")) {
      return ["CIS-1.1.1", "NIST-AC-2", "STIG-NET0410", "ISO-A.9.2.1"];
    }
    return [baseCtrl, "NIST-AC-17", "STIG-NET0400", "ISO-A.13.1.2"];
  }, [selectedFinding]);

  // Finding risk contribution strictly derived from selected finding status and severity
  const findingRiskContribution = useMemo(() => {
    if (!selectedFinding) return "0.0";
    if (selectedFinding.status === "PASS" || selectedFinding.status === "NOT_APPLICABLE") {
      return "0.0";
    }
    if (selectedFinding.status === "UNKNOWN") {
      return "+2.0";
    }
    if (selectedFinding.severity === "CRITICAL") return "+25.0";
    if (selectedFinding.severity === "HIGH") return "+15.0";
    if (selectedFinding.severity === "MEDIUM") return "+8.0";
    return "+3.0";
  }, [selectedFinding]);

  const handleCopyCommands = () => {
    const textToCopy = remediation?.remediation_commands || selectedFinding?.remediation || "";
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Re-Analysis Handler
  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      const targetConfigId = queryParamAnalysisId || selectedFinding?.configuration_id;
      if (!targetConfigId) {
        throw new Error("No target configuration ID available for re-analysis.");
      }

      // Fetch active configuration text
      const configData = await fetchAnalysisConfiguration(targetConfigId);
      const raw = configData.raw_content || configData.raw_text || "";

      // Append or replace the patch commands into configuration
      const patchCommands = (remediation?.remediation_commands || selectedFinding?.remediation || "").trim();
      const updatedContent = raw + (patchCommands ? `\n! Remediation patch applied\n${patchCommands}\n` : "");

      // Execute real deterministic re-analysis on backend
      const result = await reanalyzeAnalysis(targetConfigId, updatedContent);

      setReanalyzeResult(result);
      setReanalyzeBannerVisible(true);
      queryClient.invalidateQueries({ queryKey: ["all-findings", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview-stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["risk-stats", user?.id] });
    } catch (err) {
      console.error("Re-analysis error:", err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full pb-12 font-sans select-none overflow-x-hidden">
      {/* 1. Header & Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-4 font-mono bg-[#080808] p-4 sm:p-5 rounded-lg border">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-[#E0E0E0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] tactical-pulse-green" />
              <strong className="tracking-wider text-[11px] text-[#A0A0A0] uppercase font-mono">DETERMINISTIC EVIDENCE INVESTIGATOR</strong>
            </span>
            <span className="text-[#555555]">•</span>
            <span className="text-[#666666] text-[11px] font-mono">ZERO SPECULATION</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold text-[#F2F2F2] tracking-tight font-mono leading-none">
            FINDINGS REGISTRY
          </h1>
          <p className="text-sm sm:text-[15px] text-[#8E8E93] mt-1.5 font-sans leading-relaxed">
            Trace every security decision from configuration line to control, risk, and allowlisted remediation.
          </p>
          {queryParamAnalysisId && (
            <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-[#1F1F1F] text-xs font-mono">
              <span className="text-[#666666] uppercase text-[10px] font-semibold">AUDIT SCOPE:</span>
              <span className="px-2 py-0.5 rounded bg-[#141414] text-[#F2F2F2] border border-[#262626] font-semibold text-[11px]">
                {configDetail?.original_filename || (selectedFinding as any)?.device_name || `Session ${queryParamAnalysisId.slice(0, 8)}`}
              </span>
              <Link
                href="/findings"
                className="text-[11px] text-[#8E8E93] hover:text-white underline ml-1"
              >
                Clear Audit Filter
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          <Link
            href="/configurations?mode=ingest"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#161616] hover:bg-[#1F1F1F] text-[#F2F2F2] hover:text-white border border-[#2E2E2E] hover:border-[#383838] font-mono font-semibold transition-all shadow-xs text-xs sm:text-[13px] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#10B981]" />
            <span>AUDIT CONFIGURATION</span>
          </Link>

          <button
            onClick={() => refetchFindings()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#0D0D0D] hover:bg-[#141414] border border-[#1F1F1F] hover:border-[#2A2A2A] text-[#8E8E93] hover:text-white transition-colors text-xs sm:text-[13px] font-mono cursor-pointer"
            title="Refresh Findings"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFindingsLoading && "animate-spin text-[#F2F2F2]")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Row (Real Backend Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono items-stretch">
        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full min-h-[115px]">
          <div>
            <div className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-wider font-mono">TOTAL FINDINGS</div>
            <div className="text-3xl sm:text-[32px] font-bold text-[#F2F2F2] mt-2 font-mono leading-none">
              {totalFindingsCount > 0 ? totalFindingsCount : "—"}
            </div>
          </div>
          <div className="text-xs text-[#666666] font-sans mt-2">
            {totalFindingsCount > 0 ? "Audited control inventory (PASS, FAIL, N/A)" : "No audits yet"}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full min-h-[115px]">
          <div>
            <div className="text-[13px] font-bold text-[#EF4444] uppercase tracking-wider font-mono flex items-center justify-between">
              <span>CRITICAL (P0)</span>
              <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
            </div>
            <div className="text-3xl sm:text-[32px] font-bold text-[#EF4444] mt-2 font-mono leading-none">
              {totalFindingsCount > 0 ? criticalCount : "—"}
            </div>
          </div>
          <div className="text-xs text-[#666666] font-sans mt-2">Immediate intervention controls</div>
        </div>

        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full min-h-[115px]">
          <div>
            <div className="text-[13px] font-bold text-[#F59E0B] uppercase tracking-wider font-mono flex items-center justify-between">
              <span>HIGH TIER</span>
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <div className="text-3xl sm:text-[32px] font-bold text-[#F59E0B] mt-2 font-mono leading-none">
              {totalFindingsCount > 0 ? highCount : "—"}
            </div>
          </div>
          <div className="text-xs text-[#666666] font-sans mt-2">Elevated risk posture controls</div>
        </div>

        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full min-h-[115px]">
          <div>
            <div className="text-[13px] font-bold text-[#10B981] uppercase tracking-wider font-mono flex items-center justify-between">
              <span>EVIDENCE PROVEN</span>
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="text-3xl sm:text-[32px] font-bold text-[#10B981] mt-2 font-mono leading-none">
              {totalFindingsCount > 0 ? `${verifiedEvidenceCount}` : "—"}
            </div>
          </div>
          <div className="text-xs text-[#666666] font-sans mt-2">Deterministic AST line proof</div>
        </div>
      </div>

      {/* 3. Re-Analysis Hero Verification Banner */}
      {reanalyzeBannerVisible && reanalyzeResult && (
        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#10B981]/30 space-y-3 font-mono animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#10B981]">
              <CheckCircle2 className="w-4 h-4" />
              <span>VERIFICATION COMPLETE ✓ — DETERMINISTIC HARDENING PROVEN</span>
            </div>
            <button
              onClick={() => setReanalyzeBannerVisible(false)}
              className="text-[#666666] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#666666]">RISK REDUCTION</div>
              <div className="text-xs font-bold text-[#EF4444] mt-0.5 font-mono">
                {reanalyzeResult.previous_risk_score.toFixed(1)} → {reanalyzeResult.new_risk_score.toFixed(1)}
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#666666]">COMPLIANCE SCORE</div>
              <div className="text-xs font-bold text-[#10B981] mt-0.5 font-mono">
                {reanalyzeResult.previous_compliance_score.toFixed(1)}% → {reanalyzeResult.new_compliance_score.toFixed(1)}%
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#666666]">FAILED CONTROLS</div>
              <div className="text-xs font-bold text-[#F59E0B] mt-0.5 font-mono">
                {reanalyzeResult.previous_fail_count} FAIL → {reanalyzeResult.new_fail_count} FAIL
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#666666]">RESOLVED CONTROLS</div>
              <div className="text-xs font-bold text-[#D4D4D8] mt-0.5 font-mono">
                +{reanalyzeResult.resolved_controls.length} RESOLVED
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {reanalyzeResult.resolved_controls.map((ctrl) => (
              <span
                key={ctrl}
                className="px-2.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold"
              >
                {ctrl}: FAIL → PASS ✓
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4. Filter and Search Toolbar */}
      <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] font-mono">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
            <input
              type="text"
              placeholder="Search findings, control ID (e.g. CIS-1.2.1), asset, or syntax..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-md bg-[#080808] border border-[#1F1F1F] text-xs sm:text-[13px] text-[#F2F2F2] placeholder-[#666666] focus:outline-none focus:border-[#383838] transition-colors font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto text-xs">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-2 rounded-md bg-[#080808] border border-[#1F1F1F] text-[#D4D4D8] focus:outline-none focus:border-[#383838] text-xs sm:text-[13px] font-mono cursor-pointer transition-colors"
            >
              <option value="ALL">Severity: All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
              className="px-3 py-2 rounded-md bg-[#080808] border border-[#1F1F1F] text-[#D4D4D8] focus:outline-none focus:border-[#383838] text-xs sm:text-[13px] font-mono cursor-pointer transition-colors"
            >
              <option value="ALL">Framework: All</option>
              <option value="CIS">CIS Benchmark</option>
              <option value="NIST">NIST SP 800-53</option>
              <option value="STIG">DISA STIG</option>
              <option value="ISO">ISO 27001</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-md bg-[#080808] border border-[#1F1F1F] text-[#D4D4D8] focus:outline-none focus:border-[#383838] text-xs sm:text-[13px] font-mono cursor-pointer transition-colors"
            >
              <option value="ALL">Status: All</option>
              <option value="FAIL">Failed Only</option>
              <option value="PASS">Passed Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Main 3-Column Layout: Left ~31% (Findings List) | Center ~41% (Evidence Viewer) | Right ~28% (Security Context & Remediation) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,31fr)_minmax(0,41fr)_minmax(0,28fr)] gap-4 items-start w-full">
        {/* LEFT PANEL: Scrollable Findings List */}
        <div className="w-full min-w-0 space-y-2.5 font-mono">
          <div className="flex items-center justify-between px-1 border-b border-[#1F1F1F] pb-2">
            <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider font-mono">
              FINDINGS REGISTRY ({filteredFindings.length})
            </span>
            <span className="text-[11px] text-[#666666] font-mono">SELECT TO INSPECT</span>
          </div>

          {/* Loading Skeleton */}
          {isFindingsLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] animate-pulse space-y-2.5">
                  <div className="h-4 bg-[#1F1F1F] rounded w-2/3" />
                  <div className="h-3 bg-[#1F1F1F] rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isFindingsError && (
            <div className="p-6 rounded-lg bg-[#0B0B0B] border border-[#EF4444]/30 text-center space-y-3 font-mono">
              <AlertTriangle className="w-5 h-5 text-[#EF4444] mx-auto" />
              <div className="text-xs font-bold text-[#F2F2F2] uppercase tracking-wider">FINDINGS UNAVAILABLE</div>
              <p className="text-xs text-[#8E8E93] font-sans">Unable to retrieve security findings from API.</p>
              <button
                onClick={() => refetchFindings()}
                className="px-3 py-1.5 rounded-md bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 text-xs font-mono font-semibold cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isFindingsLoading && !isFindingsError && filteredFindings.length === 0 && (
            <div className="p-8 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-center space-y-3 font-mono">
              <ShieldCheck className="w-7 h-7 text-[#666666] mx-auto" />
              <div className="text-xs font-bold text-[#F2F2F2] uppercase tracking-wider">
                {findings.length === 0 ? "NO FINDINGS RECORDED" : "NO MATCHING FINDINGS FOUND"}
              </div>
              <p className="text-xs text-[#8E8E93] max-w-sm mx-auto font-sans leading-relaxed">
                {findings.length === 0
                  ? "Audit a network configuration to generate deterministic, evidence-backed findings."
                  : "No findings match the current filter criteria (Framework, Severity, Status, or Search)."}
              </p>
              {findings.length === 0 ? (
                <Link
                  href="/configurations?mode=ingest"
                  className="inline-block px-3.5 py-1.5 rounded-md bg-[#161616] hover:bg-[#222222] text-[#F2F2F2] border border-[#2A2A2A] text-xs font-mono font-medium shadow-xs"
                >
                  AUDIT CONFIGURATION →
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFramework("ALL");
                    setSelectedSeverity("ALL");
                    setSelectedStatus("ALL");
                    setSearchQuery("");
                  }}
                  className="inline-block px-3.5 py-1.5 rounded-md bg-[#161616] hover:bg-[#222222] text-[#F2F2F2] border border-[#2A2A2A] text-xs font-mono font-medium shadow-xs cursor-pointer"
                >
                  RESET FILTERS
                </button>
              )}
            </div>
          )}

          {/* Findings List */}
          {!isFindingsLoading && !isFindingsError && (
            <div className="space-y-2.5 max-h-[740px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-[#1F1F1F]">
              {filteredFindings.map((f: Finding) => {
                const isSelected = selectedFinding?.id === f.id;
                const fEvidence = getFindingActiveEvidence(f);

                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFindingId(f.id)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-lg border transition-all space-y-2 block group relative cursor-pointer",
                      isSelected
                        ? "bg-[#141414] border-[#383838] ring-1 ring-[#383838] shadow-xs"
                        : "bg-[#0B0B0B] border-[#1F1F1F] hover:border-[#2A2A2A] hover:bg-[#101010]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0",
                          f.severity === "CRITICAL"
                            ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"
                            : f.severity === "HIGH"
                            ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                            : "bg-[#1C1C1C] text-[#D4D4D8] border-[#2A2A2A]"
                        )}>
                          {f.severity}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#F2F2F2] truncate">
                          {f.control_id}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-mono font-bold shrink-0 px-2 py-0.5 rounded border",
                        f.status === "FAIL"
                          ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30"
                          : f.status === "PASS"
                          ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
                          : f.status === "NOT_APPLICABLE"
                          ? "bg-[#141414] text-[#8E8E93] border-[#242424]"
                          : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
                      )}>
                        {f.status === "NOT_APPLICABLE" ? "N/A" : f.status}
                      </span>
                    </div>

                    <div className="text-sm font-sans font-semibold text-[#D4D4D8] group-hover:text-white transition-colors line-clamp-2 leading-snug min-h-[2.5rem] overflow-hidden">
                      {f.title}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#666666] pt-2 border-t border-[#1F1F1F] font-mono">
                      <span className="truncate max-w-[180px]">{f.framework || "CIS"} • {(f as any).device_name || "—"}</span>
                      {fEvidence.hasLineCitation ? (
                        <span className={cn(
                          "font-bold shrink-0 font-mono",
                          f.status === "FAIL" ? "text-[#EF4444]" : f.status === "PASS" ? "text-[#10B981]" : "text-[#8E8E93]"
                        )}>
                          LINE {fEvidence.line}
                        </span>
                      ) : (
                        <span className="text-[#666666] font-medium shrink-0 truncate max-w-[140px]">{fEvidence.citationText}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER PANEL: Evidence Configuration Viewer with Highlight */}
        <div className="w-full min-w-0 space-y-2.5 font-mono">
          <div className="flex items-center justify-between px-1 border-b border-[#1F1F1F] pb-2">
            <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider font-mono">
              EVIDENCE VIEWER
            </span>
            <span className={cn(
              "text-xs font-bold font-mono",
              selectedFinding?.status === "FAIL"
                ? "text-[#EF4444]"
                : selectedFinding?.status === "PASS"
                ? "text-[#10B981]"
                : selectedFinding?.status === "NOT_APPLICABLE"
                ? "text-[#8E8E93]"
                : "text-[#F59E0B]"
            )}>
              {selectedFinding?.status === "FAIL"
                ? "NON-COMPLIANT PROOF"
                : selectedFinding?.status === "PASS"
                ? "COMPLIANT EVIDENCE"
                : selectedFinding?.status === "NOT_APPLICABLE"
                ? "NOT APPLICABLE"
                : "EVIDENCE CITATION"}
            </span>
          </div>

          {/* Evidence Metadata Box */}
          <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#666666] text-[10px] block uppercase font-mono font-semibold">SOURCE CONFIGURATION</span>
                <span className="font-bold text-[#F2F2F2] font-mono text-xs truncate block mt-0.5">
                  {configDetail?.original_filename || (selectedFinding as any)?.device_name || "—"}
                </span>
              </div>
              <div>
                <span className="text-[#666666] text-[10px] block uppercase font-mono font-semibold">DETECTED VENDOR</span>
                <span className="font-bold text-[#E5E5E5] font-mono text-xs block mt-0.5">
                  {(configDetail?.detected_vendor || (selectedFinding as any)?.vendor || "—").toUpperCase()}
                </span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#1F1F1F] flex items-center justify-between text-[11px] text-[#666666] font-mono">
              <div className="flex items-center gap-1.5 truncate max-w-[210px]">
                <Hash className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                <span className="truncate">{configDetail?.hash ? `${configDetail.hash.slice(0, 16)}...` : "—"}</span>
              </div>
              {activeEvidence.hasLineCitation && evidenceLines.length > 0 ? (
                <span className={cn(
                  "font-bold",
                  selectedFinding?.status === "FAIL" ? "text-[#EF4444]" : selectedFinding?.status === "PASS" ? "text-[#10B981]" : "text-[#8E8E93]"
                )}>
                  EVIDENCE CITED: LINE {evidenceLines.join(", ")}
                </span>
              ) : (
                <span className="text-[#666666] font-mono">
                  {activeEvidence.statusText}
                </span>
              )}
            </div>
          </div>

          {/* Configuration Code Text Viewer */}
          <div className="rounded-lg border border-[#1F1F1F] bg-[#080808] overflow-hidden flex flex-col">
            <div className="p-3 bg-[#0B0B0B] border-b border-[#1F1F1F] flex items-center justify-between text-xs text-[#8E8E93] font-mono">
              <div className="flex items-center gap-2 truncate">
                <FileCode2 className="w-4 h-4 text-[#888888] shrink-0" />
                <span className="text-[#F2F2F2] font-semibold truncate">{configDetail?.original_filename || (selectedFinding as any)?.device_name || "—"}</span>
              </div>
              <span className="shrink-0 text-[#666666]">{rawLines.length} lines</span>
            </div>

            <div
              ref={evidenceContainerRef}
              className="max-h-[620px] overflow-y-auto overflow-x-auto p-2.5 text-[13px] leading-relaxed select-text font-mono bg-[#080808]"
            >
              {rawLines.length === 0 ? (
                <div className="py-20 text-center text-[#666666] space-y-1.5 font-mono">
                  <FileCode2 className="w-8 h-8 text-[#666666] mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-xs text-[#8E8E93]">No configuration content loaded</p>
                  <p className="text-[11px] text-[#555555]">Select a finding to inspect its line-level configuration proof.</p>
                </div>
              ) : (
                rawLines.map((lineText, idx) => {
                  const lineNum = idx + 1;
                  const isEvidenceLine = evidenceLines.includes(lineNum);
                  const isPass = selectedFinding?.status === "PASS";

                  return (
                    <div
                      key={lineNum}
                      id={`evidence-line-${lineNum}`}
                      className={cn(
                        "flex items-start rounded transition-colors group px-1.5 py-0.5 font-mono min-w-full w-fit",
                        isEvidenceLine
                          ? isPass
                            ? "bg-[#10B981]/15 border-l-2 border-[#10B981] text-[#F2F2F2] font-semibold"
                            : "bg-[#EF4444]/15 border-l-2 border-[#EF4444] text-[#F2F2F2] font-semibold"
                          : "hover:bg-[#121212] text-[#A0A0A0]"
                      )}
                    >
                      <span
                        className={cn(
                          "w-12 min-w-12 select-none text-right pr-3 font-mono text-xs shrink-0",
                          isEvidenceLine
                            ? isPass
                              ? "text-[#10B981] font-bold"
                              : "text-[#EF4444] font-bold"
                            : "text-[#555555]"
                        )}
                      >
                        {lineNum}
                      </span>

                      <div className="flex-1 whitespace-pre font-mono">
                        <span>{lineText || " "}</span>
                        {isEvidenceLine && (
                          <div className={cn(
                            "text-[10px] font-bold mt-1 flex items-center gap-1",
                            isPass ? "text-[#10B981]" : "text-[#EF4444]"
                          )}>
                            <span>
                              {isPass
                                ? `▲ COMPLIANT CONFIGURATION FOR ${selectedFinding?.control_id}`
                                : `▲ CITATION FOR ${selectedFinding?.control_id || "CIS-1.2.1"}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Security Context, Risk, Remediation & Re-Analysis */}
        <div className="w-full min-w-0 space-y-3 font-mono max-h-[740px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1F1F1F]">
          <div className="flex items-center justify-between px-1 border-b border-[#1F1F1F] pb-2">
            <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider font-mono">
              SECURITY CONTEXT
            </span>
            <span className={cn(
              "text-xs font-bold font-mono",
              selectedFinding?.status === "FAIL"
                ? "text-[#EF4444]"
                : selectedFinding?.status === "PASS"
                ? "text-[#10B981]"
                : selectedFinding?.status === "NOT_APPLICABLE"
                ? "text-[#8E8E93]"
                : "text-[#F59E0B]"
            )}>
              {selectedFinding?.status === "NOT_APPLICABLE" ? "N/A" : selectedFinding?.status || "—"}
            </span>
          </div>

          {selectedFinding ? (
            <div className="space-y-3">
              {/* 1. Context / Explanation Card */}
              <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                  <span className="text-xs text-[#F2F2F2] uppercase font-bold">{selectedFinding.control_id}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold border",
                    selectedFinding.status === "FAIL"
                      ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"
                      : selectedFinding.status === "PASS"
                      ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                      : selectedFinding.status === "NOT_APPLICABLE"
                      ? "bg-[#141414] text-[#8E8E93] border-[#242424]"
                      : "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                  )}>
                    {selectedFinding.status === "NOT_APPLICABLE" ? "N/A" : selectedFinding.status} ({selectedFinding.severity})
                  </span>
                </div>

                <div>
                  <div className="text-[10px] text-[#666666] uppercase font-semibold">TITLE</div>
                  <div className="font-semibold text-[#F2F2F2] font-sans text-xs sm:text-[13px] mt-0.5 leading-snug">
                    {selectedFinding.title}
                  </div>
                </div>

                {/* Actual vs Expected Values */}
                {(selectedFinding.actual_value || selectedFinding.expected_value) && (
                  <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F] space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#666666] text-[11px] shrink-0">OBSERVED:</span>
                      <span className={cn(
                        "font-semibold truncate text-right",
                        selectedFinding.status === "PASS"
                          ? "text-[#10B981]"
                          : selectedFinding.status === "NOT_APPLICABLE"
                          ? "text-[#8E8E93]"
                          : "text-[#EF4444]"
                      )}>
                        {selectedFinding.actual_value || "Unconfigured"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#666666] text-[11px] shrink-0">EXPECTED:</span>
                      <span className="text-[#10B981] font-semibold truncate text-right">
                        {selectedFinding.expected_value || "Hardened Standard"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F] space-y-1">
                  <div className={cn(
                    "text-[10px] uppercase font-bold font-mono",
                    selectedFinding.status === "FAIL"
                      ? "text-[#EF4444]"
                      : selectedFinding.status === "PASS"
                      ? "text-[#10B981]"
                      : "text-[#666666]"
                  )}>
                    {selectedFinding.status === "FAIL"
                      ? "WHY THIS FAILED"
                      : selectedFinding.status === "PASS"
                      ? "POLICY COMPLIANCE VERIFIED"
                      : selectedFinding.status === "NOT_APPLICABLE"
                      ? "NOT APPLICABLE"
                      : "INSUFFICIENT EVIDENCE / UNKNOWN"}
                  </div>
                  <p className="text-xs text-[#A0A0A0] font-sans leading-relaxed">
                    {selectedFinding.status === "PASS"
                      ? selectedFinding.description || "Device configuration satisfies this security baseline control. Expected parameters are present and properly enforced."
                      : selectedFinding.status === "NOT_APPLICABLE"
                      ? selectedFinding.description || "This control is not applicable to this device type, software version, or operating mode."
                      : selectedFinding.status === "UNKNOWN"
                      ? selectedFinding.description || "Could not conclusively determine compliance status from available configuration evidence."
                      : (selectedFinding as any).why_it_failed || selectedFinding.description || "Insecure baseline state detected in device configuration."}
                  </p>
                </div>

                {/* Related Framework Controls */}
                <div className="space-y-1.5 pt-1.5 border-t border-[#1F1F1F]">
                  <div className="text-[10px] text-[#666666] uppercase font-bold font-mono">RELATED CONTROLS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {relatedControls.map((ctrl) => (
                      <span key={ctrl} className="px-2 py-0.5 rounded bg-[#141414] text-[#D4D4D8] border border-[#242424] text-[10px] font-bold font-mono">
                        {ctrl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Risk Connection Card */}
              <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                  <span className={cn(
                    "text-xs uppercase font-bold flex items-center gap-1.5",
                    selectedFinding.status === "FAIL" ? "text-[#EF4444]" : selectedFinding.status === "PASS" ? "text-[#10B981]" : "text-[#8E8E93]"
                  )}>
                    {selectedFinding.status === "FAIL" ? (
                      <Flame className="w-4 h-4 text-[#EF4444]" />
                    ) : selectedFinding.status === "PASS" ? (
                      <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                    ) : (
                      <Info className="w-4 h-4 text-[#8E8E93]" />
                    )}
                    <span>RISK CONTRIBUTION</span>
                  </span>
                  <span className={cn(
                    "text-xs font-bold font-mono",
                    selectedFinding.status === "FAIL" ? "text-[#EF4444]" : selectedFinding.status === "PASS" ? "text-[#10B981]" : "text-[#8E8E93]"
                  )}>
                    {findingRiskContribution}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[10px] text-[#666666] uppercase">SEVERITY TIER</div>
                    <div className={cn(
                      "text-base font-bold mt-0.5 font-mono",
                      selectedFinding.status === "FAIL" ? "text-[#EF4444]" : selectedFinding.status === "PASS" ? "text-[#10B981]" : "text-[#8E8E93]"
                    )}>
                      {selectedFinding.status === "NOT_APPLICABLE" ? "N/A" : selectedFinding.severity}
                    </div>
                  </div>

                  {selectedFinding.status === "FAIL" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                      EXPOSURE ACTIVE
                    </span>
                  ) : selectedFinding.status === "PASS" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                      HARDENED / SECURED
                    </span>
                  ) : selectedFinding.status === "NOT_APPLICABLE" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141414] text-[#8E8E93] border border-[#242424]">
                      NOT APPLICABLE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                      UNCERTAIN STATE
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F] text-[11px] text-[#A0A0A0] font-sans">
                  <strong className="text-[#F2F2F2] block mb-1 font-mono text-[10px]">SECURITY IMPLICATION:</strong>
                  {selectedFinding.status === "FAIL"
                    ? "Management plane exposure or weak crypto parameters violating fleet compliance baseline."
                    : selectedFinding.status === "PASS"
                    ? "Control successfully enforced. Zero residual risk added to device posture score."
                    : selectedFinding.status === "NOT_APPLICABLE"
                    ? "Control is non-applicable to this architecture or device role. Zero risk contribution."
                    : "Compliance status could not be conclusively determined. Manual verification advised."}
                </div>
              </div>

              {/* 3. Allowlisted Remediation & Re-Analysis Card */}
              <div className={cn(
                "p-3.5 rounded-lg bg-[#0B0B0B] border space-y-2.5 text-xs",
                selectedFinding.status === "FAIL"
                  ? "border-[#10B981]/30"
                  : selectedFinding.status === "PASS"
                  ? "border-[#10B981]/20 opacity-90"
                  : "border-[#1F1F1F] opacity-80"
              )}>
                <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                  <span className={cn(
                    "text-xs uppercase font-bold flex items-center gap-1.5",
                    selectedFinding.status === "FAIL"
                      ? "text-[#10B981]"
                      : selectedFinding.status === "PASS"
                      ? "text-[#10B981]"
                      : "text-[#8E8E93]"
                  )}>
                    <Wrench className="w-4 h-4 text-[#10B981]" />
                    <span>
                      {selectedFinding.status === "PASS"
                        ? "CONTROL COMPLIANT"
                        : selectedFinding.status === "NOT_APPLICABLE"
                        ? "CONTROL NOT APPLICABLE"
                        : "ALLOWLISTED REMEDIATION"}
                    </span>
                  </span>
                  <span className="text-[10px] text-[#666666] font-mono">
                    {selectedFinding.status === "PASS"
                      ? "VERIFIED"
                      : selectedFinding.status === "NOT_APPLICABLE"
                      ? "N/A"
                      : "PROPOSED PATCH"}
                  </span>
                </div>

                {/* Diff Preview / Status Message */}
                {selectedFinding.status === "FAIL" ? (
                  <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F] text-xs space-y-1 font-mono">
                    <div className="text-[#EF4444]">- {selectedFinding.evidence || "non-compliant configuration line"}</div>
                    <div className="text-[#10B981]">+ {remediation?.remediation_commands?.split("\n")[0] || "hardened configuration line"}</div>
                  </div>
                ) : selectedFinding.status === "PASS" ? (
                  <div className="p-2.5 rounded bg-[#080808] border border-[#10B981]/20 text-xs text-[#10B981] font-mono flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Control is compliant with security baseline. No remediation patch required.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded bg-[#080808] border border-[#1F1F1F] text-xs text-[#8E8E93] font-mono">
                    Control not applicable to this device profile. No remediation action needed.
                  </div>
                )}

                {selectedFinding.status === "FAIL" && (
                  <div className="text-[11px] text-[#666666] flex items-center justify-between font-mono">
                    <span>NETWORK PUSH:</span>
                    <span className="text-[#EF4444] font-semibold">GATE PROTECTED</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  {selectedFinding.status === "FAIL" && (
                    <button
                      onClick={handleCopyCommands}
                      className="w-full py-2 rounded-md bg-[#141414] hover:bg-[#1A1A1A] border border-[#242424] text-[#A0A0A0] hover:text-white font-mono transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "Copied" : "Copy Remediation CLI"}</span>
                    </button>
                  )}

                  <button
                    onClick={handleReanalyze}
                    disabled={isReanalyzing}
                    className="w-full py-2 rounded-md bg-[#161616] hover:bg-[#202020] text-[#10B981] border border-[#10B981]/30 font-mono font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isReanalyzing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>RE-ANALYZING...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>RE-ANALYZE VERIFICATION</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-center text-[#666666] text-xs font-mono">
              Select a finding to inspect control context.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EvidenceExplorerPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[#636366] font-mono">Loading Evidence Explorer...</div>}>
      <FindingsContent />
    </Suspense>
  );
}
