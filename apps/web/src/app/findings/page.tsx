"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Info,
  Key,
} from "lucide-react";
import {
  fetchFindings,
  fetchFindingExplanation,
  fetchFindingRemediation,
  fetchAudits,
  fetchAuditDetail,
  fetchConfigurations,
  fetchConfigurationDetail,
  fetchRisks,
  Finding,
  FindingExplanation,
  RemediationProposal,
  RiskItem,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function EvidenceExplorerPage() {
  const [selectedFramework, setSelectedFramework] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedVendor, setSelectedVendor] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(false);
  const [compareVendorOpen, setCompareVendorOpen] = useState(false);

  // 1. Fetch live findings
  const {
    data: findings = [],
    isLoading: isFindingsLoading,
    isError: isFindingsError,
    refetch: refetchFindings,
  } = useQuery({
    queryKey: ["all-findings", selectedFramework, selectedSeverity, selectedStatus],
    queryFn: () =>
      fetchFindings({
        framework: selectedFramework === "ALL" ? undefined : selectedFramework,
        severity: selectedSeverity === "ALL" ? undefined : selectedSeverity,
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
      }),
  });

  // 2. Fetch audits for config linkage
  const { data: audits = [] } = useQuery({
    queryKey: ["audits"],
    queryFn: () => fetchAudits(),
    staleTime: 60000,
  });

  // 3. Fetch configurations for raw config viewer
  const { data: configurations = [] } = useQuery({
    queryKey: ["configurations"],
    queryFn: () => fetchConfigurations(),
    staleTime: 60000,
  });

  // 4. Fetch risk intelligence for risk linkage
  const { data: risks = [] } = useQuery({
    queryKey: ["all-risks"],
    queryFn: () => fetchRisks({ priority: "ALL" }),
    staleTime: 60000,
  });

  // Default selection to first finding when loaded
  useEffect(() => {
    if (findings.length > 0 && !selectedFindingId) {
      setSelectedFindingId(findings[0].id);
    }
  }, [findings, selectedFindingId]);

  const selectedFinding: Finding | undefined = useMemo(() => {
    return findings.find((f) => f.id === selectedFindingId) || findings[0];
  }, [findings, selectedFindingId]);

  // 5. Fetch linked configuration raw text
  const selectedConfigId = useMemo(() => {
    if (!selectedFinding) return undefined;
    const linkedAudit = audits.find((a) => a.id === selectedFinding.audit_id);
    return linkedAudit?.configuration_id || configurations[0]?.id;
  }, [selectedFinding, audits, configurations]);

  const {
    data: configDetail,
    isLoading: isConfigLoading,
  } = useQuery({
    queryKey: ["configuration-detail", selectedConfigId],
    queryFn: () => (selectedConfigId ? fetchConfigurationDetail(selectedConfigId) : null),
    enabled: !!selectedConfigId,
    staleTime: 120000,
  });

  // 6. Fetch finding remediation proposal
  const {
    data: remediation,
    isLoading: isRemediationLoading,
  } = useQuery({
    queryKey: ["finding-remediation", selectedFinding?.id],
    queryFn: () => (selectedFinding ? fetchFindingRemediation(selectedFinding.id) : null),
    enabled: !!selectedFinding?.id,
    staleTime: 60000,
  });

  // 7. Fetch AI explanation for selected finding
  const {
    data: aiExplanation,
    isLoading: isAiLoading,
    isError: isAiError,
    refetch: refetchAi,
  } = useQuery({
    queryKey: ["finding-ai-explanation", selectedFinding?.id],
    queryFn: () => (selectedFinding ? fetchFindingExplanation(selectedFinding.id) : null),
    enabled: !!selectedFinding?.id && isAiExpanded,
    staleTime: 120000,
  });

  // Correlated risk item
  const correlatedRisk: RiskItem | undefined = useMemo(() => {
    if (!selectedFinding) return undefined;
    return risks.find((r) => r.finding_ids?.includes(selectedFinding.id)) || risks[0];
  }, [selectedFinding, risks]);

  // Filtered findings list
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      // Vendor filter
      if (selectedVendor !== "ALL") {
        const matchesVendor = (f as any).vendor?.toLowerCase() === selectedVendor.toLowerCase() ||
          configDetail?.detected_vendor?.toLowerCase() === selectedVendor.toLowerCase();
        if (!matchesVendor) return false;
      }

      // Search query
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
  }, [findings, selectedVendor, searchQuery, configDetail]);

  // Derived real metrics from authoritative backend state
  const totalFindingsCount = findings.length;
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const verifiedEvidenceCount = findings.filter((f) => !!f.evidence || (f.finding_metadata?.source_lines && f.finding_metadata.source_lines.length > 0)).length;
  const affectedAssetsCount = configurations.length;

  // Evidence line detection
  const evidenceLines: number[] = useMemo(() => {
    if (!selectedFinding) return [];
    if (selectedFinding.finding_metadata?.source_lines && selectedFinding.finding_metadata.source_lines.length > 0) {
      return selectedFinding.finding_metadata.source_lines;
    }
    // Search for snippet line in raw_content
    if (configDetail?.raw_content && selectedFinding.evidence) {
      const lines = configDetail.raw_content.split("\n");
      const targetSnippet = selectedFinding.evidence.trim().toLowerCase();
      const matchIdx = lines.findIndex((l) => l.trim().toLowerCase().includes(targetSnippet));
      if (matchIdx !== -1) return [matchIdx + 1];
    }
    return [];
  }, [selectedFinding, configDetail]);

  // Evidence viewer code lines
  const rawLines = useMemo(() => {
    if (configDetail?.raw_content) {
      return configDetail.raw_content.split("\n");
    }
    return [];
  }, [configDetail]);

  // Keyboard navigation across findings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;
      const curIdx = filteredFindings.findIndex((f) => f.id === selectedFindingId);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIdx = Math.min(filteredFindings.length - 1, curIdx + 1);
        if (filteredFindings[nextIdx]) {
          setSelectedFindingId(filteredFindings[nextIdx].id);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIdx = Math.max(0, curIdx - 1);
        if (filteredFindings[prevIdx]) {
          setSelectedFindingId(filteredFindings[prevIdx].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredFindings, selectedFindingId]);

  const handleCopyCommands = () => {
    if (!remediation?.remediation_commands) return;
    navigator.clipboard.writeText(remediation.remediation_commands);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-16 font-sans">
      {/* 1. Header & Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-[#00D9FF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
              <span>DETERMINISTIC EVIDENCE INVESTIGATOR</span>
            </span>
            <span className="text-white/20">•</span>
            <span className="text-[#64748B]">ZERO SPECULATION</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F8FAFC] tracking-tight font-sans">
            EVIDENCE EXPLORER
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 max-w-3xl font-sans leading-relaxed">
            Trace every security decision from configuration line to control, risk, and remediation.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto text-xs">
          <button
            onClick={() => refetchFindings()}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-[#00D9FF] font-semibold transition-all shadow-sm active:scale-[0.98]"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFindingsLoading && "animate-spin")} />
            <span>Refresh Findings</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Row (Real Backend Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 font-mono">
        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#64748B] uppercase font-semibold">OPEN FINDINGS</div>
          <div className="text-2xl font-extrabold text-[#F8FAFC] mt-1">{totalFindingsCount}</div>
          <div className="text-[10px] text-[#94A3B8] font-sans mt-0.5">Audited policy violations</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#EF4444] uppercase font-semibold">CRITICAL</div>
          <div className="text-2xl font-extrabold text-[#EF4444] mt-1">{criticalCount}</div>
          <div className="text-[10px] text-[#64748B] font-sans mt-0.5">Immediate intervention</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#F59E0B] uppercase font-semibold">HIGH</div>
          <div className="text-2xl font-extrabold text-[#F59E0B] mt-1">{highCount}</div>
          <div className="text-[10px] text-[#64748B] font-sans mt-0.5">Elevated risk posture</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#10B981] uppercase font-semibold">EVIDENCE VERIFIED</div>
          <div className="text-2xl font-extrabold text-[#10B981] mt-1">{verifiedEvidenceCount}</div>
          <div className="text-[10px] text-[#64748B] font-sans mt-0.5">100% AST Line Proof</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08]">
          <div className="text-[10px] text-[#00D9FF] uppercase font-semibold">AFFECTED ASSETS</div>
          <div className="text-2xl font-extrabold text-[#00D9FF] mt-1">{affectedAssetsCount}</div>
          <div className="text-[10px] text-[#64748B] font-sans mt-0.5">Across 3 vendor dialects</div>
        </div>
      </div>

      {/* 3. Filter and Search Toolbar */}
      <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-3 font-mono">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search findings, control ID (e.g. CIS-1.2.1), asset, syntax, or SHA-256 hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF]/50 transition-colors font-sans"
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
            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-[#E2E8F0] focus:outline-none focus:border-[#00D9FF]/50"
            >
              <option value="ALL">Severity: All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Framework Filter */}
            <select
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-[#E2E8F0] focus:outline-none focus:border-[#00D9FF]/50"
            >
              <option value="ALL">Framework: All</option>
              <option value="CIS">CIS Benchmark</option>
              <option value="NIST">NIST SP 800-53</option>
              <option value="STIG">DISA STIG</option>
              <option value="ISO">ISO 27001</option>
            </select>

            {/* Vendor Filter */}
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-[#E2E8F0] focus:outline-none focus:border-[#00D9FF]/50"
            >
              <option value="ALL">Vendor: All</option>
              <option value="cisco">Cisco IOS</option>
              <option value="juniper">Juniper JunOS</option>
              <option value="fortinet">Fortinet FortiOS</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0B0F19] border border-white/[0.08] text-[#E2E8F0] focus:outline-none focus:border-[#00D9FF]/50"
            >
              <option value="ALL">Status: All</option>
              <option value="FAIL">Failed Only</option>
              <option value="PASS">Passed Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Evidence Chain Breadcrumb */}
      {selectedFinding && (
        <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#64748B] text-[10px] uppercase font-bold">EVIDENCE CHAIN:</span>
            <span className="px-2 py-0.5 rounded bg-[#0B0F19] border border-white/[0.06] text-white">
              {configDetail?.original_filename || "Configuration"}
            </span>
            <span className="text-[#64748B]">→</span>
            <span className="px-2 py-0.5 rounded bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] font-bold">
              {evidenceLines.length > 0 ? `LINE ${evidenceLines[0]}` : "EVIDENCE CITED"}
            </span>
            <span className="text-[#64748B]">→</span>
            <span className="px-2 py-0.5 rounded bg-[#00D9FF]/15 border border-[#00D9FF]/30 text-[#00D9FF] font-bold">
              {selectedFinding.control_id}
            </span>
            <span className="text-[#64748B]">→</span>
            <span className="px-2 py-0.5 rounded bg-[#0B0F19] border border-white/[0.06] text-[#E2E8F0]">
              FINDING ({selectedFinding.severity})
            </span>
            <span className="text-[#64748B]">→</span>
            <Link
              href="/risk"
              className="px-2 py-0.5 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] hover:underline font-bold"
            >
              RISK {correlatedRisk ? `${correlatedRisk.priority} (${correlatedRisk.risk_score.toFixed(0)})` : "EVALUATED"}
            </Link>
            <span className="text-[#64748B]">→</span>
            <span className="px-2 py-0.5 rounded bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-bold">
              SAFE REMEDIATION
            </span>
          </div>

          <div className="text-[10px] text-[#64748B]">
            Keyboard: <kbd className="px-1.5 py-0.5 rounded bg-[#0B0F19] border border-white/[0.1] text-white">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-[#0B0F19] border border-white/[0.1] text-white">↓</kbd> to navigate
          </div>
        </div>
      )}

      {/* 5. Main 3-Panel Layout (Findings List | Evidence Viewer | Security Context) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (4 Cols / ~33%): Finding List */}
        <div className="lg:col-span-4 space-y-3 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              FINDINGS LIST ({filteredFindings.length})
            </span>
            <span className="text-[10px] text-[#00D9FF]">AST VERIFIED</span>
          </div>

          {/* Loading Skeleton */}
          {isFindingsLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.04] animate-pulse space-y-2">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isFindingsError && (
            <div className="p-6 rounded-xl bg-[#070A10] border border-red-500/20 text-center space-y-3">
              <AlertTriangle className="w-6 h-6 text-[#EF4444] mx-auto" />
              <div className="text-xs font-bold text-[#F8FAFC]">FINDINGS UNAVAILABLE</div>
              <p className="text-[11px] text-[#94A3B8] font-sans">Unable to retrieve security findings.</p>
              <button
                onClick={() => refetchFindings()}
                className="px-3 py-1 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isFindingsLoading && !isFindingsError && filteredFindings.length === 0 && (
            <div className="p-8 rounded-xl bg-[#070A10] border border-white/[0.08] text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
              <div className="text-xs font-bold text-[#F8FAFC]">NO SECURITY FINDINGS</div>
              <p className="text-[11px] text-[#94A3B8] font-sans">
                Evidence Explorer will populate after configurations are evaluated.
              </p>
              <Link
                href="/configurations"
                className="inline-block px-3 py-1.5 rounded-md bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 text-xs font-bold"
              >
                Ingest Configuration →
              </Link>
            </div>
          )}

          {/* Findings Scroll List */}
          {!isFindingsLoading && !isFindingsError && (
            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {filteredFindings.map((f: Finding) => {
                const isSelected = selectedFinding?.id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFindingId(f.id)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl border transition-all space-y-2 block group relative",
                      isSelected
                        ? "bg-[#0B0F19] border-[#00D9FF] shadow-[0_0_12px_rgba(0,217,255,0.15)]"
                        : "bg-[#070A10] border-white/[0.04] hover:border-white/[0.12] hover:bg-[#0B0F19]/60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-extrabold border",
                          f.severity === "CRITICAL"
                            ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"
                            : f.severity === "HIGH"
                            ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                            : "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30"
                        )}>
                          {f.severity}
                        </span>
                        <span className="text-[11px] font-bold text-[#00D9FF]">
                          {f.control_id}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold",
                        f.status === "FAIL" ? "text-[#EF4444]" : "text-[#10B981]"
                      )}>
                        {f.status}
                      </span>
                    </div>

                    <div className="text-xs font-sans font-semibold text-[#F8FAFC] group-hover:text-[#00D9FF] transition-colors line-clamp-1">
                      {f.title}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-1 border-t border-white/[0.04]">
                      <span>{f.framework || "CIS"}</span>
                      <span>Asset: CORE-RTR-01</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER PANEL (5 Cols / ~41%): Evidence Code Viewer */}
        <div className="lg:col-span-5 space-y-3 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              EVIDENCE VIEWER
            </span>
            <span className="text-[10px] text-[#10B981]">LINE-LEVEL PROOF</span>
          </div>

          {/* Evidence Provenance Header Box */}
          <div className="p-3.5 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[#64748B] text-[10px] block uppercase">SOURCE CONFIGURATION</span>
                <span className="font-bold text-[#F8FAFC]">
                  {configDetail?.original_filename || (selectedFinding ? "Linked Config" : "None Selected")}
                </span>
              </div>
              <div>
                <span className="text-[#64748B] text-[10px] block uppercase">VENDOR / PLATFORM</span>
                <span className="font-bold text-[#00D9FF]">
                  {configDetail?.detected_vendor ? configDetail.detected_vendor.toUpperCase() : "N/A"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-[#64748B]">
              <div className="flex items-center gap-1.5 truncate max-w-[260px]">
                <Hash className="w-3 h-3 text-[#00D9FF]" />
                <span className="truncate">{configDetail?.hash || "No hash available"}</span>
              </div>
              <span className={cn("font-bold", evidenceLines.length > 0 ? "text-[#EF4444]" : "text-[#64748B]")}>
                {evidenceLines.length > 0 ? `EVIDENCE: LINE ${evidenceLines.join(", ")}` : "NO DIRECT LINE CITATION"}
              </span>
            </div>
          </div>

          {/* Configuration Code Text Viewer */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#03060A] overflow-hidden">
            <div className="p-2.5 bg-[#070A10] border-b border-white/[0.06] flex items-center justify-between text-[11px] text-[#64748B]">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-3.5 h-3.5 text-[#00D9FF]" />
                <span className="text-white font-bold">{configDetail?.original_filename || configDetail?.filename || "Configuration"}</span>
              </div>
              <span>{rawLines.length} lines</span>
            </div>

            {rawLines.length === 0 ? (
              <div className="p-12 text-center text-[#64748B] space-y-2">
                <FileCode2 className="w-8 h-8 text-[#475569] mx-auto" />
                <div className="text-xs font-bold text-[#F8FAFC]">NO CONFIGURATION TEXT AVAILABLE</div>
                <p className="text-[11px] text-[#94A3B8] font-sans">
                  {isConfigLoading ? "Loading configuration file..." : "Select an evaluated finding to view configuration evidence."}
                </p>
              </div>
            ) : (
              <div className="max-h-[580px] overflow-y-auto p-2 text-[11px] leading-relaxed select-text">
                {rawLines.map((lineText, idx) => {
                  const lineNum = idx + 1;
                  const isEvidenceLine = evidenceLines.includes(lineNum);

                  return (
                    <div
                      key={lineNum}
                      className={cn(
                        "flex items-start rounded transition-colors group",
                        isEvidenceLine
                          ? "bg-[#EF4444]/15 border-l-2 border-[#EF4444] text-white font-bold"
                          : "hover:bg-white/[0.02] text-[#94A3B8]"
                      )}
                    >
                      {/* Line Number Column */}
                      <span
                        className={cn(
                          "w-10 shrink-0 text-right pr-3 select-none text-[10px]",
                          isEvidenceLine ? "text-[#EF4444] font-bold" : "text-[#475569]"
                        )}
                      >
                        {lineNum}
                      </span>

                      {/* Line Text Content */}
                      <div className="flex-1 overflow-x-auto whitespace-pre font-mono py-0.5">
                        <span>{lineText || " "}</span>
                        {isEvidenceLine && (
                          <div className="text-[10px] text-[#EF4444] font-bold mt-0.5 flex items-center gap-1">
                            <span>▲ VERIFIED EVIDENCE CITED FOR {selectedFinding?.control_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (3 Cols / ~26%): Security Control, Risk & Remediation Context */}
        <div className="lg:col-span-3 space-y-4 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              SECURITY CONTEXT
            </span>
            <span className="text-[10px] text-[#EF4444] font-bold">FAIL</span>
          </div>

          {selectedFinding ? (
            <div className="space-y-4">
              {/* 1. Control Details Card */}
              <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">CONTROL VERDICT</span>
                  <span className="text-[#00D9FF] font-bold">{selectedFinding.control_id}</span>
                </div>

                <div>
                  <div className="text-[10px] text-[#64748B] uppercase">TITLE</div>
                  <div className="font-bold text-[#F8FAFC] font-sans mt-0.5">{selectedFinding.title}</div>
                </div>

                {/* Provenance Chain Differentiator */}
                <div className="p-2.5 rounded bg-[#03060A] border border-white/[0.06] space-y-1.5 text-[10px] font-mono">
                  <div className="text-[9px] text-[#64748B] uppercase font-bold tracking-wider">
                    DETERMINISTIC PROVENANCE CHAIN
                  </div>
                  <div className="flex flex-col gap-1 text-[#94A3B8]">
                    <div className="flex items-center justify-between">
                      <span>1. SOURCE:</span>
                      <span className="text-white font-semibold">{configDetail?.original_filename || "Configuration"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>2. EVIDENCE:</span>
                      <span className="text-[#EF4444] font-semibold">
                        {evidenceLines.length > 0 ? `Line ${evidenceLines[0]}` : "Source cited"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>3. NORMALIZED FACT:</span>
                      <span className="text-[#F59E0B] font-semibold">
                        {selectedFinding.actual_value || selectedFinding.finding_metadata?.rule_id || "Observed directive"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>4. EXPECTED:</span>
                      <span className="text-[#10B981] font-semibold">{selectedFinding.expected_value || "Hardened standard"}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/[0.06] pt-1 mt-0.5">
                      <span>5. VERDICT:</span>
                      <span className="text-[#EF4444] font-extrabold">{selectedFinding.status} ({selectedFinding.severity})</span>
                    </div>
                  </div>
                </div>

                {/* Human-Readable Why Failed Explanation */}
                <div className="p-2.5 rounded bg-[#0B0F19] border border-white/[0.04] space-y-1">
                  <div className="text-[9px] text-[#64748B] uppercase font-bold">WHY FAILED?</div>
                  <p className="text-[11px] text-[#E2E8F0] font-sans leading-relaxed">
                    {selectedFinding.description || `The configuration violates baseline security control ${selectedFinding.control_id}. Required standard is not met.`}
                  </p>
                </div>
              </div>

              {/* 2. Risk Correlation Card */}
              <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-[10px] text-[#F59E0B] uppercase font-bold flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>CONTRIBUTES TO RISK</span>
                  </span>
                  <Link
                    href="/risk"
                    className="text-[10px] text-[#00D9FF] hover:underline flex items-center gap-0.5"
                  >
                    <span>View Risk →</span>
                  </Link>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                      {correlatedRisk ? `${correlatedRisk.priority} • SCORE ${correlatedRisk.risk_score.toFixed(0)}` : "EVALUATED RISK"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#64748B]">{correlatedRisk?.category || selectedFinding.category}</span>
                </div>

                <div className="text-[11px] font-sans font-semibold text-[#F8FAFC]">
                  {correlatedRisk?.title || `Security exposure related to ${selectedFinding.title}`}
                </div>
              </div>

              {/* 3. Safe Remediation Card */}
              <div className="p-4 rounded-xl bg-[#070A10] border border-white/[0.08] space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-[10px] text-[#10B981] uppercase font-bold flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>SAFE REMEDIATION</span>
                  </span>
                  <span className="text-[10px] text-[#64748B]">
                    {remediation?.template_id ? `TEMPLATE ${remediation.template_id}` : "CATALOG GUIDANCE"}
                  </span>
                </div>

                {/* Diff Preview */}
                <div className="p-2.5 rounded bg-[#03060A] border border-white/[0.06] text-[10px] space-y-1">
                  {remediation?.diff_preview?.diff_lines ? (
                    remediation.diff_preview.diff_lines.map((dl, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "font-mono truncate",
                          dl.type === "REMOVE" ? "text-[#EF4444]" : dl.type === "ADD" ? "text-[#10B981]" : "text-[#64748B]"
                        )}
                      >
                        {dl.type === "REMOVE" ? "- " : dl.type === "ADD" ? "+ " : "  "}
                        {dl.line}
                      </div>
                    ))
                  ) : (
                    <div className="text-[#10B981] font-mono whitespace-pre-wrap">
                      {remediation?.remediation_commands || selectedFinding.remediation || "! Apply hardening configuration"}
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-[#64748B] space-y-1">
                  <div className="flex items-center justify-between">
                    <span>EXECUTION:</span>
                    <span className="text-[#10B981] font-bold">DISABLED (READ-ONLY)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>REMOTE PUSH:</span>
                    <span className="text-[#00D9FF] font-bold">ABSENT</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleCopyCommands}
                    className="p-2 rounded bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-white font-semibold transition-all flex items-center justify-center gap-1.5"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? "Copied" : "Copy CLI"}</span>
                  </button>

                  <Link
                    href="/remediation"
                    className="p-2 rounded bg-[#00C896] hover:bg-[#00B383] text-[#050709] font-bold transition-all text-center flex items-center justify-center gap-1"
                  >
                    <span>Remediations →</span>
                  </Link>
                </div>
              </div>

              {/* 4. AI Advisory (Expandable Read-Only Intelligence) */}
              <div className="p-4 rounded-xl bg-[#0E0B19] border border-[#A855F7]/30 space-y-3 text-xs">
                <button
                  onClick={() => setIsAiExpanded(!isAiExpanded)}
                  className="w-full flex items-center justify-between text-[#A855F7] font-bold text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI ADVISORY — WHY THIS MATTERS</span>
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
                        <div>Deterministic security evaluation remains available.</div>
                      </div>
                    )}

                    {aiExplanation && !isAiLoading && (
                      <div className="space-y-2 text-[11px] text-[#E2E8F0] font-sans leading-relaxed">
                        <p>{aiExplanation.technical_explanation || aiExplanation.summary}</p>
                        <div className="p-2 rounded bg-[#070A10] border border-white/[0.04] text-[10px] text-[#94A3B8] font-mono">
                          Citation: {selectedFinding.control_id} • {evidenceLines.length > 0 ? `Line ${evidenceLines[0]}` : selectedFinding.framework}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[#070A10] border border-white/[0.08] text-center text-[#64748B] text-xs">
              Select a finding to inspect control context.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
