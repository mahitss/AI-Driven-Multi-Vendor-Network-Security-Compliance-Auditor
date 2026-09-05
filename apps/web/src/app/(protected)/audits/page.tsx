"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
import { useAuth } from "@/components/providers/AuthProvider";
import { resolveAuthoritativeAuditId, persistActiveAuditId } from "@/lib/audit-session";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  supporting_findings?: string[];
  confidence?: number;
  timestamp: string;
}

function AuditsPageContent() {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryAuditId = searchParams.get("audit_id") || searchParams.get("auditId");
  const queryConfigId = searchParams.get("configuration_id") || searchParams.get("configurationId") || searchParams.get("configId");

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
    queryKey: ["audits", user?.id],
    queryFn: () => fetchAudits(),
    enabled: !authLoading && !!user,
  });

  // Fetch configurations for audit launcher
  const { data: configurations = [] } = useQuery({
    queryKey: ["configurations", user?.id],
    queryFn: () => fetchConfigurations(),
    enabled: !authLoading && !!user,
  });

  const manualSelectionRef = useRef<string | null>(null);

  const handleSelectAudit = (auditId: string) => {
    manualSelectionRef.current = auditId;
    setSelectedAuditId(auditId);
    persistActiveAuditId(auditId);
    setFindingExplanation(null);
    setInspectingFinding(null);
    try {
      router.replace(`${pathname}?audit_id=${encodeURIComponent(auditId)}`, { scroll: false });
    } catch {
      // Fallback
    }
  };

  // Authoritative audit selection prioritizing URL params -> localStorage -> newest audit (Bug 1, 3, 7)
  useEffect(() => {
    if (audits.length === 0) return;

    // If manual selection in progress and query param is still catching up, do not revert
    if (manualSelectionRef.current) {
      if (queryAuditId === manualSelectionRef.current) {
        manualSelectionRef.current = null;
      } else {
        return;
      }
    }

    const authoritativeId = resolveAuthoritativeAuditId(audits, queryAuditId, queryConfigId);
    if (authoritativeId && authoritativeId !== selectedAuditId) {
      setSelectedAuditId(authoritativeId);
      persistActiveAuditId(authoritativeId);
      setInspectingFinding(null);
      setFindingExplanation(null);

      // Keep URL parameter synchronized
      try {
        if (queryAuditId !== authoritativeId) {
          router.replace(`${pathname}?audit_id=${encodeURIComponent(authoritativeId)}`, { scroll: false });
        }
      } catch {
        // Ignore
      }
    }
  }, [audits, queryAuditId, queryConfigId, selectedAuditId, pathname, router]);

  // Reset dependent finding inspector state atomically when selected audit changes (Bug 2, 7)
  useEffect(() => {
    setInspectingFinding(null);
    setFindingExplanation(null);
  }, [selectedAuditId]);

  // Fetch selected audit detail
  const { data: auditDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["audit-detail", selectedAuditId, user?.id],
    queryFn: () => (selectedAuditId ? fetchAuditDetail(selectedAuditId) : null),
    enabled: !authLoading && !!user && !!selectedAuditId,
  });

  // Create audit mutation
  const createAuditMutation = useMutation({
    mutationFn: (payload: { configuration_id: string; frameworks: string[] }) => createAudit(payload),
    onSuccess: (data) => {
      setIsLaunchModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      queryClient.invalidateQueries({ queryKey: ["overview-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-security-telemetry"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-active-findings"] });
      handleSelectAudit(data.audit_id);
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

  // Authoritative active audit resolved directly from audit list cache
  const activeAudit = audits.find((a) => a.id === selectedAuditId);

  // Strict identity verification: auditDetail MUST belong to currently selectedAuditId
  const isDetailMatching = Boolean(
    auditDetail &&
    selectedAuditId &&
    auditDetail.id === selectedAuditId
  );

  // Development / runtime invariant assertion to prevent stale cross-audit contamination
  if (auditDetail && selectedAuditId && auditDetail.id !== selectedAuditId) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[NetVigil State Guard] Mismatched auditDetail: expected ${selectedAuditId}, got ${auditDetail.id}. Discarding stale metrics.`
      );
    }
  }

  // Authoritative metrics derivation: If detail matches, use full detail; otherwise fallback to activeAudit summary_stats
  const currentScore = isDetailMatching
    ? (auditDetail?.score ?? 0)
    : (activeAudit?.score ?? 0);

  const fwScores = (isDetailMatching
    ? auditDetail?.framework_scores
    : activeAudit?.summary_stats?.framework_scores) || {};

  const sevStats = (isDetailMatching
    ? auditDetail?.severity_breakdown
    : activeAudit?.summary_stats?.severity_breakdown) || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  // Filtered findings: Only derive findings when auditDetail strictly matches selectedAuditId
  const findings = isDetailMatching ? (auditDetail?.findings || []) : [];

  // Independent Multi-Framework Grouping:
  // Each framework card is calculated and rendered strictly from results/findings belonging to that framework.
  // The cards NEVER receive the overall audit score or overall result object.
  const frameworkResults = useMemo(() => {
    const frameworks = ["CIS", "NIST", "STIG", "ISO"] as const;
    const map: Record<
      string,
      {
        framework: string;
        score: number;
        passed_count: number;
        failed_count: number;
        unknown_count: number;
        not_applicable_count: number;
        total_applicable: number;
        total_evaluated: number;
      }
    > = {};

    for (const fw of frameworks) {
      const backendFw = fwScores[fw];
      // Group findings belonging strictly to this framework identifier
      const fwFindings = findings.filter(
        (f) => (f.framework || "").toUpperCase() === fw
      );

      if (fwFindings.length > 0) {
        const passed = fwFindings.filter((f) => f.status === "PASS").length;
        const failed = fwFindings.filter((f) => f.status === "FAIL").length;
        const unknown = fwFindings.filter((f) => f.status === "UNKNOWN").length;
        const na = fwFindings.filter((f) => f.status === "NOT_APPLICABLE").length;
        const applicable = passed + failed + unknown;
        const calcScore = applicable > 0 ? (passed / applicable) * 100.0 : 100.0;
        const score = backendFw?.score !== undefined ? backendFw.score : Number(calcScore.toFixed(1));

        map[fw] = {
          framework: fw,
          score,
          passed_count: passed,
          failed_count: failed,
          unknown_count: unknown,
          not_applicable_count: na,
          total_applicable: applicable,
          total_evaluated: fwFindings.length,
        };
      } else if (backendFw) {
        map[fw] = {
          framework: fw,
          score: backendFw.score ?? 0,
          passed_count: backendFw.passed_count ?? 0,
          failed_count: backendFw.failed_count ?? 0,
          unknown_count: backendFw.unknown_count ?? 0,
          not_applicable_count: backendFw.not_applicable_count ?? 0,
          total_applicable: backendFw.total_applicable ?? 0,
          total_evaluated: backendFw.total_evaluated ?? 0,
        };
      } else {
        map[fw] = {
          framework: fw,
          score: 0,
          passed_count: 0,
          failed_count: 0,
          unknown_count: 0,
          not_applicable_count: 0,
          total_applicable: 0,
          total_evaluated: 0,
        };
      }
    }
    return map;
  }, [findings, fwScores]);
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
  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 select-none font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold text-[#F2F2F2] tracking-tight font-mono leading-none flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#10B981] shrink-0" />
            <span>MULTI-FRAMEWORK COMPLIANCE ENGINE</span>
          </h1>
          <p className="text-sm sm:text-[15px] text-[#8E8E93] mt-1.5 font-sans">
            Deterministic security baseline audits evaluating configurations against CIS, NIST SP 800-53, DISA STIG,
            and ISO/IEC 27001 with AI-grounded explanations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
          {/* Executive Report Button */}
          <Link
            href={`/reports?auditId=${selectedAuditId || ""}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#0D0D0D] hover:bg-[#141414] border border-[#1F1F1F] text-[#8E8E93] hover:text-white text-xs sm:text-[13px] font-mono font-medium transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#888888]" />
            <span>Executive Report</span>
          </Link>

          {/* AI Co-Pilot Button */}
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#121212] border border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:bg-[#181818] text-xs sm:text-[13px] font-mono font-medium transition-colors shadow-xs cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>AI Co-Pilot</span>
          </button>

          <button
            onClick={() => refetchAudits()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#0D0D0D] hover:bg-[#141414] border border-[#1F1F1F] text-[#8E8E93] hover:text-white text-xs sm:text-[13px] font-mono transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isAuditsLoading && "animate-spin text-[#888888]")} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              if (configurations.length > 0) {
                setSelectedConfigForAudit(configurations[0].id);
              }
              setIsLaunchModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#161616] hover:bg-[#1F1F1F] border border-[#2E2E2E] hover:border-[#383838] text-[#F2F2F2] hover:text-white text-xs sm:text-[13px] font-semibold shadow-xs transition-colors font-mono cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-[#10B981]" />
            <span>New Compliance Audit</span>
          </button>
        </div>
      </div>

      {isAuditsError ? (
        <div className="p-8 rounded-lg bg-[#0B0B0B] border border-[#EF4444]/30 text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mx-auto">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#F2F2F2] uppercase tracking-wider">DATA SOURCE UNAVAILABLE</div>
            <div className="text-[11px] text-[#EF4444] mt-1">
              {auditsError instanceof Error ? auditsError.message : "Failed to retrieve audit sessions from backend API."}
            </div>
          </div>
          <button
            onClick={() => refetchAudits()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#141414] hover:bg-[#181818] text-[#F2F2F2] border border-[#2A2A2A] text-xs font-semibold font-mono"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Request</span>
          </button>
        </div>
      ) : isAuditsLoading ? (
        <div className="py-16 text-center text-[#666666] font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#888888]" />
          <span>Loading compliance audit sessions...</span>
        </div>
      ) : audits.length === 0 ? (
        /* Empty State */
        <div className="p-12 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-center space-y-4 font-mono text-xs">
          <div className="w-14 h-14 rounded-xl bg-[#141414] border border-[#242424] flex items-center justify-center text-[#F2F2F2] mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[#F2F2F2] font-sans">No Compliance Audits Executed</h3>
            <p className="text-xs sm:text-sm text-[#8E8E93] max-w-md mx-auto font-sans">
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#161616] hover:bg-[#1F1F1F] border border-[#2E2E2E] text-[#F2F2F2] hover:text-white text-xs font-semibold transition-colors font-mono shadow-xs cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current text-[#10B981]" />
            <span>Launch Initial Audit</span>
          </button>
        </div>
      ) : (
        /* Main Audit Workspace */
        <div className="space-y-5">
          {/* Audit Session Selector Bar */}
          <div className="p-3 sm:p-3.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] flex flex-col md:flex-row md:items-center justify-between gap-3.5 w-full overflow-hidden">
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin scrollbar-thumb-[#1F1F1F] max-w-full">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#666666] shrink-0">
                AUDIT SESSIONS:
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {audits.map((a) => {
                  const cfg = configurations.find((c) => c.id === a.configuration_id);
                  const deviceLabel = cfg?.original_filename || (a as any).device_name || `Session ${a.id.slice(0, 8)}`;
                  const isSelected = selectedAuditId === a.id;
                  const executionTimeStr = a.started_at
                    ? new Date(a.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : null;

                  return (
                    <button
                      key={a.id}
                      onClick={() => handleSelectAudit(a.id)}
                      title={`Audit ID: ${a.id}\nAsset: ${deviceLabel}\nExecuted: ${a.started_at ? new Date(a.started_at).toLocaleString() : "Unknown"}\nScore: ${a.score !== null && a.score !== undefined ? `${a.score.toFixed(1)}%` : "N/A"}`}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-mono transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer",
                        isSelected
                          ? "bg-[#141414] text-[#F2F2F2] border-[#383838] font-semibold shadow-xs ring-1 ring-[#383838]"
                          : "bg-[#080808] text-[#8E8E93] hover:text-[#F2F2F2] border-[#1F1F1F] hover:border-[#2A2A2A] hover:bg-[#0E0E0E]"
                      )}
                    >
                      <span className="font-sans font-semibold text-[#F2F2F2] text-xs">{deviceLabel}</span>
                      <span className="text-[11px] text-[#666666] font-mono">
                        ({a.id.slice(0, 8)}{executionTimeStr ? ` · ${executionTimeStr}` : ""})
                      </span>
                      {a.score !== null && a.score !== undefined && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[11px] font-mono font-bold",
                            a.score >= 80 ? "bg-[#10B981]/15 text-[#10B981]" : a.score >= 60 ? "bg-[#F59E0B]/15 text-[#F59E0B]" : "bg-[#EF4444]/15 text-[#EF4444]"
                          )}
                        >
                          {a.score.toFixed(1)}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {(isDetailMatching ? auditDetail : activeAudit) && (
              <div className="text-xs font-mono text-[#8E8E93] flex items-center gap-3 shrink-0 self-start md:self-auto">
                <span>
                  Executed:{" "}
                  <strong className="text-[#F2F2F2] font-semibold">
                    {new Date(
                      ((isDetailMatching && auditDetail?.started_at) || activeAudit?.started_at) || Date.now()
                    ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </strong>
                </span>
                <span className="text-[#333333]">•</span>
                <span className="inline-flex items-center gap-1.5 text-[#10B981] font-semibold uppercase text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span>{(isDetailMatching && auditDetail?.status) || activeAudit?.status || "COMPLETED"}</span>
                </span>
              </div>
            )}
          </div>

          {/* Compliance Posture Overview Grid: 5 equal-width columns on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-stretch">
            {/* Overall Score Card */}
            <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] flex flex-col justify-between relative overflow-hidden h-full min-h-[145px]">
              <div className="space-y-1">
                <div className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-wider font-mono">
                  NetVigil Score
                </div>
                <div className="text-xs text-[#666666] font-mono truncate">Multi-Framework Average</div>
              </div>

              <div className="my-3 flex items-baseline gap-1.5 font-mono">
                <span
                  className={cn(
                    "text-3xl sm:text-[34px] font-bold tracking-tight leading-none",
                    currentScore >= 80 ? "text-[#10B981]" : currentScore >= 60 ? "text-[#F59E0B]" : "text-[#EF4444]"
                  )}
                >
                  {currentScore.toFixed(1)}
                </span>
                <span className="text-[#666666] text-xs font-semibold">/ 100</span>
              </div>

              <div className="w-full bg-[#141414] rounded-full h-1.5 overflow-hidden border border-[#1F1F1F]">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    currentScore >= 80 ? "bg-[#10B981]" : currentScore >= 60 ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, currentScore))}%` }}
                />
              </div>
            </div>

            {/* 4 Framework Breakdown Cards */}
            {[
              { key: "CIS", label: "CIS Benchmark", sub: "v2.0.0 Consensus" },
              { key: "NIST", label: "NIST SP 800-53", sub: "Rev 5 Federal" },
              { key: "STIG", label: "DISA STIG", sub: "DoD Hardening" },
              { key: "ISO", label: "ISO 27001", sub: "Annex A Controls" },
            ].map((fw) => {
              const fwData = frameworkResults[fw.key];
              const isEvaluated = Boolean(fwData && (fwData.total_evaluated > 0 || fwData.total_applicable > 0));
              const scoreVal = fwData ? fwData.score : 0;
              return (
                <div
                  key={fw.key}
                  onClick={() => setActiveFrameworkFilter(activeFrameworkFilter === fw.key ? "ALL" : fw.key)}
                  className={cn(
                    "p-4 rounded-lg border transition-colors cursor-pointer flex flex-col justify-between h-full min-h-[145px]",
                    activeFrameworkFilter === fw.key
                      ? "bg-[#141414] border-[#383838] ring-1 ring-[#383838] shadow-xs"
                      : "bg-[#0B0B0B] border-[#1F1F1F] hover:border-[#2A2A2A] hover:bg-[#101010]"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#F2F2F2] font-mono">{fw.key}</span>
                      {isEvaluated && fwData ? (
                        <span
                          className="text-xs font-mono text-[#8E8E93]"
                          title={`${fwData.passed_count} passed, ${fwData.failed_count} failed, ${fwData.unknown_count} unknown, ${fwData.not_applicable_count} N/A (${fwData.total_applicable} applicable controls)`}
                        >
                          {fwData.passed_count}/{fwData.total_applicable} passed
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-[#555555]">Not Evaluated</span>
                      )}
                    </div>
                    <div className="text-[13px] text-[#8E8E93] font-medium mt-1 truncate">{fw.label}</div>
                  </div>

                  <div className="mt-3">
                    <div className="text-2xl sm:text-[30px] font-bold font-mono text-[#F2F2F2] leading-none">
                      {isEvaluated ? `${scoreVal.toFixed(1)}%` : "—"}
                    </div>
                    <div className="text-xs text-[#666666] font-mono mt-1.5 flex items-center justify-between gap-1">
                      <span className="truncate">{fw.sub}</span>
                      {isEvaluated && fwData && (
                        <span
                          className="text-[#8E8E93] shrink-0"
                          title={`${fwData.failed_count} failed, ${fwData.unknown_count} unknown, ${fwData.not_applicable_count} N/A`}
                        >
                          {fwData.failed_count} fail{fwData.not_applicable_count > 0 ? ` · ${fwData.not_applicable_count} N/A` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Severity Badges Bar: Equal 4-Column Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono items-stretch">
            <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex items-center justify-between h-full">
              <div>
                <div className="text-xs text-[#EF4444] uppercase font-semibold tracking-wider">Critical Findings</div>
                <div className="text-2xl sm:text-[26px] font-bold text-[#EF4444] mt-1 leading-none">{sevStats.critical}</div>
              </div>
              <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0" />
            </div>

            <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex items-center justify-between h-full">
              <div>
                <div className="text-xs text-[#F59E0B] uppercase font-semibold tracking-wider">High Findings</div>
                <div className="text-2xl sm:text-[26px] font-bold text-[#F59E0B] mt-1 leading-none">{sevStats.high}</div>
              </div>
              <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0" />
            </div>

            <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex items-center justify-between h-full">
              <div>
                <div className="text-xs text-[#8E8E93] uppercase font-semibold tracking-wider">Medium Findings</div>
                <div className="text-2xl sm:text-[26px] font-bold text-[#F2F2F2] mt-1 leading-none">{sevStats.medium}</div>
              </div>
              <Info className="w-5 h-5 text-[#8E8E93] shrink-0" />
            </div>

            <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex items-center justify-between h-full">
              <div>
                <div className="text-xs text-[#666666] uppercase font-semibold tracking-wider">Low / Informational</div>
                <div className="text-2xl sm:text-[26px] font-bold text-[#8E8E93] mt-1 leading-none">{sevStats.low + sevStats.info}</div>
              </div>
              <ShieldCheck className="w-5 h-5 text-[#666666] shrink-0" />
            </div>
          </div>

          {/* Findings Explorer */}
          <div className="p-4 sm:p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-4 font-mono">
            {/* Filter Toolbar: Clean Two-Part Layout */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-4 border-b border-[#1F1F1F]">
              {/* LEFT: Count badge + Framework filters + Status filters */}
              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                <span className="text-xs font-semibold text-[#F2F2F2] font-mono flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-md bg-[#080808] border border-[#1F1F1F]">
                  <Filter className="w-3.5 h-3.5 text-[#8E8E93]" />
                  <span>Findings ({filteredFindings.length})</span>
                </span>

                {/* Framework Filters */}
                <div className="flex items-center gap-0.5 bg-[#080808] border border-[#1F1F1F] p-0.5 rounded-md text-xs font-mono shrink-0">
                  {["ALL", "CIS", "NIST", "STIG", "ISO"].map((fw) => (
                    <button
                      key={fw}
                      onClick={() => setActiveFrameworkFilter(fw)}
                      className={cn(
                        "px-3 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer",
                        activeFrameworkFilter === fw
                          ? "bg-[#141414] text-[#F2F2F2] border border-[#2E2E2E] shadow-xs"
                          : "text-[#8E8E93] hover:text-white"
                      )}
                    >
                      {fw}
                    </button>
                  ))}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-0.5 bg-[#080808] border border-[#1F1F1F] p-0.5 rounded-md text-xs font-mono shrink-0">
                  {["ALL", "FAIL", "PASS", "NOT_APPLICABLE", "UNKNOWN"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setActiveStatusFilter(st)}
                      className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-semibold uppercase transition-colors whitespace-nowrap cursor-pointer",
                        activeStatusFilter === st
                          ? st === "FAIL"
                            ? "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                            : st === "PASS"
                            ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                            : st === "NOT_APPLICABLE"
                            ? "bg-[#141414] text-[#8E8E93] border border-[#242424]"
                            : "bg-[#161616] text-[#F2F2F2] border border-[#2E2E2E]"
                          : "text-[#8E8E93] hover:text-white"
                      )}
                    >
                      {st === "NOT_APPLICABLE" ? "N/A" : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT: Search Field */}
              <div className="relative shrink-0 w-full md:w-72">
                <Search className="w-3.5 h-3.5 text-[#555555] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search finding or control..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-md bg-[#080808] border border-[#1F1F1F] text-xs text-[#F2F2F2] placeholder-[#555555] focus:outline-none focus:border-[#333333] w-full font-mono transition-colors"
                />
              </div>
            </div>

            {/* Findings Table */}
            {isDetailLoading || (!isDetailMatching && activeAudit) ? (
              <div className="py-16 text-center text-[#666666] font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#888888]" />
                <span>Loading compliance findings...</span>
              </div>
            ) : filteredFindings.length === 0 ? (
              <div className="py-12 text-center text-[#666666] space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-[#10B981]/50" />
                <div className="text-xs font-medium text-[#8E8E93]">No matching findings</div>
                <p className="text-[11px] text-[#666666] font-sans">
                  Try adjusting your framework, severity, or status filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full rounded-lg border border-[#1F1F1F]">
                <table className="w-full min-w-[1040px] text-left text-xs table-fixed">
                  <thead>
                    <tr className="border-b border-[#1F1F1F] text-xs font-mono text-[#8E8E93] uppercase tracking-wider bg-[#080808]">
                      <th className="py-3 px-3.5 w-[120px] shrink-0">Status</th>
                      <th className="py-3 px-3.5 w-[110px] shrink-0">Severity</th>
                      <th className="py-3 px-3.5 w-[180px] shrink-0">Framework & Control</th>
                      <th className="py-3 px-3.5 min-w-[260px]">Title</th>
                      <th className="py-3 px-3.5 w-[220px] shrink-0">Actual vs Expected</th>
                      <th className="py-3 px-3.5 w-[200px] shrink-0 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181818] bg-[#0B0B0B]">
                    {filteredFindings.map((f) => {
                      const isPass = f.status === "PASS";
                      const isFail = f.status === "FAIL";
                      const isNA = f.status === "NOT_APPLICABLE";
                      const isUnknown = f.status === "UNKNOWN";

                      return (
                        <tr
                          key={f.id}
                          onClick={() => {
                            setInspectingFinding(f);
                            setFindingExplanation(null);
                          }}
                          className="hover:bg-[#101010] transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-3.5 w-[120px] shrink-0">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase border whitespace-nowrap",
                                isPass && "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30",
                                isFail && "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30",
                                isNA && "bg-[#141414] text-[#8E8E93] border-[#242424]",
                                isUnknown && "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
                              )}
                            >
                              {isPass && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                              {isFail && <XCircle className="w-3.5 h-3.5 shrink-0" />}
                              {isNA && <ShieldCheck className="w-3.5 h-3.5 shrink-0" />}
                              {isUnknown && <HelpCircle className="w-3.5 h-3.5 shrink-0" />}
                              <span>{f.status}</span>
                            </span>
                          </td>

                          <td className="py-3 px-3.5 w-[110px] shrink-0 font-mono">
                            <span
                              className={cn(
                                "text-xs font-bold uppercase whitespace-nowrap",
                                isNA && "text-[#555555]",
                                !isNA && f.severity === "CRITICAL" && "text-[#EF4444]",
                                !isNA && f.severity === "HIGH" && "text-[#F59E0B]",
                                !isNA && f.severity === "MEDIUM" && "text-[#F59E0B]/80",
                                !isNA && f.severity === "LOW" && "text-[#8E8E93]",
                                !isNA && f.severity === "INFO" && "text-[#555555]"
                              )}
                            >
                              {isNA ? "N/A" : f.severity}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 w-[180px] shrink-0 font-mono">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded bg-[#080808] border border-[#1F1F1F] text-[#8E8E93] text-[11px] font-bold shrink-0">
                                {f.framework}
                              </span>
                              <span className="text-[#F2F2F2] font-semibold text-xs truncate">{f.control_id}</span>
                            </div>
                            {f.category && (
                              <div className="text-[11px] text-[#666666] mt-0.5 truncate">{f.category}</div>
                            )}
                          </td>

                          <td className="py-3 px-3.5 min-w-[260px]">
                            <div className="font-semibold text-sm text-[#F2F2F2] group-hover:text-white transition-colors line-clamp-1">
                              {f.title}
                            </div>
                            <div className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5 font-sans">
                              {f.description}
                            </div>
                          </td>

                          <td className="py-3 px-3.5 w-[220px] shrink-0 font-mono text-xs">
                            <div className="space-y-0.5">
                              <div className="text-[#666666] truncate">
                                Actual: <span className={cn(
                                  "font-semibold",
                                  isPass ? "text-[#10B981]" : isNA ? "text-[#8E8E93]" : "text-[#EF4444]"
                                )}>{f.actual_value || "—"}</span>
                              </div>
                              <div className="text-[#666666] truncate">
                                Expected: <span className="text-[#8E8E93]">{f.expected_value || "—"}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3.5 w-[200px] shrink-0 text-right">
                            <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectingFinding(f);
                                  setFindingExplanation(null);
                                  handleExplainFinding(f.id);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#141414] hover:bg-[#1C1C1C] text-[#8E8E93] hover:text-[#F2F2F2] border border-[#262626] text-xs font-mono transition-colors shrink-0 cursor-pointer"
                                title="AI Explanation"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                                <span>AI Explain</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectingFinding(f);
                                  setFindingExplanation(null);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#080808] hover:bg-[#141414] text-[#8E8E93] hover:text-white border border-[#1F1F1F] text-xs font-mono transition-colors shrink-0 cursor-pointer"
                                title="Inspect Finding Details"
                              >
                                <Terminal className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                                <span>Details</span>
                              </button>
                            </div>
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
          <div className="bg-[#0B0B0B] border-l border-[#1F1F1F] w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#1F1F1F] bg-[#080808] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border",
                      inspectingFinding.status === "PASS" && "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25",
                      inspectingFinding.status === "FAIL" && "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25",
                      inspectingFinding.status === "NOT_APPLICABLE" && "bg-[#888888]/10 text-[#888888] border-[#888888]/25",
                      inspectingFinding.status === "UNKNOWN" && "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25"
                    )}
                  >
                    {inspectingFinding.status}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#D4D4D8]">
                    {inspectingFinding.framework} • {inspectingFinding.control_id}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#F2F2F2]">{inspectingFinding.title}</h3>
              </div>

              <button
                onClick={() => {
                  setInspectingFinding(null);
                  setFindingExplanation(null);
                }}
                className="p-1.5 rounded-lg text-[#888888] hover:text-white hover:bg-[#141414] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-mono">
              {/* AI Explanation Banner / Action */}
              <div className="p-4 rounded-lg bg-[#0E0E11] border border-[#8B5CF6]/25 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#A78BFA] font-semibold text-xs">
                    <Sparkles className="w-4 h-4 text-[#A78BFA]" />
                    <span>Evidence-Grounded AI Analysis</span>
                  </div>

                  <button
                    onClick={() => handleExplainFinding(inspectingFinding.id)}
                    disabled={isExplaining}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#1A1829] hover:bg-[#25223D] text-[#C4B5FD] border border-[#8B5CF6]/40 text-[11px] font-mono font-semibold disabled:opacity-50 transition-colors shadow-sm"
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
                      <div className="text-[10px] font-mono text-[#A78BFA] uppercase font-bold">Executive Summary</div>
                      <p className="text-[#E5E5E5] leading-relaxed bg-[#080808] p-2.5 rounded border border-[#1F1F1F]">
                        {findingExplanation.summary}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-[#A78BFA] uppercase font-bold">Why It Matters & Risk Context</div>
                      <p className="text-[#A0A0A0] leading-relaxed bg-[#080808] p-2.5 rounded border border-[#1F1F1F]">
                        {findingExplanation.why_it_matters} {findingExplanation.risk_context}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-[#10B981] uppercase font-bold">Recommended Remediation</div>
                      <pre className="p-2.5 rounded bg-[#080808] border border-[#10B981]/25 text-[11px] font-mono text-[#10B981] overflow-x-auto">
                        {findingExplanation.recommended_action}
                      </pre>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#666666] pt-1">
                      <span>Model Confidence: {(findingExplanation.confidence * 100).toFixed(0)}%</span>
                      <span>{findingExplanation.disclaimer}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#080808] border border-[#1F1F1F]">
                  <div className="text-[10px] text-[#666666] uppercase">Severity Level</div>
                  <div
                    className={cn(
                      "text-xs font-bold mt-1 uppercase",
                      inspectingFinding.severity === "CRITICAL" && "text-[#EF4444]",
                      inspectingFinding.severity === "HIGH" && "text-[#F59E0B]",
                      inspectingFinding.severity === "MEDIUM" && "text-[#F59E0B]/80",
                      inspectingFinding.severity === "LOW" && "text-[#888888]"
                    )}
                  >
                    {inspectingFinding.severity}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#080808] border border-[#1F1F1F]">
                  <div className="text-[10px] text-[#666666] uppercase">Category Domain</div>
                  <div className="text-xs font-bold text-[#A0A0A0] mt-1">
                    {inspectingFinding.category || "General"}
                  </div>
                </div>
              </div>

              {/* Verified Document Citation */}
              {inspectingFinding.finding_metadata?.source && (
                <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#E0E0E0] text-[11px] font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-[#888888]" />
                    <span>Verified Official Citation</span>
                  </div>
                  <div className="text-[#F2F2F2] text-[11px]">
                    Document: <strong>{inspectingFinding.finding_metadata.source.document}</strong>
                  </div>
                  <div className="text-[#666666] text-[10px]">
                    Reference: {inspectingFinding.finding_metadata.source.reference} (v
                    {inspectingFinding.finding_metadata.source.version})
                  </div>
                </div>
              )}

              {/* Value Comparison */}
              <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-2">
                <div className="text-[10px] text-[#666666] uppercase">Deterministic Value Evaluation</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
                    <div className="text-[#666666] text-[10px]">Actual Extracted Value:</div>
                    <div className="text-[#EF4444] font-bold mt-0.5">{inspectingFinding.actual_value}</div>
                  </div>
                  <div className="p-2 rounded bg-[#0B0B0B] border border-[#1F1F1F]">
                    <div className="text-[#666666] text-[10px]">Expected Compliant Value:</div>
                    <div className="text-[#10B981] font-bold mt-0.5">{inspectingFinding.expected_value}</div>
                  </div>
                </div>
              </div>

              {/* Verbatim Configuration Evidence Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#666666]">
                  <span className="flex items-center gap-1 text-[#E0E0E0] font-semibold">
                    <Terminal className="w-3 h-3 text-[#888888]" />
                    <span>Verbatim Configuration Evidence</span>
                  </span>
                  <span className="text-[#666666]">
                    Line(s):{" "}
                    <strong className="text-[#F2F2F2]">
                      {(inspectingFinding.finding_metadata?.source_lines?.filter((l: number) => l > 0) || []).length > 0
                        ? inspectingFinding.finding_metadata?.source_lines?.filter((l: number) => l > 0).join(", ")
                        : "No direct evidence"}
                    </strong>
                  </span>
                </div>

                <pre className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-[11px] font-mono text-[#E5E5E5] overflow-x-auto leading-relaxed select-text">
                  {inspectingFinding.evidence || "[No direct line evidence — unconfigured directive]"}
                </pre>
              </div>

              {/* Technical Risk Explanation */}
              {inspectingFinding.description && (
                <div className="space-y-1">
                  <div className="text-[10px] text-[#666666] uppercase">Rule Specification</div>
                  <p className="text-[#A0A0A0] text-xs leading-relaxed font-sans bg-[#080808] p-3 rounded-lg border border-[#1F1F1F]">
                    {inspectingFinding.description}
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#1F1F1F] bg-[#080808] flex items-center justify-between">
              {inspectingFinding.status === "FAIL" ? (
                <Link
                  href="/remediation"
                  className="px-3.5 py-1.5 rounded-lg bg-[#121212] hover:bg-[#181818] text-[#10B981] border border-[#10B981]/30 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>View Remediation Fix</span>
                </Link>
              ) : (
                <span className={cn(
                  "text-xs font-mono font-semibold flex items-center gap-1.5",
                  inspectingFinding.status === "PASS" ? "text-[#10B981]" : "text-[#888888]"
                )}>
                  {inspectingFinding.status === "PASS" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Control Verified Compliant</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Control Not Applicable</span>
                    </>
                  )}
                </span>
              )}

              <button
                onClick={() => {
                  setInspectingFinding(null);
                  setFindingExplanation(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#121212] hover:bg-[#181818] border border-[#1F1F1F] text-[#F2F2F2] text-xs font-mono transition-colors"
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
          <div className="bg-[#0B0B0B] border-l border-[#1F1F1F] w-full max-w-xl h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Assistant Header */}
            <div className="p-4 border-b border-[#1F1F1F] bg-[#080808] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#141418] border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#F2F2F2] flex items-center gap-2">
                    <span>NetVigil AI Audit Co-Pilot</span>
                    <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/25">
                      Read-Only Grounded
                    </span>
                  </h3>
                  <p className="text-[10px] text-[#666666] font-mono">Grounded in Active Audit Session Findings</p>
                </div>
              </div>

              <button
                onClick={() => setIsAssistantOpen(false)}
                className="p-1.5 rounded-lg text-[#666666] hover:text-white hover:bg-[#141414] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="p-3 bg-[#080808] border-b border-[#1F1F1F] flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
              <span className="text-[#666666] text-[10px] whitespace-nowrap">Suggested:</span>
              {[
                "What should I fix first?",
                "Why did this device fail CIS?",
                "List all Critical findings",
                "Which findings affect remote access?",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendAssistantQuery(chip)}
                  className="px-2.5 py-1 rounded bg-[#0E0E0E] hover:bg-[#181818] hover:text-[#A78BFA] text-[#A0A0A0] border border-[#1F1F1F] whitespace-nowrap transition-colors"
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
                      <div className="w-7 h-7 rounded-lg bg-[#141418] border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA] flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "p-3.5 rounded-lg text-xs max-w-[85%] leading-relaxed",
                        isAssistant
                          ? "bg-[#0E0E0E] border border-[#1F1F1F] text-[#F2F2F2] font-sans"
                          : "bg-[#181818] border border-[#2A2A2A] text-[#F2F2F2] font-sans"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Supporting Findings Badges */}
                      {msg.supporting_findings && msg.supporting_findings.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#1F1F1F] space-y-1.5">
                          <div className="text-[10px] font-mono text-[#A78BFA] font-bold uppercase">
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
                                className="px-2 py-0.5 rounded bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#C4B5FD] border border-[#8B5CF6]/25 text-[10px] font-mono font-semibold transition-colors"
                              >
                                {findingRef}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-[#666666] mt-2 text-right">{msg.timestamp}</div>
                    </div>
                  </div>
                );
              })}

              {isAssistantLoading && (
                <div className="flex gap-3 items-center text-[#A0A0A0] font-mono text-xs p-3 rounded-lg bg-[#080808] border border-[#1F1F1F]">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#A78BFA]" />
                  <span>NetVigil AI is analyzing audit session findings...</span>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="p-3.5 border-t border-[#1F1F1F] bg-[#080808]">
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
                  className="flex-1 px-3.5 py-2 rounded-lg bg-[#0E0E0E] border border-[#1F1F1F] text-xs text-[#F2F2F2] placeholder-[#666666] focus:outline-none focus:border-[#2A2A2A] font-sans"
                />
                <button
                  type="submit"
                  disabled={!assistantInput.trim() || isAssistantLoading}
                  className="p-2 rounded-lg bg-[#141414] hover:bg-[#1F1F1F] border border-[#242424] disabled:opacity-40 text-[#F2F2F2] transition-colors"
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
          <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#1F1F1F] bg-[#080808] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-[#D4D4D8] fill-current" />
                <h3 className="text-sm font-bold text-[#F2F2F2]">Execute Compliance Audit</h3>
              </div>
              <button
                onClick={() => setIsLaunchModalOpen(false)}
                className="p-1 rounded text-[#666666] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono">
              <div className="space-y-1.5">
                <label className="text-[#A0A0A0] font-semibold">Select Configuration Target:</label>
                <select
                  value={selectedConfigForAudit}
                  onChange={(e) => setSelectedConfigForAudit(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-[#F2F2F2] text-xs focus:outline-none focus:border-[#2A2A2A]"
                >
                  {configurations.map((cfg) => (
                    <option key={cfg.id} value={cfg.id}>
                      {cfg.original_filename} ({cfg.detected_vendor} - {cfg.hash.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[#A0A0A0] font-semibold">Target Compliance Frameworks:</label>
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
                            ? "bg-[#141414] border-[#2A2A2A] text-[#F2F2F2]"
                            : "bg-[#080808] border-[#1F1F1F] text-[#666666] hover:text-[#A0A0A0]"
                        )}
                      >
                        <span className="font-bold">{fw}</span>
                        <div
                          className={cn(
                            "w-4 h-4 rounded flex items-center justify-center border",
                            isSelected ? "bg-[#242424] border-[#383838] text-white" : "border-[#1F1F1F]"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-[#666666] leading-relaxed pt-1">
                Deterministic rules will evaluate the canonical Universal Security Model. Zero unverified LLM trust.
              </p>
            </div>

            <div className="p-4 border-t border-[#1F1F1F] bg-[#080808] flex items-center justify-end gap-2">
              <button
                onClick={() => setIsLaunchModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#121212] hover:bg-[#181818] text-[#A0A0A0] hover:text-white border border-[#1F1F1F] text-xs font-mono transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunchAudit}
                disabled={createAuditMutation.isPending || configurations.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] text-[#F2F2F2] border border-[#2A2A2A] text-xs font-semibold font-mono disabled:opacity-50 transition-colors shadow-sm"
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

export default function AuditsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[#636366] font-mono">Loading Security Audits...</div>}>
      <AuditsPageContent />
    </Suspense>
  );
}

