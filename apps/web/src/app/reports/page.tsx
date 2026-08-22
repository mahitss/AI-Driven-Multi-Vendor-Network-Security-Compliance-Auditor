"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import {
  fetchReports,
  fetchReportDetail,
  generateReport,
  fetchAudits,
  ReportDocument,
  AuditItem,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const queryClient = useQueryClient();

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [reportType, setReportType] = useState<string>("EXECUTIVE_AUDIT_SUMMARY");
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");
  const [reportTitle, setReportTitle] = useState<string>("");
  const [reportNotes, setReportNotes] = useState<string>("");

  // Queries
  const { data: reports = [], isLoading: isReportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
  });

  const { data: audits = [] } = useQuery({
    queryKey: ["audits"],
    queryFn: () => fetchAudits(),
  });

  const { data: activeReport, isLoading: isReportDetailLoading } = useQuery({
    queryKey: ["report-detail", selectedReportId],
    queryFn: () => (selectedReportId ? fetchReportDetail(selectedReportId) : null),
    enabled: !!selectedReportId,
  });

  // Mutation
  const generateMutation = useMutation({
    mutationFn: (payload: { report_type: string; audit_id?: string; title?: string; notes?: string }) =>
      generateReport(payload),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setIsGenerateModalOpen(false);
      setSelectedReportId(newReport.id);
    },
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5 font-mono">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span>Compliance & Audit Reports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate and export official multi-framework security assessments, executive compliance audits, and technical remediation plans.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchReports()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-300 hover:text-white text-xs font-mono transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              if (audits.length > 0 && !selectedAuditId) {
                setSelectedAuditId(audits[0].id);
              }
              setIsGenerateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Reports History List */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white uppercase text-[11px]">Audit Report Registry</span>
          <span className="text-[10px] text-slate-500">Total Generated: {reports.length}</span>
        </div>

        {isReportsLoading ? (
          <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading generated reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <div>No official compliance reports generated yet.</div>
            <button
              onClick={() => {
                if (audits.length > 0 && !selectedAuditId) setSelectedAuditId(audits[0].id);
                setIsGenerateModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate First Report</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/5 bg-[#080c14]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/60 text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="p-3">Report Document</th>
                  <th className="p-3">Target Asset</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Compliance Score</th>
                  <th className="p-3">Created Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-white">{rep.title}</div>
                      <div className="text-[10px] text-slate-500">{rep.notes}</div>
                    </td>

                    <td className="p-3 text-cyan-300 font-semibold">{rep.target_device}</td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase">
                        {rep.report_type.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className={cn(
                        "font-bold",
                        rep.compliance_score >= 80 ? "text-emerald-400" :
                        rep.compliance_score >= 60 ? "text-amber-400" : "text-rose-400"
                      )}>
                        {rep.compliance_score.toFixed(0)}%
                      </span>
                    </td>

                    <td className="p-3 text-slate-400 text-[11px]">
                      {new Date(rep.created_at).toLocaleDateString()}
                    </td>

                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedReportId(rep.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold transition-colors"
                      >
                        Inspect Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101c] border border-cyan-500/30 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden font-mono text-xs animate-in fade-in duration-150">
            <div className="p-4 border-b border-white/10 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <FileText className="w-4 h-4" />
                <span>Generate Official Security Audit Report</span>
              </div>
              <button onClick={() => setIsGenerateModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[10px] font-semibold">Report Template Type:</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#060911] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="EXECUTIVE_AUDIT_SUMMARY">Executive Compliance & Risk Summary</option>
                  <option value="DEVICE_COMPLIANCE">Device Compliance Assessment</option>
                  <option value="REMEDIATION_PLAN">Technical Remediation Action Plan</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[10px] font-semibold">Target Audit Session:</label>
                <select
                  value={selectedAuditId}
                  onChange={(e) => setSelectedAuditId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#060911] border border-white/10 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  {audits.map((a) => (
                    <option key={a.id} value={a.id}>
                      Audit {a.id.slice(0, 8)}... (Score: {a.score ?? 0}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[10px] font-semibold">Report Title (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. NTRO Perimeter Router Quarterly Compliance Audit"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#060911] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[10px] font-semibold">Executive Notes & Context:</label>
                <textarea
                  rows={2}
                  placeholder="Official compliance assessment document generated for NTRO network operations review."
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#060911] border border-white/10 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between">
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
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
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5"
              >
                {generateMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Formatted Report Document Preview Modal */}
      {selectedReportId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#0b101c] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-mono text-xs animate-in zoom-in-95 duration-150 print:bg-white print:text-black print:border-none print:shadow-none">
            {/* Document Toolbar */}
            <div className="p-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between sticky top-0 z-20 print:hidden backdrop-blur-md">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <FileText className="w-4 h-4" />
                <span>Executive Report Document Preview</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>

                <button
                  onClick={() => setSelectedReportId(null)}
                  className="p-1.5 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            {isReportDetailLoading || !activeReport ? (
              <div className="py-24 text-center text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Formatting report document...</span>
              </div>
            ) : (
              <div className="p-8 space-y-6 overflow-y-auto print:p-0 print:space-y-4">
                {/* Formal Letterhead */}
                <div className="border-b-2 border-cyan-500/40 pb-6 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-white font-bold text-lg font-mono">
                      <Shield className="w-5 h-5 text-cyan-400" />
                      <span>NETVIGIL • COMPLIANCE AUDIT REPORT</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-sans">
                      SIH26155 — AI-Driven Multi-Vendor Network Security Compliance Auditor
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      National Technical Research Organisation (NTRO)
                    </div>
                  </div>

                  <div className="text-right font-mono text-[11px] text-slate-400">
                    <div>Report ID: <strong className="text-slate-200">{activeReport.id.slice(0, 12)}</strong></div>
                    <div>Generated: <strong className="text-slate-200">{new Date(activeReport.created_at).toLocaleDateString()}</strong></div>
                    <div>Target: <strong className="text-cyan-300">{activeReport.target_device}</strong></div>
                  </div>
                </div>

                {/* Section 1: Executive Summary */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">
                    1. Executive Compliance & Posture Summary
                  </h2>
                  <p className="text-slate-300 text-xs font-sans leading-relaxed">
                    {activeReport.notes} Evaluated using deterministic multi-framework security engines across CIS Benchmarks, NIST SP 800-53, DISA STIG, and ISO/IEC 27001 standards.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded bg-[#060911] border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Overall Compliance</div>
                      <div className="text-xl font-bold text-emerald-400 mt-0.5">
                        {activeReport.compliance_score.toFixed(0)}%
                      </div>
                    </div>

                    <div className="p-3 rounded bg-[#060911] border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Posture Status</div>
                      <div className="text-sm font-bold text-cyan-300 mt-1">
                        {activeReport.sections.executive_summary?.status || "COMPLIANT"}
                      </div>
                    </div>

                    <div className="p-3 rounded bg-[#060911] border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Total Controls</div>
                      <div className="text-xl font-bold text-white mt-0.5">
                        {activeReport.sections.executive_summary?.total_controls_evaluated || 0}
                      </div>
                    </div>

                    <div className="p-3 rounded bg-[#060911] border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Critical Findings</div>
                      <div className="text-xl font-bold text-rose-400 mt-0.5">
                        {activeReport.sections.executive_summary?.critical_findings_count || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Top Prioritized Risks */}
                {activeReport.sections.top_risks && activeReport.sections.top_risks.length > 0 && (
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400">
                      2. Top Prioritized Security Risks
                    </h2>
                    <div className="space-y-2">
                      {activeReport.sections.top_risks.map((rk, idx) => (
                        <div key={idx} className="p-3 rounded bg-[#060911] border border-white/5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-300">{rk.priority} • {rk.title}</span>
                            <span className="text-[10px] text-rose-400 font-bold">Risk Score: {rk.score}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-sans">{rk.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 3: Critical Failed Controls & Evidence */}
                {activeReport.sections.critical_findings && activeReport.sections.critical_findings.length > 0 && (
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider text-amber-400">
                      3. Critical Failed Controls & Grounded Evidence
                    </h2>
                    <div className="space-y-2">
                      {activeReport.sections.critical_findings.map((cf, idx) => (
                        <div key={idx} className="p-3 rounded bg-[#060911] border border-white/5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{cf.framework} • {cf.control_id}: {cf.title}</span>
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-bold">
                              {cf.severity}
                            </span>
                          </div>
                          {cf.evidence && (
                            <pre className="p-2 rounded bg-black/50 text-cyan-300 text-[10px] overflow-x-auto">
                              {cf.evidence}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: Recommended Vendor Remediation Playbook */}
                {activeReport.sections.remediation_action_items && activeReport.sections.remediation_action_items.length > 0 && (
                  <div className="p-5 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider text-emerald-400">
                      4. Vendor-Specific Remediation Action Playbook
                    </h2>
                    <div className="space-y-2">
                      {activeReport.sections.remediation_action_items.map((ra, idx) => (
                        <div key={idx} className="p-3 rounded bg-[#060911] border border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-300 uppercase">{ra.vendor} • {ra.title}</span>
                            <span className="text-[10px] text-slate-500">{ra.control}</span>
                          </div>
                          <pre className="p-2.5 rounded bg-black/60 text-emerald-400 text-[11px] overflow-x-auto select-text leading-relaxed">
                            {ra.commands}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Report Sign-off Footer */}
                <div className="border-t border-white/10 pt-4 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>NetVigil Enterprise Security Intelligence Engine</span>
                  <span>National Technical Research Organisation (NTRO) • Official Document</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
