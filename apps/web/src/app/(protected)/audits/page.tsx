"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Check,
  Filter,
  Search,
  ChevronRight,
  Terminal,
  FileCode2,
  RefreshCw,
  Clock,
  Key,
  Lock,
  Layers,
  Sparkles,
  X,
  ExternalLink,
  BookOpen,
  Info,
  Bot,
  Send,
  MessageSquare,
  Zap,
  Wrench,
  FileText,
} from "lucide-react";
import {
  fetchAudits,
  fetchAuditDetail,
  fetchConfigurations,
  createAudit,
  fetchFindingExplanation,
  queryAuditAssistant,
  AuditItem,
  AuditDetail,
  Finding,
  FindingExplanation,
  AuditAssistantResponse,
  ConfigurationItem,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  supporting_findings?: string[];
  confidence?: number;
  timestamp: string;
}

export default function AuditsPage() {
  const queryClient = useQueryClient();

  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [activeFrameworkFilter, setActiveFrameworkFilter] = useState<string>("ALL");
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<string>("ALL");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [selectedConfigForAudit, setSelectedConfigForAudit] = useState<string>("");
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(["CIS", "NIST", "STIG", "ISO"]);
  
  // Finding Inspector state
  const [inspectingFinding, setInspectingFinding] = useState<Finding | null>(null);
  const [findingExplanation, setFindingExplanation] = useState<FindingExplanation | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // AI Co-Pilot Assistant state
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your **NetVigil AI Audit Co-Pilot**. Ask me anything about this audit session — like *'What are the highest risk issues?'*, *'Why did this device fail CIS?'*, or *'What should I fix first?'*",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);

  // Fetch audits history
  const {
    data: audits = [],
    isLoading: isAuditsLoading,
    isError: isAuditsError,
    error: auditsError,
    refetch: refetchAudits,
  } = useQuery({
    queryKey: ["audits"],
    queryFn: () => fetchAudits(),
  });

  // Fetch configurations for audit launcher
  const { data: configurations = [] } = useQuery({
    queryKey: ["configurations"],
    queryFn: () => fetchConfigurations(),
  });

  // Set default selected audit when loaded
  useEffect(() => {
    if (audits.length > 0 && !selectedAuditId) {
      setSelectedAuditId(audits[0].id);
    }
  }, [audits, selectedAuditId]);

  // Fetch selected audit detail
  const { data: auditDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["audit-detail", selectedAuditId],
    queryFn: () => (selectedAuditId ? fetchAuditDetail(selectedAuditId) : null),
    enabled: !!selectedAuditId,
  });

  // Create audit mutation
  const createAuditMutation = useMutation({
    mutationFn: (payload: { configuration_id: string; frameworks: string[] }) => createAudit(payload),
    onSuccess: (data) => {
      setIsLaunchModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      queryClient.invalidateQueries({ queryKey: ["overview-stats"] });
      setSelectedAuditId(data.audit_id);
    },
  });

  const handleLaunchAudit = () => {
    if (!selectedConfigForAudit && configurations.length > 0) {
      createAuditMutation.mutate({
        configuration_id: configurations[0].id,
        frameworks: selectedFrameworks,
      });
    } else if (selectedConfigForAudit) {
      createAuditMutation.mutate({
        configuration_id: selectedConfigForAudit,
        frameworks: selectedFrameworks,
      });
    }
  };

  const toggleFrameworkSelection = (fw: string) => {
    if (selectedFrameworks.includes(fw)) {
      if (selectedFrameworks.length > 1) {
        setSelectedFrameworks(selectedFrameworks.filter((f) => f !== fw));
      }
    } else {
      setSelectedFrameworks([...selectedFrameworks, fw]);
    }
  };

  const handleExplainFinding = async (findingId: string) => {
    setIsExplaining(true);
    try {
      const exp = await fetchFindingExplanation(findingId);
      setFindingExplanation(exp);
    } catch (err) {
      console.error("AI finding explanation error:", err);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSendAssistantQuery = async (queryText: string) => {
    if (!queryText.trim() || !selectedAuditId || isAssistantLoading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setAssistantInput("");
    setIsAssistantLoading(true);

    try {
      const response = await queryAuditAssistant(selectedAuditId, queryText);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response.answer,
        supporting_findings: response.supporting_findings,
        confidence: response.confidence,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "Sorry, I could not query the audit data at this time. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAssistantLoading(false);
    }
  };

  // Filtered findings
  const findings = auditDetail?.findings || [];
  const filteredFindings = findings.filter((f) => {
    const matchesFw = activeFrameworkFilter === "ALL" || f.framework === activeFrameworkFilter;
    const matchesSev = activeSeverityFilter === "ALL" || f.severity === activeSeverityFilter;
    const matchesStatus = activeStatusFilter === "ALL" || f.status === activeStatusFilter;
    const matchesSearch =
      searchQuery === "" ||
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.control_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFw && matchesSev && matchesStatus && matchesSearch;
  });

  const currentScore = auditDetail?.score ?? 0;
  const fwScores = auditDetail?.framework_scores || {};
  const sevStats = auditDetail?.severity_breakdown || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F3F4F6] tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#3B82F6]" />
            <span>Multi-Framework Compliance Engine</span>
          </h1>
          <p className="text-xs text-[#A7B0C0] mt-1">
            Deterministic security baseline audits evaluating configurations against CIS, NIST SP 800-53, DISA STIG,
            and ISO/IEC 27001 with AI-grounded explanations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Executive Report Button */}
          <Link
            href={`/reports?auditId=${selectedAuditId || ""}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D121C] hover:bg-[#151E2D] border border-[#1D2939] text-[#A7B0C0] hover:text-white text-xs font-mono font-semibold transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Executive Report</span>
          </Link>

          {/* AI Co-Pilot Button */}
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#8B5CF6] hover:text-white hover:bg-[#8B5CF6]/20 text-xs font-mono font-semibold transition-colors shadow-sm"
          >
            <Bot className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>AI Co-Pilot</span>
          </button>

          <button
            onClick={() => refetchAudits()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D121C] border border-[#1D2939] text-[#A7B0C0] hover:text-white text-xs font-mono transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isAuditsLoading && "animate-spin text-[#3B82F6]")} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              if (configurations.length > 0) {
                setSelectedConfigForAudit(configurations[0].id);
              }
              setIsLaunchModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>New Compliance Audit</span>
          </button>
        </div>
      </div>

      {isAuditsError ? (
        <div className="p-8 rounded-xl bg-[#0D121C] border border-[#EF4444]/30 text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mx-auto">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider">DATA SOURCE UNAVAILABLE</div>
            <div className="text-[11px] text-[#EF4444] mt-1">
              {auditsError instanceof Error ? auditsError.message : "Failed to retrieve audit sessions from backend API."}
            </div>
          </div>
          <button
            onClick={() => refetchAudits()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111827] hover:bg-[#151E2D] text-[#3B82F6] border border-[#3B82F6]/40 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Request</span>
          </button>
        </div>
      ) : isAuditsLoading ? (
        <div className="py-16 text-center text-[#667085] font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#3B82F6]" />
          <span>Loading compliance audit sessions...</span>
        </div>
      ) : audits.length === 0 ? (
        /* Empty State */
        <div className="p-12 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center space-y-4 font-mono text-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#F3F4F6] font-sans">No Compliance Audits Executed</h3>
            <p className="text-xs text-[#A7B0C0] max-w-md mx-auto font-sans">
              Run a deterministic compliance audit against an ingested configuration to evaluate CIS, NIST, DISA STIG,
              and ISO 27001 baseline checks.
            </p>
          </div>
          <button
            onClick={() => {
              if (configurations.length > 0) {
                setSelectedConfigForAudit(configurations[0].id);
              }
              setIsLaunchModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold transition-colors font-mono shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Initial Audit</span>
          </button>
        </div>
      ) : (
        /* Main Audit Workspace */
        <div className="space-y-6">
          {/* Audit Session Selector Bar */}
          <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-mono text-[#667085] whitespace-nowrap">Audit Session:</span>
              <div className="flex items-center gap-1.5">
                {audits.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelectedAuditId(a.id);
                      setFindingExplanation(null);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap flex items-center gap-1.5",
                      selectedAuditId === a.id
                        ? "bg-[#111827] text-[#3B82F6] border border-[#3B82F6] font-semibold shadow-sm"
                        : "bg-[#080B12] text-[#A7B0C0] hover:text-[#F3F4F6] border border-[#1D2939]"
                    )}
                  >
                    <span>ID: {a.id.slice(0, 8)}...</span>
                    {a.score !== null && a.score !== undefined && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[10px] font-bold",
                          a.score >= 80 ? "text-[#10B981]" : a.score >= 60 ? "text-[#F59E0B]" : "text-[#EF4444]"
                        )}
                      >
                        {a.score.toFixed(0)}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {auditDetail && (
              <div className="text-[11px] font-mono text-[#667085] flex items-center gap-3 self-end md:self-auto">
                <span>
                  Executed:{" "}
                  <strong className="text-[#A7B0C0]">
                    {new Date(auditDetail.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </strong>
                </span>
                <span>•</span>
                <span className="text-[#10B981] font-semibold uppercase">{auditDetail.status}</span>
              </div>
            )}
          </div>

          {/* Compliance Posture Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Overall Score Card */}
            <div className="p-5 rounded-xl bg-[#0D121C] border border-[#1D2939] flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#667085] uppercase tracking-wider font-mono">
                  NetVigil Compliance Score
                </div>
                <div className="text-xs text-[#667085] font-mono">Deterministic Multi-Framework Average</div>
              </div>

              <div className="my-4 flex items-baseline gap-2 font-mono">
                <span
                  className={cn(
                    "text-4xl font-black tracking-tight",
                    currentScore >= 80 ? "text-[#10B981]" : currentScore >= 60 ? "text-[#F59E0B]" : "text-[#EF4444]"
                  )}
                >
                  {currentScore.toFixed(0)}
                </span>
                <span className="text-[#667085] text-sm font-semibold">/ 100</span>
              </div>

              <div className="w-full bg-[#080B12] rounded-full h-1.5 overflow-hidden border border-[#1D2939]">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    currentScore >= 80 ? "bg-[#10B981]" : currentScore >= 60 ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                  )}
                  style={{ width: `${currentScore}%` }}
                />
              </div>
            </div>

            {/* Framework Breakdown Cards (3 cols) */}
            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: "CIS", label: "CIS Benchmark", sub: "v2.0.0 Consensus" },
                { key: "NIST", label: "NIST SP 800-53", sub: "Rev 5 Federal" },
                { key: "STIG", label: "DISA STIG", sub: "DoD Hardening" },
                { key: "ISO", label: "ISO 27001", sub: "Annex A Controls" },
              ].map((fw) => {
                const fwData = fwScores[fw.key];
                const scoreVal = fwData ? fwData.score : 0;
                return (
                  <div
                    key={fw.key}
                    onClick={() => setActiveFrameworkFilter(activeFrameworkFilter === fw.key ? "ALL" : fw.key)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between",
                      activeFrameworkFilter === fw.key
                        ? "bg-[#111827] border-[#3B82F6] shadow-sm"
                        : "bg-[#0D121C] border-[#1D2939] hover:border-[#263B55] hover:bg-[#111827]"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F3F4F6] font-mono">{fw.key}</span>
                        {fwData && (
                          <span className="text-[10px] font-mono text-[#667085]">
                            {fwData.passed_count}/{fwData.total_applicable}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#A7B0C0] font-medium mt-0.5">{fw.label}</div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xl font-bold font-mono text-[#3B82F6]">{scoreVal.toFixed(0)}%</div>
                      <div className="text-[10px] text-[#667085] font-mono mt-0.5">{fw.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Severity Badges Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3 rounded-lg bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-colors flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#EF4444] uppercase font-semibold">Critical Findings</div>
                <div className="text-lg font-bold text-[#EF4444] mt-0.5">{sevStats.critical}</div>
              </div>
              <ShieldAlert className="w-5 h-5 text-[#EF4444]" />
            </div>

            <div className="p-3 rounded-lg bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] transition-colors flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#F59E0B] uppercase font-semibold">High Findings</div>
                <div className="text-lg font-bold text-[#F59E0B] mt-0.5">{sevStats.high}</div>
              </div>
              <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
            </div>

            <div className="p-3 rounded-lg bg-[#0D121C] border border-[#1D2939] flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#A7B0C0] uppercase font-semibold">Medium Findings</div>
                <div className="text-lg font-bold text-[#F3F4F6] mt-0.5">{sevStats.medium}</div>
              </div>
              <Info className="w-5 h-5 text-[#A7B0C0]" />
            </div>

            <div className="p-3 rounded-lg bg-[#0D121C] border border-[#1D2939] flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#667085] uppercase font-semibold">Low / Informational</div>
                <div className="text-lg font-bold text-[#A7B0C0] mt-0.5">{sevStats.low + sevStats.info}</div>
              </div>
              <ShieldCheck className="w-5 h-5 text-[#667085]" />
            </div>
          </div>

          {/* Findings Explorer */}
          <div className="p-5 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1D2939]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#F3F4F6] font-mono flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>Findings ({filteredFindings.length})</span>
                </span>

                {/* Framework Filters */}
                <div className="flex items-center gap-1 bg-[#080B12] border border-[#1D2939] p-1 rounded-md text-xs font-mono">
                  {["ALL", "CIS", "NIST", "STIG", "ISO"].map((fw) => (
                    <button
                      key={fw}
                      onClick={() => setActiveFrameworkFilter(fw)}
                      className={cn(
                        "px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors",
                        activeFrameworkFilter === fw
                          ? "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40"
                          : "text-[#A7B0C0] hover:text-white"
                      )}
                    >
                      {fw}
                    </button>
                  ))}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-[#080B12] border border-[#1D2939] p-1 rounded-md text-xs font-mono">
                  {["ALL", "FAIL", "PASS", "UNKNOWN"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setActiveStatusFilter(st)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold uppercase transition-colors",
                        activeStatusFilter === st
                          ? st === "FAIL"
                            ? "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40"
                            : st === "PASS"
                            ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40"
                            : "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40"
                          : "text-[#A7B0C0] hover:text-white"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#667085] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search finding or control..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-md bg-[#080B12] border border-[#1D2939] text-xs text-[#F3F4F6] placeholder-[#667085] focus:outline-none focus:border-[#3B82F6]/50 w-full sm:w-64 font-mono"
                />
              </div>
            </div>

            {/* Findings Table */}
            {isDetailLoading ? (
              <div className="py-16 text-center text-[#667085] font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#3B82F6]" />
                <span>Loading compliance findings...</span>
              </div>
            ) : filteredFindings.length === 0 ? (
              <div className="py-12 text-center text-[#667085] space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-[#10B981]/50" />
                <div className="text-xs font-medium text-[#A7B0C0]">No matching findings</div>
                <p className="text-[11px] text-[#667085]">
                  Try adjusting your framework, severity, or status filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1D2939] text-[11px] font-mono text-[#667085] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Framework & Control</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Actual vs Expected</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D2939]/60">
                    {filteredFindings.map((f) => {
                      const isPass = f.status === "PASS";
                      const isFail = f.status === "FAIL";
                      const isUnknown = f.status === "UNKNOWN";

                      return (
                        <tr
                          key={f.id}
                          onClick={() => {
                            setInspectingFinding(f);
                            setFindingExplanation(null);
                          }}
                          className="hover:bg-[#111827] transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border",
                                isPass && "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30",
                                isFail && "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30",
                                isUnknown && "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
                              )}
                            >
                              {isPass && <CheckCircle2 className="w-3 h-3" />}
                              {isFail && <XCircle className="w-3 h-3" />}
                              {isUnknown && <HelpCircle className="w-3 h-3" />}
                              <span>{f.status}</span>
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono">
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase",
                                f.severity === "CRITICAL" && "text-[#EF4444]",
                                f.severity === "HIGH" && "text-[#F59E0B]",
                                f.severity === "MEDIUM" && "text-[#F59E0B]/80",
                                f.severity === "LOW" && "text-[#3B82F6]",
                                f.severity === "INFO" && "text-[#667085]"
                              )}
                            >
                              {f.severity}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded bg-[#080B12] border border-[#1D2939] text-[#A7B0C0] text-[10px] font-bold">
                                {f.framework}
                              </span>
                              <span className="text-[#F3F4F6] font-semibold">{f.control_id}</span>
                            </div>
                            {f.category && (
                              <div className="text-[10px] text-[#667085] mt-0.5">{f.category}</div>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-medium text-[#F3F4F6] group-hover:text-[#3B82F6] transition-colors">
                              {f.title}
                            </div>
                            <div className="text-[10px] text-[#A7B0C0] line-clamp-1 mt-0.5">
                              {f.description}
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-[11px]">
                            <div className="space-y-0.5">
                              <div className="text-[#667085]">
                                Actual: <span className="text-[#3B82F6] font-semibold">{f.actual_value}</span>
                              </div>
                              <div className="text-[#667085]">
                                Expected: <span className="text-[#A7B0C0]">{f.expected_value}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right space-x-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingFinding(f);
                                setFindingExplanation(null);
                                handleExplainFinding(f.id);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30 text-[11px] font-mono transition-colors"
                            >
                              <Sparkles className="w-3 h-3 text-[#8B5CF6]" />
                              <span>AI Explain</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingFinding(f);
                                setFindingExplanation(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#080B12] hover:bg-[#151E2D] text-[#A7B0C0] hover:text-white border border-[#1D2939] text-[11px] font-mono transition-colors"
                            >
                              <Terminal className="w-3 h-3 text-[#3B82F6]" />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-Over Finding Evidence & AI Explanation Inspector Drawer */}
      {inspectingFinding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="bg-[#0D121C] border-l border-[#1D2939] w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#1D2939] bg-[#0A0F18] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border",
                      inspectingFinding.status === "PASS" && "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30",
                      inspectingFinding.status === "FAIL" && "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30",
                      inspectingFinding.status === "UNKNOWN" && "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
                    )}
                  >
                    {inspectingFinding.status}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#3B82F6]">
                    {inspectingFinding.framework} • {inspectingFinding.control_id}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#F3F4F6]">{inspectingFinding.title}</h3>
              </div>

              <button
                onClick={() => {
                  setInspectingFinding(null);
                  setFindingExplanation(null);
                }}
                className="p-1.5 rounded-lg text-[#667085] hover:text-white hover:bg-[#111827] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-mono">
              {/* AI Explanation Banner / Action */}
              <div className="p-4 rounded-xl bg-[#0A0F18] border border-[#8B5CF6]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#8B5CF6] font-semibold text-xs">
                    <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Evidence-Grounded AI Analysis</span>
                  </div>

                  <button
                    onClick={() => handleExplainFinding(inspectingFinding.id)}
                    disabled={isExplaining}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-[11px] font-mono font-semibold disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isExplaining ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 fill-current" />
                        <span>{findingExplanation ? "Regenerate" : "Explain with AI"}</span>
                      </>
                    )}
                  </button>
                </div>

                {findingExplanation && (
                  <div className="space-y-3 pt-2 border-t border-[#8B5CF6]/20 font-sans text-xs">
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-[#8B5CF6] uppercase font-bold">Executive Summary</div>
                      <p className="text-[#F3F4F6] leading-relaxed bg-[#080B12] p-2.5 rounded border border-[#1D2939]">
                        {findingExplanation.summary}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-[#8B5CF6] uppercase font-bold">Why It Matters & Risk Context</div>
                      <p className="text-[#A7B0C0] leading-relaxed bg-[#080B12] p-2.5 rounded border border-[#1D2939]">
                        {findingExplanation.why_it_matters} {findingExplanation.risk_context}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-[#10B981] uppercase font-bold">Recommended Remediation</div>
                      <pre className="p-2.5 rounded bg-[#080B12] border border-[#10B981]/30 text-[11px] font-mono text-[#10B981] overflow-x-auto">
                        {findingExplanation.recommended_action}
                      </pre>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#667085] pt-1">
                      <span>Model Confidence: {(findingExplanation.confidence * 100).toFixed(0)}%</span>
                      <span>{findingExplanation.disclaimer}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#080B12] border border-[#1D2939]">
                  <div className="text-[10px] text-[#667085] uppercase">Severity Level</div>
                  <div
                    className={cn(
                      "text-xs font-bold mt-1 uppercase",
                      inspectingFinding.severity === "CRITICAL" && "text-[#EF4444]",
                      inspectingFinding.severity === "HIGH" && "text-[#F59E0B]",
                      inspectingFinding.severity === "MEDIUM" && "text-[#F59E0B]/80",
                      inspectingFinding.severity === "LOW" && "text-[#3B82F6]"
                    )}
                  >
                    {inspectingFinding.severity}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#080B12] border border-[#1D2939]">
                  <div className="text-[10px] text-[#667085] uppercase">Category Domain</div>
                  <div className="text-xs font-bold text-[#A7B0C0] mt-1">
                    {inspectingFinding.category || "General"}
                  </div>
                </div>
              </div>

              {/* Verified Document Citation */}
              {inspectingFinding.finding_metadata?.source && (
                <div className="p-3.5 rounded-lg bg-[#080B12] border border-[#3B82F6]/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#3B82F6] text-[11px] font-semibold">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Verified Official Citation</span>
                  </div>
                  <div className="text-[#F3F4F6] text-[11px]">
                    Document: <strong>{inspectingFinding.finding_metadata.source.document}</strong>
                  </div>
                  <div className="text-[#667085] text-[10px]">
                    Reference: {inspectingFinding.finding_metadata.source.reference} (v
                    {inspectingFinding.finding_metadata.source.version})
                  </div>
                </div>
              )}

              {/* Value Comparison */}
              <div className="p-3.5 rounded-lg bg-[#080B12] border border-[#1D2939] space-y-2">
                <div className="text-[10px] text-[#667085] uppercase">Deterministic Value Evaluation</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-[#0D121C] border border-[#1D2939]">
                    <div className="text-[#667085] text-[10px]">Actual Extracted Value:</div>
                    <div className="text-[#3B82F6] font-bold mt-0.5">{inspectingFinding.actual_value}</div>
                  </div>
                  <div className="p-2 rounded bg-[#0D121C] border border-[#1D2939]">
                    <div className="text-[#667085] text-[10px]">Expected Baseline Value:</div>
                    <div className="text-[#10B981] font-bold mt-0.5">{inspectingFinding.expected_value}</div>
                  </div>
                </div>
              </div>

              {/* Verbatim Configuration Evidence Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#667085]">
                  <span className="flex items-center gap-1 text-[#3B82F6] font-semibold">
                    <Terminal className="w-3 h-3" />
                    <span>Verbatim Configuration Evidence</span>
                  </span>
                  {inspectingFinding.finding_metadata?.source_lines && (
                    <span className="text-[#667085]">
                      Line(s):{" "}
                      <strong className="text-[#3B82F6]">
                        {inspectingFinding.finding_metadata.source_lines.join(", ")}
                      </strong>
                    </span>
                  )}
                </div>

                <pre className="p-3.5 rounded-lg bg-[#080B12] border border-[#1D2939] text-[11px] font-mono text-[#3B82F6] overflow-x-auto leading-relaxed select-text">
                  {inspectingFinding.evidence || "[No direct line evidence — evaluated from default baseline]"}
                </pre>
              </div>

              {/* Technical Risk Explanation */}
              {inspectingFinding.description && (
                <div className="space-y-1">
                  <div className="text-[10px] text-[#667085] uppercase">Baseline Specification</div>
                  <p className="text-[#A7B0C0] text-xs leading-relaxed font-sans bg-[#080B12] p-3 rounded-lg border border-[#1D2939]">
                    {inspectingFinding.description}
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#1D2939] bg-[#0A0F18] flex items-center justify-between">
              <Link
                href="/remediation"
                className="px-3.5 py-1.5 rounded-lg bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5 text-[#10B981]" />
                <span>View Remediation Fix</span>
              </Link>

              <button
                onClick={() => {
                  setInspectingFinding(null);
                  setFindingExplanation(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#111827] hover:bg-[#151E2D] border border-[#1D2939] text-white text-xs font-mono transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Co-Pilot Interactive Assistant Slide-Over Panel */}
      {isAssistantOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="bg-[#0D121C] border-l border-[#8B5CF6]/30 w-full max-w-xl h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Assistant Header */}
            <div className="p-4 border-b border-[#1D2939] bg-[#0A0F18] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#F3F4F6] flex items-center gap-2">
                    <span>NetVigil AI Audit Co-Pilot</span>
                    <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30">
                      Read-Only Grounded
                    </span>
                  </h3>
                  <p className="text-[10px] text-[#667085] font-mono">Grounded in Active Audit Session Findings</p>
                </div>
              </div>

              <button
                onClick={() => setIsAssistantOpen(false)}
                className="p-1.5 rounded-lg text-[#667085] hover:text-white hover:bg-[#111827] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="p-3 bg-[#0A0F18] border-b border-[#1D2939] flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
              <span className="text-[#667085] text-[10px] whitespace-nowrap">Suggested:</span>
              {[
                "What should I fix first?",
                "Why did this device fail CIS?",
                "List all Critical findings",
                "Which findings affect remote access?",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendAssistantQuery(chip)}
                  className="px-2.5 py-1 rounded bg-[#080B12] hover:bg-[#8B5CF6]/15 hover:text-[#8B5CF6] text-[#A7B0C0] border border-[#1D2939] whitespace-nowrap transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, idx) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div key={idx} className={cn("flex gap-3", isAssistant ? "items-start" : "items-end justify-end")}>
                    {isAssistant && (
                      <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "p-3.5 rounded-xl text-xs max-w-[85%] leading-relaxed",
                        isAssistant
                          ? "bg-[#080B12] border border-[#1D2939] text-[#F3F4F6] font-sans"
                          : "bg-[#3B82F6] text-white font-sans"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Supporting Findings Badges */}
                      {msg.supporting_findings && msg.supporting_findings.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#1D2939] space-y-1.5">
                          <div className="text-[10px] font-mono text-[#8B5CF6] font-bold uppercase">
                            Supporting Finding Citations ({msg.supporting_findings.length}):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {msg.supporting_findings.map((findingRef) => (
                              <button
                                key={findingRef}
                                onClick={() => {
                                  const match = findings.find(
                                    (f) => f.control_id === findingRef || f.id === findingRef
                                  );
                                  if (match) {
                                    setInspectingFinding(match);
                                  }
                                }}
                                className="px-2 py-0.5 rounded bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30 text-[10px] font-mono font-semibold transition-colors"
                              >
                                {findingRef}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-[#667085] mt-2 text-right">{msg.timestamp}</div>
                    </div>
                  </div>
                );
              })}

              {isAssistantLoading && (
                <div className="flex gap-3 items-center text-[#A7B0C0] font-mono text-xs p-3 rounded-lg bg-[#080B12] border border-[#1D2939]">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                  <span>NetVigil AI is analyzing audit session findings...</span>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="p-3.5 border-t border-[#1D2939] bg-[#0A0F18]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAssistantQuery(assistantInput);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask about this audit (e.g. Which findings are high risk?)..."
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-lg bg-[#080B12] border border-[#1D2939] text-xs text-[#F3F4F6] placeholder-[#667085] focus:outline-none focus:border-[#3B82F6] font-sans"
                />
                <button
                  type="submit"
                  disabled={!assistantInput.trim() || isAssistantLoading}
                  className="p-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New Compliance Audit Launcher Modal */}
      {isLaunchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D121C] border border-[#1D2939] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#1D2939] bg-[#0A0F18] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-[#3B82F6] fill-current" />
                <h3 className="text-sm font-bold text-[#F3F4F6]">Execute Compliance Audit</h3>
              </div>
              <button
                onClick={() => setIsLaunchModalOpen(false)}
                className="p-1 rounded text-[#667085] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono">
              <div className="space-y-1.5">
                <label className="text-[#A7B0C0] font-semibold">Select Configuration Target:</label>
                <select
                  value={selectedConfigForAudit}
                  onChange={(e) => setSelectedConfigForAudit(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#080B12] border border-[#1D2939] text-[#F3F4F6] text-xs focus:outline-none focus:border-[#3B82F6]"
                >
                  {configurations.map((cfg) => (
                    <option key={cfg.id} value={cfg.id}>
                      {cfg.original_filename} ({cfg.detected_vendor} - {cfg.hash.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[#A7B0C0] font-semibold">Target Compliance Frameworks:</label>
                <div className="grid grid-cols-2 gap-2">
                  {["CIS", "NIST", "STIG", "ISO"].map((fw) => {
                    const isSelected = selectedFrameworks.includes(fw);
                    return (
                      <button
                        key={fw}
                        type="button"
                        onClick={() => toggleFrameworkSelection(fw)}
                        className={cn(
                          "p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors",
                          isSelected
                            ? "bg-[#111827] border-[#3B82F6] text-[#3B82F6]"
                            : "bg-[#080B12] border-[#1D2939] text-[#667085] hover:text-[#A7B0C0]"
                        )}
                      >
                        <span className="font-bold">{fw}</span>
                        <div
                          className={cn(
                            "w-4 h-4 rounded flex items-center justify-center border",
                            isSelected ? "bg-[#3B82F6] border-[#3B82F6] text-white" : "border-[#1D2939]"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-[#667085] leading-relaxed pt-1">
                Deterministic rules will evaluate the canonical Universal Security Model. Zero unverified LLM trust.
              </p>
            </div>

            <div className="p-4 border-t border-[#1D2939] bg-[#0A0F18] flex items-center justify-end gap-2">
              <button
                onClick={() => setIsLaunchModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#111827] hover:bg-[#151E2D] text-[#A7B0C0] hover:text-white border border-[#1D2939] text-xs font-mono transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunchAudit}
                disabled={createAuditMutation.isPending || configurations.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold font-mono disabled:opacity-50 transition-colors shadow-sm"
              >
                {createAuditMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating Rules...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Audit</span>
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
