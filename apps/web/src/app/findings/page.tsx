"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
  FileCode,
  ArrowRight,
  BookOpen,
  Wrench,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  fetchFindings,
  fetchFindingExplanation,
  fetchFindingRemediation,
  fetchAudits,
  Finding,
  FindingExplanation,
  RemediationProposal,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function FindingsPage() {
  const [selectedFramework, setSelectedFramework] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [explanation, setExplanation] = useState<FindingExplanation | null>(null);
  const [remediation, setRemediation] = useState<RemediationProposal | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const {
    data: findings = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["all-findings", selectedFramework, selectedSeverity, selectedStatus],
    queryFn: () =>
      fetchFindings({
        framework: selectedFramework === "ALL" ? undefined : selectedFramework,
        severity: selectedSeverity === "ALL" ? undefined : selectedSeverity,
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
      }),
  });

  const handleInspectFinding = async (finding: Finding) => {
    setSelectedFinding(finding);
    setExplanation(null);
    setRemediation(null);

    // Fetch remediation if available
    try {
      const rem = await fetchFindingRemediation(finding.id);
      setRemediation(rem);
    } catch {
      // Remediation may not exist for every finding
    }
  };

  const handleRequestAIExplanation = async (finding: Finding) => {
    setIsExplaining(true);
    try {
      const exp = await fetchFindingExplanation(finding.id);
      setExplanation(exp);
    } catch (err) {
      console.error("Failed to explain finding:", err);
    } finally {
      setIsExplaining(false);
    }
  };

  const filteredFindings = findings.filter((f) => {
    const matchesSearch =
      searchQuery === "" ||
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.control_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.category && f.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.evidence && f.evidence.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2.5 font-mono">
            <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
            <span>Evidence-Based Security Findings</span>
          </h1>
          <p className="text-xs text-[#8A8A8A] mt-1">
            Deterministic compliance violation proof with verbatim line evidence across CIS, NIST, DISA STIG, and ISO controls.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] text-[#8A8A8A] hover:text-[#F5F5F5] hover:border-[#242424] text-xs font-mono transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Framework Filter */}
          <div className="flex flex-wrap items-center gap-1 bg-[#0D0D0D] border border-[#1A1A1A] p-1 rounded-md">
            {["ALL", "CIS", "NIST", "STIG", "ISO"].map((fw) => (
              <button
                key={fw}
                onClick={() => setSelectedFramework(fw)}
                className={cn(
                  "px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors",
                  selectedFramework === fw
                    ? "bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/30"
                    : "text-[#8A8A8A] hover:text-[#F5F5F5]"
                )}
              >
                {fw}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <div className="flex flex-wrap items-center gap-1 bg-[#0D0D0D] border border-[#1A1A1A] p-1 rounded-md">
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-semibold uppercase transition-colors",
                  selectedSeverity === sev
                    ? "bg-[#141414] text-[#F5F5F5] border border-[#242424]"
                    : "text-[#8A8A8A] hover:text-[#F5F5F5]"
                )}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-1 bg-[#0D0D0D] border border-[#1A1A1A] p-1 rounded-md">
            {["ALL", "FAIL", "PASS", "UNKNOWN"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors",
                  selectedStatus === st
                    ? "bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/30"
                    : "text-[#8A8A8A] hover:text-[#F5F5F5]"
                )}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#555555] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search control, title, or evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-md bg-[#0D0D0D] border border-[#1A1A1A] text-xs text-[#F5F5F5] placeholder-[#555555] focus:outline-none focus:border-[#00D9FF]/50 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="text-[10px] text-[#666666] flex items-center justify-between pt-1">
          <span>Showing {filteredFindings.length} findings</span>
          <span>Deterministic AST Grounding</span>
        </div>
      </div>

      {/* Findings Table / States */}
      {isError ? (
        <div className="p-8 rounded-xl bg-[#0A0A0A] border border-[#EF4444]/30 text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mx-auto">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">DATA SOURCE UNAVAILABLE</div>
            <div className="text-[11px] text-[#EF4444] mt-1">
              {error instanceof Error ? error.message : "Failed to retrieve findings from backend API."}
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0D0D0D] hover:bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/40 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Request</span>
          </button>
        </div>
      ) : isLoading ? (
        <div className="py-16 text-center text-[#8A8A8A] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#00D9FF]" />
          <span>Loading security findings...</span>
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="py-16 text-center text-[#666666] space-y-3">
          <div>No findings match the selected criteria.</div>
          <button
            onClick={() => {
              setSelectedFramework("ALL");
              setSelectedSeverity("ALL");
              setSelectedStatus("ALL");
              setSearchQuery("");
            }}
            className="inline-block px-3 py-1 rounded bg-[#0E0E0E] text-[#00D9FF] border border-[#00D9FF]/30 text-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#1A1A1A] bg-[#050505]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1A1A1A] bg-[#0A0A0A] text-[#8A8A8A] text-[10px] uppercase font-semibold">
                <th className="p-3">Control ID</th>
                <th className="p-3">Framework</th>
                <th className="p-3">Finding Title</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Status</th>
                <th className="p-3">Line Evidence</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {filteredFindings.map((finding) => (
                <tr key={finding.id} className="hover:bg-[#0E0E0E] transition-colors">
                  <td className="p-3">
                    <span className="font-bold text-[#00D9FF]">{finding.control_id}</span>
                  </td>

                  <td className="p-3">
                    <span className="px-1.5 py-0.5 rounded bg-[#0E0E0E] text-[#D4D4D4] text-[10px] uppercase font-semibold border border-[#1A1A1A]">
                      {finding.framework}
                    </span>
                  </td>

                  <td className="p-3">
                    <div className="font-medium text-[#F5F5F5] line-clamp-1">{finding.title}</div>
                    {finding.category && (
                      <div className="text-[10px] text-[#666666]">{finding.category}</div>
                    )}
                  </td>

                  <td className="p-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold border",
                      finding.severity === "CRITICAL" && "bg-[#141414] text-[#EF4444] border-[#EF4444]/40",
                      finding.severity === "HIGH" && "bg-[#141414] text-[#F59E0B] border-[#F59E0B]/40",
                      finding.severity === "MEDIUM" && "bg-[#141414] text-[#00D9FF] border-[#00D9FF]/40",
                      finding.severity === "LOW" && "bg-[#141414] text-[#8A8A8A] border-[#8A8A8A]/40",
                      finding.severity === "INFO" && "bg-[#0E0E0E] text-[#666666] border-[#1A1A1A]"
                    )}>
                      {finding.severity}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold border",
                      finding.status === "PASS" && "bg-[#141414] text-[#22C55E] border-[#22C55E]/30",
                      finding.status === "FAIL" && "bg-[#141414] text-[#EF4444] border-[#EF4444]/30",
                      finding.status === "PARTIAL" && "bg-[#141414] text-[#F59E0B] border-[#F59E0B]/30",
                      finding.status === "UNKNOWN" && "bg-[#0E0E0E] text-[#8A8A8A] border-[#1A1A1A]"
                    )}>
                      {finding.status}
                    </span>
                  </td>

                  <td className="p-3">
                    {finding.evidence ? (
                      <code className="text-[11px] text-[#00D9FF] bg-[#0E0E0E] px-1.5 py-0.5 rounded border border-[#1A1A1A] max-w-[200px] truncate block">
                        {finding.evidence}
                      </code>
                    ) : (
                      <span className="text-[#555555] text-[10px]">Baseline Default</span>
                    )}
                  </td>

                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleInspectFinding(finding)}
                      className="px-2.5 py-1 rounded bg-[#0E0E0E] hover:bg-[#141414] text-[#00D9FF] border border-[#1A1A1A] hover:border-[#00D9FF]/40 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Finding Inspector Drawer */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-end animate-in fade-in duration-150">
          <div className="bg-[#0A0A0A] border-l border-[#1A1A1A] w-full max-w-xl h-full shadow-2xl overflow-y-auto flex flex-col font-mono text-xs">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#1A1A1A] bg-[#0E0E0E] flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2 text-[#00D9FF] font-bold">
                <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                <span>Finding Evidence Inspector</span>
              </div>
              <button onClick={() => setSelectedFinding(null)} className="p-1 text-[#666666] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-5 space-y-5 flex-1">
              {/* Finding Title & Meta */}
              <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#1A1A1A] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#00D9FF]">{selectedFinding.control_id}</span>
                  <span className="px-2 py-0.5 rounded bg-[#141414] text-[#F5F5F5] border border-[#242424] uppercase text-[10px] font-bold">
                    {selectedFinding.framework}
                  </span>
                </div>

                <h2 className="text-sm font-bold text-[#F5F5F5]">{selectedFinding.title}</h2>
                {selectedFinding.description && (
                  <p className="text-[11px] text-[#8A8A8A] font-sans leading-relaxed">
                    {selectedFinding.description}
                  </p>
                )}
              </div>

              {/* Status & Severity Bar */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-[#050505] border border-[#1A1A1A]">
                  <div className="text-[10px] text-[#666666] uppercase">Evaluation Status</div>
                  <div className={cn(
                    "text-sm font-bold mt-0.5",
                    selectedFinding.status === "PASS" ? "text-[#22C55E]" : "text-[#EF4444]"
                  )}>
                    {selectedFinding.status}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#050505] border border-[#1A1A1A]">
                  <div className="text-[10px] text-[#666666] uppercase">Severity Level</div>
                  <div className="text-sm font-bold text-[#F59E0B] mt-0.5">
                    {selectedFinding.severity}
                  </div>
                </div>
              </div>

              {/* Verbatim Evidence */}
              <div className="p-4 rounded-xl bg-[#050505] border border-[#00D9FF]/30 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-[#00D9FF] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>VERBATIM CONFIGURATION EVIDENCE</span>
                  </span>
                  {selectedFinding.finding_metadata?.source_lines && (
                    <span className="text-[#8A8A8A]">
                      Line(s): {selectedFinding.finding_metadata.source_lines.join(", ")}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded bg-[#0D0D0D] border border-[#1A1A1A] text-[#00D9FF] font-mono text-[11px] leading-relaxed">
                  {selectedFinding.evidence || "No direct line match. Control violation inferred from missing mandatory configuration."}
                </div>
              </div>

              {/* Remediation Preview */}
              {remediation && (
                <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#22C55E]/30 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-[#22C55E] font-bold">
                    <span className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>ALLOWLISTED REMEDIATION CLI FIX</span>
                    </span>
                    <span className="text-[9px] uppercase">{remediation.vendor}</span>
                  </div>

                  <pre className="p-3 rounded bg-[#050505] border border-[#1A1A1A] text-[#22C55E] font-mono text-[11px] overflow-x-auto">
                    {remediation.remediation_commands}
                  </pre>
                </div>
              )}

              {/* AI Deep Explanation */}
              {explanation ? (
                <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#8B5CF6]/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8B5CF6] font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI ADVISORY EXPLANATION</span>
                  </div>
                  <p className="text-[11px] text-[#D4D4D4] font-sans leading-relaxed">
                    {explanation.summary}
                  </p>
                  <div className="text-[10px] text-[#8A8A8A] pt-2 border-t border-[#1A1A1A] font-sans">
                    <strong>Why it matters: </strong>{explanation.why_it_matters}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleRequestAIExplanation(selectedFinding)}
                  disabled={isExplaining}
                  className="w-full py-2 rounded-lg bg-[#0D0D0D] hover:bg-[#141414] border border-[#8B5CF6]/30 hover:border-[#8B5CF6] text-[#8B5CF6] font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isExplaining ? "Analyzing with AI..." : "Request AI Technical Explanation"}</span>
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#1A1A1A] bg-[#0E0E0E] flex items-center justify-between sticky bottom-0">
              <button
                onClick={() => setSelectedFinding(null)}
                className="px-3 py-1.5 rounded bg-[#0A0A0A] hover:bg-[#141414] text-[#8A8A8A] border border-[#1A1A1A]"
              >
                Close Inspector
              </button>

              <Link
                href="/remediation"
                className="px-3.5 py-1.5 rounded bg-[#0E0E0E] hover:bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/40 font-semibold flex items-center gap-1"
              >
                <span>Remediate Finding</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
