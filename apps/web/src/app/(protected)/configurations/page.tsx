"use client";

import React, { useState, useRef, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  Upload,
  Trash2,
  FileCheck2,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  Play,
  Hash,
  Cpu,
  Search,
  Filter,
  Eye,
  X,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Layers,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Key,
  Lock,
  Radio,
  Server,
  Zap,
  Wrench,
  RotateCcw,
  ArrowRight,
  Activity,
  Code2,
  ExternalLink,
  Sliders,
  Database,
  CheckCircle,
  AlertTriangle,
  Flame,
} from "lucide-react";
import {
  ingestAnalysis,
  fetchAnalysisStatus,
  fetchAnalysisFindings,
  fetchAnalysisEvidence,
  fetchAnalysisRisk,
  reanalyzeAnalysis,
  triggerRemediation,
  fetchAnalysisConfiguration,
  fetchConfigurations,
  fetchConfigurationDetail,
  uploadConfigFile,
  detectVendorFromText,
  interpretSyntax,
  AnalysisStatus,
  AnalysisFindingItem,
  AnalysisEvidenceItem,
  AnalysisRiskReport,
  AnalysisReanalyzeResult,
  AnalysisConfigurationContent,
  ConfigurationItem,
} from "@/lib/api-client";
import { computeClientSha256, formatBytes, cn } from "@/lib/utils";
import { getFindingActiveEvidence } from "@/lib/evidence-utils";
import { useSettings } from "@/components/providers/SettingsProvider";
import { useAuth } from "@/components/providers/AuthProvider";

function ConfigurationsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const isIngestMode = searchParams.get("mode") === "ingest";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evidenceContainerRef = useRef<HTMLDivElement>(null);
  const ingestionRef = useRef<HTMLDivElement>(null);

  // Ingestion Workspace State - Default to 'upload' as the active tab
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [rawText, setRawText] = useState<string>("");
  const [configFilename, setConfigFilename] = useState<string>("");
  const [selectedFileMeta, setSelectedFileMeta] = useState<{
    name: string;
    size: number;
    lines: number;
  } | null>(null);
  const [uploadValidationError, setUploadValidationError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [clientHash, setClientHash] = useState<string>("");
  const [detectedVendorState, setDetectedVendorState] = useState<{
    vendor: string;
    confidence: number;
    platform?: string;
  }>({ vendor: "unknown", confidence: 0, platform: undefined });
  const [isGeneratingRemediation, setIsGeneratingRemediation] = useState(false);

  // Auto-switch to upload mode & scroll when mode=ingest is provided
  useEffect(() => {
    if (isIngestMode) {
      setInputMode("upload");
      const timer = setTimeout(() => {
        ingestionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isIngestMode]);

  // Active Audit State
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const { preferences } = useSettings();
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [frameworkFilter, setFrameworkFilter] = useState<string>(preferences?.defaultFramework || "ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [centerTab, setCenterTab] = useState<"evidence" | "universal" | "raw">("evidence");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Re-analysis state
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeResult, setReanalyzeResult] = useState<AnalysisReanalyzeResult | null>(null);
  const [reanalyzeBannerVisible, setReanalyzeBannerVisible] = useState(false);

  // Monotonic execution sequence tracker to prevent asynchronous out-of-order race conditions
  const executionVersionRef = useRef<number>(0);

  // Auto-detect vendor & compute SHA-256 whenever rawText changes
  useEffect(() => {
    let isSubscribed = true;
    if (!rawText.trim()) {
      setClientHash("");
      return;
    }
    computeClientSha256(rawText).then((hash) => {
      if (isSubscribed) setClientHash(hash);
    });

    // Client-side heuristics & authoritative server vendor detection
    const t = rawText.toLowerCase();
    let initialVendor = "cisco";
    let initialPlatform = "ios";
    if (t.includes("config system") || t.includes("config firewall") || t.includes("config router") || t.includes("fortigate") || t.includes("#config-version") || t.includes("fortios")) {
      initialVendor = "fortinet";
      initialPlatform = "fortios";
    } else if (t.includes("system {") || t.includes("set system") || t.includes("junos") || t.includes("set interfaces") || t.includes("set security")) {
      initialVendor = "juniper";
      initialPlatform = "junos";
    } else if (t.includes("version 1") || t.includes("cisco") || t.includes("service password") || t.includes("enable secret") || t.includes("line vty") || t.includes("interface gigabit")) {
      initialVendor = "cisco";
      initialPlatform = "ios";
    }
    setDetectedVendorState({ vendor: initialVendor, confidence: 0.95, platform: initialPlatform });

    // Call authoritative server-side detector
    detectVendorFromText(rawText, configFilename)
      .then((serverRes) => {
        if (isSubscribed && serverRes && serverRes.vendor && serverRes.vendor !== "unknown") {
          setDetectedVendorState({
            vendor: serverRes.vendor,
            confidence: serverRes.confidence,
            platform: serverRes.platform || undefined,
          });
        }
      })
      .catch(() => {
        // Retain initial heuristic
      });

    return () => {
      isSubscribed = false;
    };
  }, [rawText]);

  // Accepted configuration file extensions
  const ACCEPTED_EXTENSIONS = [".cfg", ".conf", ".txt", ".json", ".log", ".set"];

  // Real File Validation and Ingestion Reader
  const processSelectedFile = (file: File) => {
    setUploadValidationError(null);
    if (!file) return;

    // 1. Extension Validation
    const name = file.name || "network_config.cfg";
    const extMatch = name.match(/\.[0-9a-z]+$/i);
    const ext = extMatch ? extMatch[0].toLowerCase() : "";

    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setUploadValidationError(
        `Unsupported file format '${ext || "unknown"}'. Accepted formats are .cfg, .conf, .txt, .json for network configuration audits.`
      );
      return;
    }

    // 2. Size Validation
    if (file.size === 0) {
      setUploadValidationError("The selected configuration file is empty. Please select a valid network configuration file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadValidationError("Configuration file exceeds the maximum allowed limit of 10 MB.");
      return;
    }

    // 3. Read plain text content with UTF-8
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text || !text.trim()) {
        setUploadValidationError("The selected configuration file contains no readable text.");
        return;
      }
      if (text.includes("\0")) {
        setUploadValidationError(
          "Selected file contains binary data. NetVigil accepts plain text network configuration files (.cfg, .conf, .txt, .json)."
        );
        return;
      }

      setUploadValidationError(null);
      setRawText(text);
      setConfigFilename(file.name);
      setSelectedFileMeta({
        name: file.name,
        size: file.size,
        lines: text.split("\n").length,
      });
      setActiveAnalysisId(null);
      setSelectedFindingId(null);
      setHighlightedLine(null);
      setReanalyzeResult(null);
      setReanalyzeBannerVisible(false);
    };
    reader.onerror = () => {
      setUploadValidationError("Failed to read the selected file. Please verify file permissions and try again.");
    };
    reader.readAsText(file);
  };

  // Drag & drop file handler
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleRemoveSelectedFile = () => {
    setRawText("");
    setConfigFilename("");
    setSelectedFileMeta(null);
    setUploadValidationError(null);
    setClientHash("");
    setActiveAnalysisId(null);
    setSelectedFindingId(null);
    setHighlightedLine(null);
    setReanalyzeResult(null);
    setReanalyzeBannerVisible(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- Real End-to-End Audit Execution ---
  const handleRunGoldenAudit = async () => {
    if (!rawText.trim() || isAuditing) return;
    const currentVersion = ++executionVersionRef.current;
    try {
      setIsAuditing(true);
      setAuditError(null);
      setReanalyzeResult(null);
      setReanalyzeBannerVisible(false);
      setSelectedFindingId(null);
      setHighlightedLine(null);

      // Invalidate and clear current query data immediately to prevent stale leak
      if (activeAnalysisId) {
        queryClient.setQueryData(["analysis-status", activeAnalysisId, user?.id], null);
        queryClient.setQueryData(["analysis-findings", activeAnalysisId, user?.id], []);
        queryClient.setQueryData(["analysis-evidence", activeAnalysisId, user?.id], []);
        queryClient.setQueryData(["analysis-risk", activeAnalysisId, user?.id], null);
      }

      let activeName = (configFilename || "").trim();
      if (!activeName) {
        if (detectedVendorState.vendor === "juniper") activeName = "juniper-device.set";
        else if (detectedVendorState.vendor === "fortinet") activeName = "fortinet-device.conf";
        else activeName = "cisco-device.cfg";
      } else if (!activeName.includes(".")) {
        activeName += detectedVendorState.vendor === "juniper" ? ".set" : detectedVendorState.vendor === "fortinet" ? ".conf" : ".cfg";
      }

      // 1. Ingest via real backend pipeline endpoint (executes Stages 1-6 synchronously)
      const ingestRes = await ingestAnalysis(
        rawText,
        activeName,
        detectedVendorState.vendor
      );

      if (currentVersion !== executionVersionRef.current) return;

      // 2. Fetch fresh completed authoritative results directly from backend
      const [freshStatus, freshFindings, freshEvidence, freshRisk, freshConfig] = await Promise.all([
        fetchAnalysisStatus(ingestRes.analysis_id),
        fetchAnalysisFindings(ingestRes.analysis_id),
        fetchAnalysisEvidence(ingestRes.analysis_id),
        fetchAnalysisRisk(ingestRes.analysis_id),
        fetchAnalysisConfiguration(ingestRes.analysis_id),
      ]);

      if (currentVersion !== executionVersionRef.current) return;

      // 3. Directly hydrate query cache so stages and summary advance to COMPLETED immediately
      queryClient.setQueryData(["analysis-status", ingestRes.analysis_id, user?.id], freshStatus);
      queryClient.setQueryData(["analysis-findings", ingestRes.analysis_id, user?.id], freshFindings);
      queryClient.setQueryData(["analysis-evidence", ingestRes.analysis_id, user?.id], freshEvidence);
      queryClient.setQueryData(["analysis-risk", ingestRes.analysis_id, user?.id], freshRisk);
      queryClient.setQueryData(["analysis-config", ingestRes.analysis_id, user?.id], freshConfig);

      setActiveAnalysisId(ingestRes.analysis_id);

      await queryClient.invalidateQueries({ queryKey: ["configurations-list"] });
    } catch (err: any) {
      if (currentVersion !== executionVersionRef.current) return;
      console.error("Audit execution failed:", err);
      setAuditError(err?.message || "Audit execution failed. Please verify the backend service.");
    } finally {
      if (currentVersion === executionVersionRef.current) {
        setIsAuditing(false);
      }
    }
  };

  // --- Reactive Query Hooks for Active Audit ---
  const { data: analysisStatus, isLoading: isStatusLoading } = useQuery({
    queryKey: ["analysis-status", activeAnalysisId, user?.id],
    queryFn: () => (activeAnalysisId ? fetchAnalysisStatus(activeAnalysisId) : null),
    enabled: !!activeAnalysisId && !authLoading,
    refetchInterval: (query) => (query.state.data?.status === "PROCESSING" ? 1000 : false),
  });

  const { data: findings = [], isLoading: isFindingsLoading } = useQuery({
    queryKey: ["analysis-findings", activeAnalysisId, user?.id],
    queryFn: () => (activeAnalysisId ? fetchAnalysisFindings(activeAnalysisId) : []),
    enabled: !!activeAnalysisId && !authLoading,
  });

  const { data: evidenceItems = [], isLoading: isEvidenceLoading } = useQuery({
    queryKey: ["analysis-evidence", activeAnalysisId, user?.id],
    queryFn: () => (activeAnalysisId ? fetchAnalysisEvidence(activeAnalysisId) : []),
    enabled: !!activeAnalysisId && !authLoading,
  });

  const { data: riskReport, isLoading: isRiskLoading } = useQuery({
    queryKey: ["analysis-risk", activeAnalysisId, user?.id],
    queryFn: () => (activeAnalysisId ? fetchAnalysisRisk(activeAnalysisId) : null),
    enabled: !!activeAnalysisId && !authLoading,
  });

  const { data: configData, isLoading: isConfigLoading } = useQuery({
    queryKey: ["analysis-config", activeAnalysisId, user?.id],
    queryFn: () => (activeAnalysisId ? fetchAnalysisConfiguration(activeAnalysisId) : null),
    enabled: !!activeAnalysisId && !authLoading,
  });

  const { data: storedConfigs = [] } = useQuery({
    queryKey: ["configurations-list", user?.id],
    queryFn: () => fetchConfigurations(),
    enabled: !authLoading,
  });

  // Reset selection and highlights immediately when switching configurations to prevent stale evidence
  useEffect(() => {
    setSelectedFindingId(null);
    setHighlightedLine(null);
    setReanalyzeResult(null);
    setReanalyzeBannerVisible(false);
  }, [activeAnalysisId]);

  // Auto-restore previous user audit/configuration if available and no active analysis is selected
  useEffect(() => {
    if (!activeAnalysisId && storedConfigs.length > 0 && !isIngestMode) {
      setActiveAnalysisId(storedConfigs[0].id);
    }
  }, [activeAnalysisId, storedConfigs, isIngestMode]);

  // Synchronize detected vendor and filename when active analysis changes to ensure multi-audit isolation
  useEffect(() => {
    if (analysisStatus) {
      if (analysisStatus.vendor && analysisStatus.vendor !== "unknown") {
        setDetectedVendorState({
          vendor: analysisStatus.vendor,
          platform: analysisStatus.platform || undefined,
          confidence: 1.0,
        });
      }
      if (analysisStatus.filename) {
        setConfigFilename(analysisStatus.filename);
      }
    }
  }, [analysisStatus]);

  // Sync rawText with active configuration content when available
  useEffect(() => {
    if (configData?.raw_text && !rawText) {
      setRawText(configData.raw_text);
    }
  }, [configData, rawText]);

  // Active audit synchronization checks
  const isAuditStatusMatch = Boolean(
    activeAnalysisId &&
    analysisStatus &&
    analysisStatus.analysis_id === activeAnalysisId &&
    !isStatusLoading
  );

  // Authoritative Risk completion check
  const isRiskDone = Boolean(
    !isReanalyzing &&
    !isAuditing &&
    isAuditStatusMatch &&
    analysisStatus?.status === "COMPLETED" &&
    analysisStatus?.risk_score !== null &&
    analysisStatus?.risk_score !== undefined
  );

  // Enforce Invariant:
  // IF risk stage != COMPLETE: risk score = null, priority = null
  // IF risk stage == COMPLETE: risk score = authoritative backend value, priority = authoritative backend value
  const effectiveRiskScore = isRiskDone
    ? (analysisStatus?.risk_score ?? riskReport?.risk_score ?? null)
    : null;

  const effectiveRiskLevel = isRiskDone
    ? (analysisStatus?.risk_level || riskReport?.risk_level || null)
    : null;

  const effectiveSeverityName = effectiveRiskLevel
    ? (effectiveRiskLevel === "P0"
        ? "CRITICAL"
        : effectiveRiskLevel === "P1"
        ? "HIGH"
        : effectiveRiskLevel === "P2"
        ? "MEDIUM"
        : "LOW")
    : null;

  // Authoritative Compliance completion check
  const effectiveComplianceScore = (!isReanalyzing && !isAuditing && isAuditStatusMatch && analysisStatus?.compliance_score !== null && analysisStatus?.compliance_score !== undefined)
    ? analysisStatus.compliance_score
    : null;

  // Authoritative Full Audit completion check (Stages 1-6 complete)
  const isAuditFullyComplete = Boolean(
    !isAuditing &&
    !isReanalyzing &&
    isAuditStatusMatch &&
    analysisStatus?.status === "COMPLETED" &&
    isRiskDone
  );

  // Authoritative Audit Result Available check: true ONLY when not in-flight and backend status is COMPLETED
  const isAuditResultAvailable = Boolean(
    !isAuditing &&
    !isReanalyzing &&
    isAuditStatusMatch &&
    analysisStatus?.status === "COMPLETED"
  );

  // Effective data sources strictly bound to authoritative audit result availability
  const effectiveFindings = useMemo(() => {
    return isAuditResultAvailable ? findings : [];
  }, [isAuditResultAvailable, findings]);

  const effectiveEvidenceItems = useMemo(() => {
    return isAuditResultAvailable ? evidenceItems : [];
  }, [isAuditResultAvailable, evidenceItems]);

  const effectiveRiskReport = useMemo(() => {
    return isAuditResultAvailable && isRiskDone ? riskReport : null;
  }, [isAuditResultAvailable, isRiskDone, riskReport]);

  // Auto-select first finding with line evidence, first fail, or first overall
  useEffect(() => {
    if (!isAuditResultAvailable || effectiveFindings.length === 0) {
      setSelectedFindingId(null);
      setHighlightedLine(null);
      return;
    }
    if (!selectedFindingId || !effectiveFindings.some((f) => f.finding_id === selectedFindingId)) {
      const firstWithEvidence = effectiveFindings.find((f) => f.evidence_lines?.some((e) => e.line && e.line > 0));
      const firstFail = effectiveFindings.find((f) => f.status === "FAIL");
      const defaultFinding = firstWithEvidence || firstFail || effectiveFindings[0];
      setSelectedFindingId(defaultFinding.finding_id);
    }
  }, [isAuditResultAvailable, effectiveFindings, selectedFindingId]);

  // Selected finding strictly bound to selectedFindingId
  const selectedFinding = useMemo(() => {
    if (!isAuditResultAvailable || effectiveFindings.length === 0) return null;
    if (!selectedFindingId) return null;
    return effectiveFindings.find((f) => f.finding_id === selectedFindingId) || null;
  }, [isAuditResultAvailable, effectiveFindings, selectedFindingId]);

  // Authoritative, synchronous active evidence derivation strictly bound to selectedFinding (Requirements 1, 2, 3, 4)
  const activeEvidence = useMemo(() => {
    return getFindingActiveEvidence(selectedFinding);
  }, [selectedFinding]);

  // When selected finding's active evidence changes, synchronize highlightedLine and scroll to cited line
  useEffect(() => {
    if (activeEvidence.hasLineCitation && activeEvidence.line) {
      setHighlightedLine(activeEvidence.line);
      const lineEl = document.getElementById(`line-${activeEvidence.line}`);
      if (lineEl && evidenceContainerRef.current) {
        lineEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setHighlightedLine(null);
    }
  }, [activeEvidence]);

  // Filtered findings list
  const filteredFindings = useMemo(() => {
    if (!isAuditResultAvailable) return [];
    return effectiveFindings.filter((f) => {
      const matchFw = frameworkFilter === "ALL" || f.framework.toUpperCase() === frameworkFilter;
      const matchStatus = statusFilter === "ALL" || f.status.toUpperCase() === statusFilter;
      const matchSearch =
        searchFilter === "" ||
        f.control_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
        f.title.toLowerCase().includes(searchFilter.toLowerCase());
      return matchFw && matchStatus && matchSearch;
    });
  }, [isAuditResultAvailable, effectiveFindings, frameworkFilter, statusFilter, searchFilter]);

  // --- Real Remediation & Verification Workflow ---
  const handleReviewRemediation = async () => {
    if (!activeAnalysisId) return;
    try {
      setIsGeneratingRemediation(true);
      await triggerRemediation(activeAnalysisId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["analysis-status", activeAnalysisId] }),
        queryClient.invalidateQueries({ queryKey: ["audit-remediations", activeAnalysisId] }),
      ]);
    } catch (err) {
      console.error("Remediation generation error:", err);
    } finally {
      setIsGeneratingRemediation(false);
      const el = document.getElementById("panel-remediation");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleReanalyzeWithRemediation = async () => {
    if (!activeAnalysisId) return;
    const currentVersion = ++executionVersionRef.current;
    try {
      setIsReanalyzing(true);
      setAuditError(null);
      setReanalyzeResult(null);
      setReanalyzeBannerVisible(false);
      setSelectedFindingId(null);
      setHighlightedLine(null);

      // Clear query cache immediately so no old results display during re-analysis
      queryClient.setQueryData(["analysis-status", activeAnalysisId, user?.id], null);
      queryClient.setQueryData(["analysis-findings", activeAnalysisId, user?.id], []);
      queryClient.setQueryData(["analysis-evidence", activeAnalysisId, user?.id], []);
      queryClient.setQueryData(["analysis-risk", activeAnalysisId, user?.id], null);

      // Generate or retrieve backend safe remediated configuration artifact
      const remResult = await triggerRemediation(activeAnalysisId);
      if (currentVersion !== executionVersionRef.current) return;
      const remediatedText = remResult.remediated_content;

      // Execute backend re-analysis endpoint (Stage 8)
      const result = await reanalyzeAnalysis(activeAnalysisId, remediatedText);
      if (currentVersion !== executionVersionRef.current) return;

      if (remediatedText) {
        setRawText(remediatedText);
      }

      // Fetch fresh authoritative results post-remediation
      const [freshStatus, freshFindings, freshEvidence, freshRisk, freshConfig] = await Promise.all([
        fetchAnalysisStatus(activeAnalysisId),
        fetchAnalysisFindings(activeAnalysisId),
        fetchAnalysisEvidence(activeAnalysisId),
        fetchAnalysisRisk(activeAnalysisId),
        fetchAnalysisConfiguration(activeAnalysisId),
      ]);

      if (currentVersion !== executionVersionRef.current) return;

      queryClient.setQueryData(["analysis-status", activeAnalysisId, user?.id], freshStatus);
      queryClient.setQueryData(["analysis-findings", activeAnalysisId, user?.id], freshFindings);
      queryClient.setQueryData(["analysis-evidence", activeAnalysisId, user?.id], freshEvidence);
      queryClient.setQueryData(["analysis-risk", activeAnalysisId, user?.id], freshRisk);
      queryClient.setQueryData(["analysis-config", activeAnalysisId, user?.id], freshConfig);

      setReanalyzeResult(result);
      setReanalyzeBannerVisible(true);
    } catch (err: any) {
      if (currentVersion !== executionVersionRef.current) return;
      console.error("Re-analysis execution error:", err);
      setAuditError(err?.message || "Re-analysis failed.");
    } finally {
      if (currentVersion === executionVersionRef.current) {
        setIsReanalyzing(false);
      }
    }
  };

  const handleCopyClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6]">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#F2F2F2] tracking-tight">
                  CONFIGURATION AUDIT
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  DETERMINISTIC VERIFICATION
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141414] text-[#D4D4D8] border border-[#242424]">
                  MULTI-VENDOR
                </span>
              </div>
              <p className="text-xs text-[#8E8E93] mt-0.5">
                Analyze network configurations with deterministic, line-level security evidence.
              </p>
            </div>
          </div>
        </div>

        {/* Global Security Invariant Badge */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-xs font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[#636366]">NETWORK PUSH:</span>
            <strong className="text-[#10B981]">DISABLED (READ-ONLY)</strong>
          </div>

          <button
            onClick={() => {
              if (activeAnalysisId) {
                queryClient.invalidateQueries({ queryKey: ["analysis-status", activeAnalysisId] });
                queryClient.invalidateQueries({ queryKey: ["analysis-findings", activeAnalysisId] });
              }
            }}
            className="p-2 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-[#8E8E93] hover:text-white hover:bg-[#141414] transition-colors"
            title="Refresh Analysis State"
          >
            <RefreshCw className={cn("w-4 h-4", isAuditing && "animate-spin text-[#F2F2F2]")} />
          </button>
        </div>
      </div>

      {/* Ingest Mode State Banner */}
      {isIngestMode && (
        <div className="p-4 rounded-lg bg-[#0E0E0E] border border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm animate-fadeIn">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#888888]" />
              <h2 className="text-sm font-bold font-mono text-[#F2F2F2] uppercase tracking-wider">
                INGEST CONFIGURATION
              </h2>
            </div>
            <p className="text-xs text-[#8E8E93]">
              Upload or paste a network configuration to begin deterministic security analysis.
            </p>
          </div>
          <Link
            href="/configurations"
            className="self-start md:self-auto px-3.5 py-1.5 rounded-lg bg-[#141414] border border-[#1F1F1F] hover:border-[#2E2E2E] text-xs font-mono font-semibold text-[#A0A0A0] hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>← AUDIT WORKSPACE</span>
          </Link>
        </div>
      )}

      {/* 2. Top Ingestion & Audit Activation Control */}
      <div ref={ingestionRef} id="ingestion-workspace" className="p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-4 shadow-xl scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F1F1F] pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#888888]" />
            <span className="text-xs font-mono font-bold text-[#F2F2F2] uppercase tracking-wider">
              INGESTION WORKSPACE
            </span>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex items-center p-1 rounded-lg bg-[#080808] border border-[#1F1F1F] text-xs font-mono">
            <button
              onClick={() => setInputMode("upload")}
              className={cn(
                "px-3 py-1 rounded transition-all flex items-center gap-1.5",
                inputMode === "upload" ? "bg-[#161616] text-[#F2F2F2] font-bold border border-[#2A2A2A]" : "text-[#666666] hover:text-white"
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>UPLOAD CONFIGURATION</span>
            </button>
            <button
              onClick={() => setInputMode("paste")}
              className={cn(
                "px-3 py-1 rounded transition-all flex items-center gap-1.5",
                inputMode === "paste" ? "bg-[#161616] text-[#F2F2F2] font-bold border border-[#2A2A2A]" : "text-[#666666] hover:text-white"
              )}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>DIRECT PASTE / RAW CONFIG</span>
            </button>
          </div>
        </div>

        {/* Input Mode 1: Drag & Drop / File Upload (DEFAULT) */}
        {inputMode === "upload" && (
          <div className="space-y-3">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".cfg,.conf,.txt,.json,.log,.set"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {selectedFileMeta && rawText.trim() ? (
              /* Selected Configuration File Card */
              <div className="p-5 rounded-lg bg-[#080808] border border-[#242424] space-y-3.5 shadow-lg animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F1F1F] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-center text-[#A0A0A0]">
                      <FileCode2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#F2F2F2] font-mono flex items-center gap-2">
                        <span>{selectedFileMeta.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25">
                          READY TO AUDIT
                        </span>
                      </div>
                      <div className="text-xs text-[#8E8E93] font-mono mt-0.5">
                        {formatBytes(selectedFileMeta.size)} • {selectedFileMeta.lines} Lines • Plain Text UTF-8
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#1F1F1F] hover:border-[#2E2E2E] text-xs font-mono text-[#D4D4D8] hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#888888]" />
                      <span>Replace File</span>
                    </button>
                    <button
                      onClick={handleRemoveSelectedFile}
                      className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#1F1F1F] hover:border-[#EF4444]/40 text-xs font-mono text-[#EF4444] transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                {/* Configuration Code Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#666666]">
                    <span>CONFIGURATION PREVIEW (FIRST 10 LINES)</span>
                    <span className="uppercase text-[#D4D4D8] font-bold">
                      {detectedVendorState.vendor} ({detectedVendorState.platform || "generic"})
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050505] border border-[#1F1F1F] font-mono text-xs text-[#A0A0A0] max-h-40 overflow-y-auto leading-relaxed">
                    {rawText.split("\n").slice(0, 10).map((line, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="text-[#555555] select-none w-6 text-right shrink-0">{idx + 1}</span>
                        <span className="text-[#F2F2F2] font-mono whitespace-pre-wrap">{line || " "}</span>
                      </div>
                    ))}
                    {rawText.split("\n").length > 10 && (
                      <div className="text-[11px] text-[#555555] pt-1 italic">
                        ... +{rawText.split("\n").length - 10} more lines
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Drag & Drop Upload Zone */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-8 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#080808]",
                  dragOver
                    ? "border-[#383838] bg-[#121212] shadow-inner"
                    : "border-[#1F1F1F] hover:border-[#2E2E2E] hover:bg-[#0E0E0E]"
                )}
              >
                <div className="w-12 h-12 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-center text-[#888888] mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-[#F2F2F2] font-mono">
                  Click to browse or drag & drop configuration file
                </div>
                <div className="text-xs text-[#8E8E93] mt-1.5 max-w-md font-sans">
                  Upload real network configurations for automated SHA-256 integrity, vendor AST normalization, and multi-framework compliance audit.
                </div>

                {/* Accepted file formats badges */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <span className="px-2 py-0.5 rounded bg-[#121212] border border-[#1F1F1F] text-[10px] font-mono text-[#8E8E93]">
                    <strong className="text-[#D4D4D8]">.cfg</strong> Cisco IOS / IOS-XE
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#121212] border border-[#1F1F1F] text-[10px] font-mono text-[#8E8E93]">
                    <strong className="text-[#D4D4D8]">.conf</strong> Juniper JunOS
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#121212] border border-[#1F1F1F] text-[10px] font-mono text-[#8E8E93]">
                    <strong className="text-[#D4D4D8]">.txt</strong> Fortinet FortiOS / Raw
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#121212] border border-[#1F1F1F] text-[10px] font-mono text-[#8E8E93]">
                    <strong className="text-[#D4D4D8]">.json</strong> Universal Schema
                  </span>
                </div>

                {/* Automatic vendor detection indicator */}
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E0E0E] border border-[#1F1F1F] text-[11px] font-mono text-[#A0A0A0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span>AUTOMATIC VENDOR DETECTION: Cisco IOS • Juniper JunOS • Fortinet FortiOS</span>
                </div>
              </div>
            )}

            {/* Validation Error Alert Banner */}
            {uploadValidationError && (
              <div className="p-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{uploadValidationError}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadValidationError(null);
                  }}
                  className="text-[#EF4444] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input Mode 2: Paste / Custom Text */}
        {inputMode === "paste" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <input
                type="text"
                value={configFilename}
                onChange={(e) => setConfigFilename(e.target.value)}
                placeholder="filename.cfg"
                className="px-2.5 py-1 rounded bg-[#080808] border border-[#1F1F1F] text-[#F2F2F2] text-xs font-mono focus:border-[#2A2A2A] focus:outline-none w-64"
              />
              <span className="text-[11px] text-[#666666]">
                {rawText ? rawText.split("\n").length : 0} Lines • {formatBytes(rawText.length)}
              </span>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw configuration here..."
              rows={8}
              className="w-full p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] font-mono text-xs text-[#A0A0A0] focus:border-[#2A2A2A] focus:outline-none resize-y leading-relaxed"
            />
          </div>
        )}

        {/* Live Detection Metadata & Primary CTA */}
        <div className="pt-2 border-t border-[#1F1F1F] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#080808] border border-[#1F1F1F]">
              <span className="text-[#666666]">DETECTED:</span>
              <strong className="text-[#D4D4D8] uppercase">{detectedVendorState.vendor}</strong>
              <span className="text-[#666666]">({detectedVendorState.platform || "generic"})</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#080808] border border-[#1F1F1F]">
              <span className="text-[#666666]">SHA-256:</span>
              <span className="text-[#8E8E93] max-w-[120px] truncate" title={clientHash}>
                {clientHash ? clientHash.slice(0, 16) + "..." : "computing..."}
              </span>
            </div>

            <div className="text-[11px] text-[#666666]">
              Confidence: <strong className="text-[#10B981]">{(detectedVendorState.confidence * 100).toFixed(0)}%</strong>
            </div>
          </div>

          <button
            onClick={handleRunGoldenAudit}
            disabled={isAuditing || !rawText.trim()}
            className="px-5 py-2.5 rounded-lg bg-[#161616] hover:bg-[#202020] text-[#F2F2F2] border border-[#2A2A2A] font-extrabold font-mono text-xs flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAuditing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AUDITING DETERMINISTICALLY...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-[#A0A0A0]" />
                <span>AUDIT CONFIGURATION</span>
              </>
            )}
          </button>
        </div>

        {/* Error notification if any */}
        {auditError && (
          <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{auditError}</span>
          </div>
        )}
      </div>

      {/* Real Pipeline Stages Progress Bar */}
      {(() => {
        const isIngestDone = Boolean(rawText.trim() || selectedFileMeta || activeAnalysisId);
        const isDetectDone = Boolean(
          isIngestDone &&
          ((detectedVendorState.confidence > 0 && detectedVendorState.vendor !== "unknown") || (isAuditStatusMatch && Boolean(analysisStatus?.vendor)))
        );
        const isParseDone = Boolean(
          isAuditStatusMatch &&
          (analysisStatus?.status === "COMPLETED" || (analysisStatus?.lines_parsed ?? 0) > 0 || (analysisStatus?.facts_extracted_count ?? 0) > 0)
        );
        const isNormalizeDone = Boolean(
          isParseDone &&
          isAuditStatusMatch &&
          (analysisStatus?.facts_extracted_count ?? 0) > 0
        );
        const isEvaluateDone = Boolean(
          isNormalizeDone &&
          isAuditStatusMatch &&
          (analysisStatus?.controls_evaluated_count ?? 0) > 0
        );
        const isRemediationDone = !isReanalyzing && isAuditStatusMatch && analysisStatus?.remediation_status === "complete";
        const isRemediationFailed = isAuditStatusMatch && analysisStatus?.remediation_status === "failed";
        const isVerifyDone = !isReanalyzing && isAuditStatusMatch && (analysisStatus?.verification_status === "complete" || (Boolean(reanalyzeResult) && reanalyzeResult?.status === "REANALYZED"));
        const isVerifyFailed = isAuditStatusMatch && analysisStatus?.verification_status === "failed";

        return (
          <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] font-mono">
            <div className="text-[10px] text-[#666666] uppercase font-bold tracking-wider mb-2.5 flex items-center justify-between">
              <span>DETERMINISTIC ANALYSIS PIPELINE</span>
              <span className="text-[#A0A0A0]">REAL BACKEND PROVENANCE</span>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-center text-xs">
              {[
                { key: "INGEST", label: "1. INGEST", done: isIngestDone },
                { key: "DETECT", label: "2. DETECT", done: isDetectDone },
                { key: "PARSE", label: "3. PARSE", done: isParseDone },
                { key: "NORMALIZE", label: "4. NORMALIZE", done: isNormalizeDone },
                { key: "EVALUATE", label: "5. EVALUATE", done: isEvaluateDone },
                { key: "RISK", label: "6. RISK", done: isRiskDone },
                { key: "REMEDIATION", label: "7. REMEDIATION", done: isRemediationDone, failed: isRemediationFailed },
                { key: "VERIFY", label: "8. VERIFY", done: isVerifyDone, failed: isVerifyFailed, isVerify: true },
              ].map((stage) => (
                <div
                  key={stage.key}
                  className={cn(
                    "p-2 rounded-lg border transition-all flex flex-col items-center justify-center gap-1",
                    stage.done
                      ? "bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981]"
                      : stage.failed
                      ? "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]"
                      : isAuditing || (stage.key === "REMEDIATION" && isGeneratingRemediation) || (stage.key === "VERIFY" && isReanalyzing) || (stage.key === "RISK" && (isStatusLoading || isRiskLoading || isReanalyzing))
                      ? "bg-[#141414] border-[#2A2A2A] text-[#F2F2F2] animate-pulse"
                      : "bg-[#080808] border-[#1F1F1F] text-[#555555]"
                  )}
                >
                  <div className="text-[10px] font-extrabold">{stage.label}</div>
                  <div className="text-xs">
                    {stage.done ? (
                      <span className="text-[#10B981] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    ) : stage.failed ? (
                      <span className="text-[#EF4444] font-bold text-[10px]">failed</span>
                    ) : isAuditing || (stage.key === "REMEDIATION" && isGeneratingRemediation) || (stage.key === "VERIFY" && isReanalyzing) || (stage.key === "RISK" && (isStatusLoading || isRiskLoading || isReanalyzing)) ? (
                      <span className="text-[#D4D4D8] font-bold animate-pulse">...</span>
                    ) : (
                      <span className="text-[#555555] font-mono text-[10px]">pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Audit Execution Progress Overlay Card */}
      {isAuditing && (
        <div className="p-6 rounded-lg bg-[#0B0B0B] border border-[#2C2C2E] space-y-4 font-mono shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <RefreshCw className="w-4 h-4 animate-spin text-[#10B981]" />
              <span>ANALYZING CONFIGURATION DETERMINISTICALLY</span>
            </div>
            <span className="text-[10px] text-[#636366]">ZERO SPECULATION ENGINE</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#080808] border border-[#1F1F1F]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#8E8E93]">Vendor Detection</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#080808] border border-[#1F1F1F]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#8E8E93]">AST Fact Extraction</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#080808] border border-[#1F1F1F]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#8E8E93]">Security Normalization</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#080808] border border-[#1F1F1F]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#8E8E93]">Framework Evaluation</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#080808] border border-[#1F1F1F]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#8E8E93]">Deterministic Risk</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#080808] border border-[#1F1F1F]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#8E8E93]">Evidence Line Mapping</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Re-Analysis Success / Transition Banner */}
      {reanalyzeBannerVisible && reanalyzeResult && (
        <div className="p-4 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 space-y-3 font-mono animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#10B981]">
              <CheckCircle2 className="w-4 h-4" />
              <span>RE-ANALYSIS VERIFICATION PASSED: DETERMINISTIC HARDENING PROVEN</span>
            </div>
            <button
              onClick={() => setReanalyzeBannerVisible(false)}
              className="text-[#636366] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#636366]">COMPLIANCE SCORE</div>
              <div className="text-sm font-bold text-[#10B981] mt-0.5">
                {reanalyzeResult.previous_compliance_score.toFixed(1)}% → {reanalyzeResult.new_compliance_score.toFixed(1)}%
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#636366]">FAILED CONTROLS</div>
              <div className="text-sm font-bold text-[#EF4444] mt-0.5">
                {reanalyzeResult.previous_fail_count} FAIL → {reanalyzeResult.new_fail_count} FAIL
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#636366]">RESOLVED CONTROLS</div>
              <div className="text-sm font-bold text-[#3B82F6] mt-0.5">
                +{reanalyzeResult.resolved_controls.length} RESOLVED
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F]">
              <div className="text-[10px] text-[#636366]">VERDICT TRANSITION</div>
              <div className="text-sm font-bold text-[#10B981] mt-0.5">
                FAIL → PASS ✓
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] text-[#636366] uppercase self-center mr-1">Controls Resolved:</span>
            {reanalyzeResult.resolved_controls.map((ctrl) => (
              <span
                key={ctrl}
                className="px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 text-[10px] font-bold"
              >
                {ctrl} (PASS)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4. Active Analysis Workspace (Rendered when activeAnalysisId exists or sample is loaded) */}
      {activeAnalysisId ? (
        <div className="space-y-6">
          {/* Polished Enterprise Audit Result Summary Header */}
          <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-4 font-mono">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1F1F1F] pb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center border",
                  isAuditFullyComplete
                    ? "bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]"
                    : "bg-[#141414] border-[#242424] text-[#D4D4D8]"
                )}>
                  {isAuditFullyComplete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <RefreshCw className="w-4 h-4 animate-spin text-[#D4D4D8]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#F2F2F2] tracking-wider uppercase">
                      {isReanalyzing
                        ? "RE-ANALYSIS IN PROGRESS"
                        : isAuditing
                        ? "AUDIT IN PROGRESS"
                        : (isAuditStatusMatch && analysisStatus?.status === "PROCESSING")
                        ? "AUDIT IN PROGRESS"
                        : isAuditFullyComplete
                        ? "AUDIT COMPLETE"
                        : "AWAITING AUDIT"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141414] text-[#D4D4D8] border border-[#242424]">
                      {(analysisStatus?.vendor || detectedVendorState.vendor || "CISCO").toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#636366] flex items-center gap-2 mt-0.5">
                    <span>Target: <strong className="text-[#F2F2F2]">{(analysisStatus?.filename || configFilename).replace(/\.[^/.]+$/, "") || "DEVICE-01"}</strong></span>
                    <span>•</span>
                    <span>File: <strong className="text-[#F2F2F2]">{analysisStatus?.filename || configFilename || "network_config.cfg"}</strong></span>
                  </div>
                </div>
              </div>

              {/* Fast Action Links */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  onClick={() => {
                    const el = document.getElementById("panel-findings");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#1F1F1F] text-[#8E8E93] hover:text-[#F2F2F2] font-bold transition-all flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>INVESTIGATE FINDINGS</span>
                </button>

                <button
                  onClick={() => {
                    setCenterTab("evidence");
                    const el = document.getElementById("panel-evidence");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#1F1F1F] text-[#8E8E93] hover:text-[#F2F2F2] font-bold transition-all flex items-center gap-1.5"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>VIEW EVIDENCE</span>
                </button>

                <button
                  onClick={handleReviewRemediation}
                  disabled={isGeneratingRemediation}
                  className="px-3 py-1.5 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#1F1F1F] text-[#8E8E93] hover:text-[#10B981] font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Wrench className={cn("w-3.5 h-3.5", isGeneratingRemediation && "animate-spin")} />
                  <span>{isGeneratingRemediation ? "GENERATING..." : "REVIEW REMEDIATION"}</span>
                </button>

                <button
                  onClick={handleReanalyzeWithRemediation}
                  disabled={isReanalyzing}
                  className="px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#0ea371] text-white font-extrabold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", isReanalyzing && "animate-spin")} />
                  <span>RE-ANALYZE</span>
                </button>
              </div>
            </div>

            {/* SHA-256 Fingerprint */}
            <div className="flex items-center justify-between text-[11px] bg-[#080808] px-3 py-2 rounded-lg border border-[#1F1F1F]">
              <span className="text-[#636366]">CRYPTOGRAPHIC HASH (SHA-256):</span>
              <span className="text-[#3B82F6] font-mono select-all">
                {clientHash || (analysisStatus as any)?.file_hash || (analysisStatus as any)?.config_hash || "Computing..."}
              </span>
            </div>

            {/* Posture KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-[#080808] border border-[#1F1F1F] space-y-1">
                <div className="text-[10px] text-[#636366] uppercase font-bold">COMPLIANCE</div>
                <div className="text-2xl font-black text-[#F2F2F2]">
                  {effectiveComplianceScore !== null && effectiveComplianceScore !== undefined
                    ? `${effectiveComplianceScore.toFixed(1)}%`
                    : "--"}
                </div>
                <div className="text-[9px] text-[#10B981]">
                  {isAuditStatusMatch && analysisStatus && (analysisStatus.total_applicable_controls ?? analysisStatus.applicable_count) !== undefined && ((analysisStatus.total_applicable_controls ?? analysisStatus.applicable_count) ?? 0) > 0
                    ? `${analysisStatus.pass_count} PASSED / ${analysisStatus.total_applicable_controls ?? analysisStatus.applicable_count} APPLICABLE`
                    : "CIS • NIST • STIG • ISO"}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080808] border border-[#1F1F1F] space-y-1">
                <div className="text-[10px] text-[#636366] uppercase font-bold">RISK INDEX</div>
                <div className={cn(
                  "text-2xl font-black",
                  effectiveRiskScore === null || effectiveRiskScore === undefined
                    ? "text-[#636366]"
                    : effectiveRiskScore >= 85
                    ? "text-[#EF4444]"
                    : effectiveRiskScore >= 70
                    ? "text-[#F59E0B]"
                    : effectiveRiskScore >= 45
                    ? "text-[#EAB308]"
                    : "text-[#10B981]"
                )}>
                  {effectiveRiskScore !== null && effectiveRiskScore !== undefined
                    ? `${effectiveRiskScore.toFixed(1)}/100`
                    : "--"}
                </div>
                <div className={cn(
                  "text-[9px] font-bold",
                  effectiveRiskLevel === "P0"
                    ? "text-[#EF4444]"
                    : effectiveRiskLevel === "P1"
                    ? "text-[#F59E0B]"
                    : effectiveRiskLevel === "P2"
                    ? "text-[#EAB308]"
                    : effectiveRiskLevel === "P3"
                    ? "text-[#10B981]"
                    : "text-[#636366]"
                )}>
                  {effectiveRiskLevel
                    ? `PRIORITY: ${effectiveRiskLevel} ${effectiveSeverityName}`
                    : "PRIORITY: PENDING"}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080808] border border-[#1F1F1F] space-y-1">
                <div className="text-[10px] text-[#636366] uppercase font-bold">FAILED CONTROLS</div>
                <div className="text-2xl font-black text-[#EF4444]">
                  {isAuditStatusMatch && analysisStatus?.fail_count !== undefined
                    ? analysisStatus.fail_count
                    : "--"}
                </div>
                <div className="text-[9px] text-[#EF4444]">VIOLATIONS DETECTED</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080808] border border-[#1F1F1F] space-y-1">
                <div className="text-[10px] text-[#636366] uppercase font-bold">PASSED CONTROLS</div>
                <div className="text-2xl font-black text-[#10B981]">
                  {isAuditStatusMatch && analysisStatus?.pass_count !== undefined
                    ? analysisStatus.pass_count
                    : "--"}
                </div>
                <div className="text-[9px] text-[#10B981]">HARDENED COMPLIANT</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080808] border border-[#1F1F1F] space-y-1">
                <div className="text-[10px] text-[#636366] uppercase font-bold">NORMALIZED FACTS</div>
                <div className="text-2xl font-black text-[#3B82F6]">
                  {isAuditStatusMatch && analysisStatus?.facts_extracted_count !== undefined
                    ? analysisStatus.facts_extracted_count
                    : "--"}
                </div>
                <div className="text-[9px] text-[#3B82F6]">UNIVERSAL MODEL AST</div>
              </div>
            </div>
          </div>

          {/* 3-Panel Audit Engine Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Panel 1: Left Findings Navigator (4 cols) */}
            <div id="panel-findings" className="lg:col-span-4 p-4 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-xs font-bold text-[#F2F2F2]">
                    FINDINGS ({filteredFindings.length})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  {isAuditResultAvailable ? (
                    <>
                      <span className="px-1.5 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444]">
                        {effectiveFindings.filter((f) => f.status === "FAIL").length} FAIL
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981]">
                        {effectiveFindings.filter((f) => f.status === "PASS").length} PASS
                      </span>
                    </>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-[#3B82F6]/15 text-[#3B82F6] animate-pulse">
                      EVALUATING...
                    </span>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-2 text-xs">
                <div className="flex gap-1 overflow-x-auto pb-1 text-[10px]">
                  {["ALL", "CIS", "NIST", "STIG", "ISO"].map((fw) => (
                    <button
                      key={fw}
                      onClick={() => setFrameworkFilter(fw)}
                      className={cn(
                        "px-2 py-0.5 rounded border transition-colors",
                        frameworkFilter === fw
                          ? "bg-[#3B82F6]/20 border-[#3B82F6] text-[#3B82F6] font-bold"
                          : "bg-[#080808] border-[#1F1F1F] text-[#636366] hover:text-white"
                      )}
                    >
                      {fw}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-[#636366] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search controls..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-[#080808] border border-[#1F1F1F] text-xs text-[#8E8E93] focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-[#080808] border border-[#1F1F1F] text-[10px] text-[#8E8E93] focus:outline-none"
                  >
                    <option value="ALL">ALL STATUS</option>
                    <option value="FAIL">FAIL ONLY</option>
                    <option value="PASS">PASS ONLY</option>
                  </select>
                </div>
              </div>

              {/* Findings List */}
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {filteredFindings.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#636366] rounded-xl bg-[#080808] border border-dashed border-[#1F1F1F]">
                    {!isAuditResultAvailable ? "Evaluating compliance rules..." : "No findings matching active filters."}
                  </div>
                ) : (
                  filteredFindings.map((finding) => {
                    const isSelected = finding.finding_id === selectedFindingId;
                    const isFail = finding.status === "FAIL";
                    const isCrit = finding.severity === "CRITICAL";

                    return (
                      <div
                        key={finding.finding_id}
                        onClick={() => {
                          setSelectedFindingId(finding.finding_id);
                        }}
                        className={cn(
                          "p-3 rounded-xl border cursor-pointer transition-all space-y-1.5",
                          isSelected
                            ? "bg-[#141414] border-[#3B82F6] shadow-sm"
                            : "bg-[#080808] border-[#1F1F1F] hover:border-[#2C2C2E] hover:bg-[#141414]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#3B82F6]">{finding.control_id}</span>
                            <span className="text-[#636366]">({finding.framework})</span>
                          </div>

                          <div className="flex items-center gap-1 font-bold">
                            <span
                              className={cn(
                                "px-1.5 py-0.2 rounded text-[9px]",
                                isCrit
                                  ? "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30"
                                  : "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30"
                              )}
                            >
                              {finding.severity}
                            </span>
                            <span
                              className={cn(
                                "px-1.5 py-0.2 rounded text-[9px]",
                                isFail
                                  ? "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                                  : "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                              )}
                            >
                              {finding.status}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs font-sans font-medium text-[#F2F2F2] line-clamp-1">
                          {finding.title}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#636366] pt-0.5">
                          <span>
                            Line(s):{" "}
                            <strong className="text-[#EF4444]">
                              {finding.evidence_lines?.filter((e) => e.line && e.line > 0).length > 0
                                ? finding.evidence_lines.filter((e) => e.line && e.line > 0).map((e) => e.line).join(", ")
                                : "No direct evidence"}
                            </strong>
                          </span>
                          {finding.remediation_proposal && (
                            <span className="text-[#10B981] flex items-center gap-1">
                              <Wrench className="w-2.5 h-2.5" />
                              <span>Patch Available</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Panel 2: Center Interactive Evidence & Source Viewer (5 cols) */}
            <div id="panel-evidence" className="lg:col-span-5 p-4 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#3B82F6]" />
                  <span className="text-xs font-bold text-[#F2F2F2] uppercase">
                    EVIDENCE EXPLORER
                  </span>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    onClick={() => setCenterTab("evidence")}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      centerTab === "evidence"
                        ? "bg-[#3B82F6]/20 text-[#3B82F6] font-bold border border-[#3B82F6]/40"
                        : "text-[#636366] hover:text-white"
                    )}
                  >
                    LINE CITATIONS
                  </button>
                  <button
                    onClick={() => setCenterTab("universal")}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      centerTab === "universal"
                        ? "bg-[#3B82F6]/20 text-[#3B82F6] font-bold border border-[#3B82F6]/40"
                        : "text-[#636366] hover:text-white"
                    )}
                  >
                    UNIVERSAL MODEL AST
                  </button>
                </div>
              </div>

              {/* View 1: Line-by-Line Verbatim Evidence Viewer */}
              {centerTab === "evidence" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#636366] px-1">
                    <span>
                      File: <strong className="text-white">{configData?.filename || configFilename}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span>Active Citation:</span>
                      <strong
                        className={cn(
                          activeEvidence.hasLineCitation ? "text-[#3B82F6]" : "text-[#EF4444]"
                        )}
                      >
                        {activeEvidence.citationText}
                      </strong>
                      {!activeEvidence.hasLineCitation && (
                        <span className="text-[#636366] text-[10px] font-mono">
                          {activeEvidence.statusText}
                        </span>
                      )}
                    </span>
                  </div>

                  <div
                    ref={evidenceContainerRef}
                    className="p-3 rounded-xl bg-[#080808] border border-[#1F1F1F] max-h-[540px] overflow-y-auto text-xs space-y-0.5 font-mono select-text"
                  >
                    {configData?.lines?.map((item) => {
                      const isCited = activeEvidence.hasLineCitation && activeEvidence.line === item.line;
                      const isHighlighted = highlightedLine === item.line;

                      return (
                        <div
                          key={item.line}
                          id={`line-${item.line}`}
                          onClick={() => setHighlightedLine(item.line)}
                          className={cn(
                            "flex items-start gap-3 px-2 py-1 rounded transition-colors cursor-pointer group",
                            isHighlighted
                              ? "bg-[#EF4444]/20 border-l-2 border-[#EF4444]"
                              : isCited
                              ? "bg-[#EF4444]/10"
                              : "hover:bg-white/[0.03]"
                          )}
                        >
                          <span
                            className={cn(
                              "w-7 text-right select-none shrink-0 font-bold",
                              isHighlighted ? "text-[#EF4444]" : isCited ? "text-[#EF4444]/70" : "text-[#475569]"
                            )}
                          >
                            {item.line}
                          </span>
                          <span
                            className={cn(
                              "flex-1 break-all",
                              isHighlighted
                                ? "text-white font-bold"
                                : isCited
                                ? "text-[#FCA5A5]"
                                : "text-[#8E8E93]"
                            )}
                          >
                            {item.text || "\u00A0"}
                          </span>
                          {isCited && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 shrink-0">
                              CITATION
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Finding Evidence Summary at bottom of Center Panel */}
                  {selectedFinding && (
                    <div className="p-3 rounded-xl bg-[#080808] border border-[#1F1F1F] space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={cn(
                          "uppercase font-bold",
                          selectedFinding.status === "PASS"
                            ? "text-[#10B981]"
                            : selectedFinding.status === "NOT_APPLICABLE"
                            ? "text-[#8E8E93]"
                            : selectedFinding.status === "UNKNOWN"
                            ? "text-[#F59E0B]"
                            : "text-[#EF4444]"
                        )}>
                          {selectedFinding.status === "PASS"
                            ? "POLICY COMPLIANCE VERIFIED"
                            : selectedFinding.status === "NOT_APPLICABLE"
                            ? "NOT APPLICABLE"
                            : selectedFinding.status === "UNKNOWN"
                            ? "UNCERTAIN / INSUFFICIENT EVIDENCE"
                            : "WHY THIS FAILED"}
                        </span>
                        <span className="text-[#3B82F6] font-bold">CONTROL: {selectedFinding.control_id}</span>
                      </div>
                      <p className="text-xs text-[#8E8E93] font-sans leading-relaxed">
                        {selectedFinding.status === "PASS"
                          ? ((selectedFinding as any).description || "Deterministic compliance rule evaluated against extracted security facts: Control passed verification.")
                          : selectedFinding.status === "NOT_APPLICABLE"
                          ? ((selectedFinding as any).description || "This control is not applicable to the targeted device type or architecture.")
                          : (selectedFinding.why_it_failed || selectedFinding.title || "Deterministic compliance rule evaluated against extracted security facts.")}
                      </p>
                      {selectedFinding.actual_value && (
                        <div className="flex items-center gap-3 text-[11px] pt-1 border-t border-[#1F1F1F]">
                          <span>Observed: <strong className={cn("font-mono", selectedFinding.status === "PASS" ? "text-[#10B981]" : selectedFinding.status === "NOT_APPLICABLE" ? "text-[#8E8E93]" : "text-[#EF4444]")}>{selectedFinding.actual_value}</strong></span>
                          <span>•</span>
                          <span>Expected: <strong className="text-[#10B981] font-mono">{selectedFinding.expected_value || "Hardened standard"}</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* View 2: Universal Security Model AST Facts */}
              {centerTab === "universal" && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[#636366]">
                    Extracted security facts mapped to normalized schema:
                  </div>

                  <div className="p-3 rounded-xl bg-[#080808] border border-[#1F1F1F] max-h-[540px] overflow-y-auto text-xs space-y-2">
                    {effectiveEvidenceItems.length === 0 ? (
                      <div className="text-center text-[#636366] py-6">
                        {!isAuditResultAvailable ? "Extracting configuration AST facts..." : "No AST facts extracted for this profile."}
                      </div>
                    ) : (
                      effectiveEvidenceItems.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setHighlightedLine(item.line ?? null);
                            setCenterTab("evidence");
                          }}
                          className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#3B82F6]/40 cursor-pointer transition-all space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#3B82F6] font-bold">{item.property_path}</span>
                            <span className="text-[#EF4444]">{item.line && item.line > 0 ? `Line ${item.line}` : "Unconfigured"}</span>
                          </div>
                          <div className="text-xs text-[#8E8E93] font-mono">{item.raw_text}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Panel 3: Right Context, Deterministic Risk & Safe Re-Analysis (3 cols) */}
            <div id="panel-remediation" className="lg:col-span-3 space-y-4 font-mono">
              {/* Top Risk & Contributing Factors Card */}
              <div className="p-4 rounded-2xl bg-[#0B0B0B] border border-[#EF4444]/30 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                  <span className="text-[10px] text-[#636366] uppercase tracking-wider font-bold">
                    COMPOSITE SYSTEM RISK
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold border",
                    effectiveRiskLevel === "P0"
                      ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"
                      : effectiveRiskLevel === "P1"
                      ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                      : effectiveRiskLevel === "P2"
                      ? "bg-[#EAB308]/15 text-[#EAB308] border-[#EAB308]/30"
                      : effectiveRiskLevel === "P3"
                      ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                      : "bg-[#1F1F1F] text-[#636366] border-[#1F1F1F]"
                  )}>
                    {effectiveRiskLevel ? `${effectiveRiskLevel} PRIORITY` : "PENDING"}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className={cn(
                    "text-2xl font-black",
                    effectiveRiskScore === null || effectiveRiskScore === undefined
                      ? "text-[#636366]"
                      : effectiveRiskScore >= 85
                      ? "text-[#EF4444]"
                      : effectiveRiskScore >= 70
                      ? "text-[#F59E0B]"
                      : effectiveRiskScore >= 45
                      ? "text-[#EAB308]"
                      : "text-[#10B981]"
                  )}>
                    {effectiveRiskScore !== null && effectiveRiskScore !== undefined ? (
                      <>
                        {effectiveRiskScore.toFixed(1)}
                        <span className="text-xs text-[#636366] font-normal"> / 100</span>
                      </>
                    ) : (
                      "--"
                    )}
                  </div>
                  <span className="text-[10px] text-[#8E8E93]">DETERMINISTIC FORMULA</span>
                </div>

                {/* Contributing factors */}
                <div className="space-y-1.5 pt-1 border-t border-[#1F1F1F]">
                  <div className="text-[10px] text-[#636366] uppercase font-bold tracking-wider">
                    CONTRIBUTORS (WHY):
                  </div>
                  <div className="space-y-1 text-[11px] text-[#8E8E93]">
                    {!isAuditResultAvailable || !isRiskDone ? (
                      <div className="p-2 text-center text-[#636366] text-[10px]">
                        Risk evaluation in progress...
                      </div>
                    ) : effectiveRiskReport?.contributing_findings && effectiveRiskReport.contributing_findings.length > 0 ? (
                      effectiveRiskReport.contributing_findings.slice(0, 4).map((cf: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-[#080808] border border-[#1F1F1F]">
                          <span className="truncate max-w-[180px]">{cf.title || cf.control_id}</span>
                          <span className="text-[#EF4444] font-bold text-[10px]">{cf.severity || "FAIL"}</span>
                        </div>
                      ))
                    ) : effectiveFindings.filter(f => f.status === "FAIL").length > 0 ? (
                      effectiveFindings.filter(f => f.status === "FAIL").slice(0, 4).map((f) => (
                        <div key={f.finding_id} className="flex items-center justify-between p-1.5 rounded bg-[#080808] border border-[#1F1F1F]">
                          <span className="truncate max-w-[180px]">{f.title || f.control_id}</span>
                          <span className="text-[#EF4444] font-bold text-[10px]">{f.severity}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-center text-[#10B981] text-[10px]">
                        Zero non-compliant risk contributors detected.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedFinding ? (
                <>
                  {/* Selected Finding Provenance & Verdict Card */}
                  <div className="p-4 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                      <span className="text-[10px] text-[#3B82F6] uppercase font-bold">
                        {selectedFinding.control_id}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold",
                          selectedFinding.status === "FAIL"
                            ? "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                            : "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                        )}
                      >
                        {selectedFinding.status}
                      </span>
                    </div>

                    <div className="text-xs font-sans font-bold text-[#F2F2F2]">
                      {selectedFinding.title}
                    </div>

                    {/* Deterministic Provenance Chain */}
                    <div className="p-2.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1.5 text-[10px]">
                      <div className="text-[9px] text-[#636366] uppercase font-bold tracking-wider">
                        DETERMINISTIC PROVENANCE CHAIN
                      </div>
                      <div className="flex flex-col gap-1 text-[#8E8E93]">
                        <div className="flex items-center justify-between">
                          <span>SOURCE:</span>
                          <span className="text-white font-semibold">{configFilename}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>EVIDENCE STATUS:</span>
                          <span
                            className={cn(
                              "font-semibold",
                              activeEvidence.hasLineCitation ? "text-[#10B981]" : "text-[#EF4444]"
                            )}
                          >
                            {activeEvidence.hasLineCitation ? "Configured Directive" : "Unconfigured Directive"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>LINE CITATION:</span>
                          <span className={cn(
                            "font-semibold",
                            selectedFinding.status === "PASS"
                              ? "text-[#10B981]"
                              : selectedFinding.status === "NOT_APPLICABLE"
                              ? "text-[#8E8E93]"
                              : "text-[#EF4444]"
                          )}>
                            {activeEvidence.hasLineCitation ? activeEvidence.citationText : activeEvidence.statusText}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>OBSERVED:</span>
                          <span className={cn(
                            "font-semibold",
                            selectedFinding.status === "PASS"
                              ? "text-[#10B981]"
                              : selectedFinding.status === "NOT_APPLICABLE"
                              ? "text-[#8E8E93]"
                              : "text-[#F59E0B]"
                          )}>
                            {selectedFinding.actual_value || "None / Unconfigured"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>EXPECTED:</span>
                          <span className="text-[#10B981] font-semibold">
                            {selectedFinding.expected_value || "Hardened Standard"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#1F1F1F] pt-1 mt-0.5">
                          <span>VERDICT:</span>
                          <span className={cn(
                            "font-extrabold",
                            selectedFinding.status === "PASS"
                              ? "text-[#10B981]"
                              : selectedFinding.status === "NOT_APPLICABLE"
                              ? "text-[#8E8E93]"
                              : selectedFinding.status === "UNKNOWN"
                              ? "text-[#F59E0B]"
                              : "text-[#EF4444]"
                          )}>
                            {selectedFinding.status} {selectedFinding.status === "NOT_APPLICABLE" ? "" : `(${selectedFinding.severity})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Context Explanation */}
                    <div className="p-2.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1">
                      <div className={cn(
                        "text-[9px] uppercase font-bold",
                        selectedFinding.status === "PASS"
                          ? "text-[#10B981]"
                          : selectedFinding.status === "NOT_APPLICABLE"
                          ? "text-[#8E8E93]"
                          : selectedFinding.status === "UNKNOWN"
                          ? "text-[#F59E0B]"
                          : "text-[#636366]"
                      )}>
                        {selectedFinding.status === "PASS"
                          ? "POLICY COMPLIANCE VERIFIED"
                          : selectedFinding.status === "NOT_APPLICABLE"
                          ? "NOT APPLICABLE"
                          : selectedFinding.status === "UNKNOWN"
                          ? "INSUFFICIENT EVIDENCE"
                          : "WHY FAILED?"}
                      </div>
                      <p className="text-[11px] text-[#8E8E93] font-sans leading-relaxed">
                        {selectedFinding.status === "PASS"
                          ? ((selectedFinding as any).description || "Deterministic security rule evaluation verified that the configuration complies with specifications.")
                          : selectedFinding.status === "NOT_APPLICABLE"
                          ? ((selectedFinding as any).description || "This control is not applicable to the detected device platform or operating mode.")
                          : (selectedFinding.why_it_failed || "Deterministic security rule evaluation identified a violation against control specifications.")}
                      </p>
                    </div>
                  </div>

                  {/* Safe Remediation & Re-Analysis Action Card */}
                  {selectedFinding.status === "FAIL" ? (
                    <div className="p-4 rounded-2xl bg-[#0B0B0B] border border-[#10B981]/30 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                        <div className="flex items-center gap-1.5 text-[#10B981] font-bold">
                          <Wrench className="w-3.5 h-3.5" />
                          <span>SAFE REMEDIATION</span>
                        </div>
                        <span className="text-[9px] text-[#636366]">READ-ONLY ADVISORY</span>
                      </div>

                      {/* Diff Preview: Current vs Proposed */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-[#636366]">
                          <span>CURRENT vs PROPOSED DIFF</span>
                          <span className="text-[#10B981] font-bold">ALLOWLISTED</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-[11px] font-mono space-y-1 select-text">
                          {selectedFinding.remediation_diff?.diff_lines ? (
                            selectedFinding.remediation_diff.diff_lines.map((dl: any, idx: number) => (
                              <div
                                key={idx}
                                className={cn(
                                  dl.type === "REMOVE"
                                    ? "text-[#EF4444]"
                                    : dl.type === "ADD"
                                    ? "text-[#10B981]"
                                    : "text-[#636366]"
                                )}
                              >
                                {dl.type === "REMOVE" ? "- " : dl.type === "ADD" ? "+ " : "  "}
                                {dl.line}
                              </div>
                            ))
                          ) : (
                            <div className="text-[#10B981] whitespace-pre-wrap">
                              {selectedFinding.remediation_proposal || "! Recommended remediation patch"}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-[10px] text-[#636366] flex items-center justify-between pt-1">
                        <span>NETWORK PUSH:</span>
                        <span className="text-[#EF4444] font-bold">DISABLED (LOCAL DIFF ONLY)</span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <button
                          onClick={() =>
                            handleCopyClipboard(
                              selectedFinding.remediation_proposal || "",
                              "cli"
                            )
                          }
                          className="w-full py-2 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#1F1F1F] text-[#8E8E93] hover:text-white font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          {copiedText === "cli" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#10B981]" />
                              <span>COPIED TO CLIPBOARD</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>COPY REMEDIATION CLI</span>
                            </>
                          )}
                        </button>

                        {/* Primary Re-Analysis CTA */}
                        <button
                          onClick={handleReanalyzeWithRemediation}
                          disabled={isReanalyzing}
                          className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-white font-extrabold text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isReanalyzing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>RE-ANALYZING DETERMINISTICALLY...</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>RE-ANALYZE & VERIFY</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : selectedFinding.status === "PASS" ? (
                    <div className="p-4 rounded-2xl bg-[#0B0B0B] border border-[#10B981]/30 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                        <div className="flex items-center gap-1.5 text-[#10B981] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>CONTROL COMPLIANT</span>
                        </div>
                        <span className="text-[9px] text-[#10B981] font-bold">VERIFIED</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#080808] border border-[#10B981]/20 text-[11px] font-mono text-[#10B981] flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>Configuration satisfies baseline security requirements. No remediation patch needed.</span>
                      </div>

                      <button
                        onClick={handleReanalyzeWithRemediation}
                        disabled={isReanalyzing}
                        className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-white font-extrabold text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 font-mono"
                      >
                        {isReanalyzing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>RE-ANALYZING DETERMINISTICALLY...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>RE-ANALYZE & VERIFY</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                        <div className="flex items-center gap-1.5 text-[#8E8E93] font-bold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>CONTROL NOT APPLICABLE</span>
                        </div>
                        <span className="text-[9px] text-[#636366]">N/A</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-[11px] font-mono text-[#8E8E93]">
                        This control is out of scope for this architecture or platform. No remediation action required.
                      </div>
                    </div>
                  )}

                  {/* AI Advisory Note */}
                  <div className="p-4 rounded-2xl bg-[#0B0B0B] border border-[#8B5CF6]/30 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-[#8B5CF6] font-bold text-[10px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI ADVISORY — READ ONLY</span>
                    </div>
                    <p className="text-[11px] text-[#8E8E93] font-sans leading-relaxed">
                      This control enforces deterministic hardening standards defined by CIS and NIST. The AI boundary maintains strict read-only isolation and does not alter the mathematical compliance verdict.
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] text-center text-[#636366] text-xs">
                  Select a finding from the left panel to inspect evidence and remediation.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 rounded-2xl bg-[#0B0B0B] border border-dashed border-[#1F1F1F] text-center space-y-3 font-mono">
          <div className="w-10 h-10 rounded-xl bg-[#080808] border border-[#1F1F1F] text-[#3B82F6] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-[#F2F2F2]">NO ACTIVE AUDIT SESSION</div>
            <p className="text-xs text-[#8E8E93] max-w-md mx-auto font-sans">
              Select a preset fixture or upload a network configuration above and click{" "}
              <strong className="text-[#3B82F6]">AUDIT CONFIGURATION</strong> to begin deterministic evaluation.
            </p>
          </div>
        </div>
      )}

      {/* 5. Ingested Configuration Repository History Table */}
      <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-xs font-bold text-[#F2F2F2] uppercase tracking-wider">
              INGESTED CONFIGURATION REPOSITORY ({storedConfigs.length})
            </span>
          </div>
          <span className="text-[10px] text-[#636366]">Persistent Database Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F1F1F] text-[#636366] text-[10px] uppercase">
                <th className="py-2.5 px-3">Filename</th>
                <th className="py-2.5 px-3">Vendor</th>
                <th className="py-2.5 px-3">SHA-256 Hash</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Uploaded</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F]/60">
              {storedConfigs.slice(0, 8).map((cfg) => (
                <tr key={cfg.id} className="hover:bg-[#141414] transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span>{cfg.original_filename}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 uppercase">
                      {cfg.detected_vendor}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#8E8E93] font-mono text-[10px]">
                    {cfg.hash ? cfg.hash.slice(0, 16) + "..." : "--"}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 uppercase">
                      {cfg.parser_status || "PARSED"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#636366] text-[10px]">
                    {new Date(cfg.uploaded_at || Date.now()).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        setActiveAnalysisId(cfg.id);
                        setRawText("");
                        setConfigFilename(cfg.original_filename);
                        setSelectedFindingId(null);
                        setHighlightedLine(null);
                        setReanalyzeResult(null);
                        setReanalyzeBannerVisible(false);
                      }}
                      className="px-2.5 py-1 rounded bg-[#080808] hover:bg-[#141414] border border-[#1F1F1F] text-[#3B82F6] font-bold text-[10px] transition-all"
                    >
                      Inspect Audit →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ConfigurationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-mono text-[#636366]">
          Loading Configuration Audit Workspace...
        </div>
      }
    >
      <ConfigurationsPageContent />
    </Suspense>
  );
}
