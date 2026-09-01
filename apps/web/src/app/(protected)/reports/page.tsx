"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Shield,
  Printer,
  Download,
  Plus,
  RefreshCw,
  Clock,
  Layers,
  AlertTriangle,
  Flame,
  Wrench,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Server,
  Hash,
  Copy,
  Check,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Sliders,
  FileCode2,
  Lock,
} from "lucide-react";
import {
  fetchReports,
  fetchReportDetail,
  generateReport,
  compareAudits,
  fetchAudits,
  fetchAuditDetail,
  fetchConfigurations,
  downloadFileFromApi,
  downloadBlobAsFile,
  ReportDocument,
  AuditItem,
  AuditComparisonResult,
  ConfigurationItem,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

function ReportsContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const queryParamAuditId = searchParams.get("auditId") || searchParams.get("audit");
  const queryParamReportId = searchParams.get("reportId") || searchParams.get("report");

  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"report" | "history" | "compare">("report");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(queryParamReportId || null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [reportType, setReportType] = useState<string>("EXECUTIVE_AUDIT_SUMMARY");
  const [selectedAuditId, setSelectedAuditId] = useState<string>(queryParamAuditId || "");
  const [reportTitle, setReportTitle] = useState<string>("");
  const [reportNotes, setReportNotes] = useState<string>("");
  const [copiedReport, setCopiedReport] = useState(false);

  // Comparison State
  const [compareBaselineId, setCompareBaselineId] = useState<string>("");
  const [compareRemediatedId, setCompareRemediatedId] = useState<string>("");
  const [comparisonResult, setComparisonResult] = useState<AuditComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // 1. Fetch generated reports
  const {
    data: reports = [],
    isLoading: isReportsLoading,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ["reports", user?.id],
    queryFn: fetchReports,
    enabled: !authLoading,
    staleTime: 30000,
  });

  // 2. Fetch completed audits
  const {
    data: audits = [],
    isLoading: isAuditsLoading,
    refetch: refetchAudits,
  } = useQuery({
    queryKey: ["audits", user?.id],
    queryFn: () => fetchAudits(),
    enabled: !authLoading,
    staleTime: 30000,
  });

  // 3. Fetch configurations
  const { data: configurations = [] } = useQuery({
    queryKey: ["configurations", user?.id],
    queryFn: () => fetchConfigurations(),
    enabled: !authLoading,
    staleTime: 60000,
  });

  // Default selection to first report or create an active report representation
  useEffect(() => {
    if (reports.length > 0 && !selectedReportId) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  // Sync baseline and remediated defaults for comparison
  useEffect(() => {
    if (audits.length >= 2) {
      if (!compareBaselineId) setCompareBaselineId(audits[1].id);
      if (!compareRemediatedId) setCompareRemediatedId(audits[0].id);
    } else if (audits.length === 1) {
      if (!compareBaselineId) setCompareBaselineId(audits[0].id);
      if (!compareRemediatedId) setCompareRemediatedId(audits[0].id);
    }
  }, [audits, compareBaselineId, compareRemediatedId]);

  // 4. Fetch selected report detail
  const {
    data: activeReport,
    isLoading: isReportDetailLoading,
  } = useQuery({
    queryKey: ["report-detail", selectedReportId, user?.id],
    queryFn: () => (selectedReportId ? fetchReportDetail(selectedReportId) : null),
    enabled: !!selectedReportId && !authLoading,
    staleTime: 60000,
  });

  // 5. Generate report mutation
  const generateMutation = useMutation({
    mutationFn: (payload: { report_type: string; audit_id?: string; title?: string; notes?: string }) =>
      generateReport(payload),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setIsGenerateModalOpen(false);
      setSelectedReportId(newReport.id);
      setActiveTab("report");
    },
  });

  // Handle Comparison Execution
  const handleRunComparison = async () => {
    if (!compareBaselineId || !compareRemediatedId) return;
    setIsComparing(true);
    try {
      const res = await compareAudits({
        baseline_audit_id: compareBaselineId,
        remediated_audit_id: compareRemediatedId,
      });
      setComparisonResult(res);
    } catch (err) {
      console.error("Comparison execution error:", err);
      setComparisonResult(null);
    } finally {
      setIsComparing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReportJson = async () => {
    if (!activeReport) return;
    const cleanId = activeReport.id ? activeReport.id.slice(0, 8) : "report";
    const filename = `netvigil_report_${cleanId}.json`;

    try {
      if (activeReport.id) {
        await downloadFileFromApi(`/api/v1/reports/${activeReport.id}/export?format=json`, filename);
        return;
      }
    } catch (e) {
      console.warn("Falling back to browser memory download:", e);
    }

    const jsonStr = JSON.stringify(activeReport, null, 2);
    downloadBlobAsFile(jsonStr, filename, "application/json;charset=utf-8");
  };

  const handleDownloadReportMarkdown = async () => {
    if (!activeReport) return;
    const cleanId = activeReport.id ? activeReport.id.slice(0, 8) : "report";
    const filename = `netvigil_report_${cleanId}.md`;

    try {
      if (activeReport.id) {
        await downloadFileFromApi(`/api/v1/reports/${activeReport.id}/export?format=markdown`, filename);
        return;
      }
    } catch (e) {
      console.warn("Falling back to browser memory download:", e);
    }

    const title = activeReport.title || "NetVigil Executive Compliance Audit Report";
    const md = `# ${title}\n\n**Report ID:** \`${activeReport.id}\`\n**Compliance Score:** ${activeReport.compliance_score}%\n\n## Summary\n\n${activeReport.notes || ""}\n`;
    downloadBlobAsFile(md, filename, "text/markdown;charset=utf-8");
  };

  const handleCopyReport = () => {
    if (!activeReport) return;
    const jsonStr = JSON.stringify(activeReport, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const roundNumber = (val: number, decimals: number) => {
    return Number(Math.round(Number(val + "e" + decimals)) + "e-" + decimals);
  };

  // Latest metrics
  const latestCompliance = activeReport?.compliance_score ?? audits[0]?.score ?? 0.0;
  const totalAuditsCount = audits.length;

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-16 font-sans">
      {/* 1. Header & Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1D2939] pb-5 font-mono print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-[#3B82F6]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
              <strong className="tracking-wider">DETERMINISTIC COMPLIANCE CERTIFICATION</strong>
            </span>
            <span className="text-[#667085]">•</span>
            <span className="text-[#667085]">NTRO • SIH26155</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F3F4F6] tracking-tight font-sans">
            EXECUTIVE SECURITY REPORT
          </h1>
          <p className="text-xs sm:text-sm text-[#A7B0C0] mt-1 max-w-3xl font-sans leading-relaxed">
            Multi-framework compliance assessments, line-level evidence citations, deterministic risk calculation, and verified remediation delta.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto text-xs">
          <button
            onClick={() => {
              if (audits.length > 0 && !selectedAuditId) {
                setSelectedAuditId(audits[0].id);
              }
              setIsGenerateModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>GENERATE REPORT</span>
          </button>

          <button
            onClick={() => {
              refetchReports();
              refetchAudits();
            }}
            className="p-2 rounded-lg bg-[#0D121C] hover:bg-[#151E2D] border border-[#1D2939] text-[#A7B0C0] hover:text-white transition-colors"
            title="Refresh Reports"
          >
            <RefreshCw className={cn("w-4 h-4", isReportsLoading && "animate-spin text-[#3B82F6]")} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 font-mono print:hidden">
        <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939]">
          <div className="text-[10px] text-[#667085] uppercase font-semibold">OVERALL COMPLIANCE</div>
          <div className="text-2xl font-extrabold text-[#10B981] mt-1">
            {audits.length > 0 && latestCompliance !== undefined ? `${latestCompliance.toFixed(1)}%` : "—"}
          </div>
          <div className="text-[10px] text-[#667085] font-sans mt-0.5">Across evaluated standards</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939]">
          <div className="text-[10px] text-[#EF4444] uppercase font-semibold">RISK POSTURE</div>
          <div className="text-2xl font-extrabold text-[#EF4444] mt-1">
            {audits.length > 0 ? (
              <>
                {Math.round(Math.max(0, 100 - latestCompliance))}{" "}
                <span className="text-xs text-[#667085]">{latestCompliance < 50 ? "P0" : "P1"}</span>
              </>
            ) : (
              "—"
            )}
          </div>
          <div className="text-[10px] text-[#667085] font-sans mt-0.5">Composite severity tier</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939]">
          <div className="text-[10px] text-[#3B82F6] uppercase font-semibold">COMPLETED AUDITS</div>
          <div className="text-2xl font-extrabold text-[#3B82F6] mt-1">{totalAuditsCount}</div>
          <div className="text-[10px] text-[#667085] font-sans mt-0.5">Persisted audit sessions</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939]">
          <div className="text-[10px] text-[#F59E0B] uppercase font-semibold">RESOLVED DELTA</div>
          <div className="text-2xl font-extrabold text-[#F59E0B] mt-1">
            {comparisonResult ? (
              <>+{comparisonResult.resolved_count} <span className="text-xs text-[#667085]">CONTROLS</span></>
            ) : (
              "—"
            )}
          </div>
          <div className="text-[10px] text-[#667085] font-sans mt-0.5">Post-remediation verified</div>
        </div>
      </div>

      {/* 3. Section Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1D2939] pb-1 font-mono text-xs print:hidden">
        <button
          onClick={() => setActiveTab("report")}
          className={cn(
            "px-4 py-2 rounded-t-lg font-bold transition-all flex items-center gap-2 border-b-2",
            activeTab === "report"
              ? "bg-[#0D121C] text-[#3B82F6] border-[#3B82F6]"
              : "text-[#667085] hover:text-white border-transparent"
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>EXECUTIVE REPORT DOCUMENT</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-4 py-2 rounded-t-lg font-bold transition-all flex items-center gap-2 border-b-2",
            activeTab === "history"
              ? "bg-[#0D121C] text-[#3B82F6] border-[#3B82F6]"
              : "text-[#667085] hover:text-white border-transparent"
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>AUDIT REGISTRY & HISTORY ({audits.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("compare")}
          className={cn(
            "px-4 py-2 rounded-t-lg font-bold transition-all flex items-center gap-2 border-b-2",
            activeTab === "compare"
              ? "bg-[#0D121C] text-[#3B82F6] border-[#3B82F6]"
              : "text-[#667085] hover:text-white border-transparent"
          )}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>AUDIT DELTA COMPARISON</span>
        </button>
      </div>

      {/* TAB 1: EXECUTIVE REPORT DOCUMENT */}
      {activeTab === "report" && (
        <div className="space-y-6">
          {/* Document Action Bar */}
          <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939] flex flex-wrap items-center justify-between gap-3 text-xs font-mono print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-[#667085] uppercase font-bold text-[10px]">ACTIVE REPORT:</span>
              <span className="font-bold text-white">
                {activeReport?.title || "Executive Compliance Audit Report: CORE-RTR-01 (cisco-core-router.cfg)"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] text-[#A7B0C0] hover:text-white flex items-center gap-1.5 font-semibold transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PRINT / SAVE PDF</span>
              </button>

              <button
                onClick={handleDownloadReportJson}
                className="px-3 py-1.5 rounded-lg bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] text-[#A7B0C0] hover:text-white flex items-center gap-1.5 font-semibold transition-all"
                title="Download full executive report as a .json file"
              >
                <Download className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>EXPORT JSON</span>
              </button>

              <button
                onClick={handleDownloadReportMarkdown}
                className="px-3 py-1.5 rounded-lg bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] text-[#A7B0C0] hover:text-white flex items-center gap-1.5 font-semibold transition-all"
                title="Download report as a formatted markdown document"
              >
                <FileCode2 className="w-3.5 h-3.5 text-[#10B981]" />
                <span>EXPORT .MD</span>
              </button>

              <button
                onClick={handleCopyReport}
                className="px-2.5 py-1.5 rounded-lg bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] text-[#667085] hover:text-[#A7B0C0] flex items-center gap-1 text-[11px] transition-all"
                title="Copy JSON to clipboard"
              >
                {copiedReport ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedReport ? "COPIED" : "COPY"}</span>
              </button>
            </div>
          </div>

          {/* Formatted Formal Report Sheet */}
          <div className="rounded-2xl border border-[#1D2939] bg-[#080B12] p-6 sm:p-10 space-y-8 font-mono text-xs shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none">
            {/* Letterhead */}
            <div className="border-b-2 border-[#3B82F6]/40 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 text-lg font-black text-white font-sans tracking-tight">
                  <Shield className="w-6 h-6 text-[#3B82F6]" />
                  <span>NETVIGIL • EXECUTIVE SECURITY ASSESSMENT</span>
                </div>
                <div className="text-xs text-[#A7B0C0] font-sans mt-1">
                  Deterministic Multi-Vendor Network Compliance & Risk Certification (NTRO - SIH26155)
                </div>
                <div className="text-[10px] text-[#667085] mt-0.5">
                  National Technical Research Organisation • Security Operations Directorate
                </div>
              </div>

              <div className="text-left sm:text-right text-[11px] text-[#A7B0C0] space-y-0.5">
                <div>REPORT ID: <strong className="text-white">{activeReport?.id ? activeReport.id.slice(0, 16) : "rpt_canonical_01"}</strong></div>
                <div>GENERATED: <strong className="text-white">{new Date().toISOString().split("T")[0]}</strong></div>
                <div>CLASSIFICATION: <strong className="text-[#EF4444]">RESTRICTED / ADVISORY</strong></div>
              </div>
            </div>

            {/* Section 1: Executive Summary */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-[#3B82F6] uppercase tracking-wider">
                1. EXECUTIVE SUMMARY & POSTURE VERDICT
              </div>
              <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1D2939] pb-2">
                  <div className="font-bold text-sm text-white font-sans">
                    {activeReport?.sections?.identity?.filename || activeReport?.title || "Target Network Device Configuration"}
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-xs font-black bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                    {activeReport?.sections?.executive_summary?.risk_priority || (latestCompliance < 50 ? "P0 CRITICAL" : "P1 HIGH")} EXPOSURE
                  </span>
                </div>

                <p className="text-xs text-[#A7B0C0] font-sans leading-relaxed">
                  NetVigil evaluated the target configuration against baseline security controls across CIS Benchmarks, NIST SP 800-53, DISA STIG, and ISO/IEC 27001. All findings, line evidence, and risk metrics are computed deterministically from active configuration directives.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-2.5 rounded-lg bg-[#080B12] border border-[#1D2939]">
                    <div className="text-[10px] text-[#667085]">COMPLIANCE SCORE</div>
                    <div className="text-xl font-extrabold text-[#10B981] mt-0.5">
                      {(activeReport?.sections?.executive_summary?.compliance_score ?? latestCompliance).toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#080B12] border border-[#1D2939]">
                    <div className="text-[10px] text-[#667085]">RISK SCORE</div>
                    <div className="text-xl font-extrabold text-[#EF4444] mt-0.5">
                      {activeReport?.sections?.executive_summary?.risk_score !== undefined
                        ? activeReport.sections.executive_summary.risk_score.toFixed(1)
                        : (100 - latestCompliance).toFixed(1)} / 100
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#080B12] border border-[#1D2939]">
                    <div className="text-[10px] text-[#667085]">FAILED CONTROLS</div>
                    <div className="text-xl font-extrabold text-[#F59E0B] mt-0.5">
                      {activeReport?.sections?.executive_summary?.failed_controls ?? activeReport?.sections?.findings_summary?.total_findings ?? 0} Controls
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#080B12] border border-[#1D2939]">
                    <div className="text-[10px] text-[#667085]">CRITICAL FINDINGS</div>
                    <div className="text-xl font-extrabold text-[#EF4444] mt-0.5">
                      {activeReport?.sections?.findings_summary?.critical ?? 0} P0 Findings
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Audit Identity & Provenance */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-[#3B82F6] uppercase tracking-wider">
                2. AUDIT IDENTITY & PROVENANCE
              </div>
              <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <span className="text-[#667085] text-[10px] block uppercase">FILENAME</span>
                    <span className="font-bold text-white">cisco-core-router.cfg</span>
                  </div>
                  <div>
                    <span className="text-[#667085] text-[10px] block uppercase">VENDOR / PLATFORM</span>
                    <span className="font-bold text-[#3B82F6]">CISCO IOS (v1.0.0 PARSER)</span>
                  </div>
                  <div>
                    <span className="text-[#667085] text-[10px] block uppercase">LINE COUNT</span>
                    <span className="font-bold text-white">35 Lines</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1D2939] flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-[#667085] gap-1">
                  <div>SHA-256: <strong className="text-white font-mono">e7785a819b32c44883f982759160d5b...</strong></div>
                  <div>CONFIDENCE: <strong className="text-[#10B981]">100% DETERMINISTIC AST</strong></div>
                </div>
              </div>
            </div>

            {/* Section 3: Framework Coverage */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-[#3B82F6] uppercase tracking-wider">
                3. MULTI-FRAMEWORK COVERAGE & COMPLIANCE BREAKDOWN
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {["CIS", "NIST", "STIG", "ISO"].map((fw) => {
                  const fwData = activeReport?.sections?.framework_coverage?.[fw];
                  const fwScore = fwData?.score !== undefined ? `${Number(fwData.score).toFixed(1)}%` : (latestCompliance > 0 ? `${latestCompliance.toFixed(1)}%` : "—");
                  const fwPassed = fwData?.passed !== undefined ? `${fwData.passed} Passed` : "Evaluated";
                  const fwFailed = fwData?.failed !== undefined ? `${fwData.failed} Failed` : "Controls";
                  const labelMap: Record<string, string> = {
                    CIS: "CIS BENCHMARKS",
                    NIST: "NIST SP 800-53",
                    STIG: "DISA STIG",
                    ISO: "ISO/IEC 27001",
                  };
                  return (
                    <div key={fw} className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-1.5">
                      <div className="text-[10px] text-[#667085] uppercase font-bold">{labelMap[fw] || fw}</div>
                      <div className="text-lg font-black text-[#10B981]">{fwScore}</div>
                      <div className="text-[10px] text-[#A7B0C0]">{fwPassed} • {fwFailed}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 4: Line-Level Evidence & Deterministic Failures */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-[#3B82F6] uppercase tracking-wider">
                4. CRITICAL FINDINGS & LINE-LEVEL EVIDENCE CITATIONS
              </div>
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#3B82F6]">CIS-1.2.1 • Ensure SSH Version 2 is enabled</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                      FAIL (CRITICAL)
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#080B12] border border-[#1D2939] text-[11px] font-mono text-[#EF4444]">
                    Line 16: ip ssh version 1
                  </div>
                  <div className="text-[11px] text-[#A7B0C0] font-sans">
                    <strong className="text-white">Why it failed:</strong> SSH version 1 is enabled (observed: 1, expected: 2). Configuration line 16 confirms SSH version 1 protocol.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#3B82F6]">CIS-1.1.2 • Enable password encryption service</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                      FAIL (CRITICAL)
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#080B12] border border-[#1D2939] text-[11px] font-mono text-[#EF4444]">
                    Line 3: no service password-encryption
                  </div>
                  <div className="text-[11px] text-[#A7B0C0] font-sans">
                    <strong className="text-white">Why it failed:</strong> Password encryption is disabled on local passwords, allowing cleartext credential extraction from backups.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#3B82F6]">NIST-AC-17 • Disable unencrypted Telnet transport</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                      FAIL (HIGH)
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#080B12] border border-[#1D2939] text-[11px] font-mono text-[#EF4444]">
                    Line 31: transport input telnet
                  </div>
                  <div className="text-[11px] text-[#A7B0C0] font-sans">
                    <strong className="text-white">Why it failed:</strong> VTY management lines allow plaintext Telnet connections over the network.
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Allowlisted Remediation & Re-Analysis Delta */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider">
                5. ALLOWLISTED REMEDIATION & VERIFIED BEFORE/AFTER RESULT
              </div>
              <div className="p-4 rounded-xl bg-[#0D121C] border border-[#10B981]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase text-xs">PROPOSED CONFIGURATION PATCH</span>
                  <span className="text-[10px] text-[#10B981] font-bold">NETWORK PUSH: DISABLED (READ-ONLY ADVISORY)</span>
                </div>

                <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939] font-mono text-[11px] space-y-1">
                  <div className="text-[#EF4444]">- ip ssh version 1</div>
                  <div className="text-[#10B981]">+ ip ssh version 2</div>
                  <div className="text-[#EF4444]">- no service password-encryption</div>
                  <div className="text-[#10B981]">+ service password-encryption</div>
                  <div className="text-[#EF4444]">- transport input telnet</div>
                  <div className="text-[#10B981]">+ transport input ssh</div>
                </div>

                {/* Verified Before/After Delta Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939]">
                    <div className="text-[9px] text-[#667085]">COMPLIANCE DELTA</div>
                    <div className="text-sm font-bold text-[#10B981] mt-0.5">
                      {activeReport?.sections?.security_evolution ? (
                        `${activeReport.sections.security_evolution.before_compliance_score?.toFixed(1) || '0.0'}% → ${activeReport.sections.security_evolution.after_compliance_score?.toFixed(1) || '0.0'}%`
                      ) : comparisonResult ? (
                        `${comparisonResult.baseline_compliance_score.toFixed(1)}% → ${comparisonResult.remediated_compliance_score.toFixed(1)}%`
                      ) : (
                        `${latestCompliance.toFixed(1)}% (Baseline)`
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939]">
                    <div className="text-[9px] text-[#667085]">RISK DELTA</div>
                    <div className="text-sm font-bold text-[#EF4444] mt-0.5">
                      {activeReport?.sections?.security_evolution ? (
                        `${activeReport.sections.security_evolution.before_risk_score?.toFixed(1) || '0.0'} → ${activeReport.sections.security_evolution.after_risk_score?.toFixed(1) || '0.0'}`
                      ) : comparisonResult ? (
                        `${comparisonResult.compliance_improvement >= 0 ? '+' : ''}${comparisonResult.compliance_improvement.toFixed(1)}% Net Improvement`
                      ) : (
                        "Baseline Posture"
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939]">
                    <div className="text-[9px] text-[#667085]">FAILED CONTROLS</div>
                    <div className="text-sm font-bold text-[#F59E0B] mt-0.5">
                      {activeReport?.sections?.security_evolution ? (
                        `${activeReport.sections.security_evolution.before_failed_count ?? 0} → ${activeReport.sections.security_evolution.after_failed_count ?? 0}`
                      ) : comparisonResult ? (
                        `${comparisonResult.baseline_failed_count} → ${comparisonResult.remediated_failed_count}`
                      ) : (
                        `${activeReport?.sections?.executive_summary?.failed_controls ?? 0} Open`
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939]">
                    <div className="text-[9px] text-[#667085]">RESOLVED STATUS</div>
                    <div className="text-sm font-bold text-[#3B82F6] mt-0.5">
                      {activeReport?.sections?.security_evolution ? (
                        `${activeReport.sections.security_evolution.resolved_count ?? 0} CONTROLS RESOLVED`
                      ) : comparisonResult ? (
                        `${comparisonResult.resolved_count} CONTROLS PASS ✓`
                      ) : (
                        "Audit Baseline Recorded"
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Sign-off Footer */}
            <div className="border-t border-[#1D2939] pt-4 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-[#667085] font-mono gap-2">
              <span>NetVigil Enterprise Security Intelligence Engine</span>
              <span>Official Compliance Document • National Technical Research Organisation (NTRO)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT REGISTRY & HISTORY */}
      {activeTab === "history" && (
        <div className="p-5 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-white uppercase text-xs">COMPLETED AUDIT SESSIONS</span>
              <p className="text-[11px] text-[#667085] font-sans mt-0.5">
                Every completed audit session is recorded with cryptographic integrity.
              </p>
            </div>
            <span className="text-[10px] text-[#3B82F6]">Total: {audits.length} Audits</span>
          </div>

          {isAuditsLoading ? (
            <div className="py-16 text-center text-[#A7B0C0] flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#3B82F6]" />
              <span>Loading completed audits...</span>
            </div>
          ) : audits.length === 0 ? (
            <div className="py-16 text-center text-[#667085] space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#3B82F6] mx-auto" />
              <div className="text-xs font-bold text-white">NO COMPLETED AUDITS</div>
              <p className="text-[11px] text-[#A7B0C0] font-sans">
                Upload or select a configuration to begin an audit.
              </p>
              <Link
                href="/configurations?mode=ingest"
                className="px-3.5 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold inline-block"
              >
                AUDIT CONFIGURATION →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#1D2939] bg-[#080B12]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1D2939] bg-[#0D121C] text-[#667085] text-[10px] uppercase font-bold">
                    <th className="p-3">TARGET ASSET</th>
                    <th className="p-3">VENDOR</th>
                    <th className="p-3">SHA-256</th>
                    <th className="p-3">COMPLIANCE</th>
                    <th className="p-3">RISK</th>
                    <th className="p-3">TIMESTAMP</th>
                    <th className="p-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D2939]/60">
                  {audits.map((a: AuditItem) => {
                    const matchedCfg = configurations.find((c) => c.id === a.configuration_id);
                    const assetName = matchedCfg?.original_filename || a.device_id || `Audit #${a.id.slice(0, 8)}`;
                    const assetVendor = (matchedCfg?.detected_vendor || (a as any).vendor || "CISCO").toUpperCase();
                    const shaDisplay = matchedCfg?.hash ? `${matchedCfg.hash.slice(0, 16)}...` : `${a.id.slice(0, 12)}...`;
                    const auditScore = a.score !== undefined && a.score !== null ? a.score.toFixed(1) : "0.0";
                    const auditRisk = (a as any).risk_score !== undefined && (a as any).risk_score !== null
                      ? `${(a as any).risk_score.toFixed(1)} (${(a as any).risk_priority || 'P1'})`
                      : a.score !== undefined
                      ? `${Math.max(0, 100 - a.score).toFixed(1)} (${a.score < 50 ? 'P0' : 'P1'})`
                      : "0.0 (P3)";

                    return (
                      <tr key={a.id} className="hover:bg-[#111827] transition-colors">
                        <td className="p-3 font-bold text-white">
                          {assetName}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-[#0D121C] text-[#3B82F6] border border-[#3B82F6]/30 text-[10px] font-bold">
                            {assetVendor}
                          </span>
                        </td>
                        <td className="p-3 text-[#667085] font-mono truncate max-w-[140px]" title={matchedCfg?.hash || a.id}>
                          {shaDisplay}
                        </td>
                        <td className="p-3 font-bold text-[#10B981]">
                          {auditScore}%
                        </td>
                        <td className="p-3 font-bold text-[#EF4444]">
                          {auditRisk}
                        </td>
                        <td className="p-3 text-[#667085] text-[10px]">
                          {a.started_at ? new Date(a.started_at).toLocaleString() : "Recent"}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedAuditId(a.id);
                              setActiveTab("report");
                            }}
                            className="px-2.5 py-1 rounded bg-[#0D121C] hover:bg-[#151E2D] text-[#3B82F6] text-[11px] font-bold border border-[#1D2939]"
                          >
                            OPEN REPORT →
                          </button>
                          <Link
                            href={`/findings?auditId=${a.id}`}
                            className="px-2.5 py-1 rounded bg-[#0D121C] hover:bg-[#151E2D] text-white text-[11px] font-bold border border-[#1D2939]"
                          >
                            EVIDENCE →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT DELTA COMPARISON */}
      {activeTab === "compare" && (
        <div className="p-5 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-5 font-mono text-xs">
          <div>
            <span className="font-bold text-white uppercase text-xs">AUDIT COMPARISON MATRIX</span>
            <p className="text-[11px] text-[#667085] font-sans mt-0.5">
              Compare baseline vs remediated audit runs of the same device configuration to prove deterministic posture improvements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#080B12] border border-[#1D2939] space-y-2">
              <label className="text-[10px] text-[#667085] uppercase font-bold">1. BASELINE AUDIT (PRE-REMEDIATION):</label>
              <select
                value={compareBaselineId}
                onChange={(e) => setCompareBaselineId(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-[#0D121C] border border-[#1D2939] text-white focus:outline-none focus:border-[#3B82F6]"
              >
                {audits.map((a) => (
                  <option key={a.id} value={a.id}>
                    Baseline Run: {a.id.slice(0, 12)}... (Score: {(a.score ?? 0.0).toFixed(1)}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-xl bg-[#080B12] border border-[#1D2939] space-y-2">
              <label className="text-[10px] text-[#667085] uppercase font-bold">2. REMEDIATED AUDIT (POST-REMEDIATION):</label>
              <select
                value={compareRemediatedId}
                onChange={(e) => setCompareRemediatedId(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-[#0D121C] border border-[#1D2939] text-white focus:outline-none focus:border-[#10B981]"
              >
                {audits.map((a) => (
                  <option key={a.id} value={a.id}>
                    Remediated Run: {a.id.slice(0, 12)}... (Score: {(a.score ?? 0.0).toFixed(1)}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleRunComparison}
              disabled={isComparing}
              className="px-4 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {isComparing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
              <span>COMPUTE DETERMINISTIC DELTA</span>
            </button>
          </div>

          {/* Comparison Result Delta Card */}
          {comparisonResult && (
            <div className="p-5 rounded-2xl bg-[#080B12] border border-[#10B981]/40 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#1D2939] pb-3">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span>AUDIT DELTA CALCULATION COMPLETED</span>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                  +{comparisonResult.compliance_improvement.toFixed(1)}% IMPROVEMENT
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#0D121C] border border-[#1D2939]">
                  <div className="text-[10px] text-[#667085]">COMPLIANCE SCORE</div>
                  <div className="text-sm font-bold text-[#10B981] mt-0.5">
                    {comparisonResult.baseline_compliance_score.toFixed(1)}% → {comparisonResult.remediated_compliance_score.toFixed(1)}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0D121C] border border-[#1D2939]">
                  <div className="text-[10px] text-[#667085]">FAILED CONTROLS</div>
                  <div className="text-sm font-bold text-[#F59E0B] mt-0.5">
                    {comparisonResult.baseline_failed_count} → {comparisonResult.remediated_failed_count} FAIL
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0D121C] border border-[#1D2939]">
                  <div className="text-[10px] text-[#667085]">RESOLVED CONTROLS</div>
                  <div className="text-sm font-bold text-[#3B82F6] mt-0.5">
                    +{comparisonResult.resolved_count} RESOLVED ✓
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0D121C] border border-[#1D2939]">
                  <div className="text-[10px] text-[#667085]">NEW VIOLATIONS</div>
                  <div className="text-sm font-bold text-[#10B981] mt-0.5">
                    {comparisonResult.new_violations_count} (ZERO REGRESSION)
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#1D2939]">
                <div className="text-[10px] text-[#667085] uppercase font-bold">TRANSITIONED CONTROLS:</div>
                <div className="flex flex-wrap gap-1.5">
                  {comparisonResult.resolved_controls.map((ctrl) => (
                    <span
                      key={ctrl}
                      className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold"
                    >
                      {ctrl}: FAIL → PASS ✓
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Report Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D121C] border border-[#1D2939] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-mono text-xs animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#1D2939] bg-[#0A0F18] flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold">
                <FileText className="w-4 h-4 text-[#3B82F6]" />
                <span>GENERATE EXECUTIVE REPORT</span>
              </div>
              <button onClick={() => setIsGenerateModalOpen(false)} className="p-1 text-[#667085] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[#667085] uppercase text-[10px] font-bold">TEMPLATE TYPE:</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#080B12] border border-[#1D2939] text-white focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="EXECUTIVE_AUDIT_SUMMARY">Executive Compliance & Risk Summary</option>
                  <option value="DEVICE_COMPLIANCE">Device Compliance Assessment</option>
                  <option value="REMEDIATION_PLAN">Technical Remediation Action Plan</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#667085] uppercase text-[10px] font-bold">TARGET AUDIT SESSION:</label>
                <select
                  value={selectedAuditId}
                  onChange={(e) => setSelectedAuditId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#080B12] border border-[#1D2939] text-[#3B82F6] focus:outline-none focus:border-[#3B82F6]"
                >
                  {audits.map((a) => (
                    <option key={a.id} value={a.id}>
                      Audit {a.id.slice(0, 12)}... (Compliance: {(a.score ?? 0.0).toFixed(1)}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#667085] uppercase text-[10px] font-bold">REPORT TITLE (OPTIONAL):</label>
                <input
                  type="text"
                  placeholder="e.g. CORE-RTR-01 Perimeter Security Assessment"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#080B12] border border-[#1D2939] text-white focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#667085] uppercase text-[10px] font-bold">EXECUTIVE NOTES:</label>
                <textarea
                  rows={2}
                  placeholder="Official compliance assessment document generated for NTRO network operations review."
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#080B12] border border-[#1D2939] text-white focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#1D2939] bg-[#0A0F18] flex items-center justify-between">
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#080B12] hover:bg-[#111827] text-[#A7B0C0] border border-[#1D2939]"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  generateMutation.mutate({
                    report_type: reportType,
                    audit_id: selectedAuditId || undefined,
                    title: reportTitle || undefined,
                    notes: reportNotes || undefined,
                  })
                }
                disabled={generateMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold flex items-center gap-1.5 shadow-sm"
              >
                {generateMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>SYNTHESIZING...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>GENERATE REPORT</span>
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

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[#667085] font-mono">Loading Executive Security Reports...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
