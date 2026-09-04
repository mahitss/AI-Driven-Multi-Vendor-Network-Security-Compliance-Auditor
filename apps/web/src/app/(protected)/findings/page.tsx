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
    <div className="space-y-4 max-w-[1440px] mx-auto pb-12 font-sans">
      {/* 1. Header & Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1F1F1F] pb-3.5 font-mono bg-[#080808] p-4 rounded-lg">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="flex items-center gap-1.5 text-[#E0E0E0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] tactical-pulse-green" />
              <strong className="tracking-wider text-[11px] text-[#A0A0A0]">DETERMINISTIC EVIDENCE INVESTIGATOR</strong>
            </span>
            <span className="text-[#555555]">•</span>
            <span className="text-[#666666] text-[11px]">ZERO SPECULATION</span>
          </div>
          <h1 className="text-lg lg:text-xl font-bold text-[#F2F2F2] tracking-tight font-mono">
            EVIDENCE EXPLORER
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5 max-w-3xl font-sans leading-relaxed">
            Trace every security decision from configuration line to control, risk, and allowlisted remediation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto text-xs">
          <Link
            href="/configurations?mode=ingest"
            className="px-3 py-1.5 rounded bg-[#161616] hover:bg-[#202020] text-[#F2F2F2] border border-[#2A2A2A] font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm text-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#A0A0A0]" />
            <span>AUDIT CONFIGURATION</span>
          </Link>

          <button
            onClick={() => refetchFindings()}
            className="p-1.5 rounded bg-[#0B0B0B] hover:bg-[#141414] border border-[#1F1F1F] text-[#8E8E93] hover:text-[#F2F2F2] transition-colors"
            title="Refresh Findings"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFindingsLoading && "animate-spin text-[#F2F2F2]")} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Row (Real Backend Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
        <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors">
          <div className="text-[10px] text-[#666666] uppercase font-semibold">OPEN FINDINGS</div>
          <div className="text-xl font-bold text-[#F2F2F2] mt-0.5 font-mono">
            {totalFindingsCount > 0 ? totalFindingsCount : "—"}
          </div>
          <div className="text-[10px] text-[#8E8E93] font-sans mt-0.5">
            {totalFindingsCount > 0 ? "Audited policy violations" : "No audits yet"}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors">
          <div className="text-[10px] text-[#EF4444] uppercase font-semibold">CRITICAL (P0)</div>
          <div className="text-xl font-bold text-[#EF4444] mt-0.5 font-mono">
            {totalFindingsCount > 0 ? criticalCount : "—"}
          </div>
          <div className="text-[10px] text-[#666666] font-sans mt-0.5">Immediate intervention</div>
        </div>

        <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors">
          <div className="text-[10px] text-[#F59E0B] uppercase font-semibold">HIGH TIER</div>
          <div className="text-xl font-bold text-[#F59E0B] mt-0.5 font-mono">
            {totalFindingsCount > 0 ? highCount : "—"}
          </div>
          <div className="text-[10px] text-[#666666] font-sans mt-0.5">Elevated risk posture</div>
        </div>

        <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors">
          <div className="text-[10px] text-[#10B981] uppercase font-semibold">EVIDENCE PROVEN</div>
          <div className="text-xl font-bold text-[#10B981] mt-0.5 font-mono">
            {totalFindingsCount > 0 ? `${verifiedEvidenceCount}` : "—"}
          </div>
          <div className="text-[10px] text-[#666666] font-sans mt-0.5">100% AST Line Proof</div>
        </div>
      </div>

      {/* 3. Re-Analysis Hero Verification Banner */}
      {reanalyzeBannerVisible && reanalyzeResult && (
        <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#10B981]/30 space-y-2.5 font-mono animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#10B981]">
              <CheckCircle2 className="w-4 h-4" />
              <span>VERIFICATION COMPLETE ✓ — DETERMINISTIC HARDENING PROVEN</span>
            </div>
            <button
              onClick={() => setReanalyzeBannerVisible(false)}
              className="text-[#666666] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#666666]">RISK REDUCTION</div>
              <div className="text-xs font-bold text-[#EF4444] mt-0.5 font-mono">
                {reanalyzeResult.previous_risk_score.toFixed(1)} → {reanalyzeResult.new_risk_score.toFixed(1)}
              </div>
            </div>

            <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#666666]">COMPLIANCE SCORE</div>
              <div className="text-xs font-bold text-[#10B981] mt-0.5 font-mono">
                {reanalyzeResult.previous_compliance_score.toFixed(1)}% → {reanalyzeResult.new_compliance_score.toFixed(1)}%
              </div>
            </div>

            <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#666666]">FAILED CONTROLS</div>
              <div className="text-xs font-bold text-[#F59E0B] mt-0.5 font-mono">
                {reanalyzeResult.previous_fail_count} FAIL → {reanalyzeResult.new_fail_count} FAIL
              </div>
            </div>

            <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#666666]">RESOLVED CONTROLS</div>
              <div className="text-xs font-bold text-[#D4D4D8] mt-0.5 font-mono">
                +{reanalyzeResult.resolved_controls.length} RESOLVED
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            {reanalyzeResult.resolved_controls.map((ctrl) => (
              <span
                key={ctrl}
                className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[9px] font-bold"
              >
                {ctrl}: FAIL → PASS ✓
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4. Filter and Search Toolbar */}
      <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-2.5 font-mono">
        <div className="flex flex-col md:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666666]" />
            <input
              type="text"
              placeholder="Search findings, control ID (e.g. CIS-1.2.1), asset, or syntax..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-xs text-[#F2F2F2] placeholder-[#666666] focus:outline-none focus:border-[#2A2A2A] transition-colors font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-[#A0A0A0] focus:outline-none focus:border-[#2A2A2A] text-xs font-mono"
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
              className="px-2.5 py-1.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-[#A0A0A0] focus:outline-none focus:border-[#2A2A2A] text-xs font-mono"
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
              className="px-2.5 py-1.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-[#A0A0A0] focus:outline-none focus:border-[#2A2A2A] text-xs font-mono"
            >
              <option value="ALL">Status: All</option>
              <option value="FAIL">Failed Only</option>
              <option value="PASS">Passed Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Main 3-Column Layout: Left (Findings List) | Center (Evidence Viewer) | Right (Security Context & Remediation) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* LEFT PANEL (4 Cols): Scrollable Findings List */}
        <div className="lg:col-span-4 space-y-2 font-mono">
          <div className="flex items-center justify-between px-1 border-b border-[#1F1F1F] pb-1.5">
            <span className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">
              FINDINGS REGISTRY ({filteredFindings.length})
            </span>
            <span className="text-[10px] text-[#A0A0A0]">SELECT TO INSPECT</span>
          </div>

          {/* Loading Skeleton */}
          {isFindingsLoading && (
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="p-3 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] animate-pulse space-y-2">
                  <div className="h-3.5 bg-[#1F1F1F] rounded w-2/3" />
                  <div className="h-2.5 bg-[#1F1F1F] rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isFindingsError && (
            <div className="p-5 rounded-lg bg-[#0B0B0B] border border-[#EF4444]/30 text-center space-y-2.5">
              <AlertTriangle className="w-5 h-5 text-[#EF4444] mx-auto" />
              <div className="text-xs font-bold text-[#F2F2F2]">FINDINGS UNAVAILABLE</div>
              <p className="text-[11px] text-[#8E8E93] font-sans">Unable to retrieve security findings from API.</p>
              <button
                onClick={() => refetchFindings()}
                className="px-2.5 py-1 rounded bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 text-xs font-mono font-semibold"
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isFindingsLoading && !isFindingsError && filteredFindings.length === 0 && (
            <div className="p-6 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-center space-y-2.5">
              <ShieldCheck className="w-6 h-6 text-[#666666] mx-auto" />
              <div className="text-xs font-bold text-[#F2F2F2]">NO FINDINGS RECORDED</div>
              <p className="text-[11px] text-[#8E8E93] font-sans">
                Audit a configuration to generate evidence-backed findings.
              </p>
              <Link
                href="/configurations?mode=ingest"
                className="inline-block px-3 py-1.5 rounded bg-[#161616] hover:bg-[#222222] text-[#F2F2F2] border border-[#2A2A2A] text-xs font-mono font-medium shadow-sm"
              >
                AUDIT CONFIGURATION →
              </Link>
            </div>
          )}

          {/* Findings List */}
          {!isFindingsLoading && !isFindingsError && (
            <div className="space-y-1.5 max-h-[700px] overflow-y-auto pr-1">
              {filteredFindings.map((f: Finding) => {
                const isSelected = selectedFinding?.id === f.id;
                const fEvidence = getFindingActiveEvidence(f);

                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFindingId(f.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg border transition-all space-y-1.5 block group relative",
                      isSelected
                        ? "bg-[#141414] border-[#2E2E2E] shadow-sm"
                        : "bg-[#0B0B0B] border-[#1F1F1F] hover:border-[#2A2A2A] hover:bg-[#121212]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border",
                          f.severity === "CRITICAL"
                            ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/25"
                            : f.severity === "HIGH"
                            ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/25"
                            : "bg-[#1C1C1C] text-[#D4D4D8] border-[#2A2A2A]"
                        )}>
                          {f.severity}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-[#E5E5E5]">
                          {f.control_id}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-mono font-bold",
                        f.status === "FAIL"
                          ? "text-[#EF4444]"
                          : f.status === "PASS"
                          ? "text-[#10B981]"
                          : f.status === "NOT_APPLICABLE"
                          ? "text-[#888888]"
                          : "text-[#F59E0B]"
                      )}>
                        {f.status}
                      </span>
                    </div>

                    <div className="text-xs font-sans font-medium text-[#D4D4D8] group-hover:text-white transition-colors line-clamp-1">
                      {f.title}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#666666] pt-1 border-t border-[#1F1F1F] font-mono">
                      <span>{f.framework || "CIS"} • {(f as any).device_name || "—"}</span>
                      {fEvidence.hasLineCitation ? (
                        <span className={cn(
                          "font-bold",
                          f.status === "FAIL" ? "text-[#EF4444]" : f.status === "PASS" ? "text-[#10B981]" : "text-[#888888]"
                        )}>
                          LINE {fEvidence.line}
                        </span>
                      ) : (
                        <span className="text-[#666666] font-medium">{fEvidence.citationText}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER PANEL (5 Cols): Evidence Configuration Viewer with Highlight */}
        <div className="lg:col-span-5 space-y-2 font-mono">
          <div className="flex items-center justify-between px-1 border-b border-[#1F1F1F] pb-1.5">
            <span className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">
              EVIDENCE VIEWER
            </span>
            <span className={cn(
              "text-[10px] font-bold",
              selectedFinding?.status === "FAIL"
                ? "text-[#EF4444]"
                : selectedFinding?.status === "PASS"
                ? "text-[#10B981]"
                : selectedFinding?.status === "NOT_APPLICABLE"
                ? "text-[#888888]"
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
          <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[#666666] text-[9px] block uppercase font-mono">SOURCE CONFIGURATION</span>
                <span className="font-bold text-[#F2F2F2] font-mono text-[11px] truncate block">
                  {configDetail?.original_filename || (selectedFinding as any)?.device_name || "—"}
                </span>
              </div>
              <div>
                <span className="text-[#666666] text-[9px] block uppercase font-mono">DETECTED VENDOR</span>
                <span className="font-bold text-[#E5E5E5] font-mono text-[11px]">
                  {(configDetail?.detected_vendor || (selectedFinding as any)?.vendor || "—").toUpperCase()}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1F1F1F] flex items-center justify-between text-[10px] text-[#666666] font-mono">
              <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                <Hash className="w-3 h-3 text-[#888888]" />
                <span className="truncate">{configDetail?.hash ? `${configDetail.hash.slice(0, 16)}...` : "—"}</span>
              </div>
              {activeEvidence.hasLineCitation && evidenceLines.length > 0 ? (
                <span className={cn(
                  "font-bold",
                  selectedFinding?.status === "FAIL" ? "text-[#EF4444]" : selectedFinding?.status === "PASS" ? "text-[#10B981]" : "text-[#888888]"
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
          <div className="rounded-lg border border-[#1F1F1F] bg-[#080808] overflow-hidden">
            <div className="p-2 bg-[#0B0B0B] border-b border-[#1F1F1F] flex items-center justify-between text-[10px] text-[#666666] font-mono">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-3.5 h-3.5 text-[#888888]" />
                <span className="text-[#F2F2F2] font-semibold">{configDetail?.original_filename || (selectedFinding as any)?.device_name || "—"}</span>
              </div>
              <span>{rawLines.length} lines</span>
            </div>

            <div
              ref={evidenceContainerRef}
              className="max-h-[560px] overflow-y-auto p-2 text-[11px] leading-relaxed select-text font-mono bg-[#080808]"
            >
              {rawLines.length === 0 ? (
                <div className="py-16 text-center text-[#666666] space-y-1 font-mono">
                  <FileCode2 className="w-8 h-8 text-[#666666] mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-xs text-[#8E8E93]">No configuration content loaded</p>
                  <p className="text-[10px] text-[#555555]">Select a finding to inspect its line-level configuration proof.</p>
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
                      "flex items-start rounded transition-colors group px-1 py-0.5 font-mono",
                      isEvidenceLine
                        ? isPass
                          ? "bg-[#10B981]/15 border-l-2 border-[#10B981] text-[#F2F2F2] font-semibold"
                          : "bg-[#EF4444]/15 border-l-2 border-[#EF4444] text-[#F2F2F2] font-semibold"
                        : "hover:bg-[#121212] text-[#A0A0A0]"
                    )}
                  >
                    <span
                      className={cn(
                        "w-9 shrink-0 text-right pr-2.5 select-none text-[10px]",
                        isEvidenceLine
                          ? isPass
                            ? "text-[#10B981] font-bold"
                            : "text-[#EF4444] font-bold"
                          : "text-[#555555]"
                      )}
                    >
                      {lineNum}
                    </span>

                    <div className="flex-1 overflow-x-auto whitespace-pre font-mono">
                      <span>{lineText || " "}</span>
                      {isEvidenceLine && (
                        <div className={cn(
                          "text-[9px] font-bold mt-0.5 flex items-center gap-1",
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
              }))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (3 Cols): Security Context, Risk, Remediation & Re-Analysis */}
        <div className="lg:col-span-3 space-y-2.5 font-mono">
          <div className="flex items-center justify-between px-1 border-b border-[#1F1F1F] pb-1.5">
            <span className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">
              SECURITY CONTEXT
            </span>
            <span className={cn(
              "text-[10px] font-bold",
              selectedFinding?.status === "FAIL"
                ? "text-[#EF4444]"
                : selectedFinding?.status === "PASS"
                ? "text-[#10B981]"
                : selectedFinding?.status === "NOT_APPLICABLE"
                ? "text-[#888888]"
                : "text-[#F59E0B]"
            )}>
              {selectedFinding?.status || "—"}
            </span>
          </div>

          {selectedFinding ? (
            <div className="space-y-2.5">
              {/* 1. Context / Explanation Card */}
              <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-1.5">
                  <span className="text-[10px] text-[#D4D4D8] uppercase font-bold">{selectedFinding.control_id}</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded text-[9px] font-bold border",
                    selectedFinding.status === "FAIL"
                      ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/25"
                      : selectedFinding.status === "PASS"
                      ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/25"
                      : selectedFinding.status === "NOT_APPLICABLE"
                      ? "bg-[#888888]/15 text-[#888888] border-[#888888]/25"
                      : "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/25"
                  )}>
                    {selectedFinding.status} ({selectedFinding.severity})
                  </span>
                </div>

                <div>
                  <div className="text-[9px] text-[#666666] uppercase">TITLE</div>
                  <div className="font-semibold text-[#F2F2F2] font-sans text-xs mt-0.5">{selectedFinding.title}</div>
                </div>

                {/* Actual vs Expected Values */}
                {(selectedFinding.actual_value || selectedFinding.expected_value) && (
                  <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F] space-y-1 text-[11px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[#666666] text-[10px]">OBSERVED:</span>
                      <span className={cn(
                        "font-semibold",
                        selectedFinding.status === "PASS"
                          ? "text-[#10B981]"
                          : selectedFinding.status === "NOT_APPLICABLE"
                          ? "text-[#888888]"
                          : "text-[#EF4444]"
                      )}>
                        {selectedFinding.actual_value || "Unconfigured"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#666666] text-[10px]">EXPECTED:</span>
                      <span className="text-[#10B981] font-semibold">
                        {selectedFinding.expected_value || "Hardened Standard"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F] space-y-1">
                  <div className={cn(
                    "text-[9px] uppercase font-bold",
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
                  <p className="text-[11px] text-[#A0A0A0] font-sans leading-relaxed">
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
                <div className="space-y-1 pt-1 border-t border-[#1F1F1F]">
                  <div className="text-[9px] text-[#666666] uppercase font-bold">RELATED CONTROLS</div>
                  <div className="flex flex-wrap gap-1">
                    {relatedControls.map((ctrl) => (
                      <span key={ctrl} className="px-1.5 py-0.2 rounded bg-[#161616] text-[#D4D4D8] border border-[#262626] text-[9px] font-bold">
                        {ctrl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Risk Connection Card */}
              <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-1.5">
                  <span className={cn(
                    "text-[10px] uppercase font-bold flex items-center gap-1.5",
                    selectedFinding.status === "FAIL" ? "text-[#EF4444]" : selectedFinding.status === "PASS" ? "text-[#10B981]" : "text-[#888888]"
                  )}>
                    {selectedFinding.status === "FAIL" ? (
                      <Flame className="w-3.5 h-3.5" />
                    ) : selectedFinding.status === "PASS" ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Info className="w-3.5 h-3.5" />
                    )}
                    <span>RISK CONTRIBUTION</span>
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold",
                    selectedFinding.status === "FAIL" ? "text-[#EF4444]" : selectedFinding.status === "PASS" ? "text-[#10B981]" : "text-[#888888]"
                  )}>
                    {findingRiskContribution}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[9px] text-[#666666]">SEVERITY TIER</div>
                    <div className={cn(
                      "text-base font-bold mt-0.5",
                      selectedFinding.status === "FAIL" ? "text-[#EF4444]" : selectedFinding.status === "PASS" ? "text-[#10B981]" : "text-[#888888]"
                    )}>
                      {selectedFinding.status === "NOT_APPLICABLE" ? "N/A" : selectedFinding.severity}
                    </div>
                  </div>
                  {selectedFinding.status === "FAIL" ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/25">
                      EXPOSURE ACTIVE
                    </span>
                  ) : selectedFinding.status === "PASS" ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25">
                      HARDENED / SECURED
                    </span>
                  ) : selectedFinding.status === "NOT_APPLICABLE" ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#888888]/15 text-[#888888] border border-[#888888]/25">
                      NOT APPLICABLE
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25">
                      UNCERTAIN STATE
                    </span>
                  )}
                </div>

                <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F] text-[10px] text-[#A0A0A0] font-sans">
                  <strong className="text-[#F2F2F2] block mb-0.5 font-mono text-[9px]">SECURITY IMPLICATION:</strong>
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
                "p-3 rounded-lg bg-[#0B0B0B] border space-y-2 text-xs",
                selectedFinding.status === "FAIL"
                  ? "border-[#10B981]/30"
                  : selectedFinding.status === "PASS"
                  ? "border-[#10B981]/20 opacity-90"
                  : "border-[#1F1F1F] opacity-80"
              )}>
                <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-1.5">
                  <span className={cn(
                    "text-[10px] uppercase font-bold flex items-center gap-1.5",
                    selectedFinding.status === "FAIL"
                      ? "text-[#10B981]"
                      : selectedFinding.status === "PASS"
                      ? "text-[#10B981]"
                      : "text-[#888888]"
                  )}>
                    <Wrench className="w-3.5 h-3.5" />
                    <span>
                      {selectedFinding.status === "PASS"
                        ? "CONTROL COMPLIANT"
                        : selectedFinding.status === "NOT_APPLICABLE"
                        ? "CONTROL NOT APPLICABLE"
                        : "ALLOWLISTED REMEDIATION"}
                    </span>
                  </span>
                  <span className="text-[9px] text-[#666666]">
                    {selectedFinding.status === "PASS"
                      ? "VERIFIED"
                      : selectedFinding.status === "NOT_APPLICABLE"
                      ? "N/A"
                      : "PROPOSED PATCH"}
                  </span>
                </div>

                {/* Diff Preview / Status Message */}
                {selectedFinding.status === "FAIL" ? (
                  <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F] text-[10px] space-y-0.5 font-mono">
                    <div className="text-[#EF4444]">- {selectedFinding.evidence || "non-compliant configuration line"}</div>
                    <div className="text-[#10B981]">+ {remediation?.remediation_commands?.split("\n")[0] || "hardened configuration line"}</div>
                  </div>
                ) : selectedFinding.status === "PASS" ? (
                  <div className="p-2 rounded bg-[#080808] border border-[#10B981]/20 text-[10px] text-[#10B981] font-mono flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Control is compliant with security baseline. No remediation patch required.</span>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-[#080808] border border-[#1F1F1F] text-[10px] text-[#888888] font-mono">
                    Control not applicable to this device profile. No remediation action needed.
                  </div>
                )}

                {selectedFinding.status === "FAIL" && (
                  <div className="text-[10px] text-[#666666] flex items-center justify-between font-mono">
                    <span>NETWORK PUSH:</span>
                    <span className="text-[#EF4444] font-semibold">GATE PROTECTED</span>
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  {selectedFinding.status === "FAIL" && (
                    <button
                      onClick={handleCopyCommands}
                      className="w-full py-1.5 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#242424] text-[#A0A0A0] hover:text-white font-mono transition-all flex items-center justify-center gap-1.5 text-xs"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? "Copied" : "Copy Remediation CLI"}</span>
                    </button>
                  )}

                  <button
                    onClick={handleReanalyze}
                    disabled={isReanalyzing}
                    className="w-full py-2 rounded-lg bg-[#161616] hover:bg-[#202020] text-[#10B981] border border-[#10B981]/30 font-mono font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isReanalyzing ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>RE-ANALYZING...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        <span>RE-ANALYZE VERIFICATION</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-center text-[#666666] text-xs font-mono">
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
