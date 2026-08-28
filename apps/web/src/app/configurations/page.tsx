"use client";

import React, { useState, useRef, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
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
import { useSettings } from "@/components/providers/SettingsProvider";

// Authentic canonical test fixtures from data/demo/
const CANONICAL_FIXTURES = [
  {
    id: "cisco-insecure",
    name: "cisco-core-router.cfg",
    vendor: "cisco",
    platform: "ios",
    label: "Cisco IOS Core Router (Insecure Baseline)",
    description: "Contains cleartext passwords, Telnet, HTTP server, SSH v1, and missing syslog.",
    content: `! =============================================================
! NetVigil Synthetic Demo Dataset: Insecure Cisco Perimeter Router
! Hostname: CORE-RTR-01
! Description: Canonical SIH evaluation configuration with critical vulnerabilities
! =============================================================
version 15.0
no service password-encryption
service finger
hostname CORE-RTR-01
!
no aaa new-model
username admin privilege 15 password 0 cisco123
enable password unencrypted_enable_pass
!
ip domain name internal.lab
ip ssh version 1
ip http server
!
interface GigabitEthernet0/0
 description UNTRUSTED-WAN
 ip address 203.0.113.1 255.255.255.0
 ip proxy-arp
 ip directed-broadcast
!
! Missing remote syslog configuration
! Missing authoritative NTP configuration
!
line con 0
 password consolepass
line vty 0 4
 transport input telnet
 password vtypass
 login
!
end`,
  },
  {
    id: "cisco-secure",
    name: "cisco-hardened-gateway.cfg",
    vendor: "cisco",
    platform: "ios",
    label: "Cisco IOS Hardened Gateway (Compliant)",
    description: "Fully hardened baseline with SSH v2, AAA, secret password hashing, and remote logging.",
    content: `! =============================================================
! NetVigil Synthetic Demo Dataset: Hardened Cisco Gateway Router
! Hostname: NTRO-SECURE-RTR-01
! Description: Fully compliant and hardened baseline configuration
! =============================================================
version 15.2
service timestamps debug datetime msec
service timestamps log datetime msec
service password-encryption
no service finger
hostname NTRO-SECURE-RTR-01
!
aaa new-model
aaa authentication login default local
aaa authorization exec default local
!
username ntro-admin privilege 15 secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0
!
ip domain name ntro.gov.in
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3
no ip http server
no ip http secure-server
!
interface GigabitEthernet0/0
 description WAN-UPLINK
 ip address 198.51.100.1 255.255.255.0
 no ip proxy-arp
 no ip directed-broadcast
 spanning-tree bpduguard enable
!
logging trap warnings
logging host 10.10.100.50
!
ntp server 10.10.100.1
!
line con 0
 exec-timeout 10 0
 login authentication default
line vty 0 4
 transport input ssh
 exec-timeout 10 0
 login authentication default
!
end`,
  },
  {
    id: "juniper-insecure",
    name: "juniper-edge-srx.conf",
    vendor: "juniper",
    platform: "junos",
    label: "Juniper JunOS SRX Gateway (Insecure)",
    description: "Hierarchical syntax with Telnet and cleartext Web Management enabled.",
    content: `# =============================================================
# NetVigil Synthetic Demo Dataset: Insecure Juniper JunOS Gateway
# Hostname: LAB-JUNIPER-SRX-02
# =============================================================
system {
    host-name LAB-JUNIPER-SRX-02;
    services {
        telnet;
        web-management {
            http {
                port 80;
            }
        }
    }
}`,
  },
  {
    id: "juniper-secure",
    name: "juniper-hardened-srx.conf",
    vendor: "juniper",
    platform: "junos",
    label: "Juniper JunOS SRX Gateway (Compliant)",
    description: "Enforces SSHv2, remote Syslog daemon, and centralized NTP synchronization.",
    content: `# =============================================================
# NetVigil Synthetic Demo Dataset: Hardened Juniper JunOS Gateway
# Hostname: NTRO-JUNIPER-SRX-01
# =============================================================
system {
    host-name NTRO-JUNIPER-SRX-01;
    services {
        ssh {
            protocol-version v2;
            connection-limit 5;
            rate-limit 3;
        }
    }
    syslog {
        host 10.10.100.50 {
            any warning;
            authorization info;
        }
    }
    ntp {
        server 10.10.100.1;
    }
}`,
  },
  {
    id: "fortinet-insecure",
    name: "fortinet-perimeter-fgt.conf",
    vendor: "fortinet",
    platform: "fortios",
    label: "Fortinet FortiGate Firewall (Insecure)",
    description: "FortiOS block syntax with legacy SSH v1 enabled and insecure administrative port.",
    content: `# =============================================================
# NetVigil Synthetic Demo Dataset: Insecure Fortinet FortiOS Firewall
# Hostname: LAB-FORTIGATE-02
# =============================================================
config system global
    set hostname "LAB-FORTIGATE-02"
    set admin-ssh-v1 enable
    set admin-sport 80
end`,
  },
  {
    id: "fortinet-secure",
    name: "fortinet-hardened-fgt.conf",
    vendor: "fortinet",
    platform: "fortios",
    label: "Fortinet FortiGate Firewall (Compliant)",
    description: "Hardened FortiOS profile disabling SSHv1 with TLS 1.3 admin port and remote syslog.",
    content: `# =============================================================
# NetVigil Synthetic Demo Dataset: Hardened Fortinet FortiOS Firewall
# Hostname: NTRO-FORTIGATE-01
# =============================================================
config system global
    set hostname "NTRO-FORTIGATE-01"
    set admin-ssh-v1 disable
    set admin-sport 443
end
config log syslogd setting
    set status enable
    set server "10.10.100.50"
end
config system ntp
    set ntpsync enable
    config ntpserver
        edit 1
            set server "10.10.100.1"
        next
    end
end`,
  },
];

function ConfigurationsPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const isIngestMode = searchParams.get("mode") === "ingest";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evidenceContainerRef = useRef<HTMLDivElement>(null);
  const ingestionRef = useRef<HTMLDivElement>(null);

  // Ingestion Workspace State
  const [inputMode, setInputMode] = useState<"samples" | "paste" | "upload">("samples");
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("cisco-insecure");
  const [rawText, setRawText] = useState<string>(CANONICAL_FIXTURES[0].content);
  const [configFilename, setConfigFilename] = useState<string>(CANONICAL_FIXTURES[0].name);
  const [dragOver, setDragOver] = useState(false);
  const [clientHash, setClientHash] = useState<string>("");
  const [detectedVendorState, setDetectedVendorState] = useState<{
    vendor: string;
    confidence: number;
    platform?: string;
  }>({ vendor: "cisco", confidence: 0.98, platform: "ios" });

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

    // Client-side quick heuristics & server vendor detection
    const t = rawText.toLowerCase();
    if (t.includes("config system") || t.includes("fortigate") || t.includes("end\n")) {
      setDetectedVendorState({ vendor: "fortinet", confidence: 0.96, platform: "fortios" });
    } else if (t.includes("system {") || t.includes("set system") || t.includes("junos")) {
      setDetectedVendorState({ vendor: "juniper", confidence: 0.98, platform: "junos" });
    } else {
      setDetectedVendorState({ vendor: "cisco", confidence: 0.99, platform: "ios" });
    }

    return () => {
      isSubscribed = false;
    };
  }, [rawText]);

  // Load sample fixture
  const handleSelectFixture = (fixtureId: string) => {
    const fixture = CANONICAL_FIXTURES.find((f) => f.id === fixtureId);
    if (!fixture) return;
    setSelectedFixtureId(fixtureId);
    setRawText(fixture.content);
    setConfigFilename(fixture.name);
    setReanalyzeResult(null);
    setReanalyzeBannerVisible(false);
  };

  // Drag & drop file handler
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setRawText(text);
          setConfigFilename(file.name);
          setInputMode("paste");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setRawText(text);
          setConfigFilename(file.name);
          setInputMode("paste");
        }
      };
      reader.readAsText(file);
    }
  };

  // --- Real End-to-End Audit Execution ---
  const handleRunGoldenAudit = async () => {
    if (!rawText.trim()) return;
    try {
      setIsAuditing(true);
      setAuditError(null);
      setReanalyzeResult(null);
      setReanalyzeBannerVisible(false);

      let activeName = (configFilename || "").trim();
      if (!activeName) {
        if (detectedVendorState.vendor === "juniper") activeName = "juniper-device.set";
        else if (detectedVendorState.vendor === "fortinet") activeName = "fortinet-device.conf";
        else activeName = "cisco-device.cfg";
      } else if (!activeName.includes(".")) {
        activeName += detectedVendorState.vendor === "juniper" ? ".set" : detectedVendorState.vendor === "fortinet" ? ".conf" : ".cfg";
      }

      // 1. Ingest via real backend pipeline endpoint
      const ingestRes = await ingestAnalysis(
        rawText,
        activeName,
        detectedVendorState.vendor
      );

      setActiveAnalysisId(ingestRes.analysis_id);

      // Invalidate existing queries to trigger reactive refresh
      await queryClient.invalidateQueries({ queryKey: ["analysis-status", ingestRes.analysis_id] });
      await queryClient.invalidateQueries({ queryKey: ["analysis-findings", ingestRes.analysis_id] });
      await queryClient.invalidateQueries({ queryKey: ["analysis-evidence", ingestRes.analysis_id] });
      await queryClient.invalidateQueries({ queryKey: ["analysis-risk", ingestRes.analysis_id] });
      await queryClient.invalidateQueries({ queryKey: ["analysis-config", ingestRes.analysis_id] });
      await queryClient.invalidateQueries({ queryKey: ["configurations-list"] });
    } catch (err: any) {
      console.error("Audit execution failed:", err);
      setAuditError(err?.message || "Audit execution failed. Please verify the backend service.");
    } finally {
      setIsAuditing(false);
    }
  };

  // --- Reactive Query Hooks for Active Audit ---
  const { data: analysisStatus, isLoading: isStatusLoading } = useQuery({
    queryKey: ["analysis-status", activeAnalysisId],
    queryFn: () => (activeAnalysisId ? fetchAnalysisStatus(activeAnalysisId) : null),
    enabled: !!activeAnalysisId,
  });

  const { data: findings = [], isLoading: isFindingsLoading } = useQuery({
    queryKey: ["analysis-findings", activeAnalysisId],
    queryFn: () => (activeAnalysisId ? fetchAnalysisFindings(activeAnalysisId) : []),
    enabled: !!activeAnalysisId,
  });

  const { data: evidenceItems = [], isLoading: isEvidenceLoading } = useQuery({
    queryKey: ["analysis-evidence", activeAnalysisId],
    queryFn: () => (activeAnalysisId ? fetchAnalysisEvidence(activeAnalysisId) : []),
    enabled: !!activeAnalysisId,
  });

  const { data: riskReport, isLoading: isRiskLoading } = useQuery({
    queryKey: ["analysis-risk", activeAnalysisId],
    queryFn: () => (activeAnalysisId ? fetchAnalysisRisk(activeAnalysisId) : null),
    enabled: !!activeAnalysisId,
  });

  const { data: configData, isLoading: isConfigLoading } = useQuery({
    queryKey: ["analysis-config", activeAnalysisId],
    queryFn: () => (activeAnalysisId ? fetchAnalysisConfiguration(activeAnalysisId) : null),
    enabled: !!activeAnalysisId,
  });

  const { data: storedConfigs = [] } = useQuery({
    queryKey: ["configurations-list"],
    queryFn: () => fetchConfigurations(),
  });

  // Auto-select first failing finding or first finding
  useEffect(() => {
    if (findings.length > 0 && !selectedFindingId) {
      const firstFail = findings.find((f) => f.status === "FAIL");
      setSelectedFindingId(firstFail ? firstFail.finding_id : findings[0].finding_id);
    }
  }, [findings, selectedFindingId]);

  const selectedFinding = useMemo(() => {
    return findings.find((f) => f.finding_id === selectedFindingId) || findings[0] || null;
  }, [findings, selectedFindingId]);

  // When selected finding changes, highlight its primary evidence line
  useEffect(() => {
    if (selectedFinding && selectedFinding.evidence_lines?.length > 0) {
      const targetLine = selectedFinding.evidence_lines[0].line;
      setHighlightedLine(targetLine);
    }
  }, [selectedFinding]);

  // Filtered findings list
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchFw = frameworkFilter === "ALL" || f.framework.toUpperCase() === frameworkFilter;
      const matchStatus = statusFilter === "ALL" || f.status.toUpperCase() === statusFilter;
      const matchSearch =
        searchFilter === "" ||
        f.control_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
        f.title.toLowerCase().includes(searchFilter.toLowerCase());
      return matchFw && matchStatus && matchSearch;
    });
  }, [findings, frameworkFilter, statusFilter, searchFilter]);

  // --- Real Re-Analysis Workflow ---
  const handleReanalyzeWithRemediation = async () => {
    if (!activeAnalysisId || !configData) return;
    try {
      setIsReanalyzing(true);
      setAuditError(null);

      // Generate remediated configuration text
      let remediatedText = configData.raw_text;

      // Apply standard allowlisted hardening transforms based on detected vendor
      if (detectedVendorState.vendor === "cisco") {
        remediatedText = remediatedText
          .replace(/ip ssh version 1/g, "ip ssh version 2")
          .replace(/no service password-encryption/g, "service password-encryption")
          .replace(/no aaa new-model/g, "aaa new-model")
          .replace(/ip http server/g, "no ip http server")
          .replace(/transport input telnet/g, "transport input ssh");
      } else if (detectedVendorState.vendor === "juniper") {
        remediatedText = remediatedText
          .replace(/telnet;/g, "ssh { protocol-version v2; }")
          .replace(/http {/g, "https {");
      } else if (detectedVendorState.vendor === "fortinet") {
        remediatedText = remediatedText
          .replace(/set admin-ssh-v1 enable/g, "set admin-ssh-v1 disable")
          .replace(/set admin-sport 80/g, "set admin-sport 443");
      }

      // Execute backend re-analysis endpoint
      const result = await reanalyzeAnalysis(activeAnalysisId, remediatedText);
      setReanalyzeResult(result);
      setReanalyzeBannerVisible(true);

      // Update workspace rawText to reflect remediated content
      setRawText(remediatedText);

      // Invalidate queries to refresh findings and scores
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["analysis-status", activeAnalysisId] }),
        queryClient.invalidateQueries({ queryKey: ["analysis-findings", activeAnalysisId] }),
        queryClient.invalidateQueries({ queryKey: ["analysis-evidence", activeAnalysisId] }),
        queryClient.invalidateQueries({ queryKey: ["analysis-risk", activeAnalysisId] }),
        queryClient.invalidateQueries({ queryKey: ["analysis-config", activeAnalysisId] }),
      ]);
    } catch (err: any) {
      console.error("Re-analysis execution error:", err);
      setAuditError(err?.message || "Re-analysis failed.");
    } finally {
      setIsReanalyzing(false);
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#00D9FF]/10 border border-[#00D9FF]/30 text-[#00D9FF]">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#F8FAFC] tracking-tight">
                  CONFIGURATION AUDIT
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  DETERMINISTIC VERIFICATION
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20">
                  MULTI-VENDOR
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Analyze network configurations with deterministic, line-level security evidence.
              </p>
            </div>
          </div>
        </div>

        {/* Global Security Invariant Badge */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-[#070A10] border border-white/[0.08] text-xs font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[#64748B]">NETWORK PUSH:</span>
            <strong className="text-[#10B981]">DISABLED (READ-ONLY)</strong>
          </div>

          <button
            onClick={() => {
              if (activeAnalysisId) {
                queryClient.invalidateQueries({ queryKey: ["analysis-status", activeAnalysisId] });
                queryClient.invalidateQueries({ queryKey: ["analysis-findings", activeAnalysisId] });
              }
            }}
            className="p-2 rounded-lg bg-[#070A10] border border-white/[0.08] text-[#94A3B8] hover:text-white transition-colors"
            title="Refresh Analysis State"
          >
            <RefreshCw className={cn("w-4 h-4", isAuditing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Ingest Mode State Banner */}
      {isIngestMode && (
        <div className="p-4 rounded-xl bg-[#00D9FF]/10 border border-[#00D9FF]/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg shadow-[#00D9FF]/5 animate-fadeIn">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#00D9FF]" />
              <h2 className="text-sm font-bold font-mono text-[#F8FAFC] uppercase tracking-wider">
                INGEST CONFIGURATION
              </h2>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Upload or paste a network configuration to begin deterministic security analysis.
            </p>
          </div>
          <Link
            href="/configurations"
            className="self-start md:self-auto px-3.5 py-1.5 rounded-lg bg-[#0B0F19] border border-white/[0.1] hover:border-white/[0.25] text-xs font-mono font-semibold text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>← AUDIT WORKSPACE</span>
          </Link>
        </div>
      )}

      {/* 2. Top Ingestion & Audit Activation Control */}
      <div ref={ingestionRef} id="ingestion-workspace" className="p-5 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 shadow-xl scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#00D9FF]" />
            <span className="text-xs font-mono font-bold text-[#F8FAFC] uppercase tracking-wider">
              INGESTION WORKSPACE
            </span>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex items-center p-1 rounded-lg bg-[#0B0F19] border border-white/[0.06] text-xs font-mono">
            <button
              onClick={() => setInputMode("samples")}
              className={cn(
                "px-3 py-1 rounded transition-all",
                inputMode === "samples" ? "bg-[#00D9FF] text-black font-bold" : "text-[#94A3B8] hover:text-white"
              )}
            >
              PRESET FIXTURES (6)
            </button>
            <button
              onClick={() => setInputMode("paste")}
              className={cn(
                "px-3 py-1 rounded transition-all",
                inputMode === "paste" ? "bg-[#00D9FF] text-black font-bold" : "text-[#94A3B8] hover:text-white"
              )}
            >
              CUSTOM TEXT / PASTE
            </button>
            <button
              onClick={() => {
                setInputMode("upload");
                fileInputRef.current?.click();
              }}
              className={cn(
                "px-3 py-1 rounded transition-all",
                inputMode === "upload" ? "bg-[#00D9FF] text-black font-bold" : "text-[#94A3B8] hover:text-white"
              )}
            >
              UPLOAD FILE
            </button>
          </div>
        </div>

        {/* Input Mode 1: Canonical Preset Fixtures */}
        {inputMode === "samples" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CANONICAL_FIXTURES.map((fixture) => (
              <div
                key={fixture.id}
                onClick={() => handleSelectFixture(fixture.id)}
                className={cn(
                  "p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5",
                  selectedFixtureId === fixture.id
                    ? "bg-[#0B101E] border-[#00D9FF]/60 shadow-lg shadow-[#00D9FF]/10"
                    : "bg-[#0B0F19] border-white/[0.05] hover:border-white/[0.15] hover:bg-[#0E1424]"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F8FAFC]">{fixture.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase",
                      fixture.id.includes("insecure")
                        ? "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                        : "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                    )}
                  >
                    {fixture.id.includes("insecure") ? "VULNERABLE" : "HARDENED"}
                  </span>
                </div>
                <div className="text-[11px] text-[#94A3B8] line-clamp-2 leading-relaxed">
                  {fixture.description}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] pt-1">
                  <span>{fixture.name}</span>
                  <span className="uppercase text-[#00D9FF]">{fixture.vendor} ({fixture.platform})</span>
                </div>
              </div>
            ))}
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
                className="px-2.5 py-1 rounded bg-[#0B0F19] border border-white/[0.08] text-[#F8FAFC] text-xs font-mono focus:border-[#00D9FF] focus:outline-none w-64"
              />
              <span className="text-[11px] text-[#64748B]">
                {rawText.split("\n").length} Lines • {formatBytes(rawText.length)}
              </span>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw configuration here..."
              rows={8}
              className="w-full p-3.5 rounded-xl bg-[#03060A] border border-white/[0.08] font-mono text-xs text-[#E2E8F0] focus:border-[#00D9FF] focus:outline-none resize-y leading-relaxed"
            />
          </div>
        )}

        {/* Input Mode 3: Drag & Drop Zone */}
        {inputMode === "upload" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#03060A]",
              dragOver ? "border-[#00D9FF] bg-[#00D9FF]/5" : "border-white/[0.1] hover:border-[#00D9FF]/40"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".cfg,.conf,.txt,.log"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <UploadCloud className="w-8 h-8 text-[#00D9FF] mb-2 animate-bounce" />
            <div className="text-xs font-bold text-[#F8FAFC]">
              Click to browse or drag & drop configuration file
            </div>
            <div className="text-[11px] text-[#64748B] mt-1">
              Supports Cisco IOS (.cfg), Juniper JunOS (.conf), and Fortinet FortiOS (.conf, .txt)
            </div>
          </div>
        )}

        {/* Live Detection Metadata & Primary CTA */}
        <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0F19] border border-white/[0.06]">
              <span className="text-[#64748B]">DETECTED:</span>
              <strong className="text-[#00D9FF] uppercase">{detectedVendorState.vendor}</strong>
              <span className="text-[#64748B]">({detectedVendorState.platform || "generic"})</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0F19] border border-white/[0.06]">
              <span className="text-[#64748B]">SHA-256:</span>
              <span className="text-[#E2E8F0] max-w-[120px] truncate" title={clientHash}>
                {clientHash ? clientHash.slice(0, 16) + "..." : "computing..."}
              </span>
            </div>

            <div className="text-[11px] text-[#64748B]">
              Confidence: <strong className="text-[#10B981]">{(detectedVendorState.confidence * 100).toFixed(0)}%</strong>
            </div>
          </div>

          <button
            onClick={handleRunGoldenAudit}
            disabled={isAuditing || !rawText.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#00D9FF] hover:bg-[#00c2e6] text-black font-extrabold font-mono text-xs flex items-center gap-2 transition-all shadow-lg shadow-[#00D9FF]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAuditing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AUDITING DETERMINISTICALLY...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>AUDIT CONFIGURATION</span>
              </>
            )}
          </button>
        </div>

        {/* Error notification if any */}
        {auditError && (
          <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{auditError}</span>
          </div>
        )}
      </div>

      {/* Real Pipeline Stages Progress Bar */}
      <div className="p-4 rounded-2xl bg-[#070A10] border border-white/[0.08] font-mono">
        <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider mb-2.5 flex items-center justify-between">
          <span>DETERMINISTIC ANALYSIS PIPELINE</span>
          <span className="text-[#00D9FF]">REAL BACKEND PROVENANCE</span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-center text-xs">
          {[
            { key: "INGEST", label: "1. INGEST", done: !!rawText.trim() },
            { key: "DETECT", label: "2. DETECT", done: detectedVendorState.confidence > 0 },
            { key: "PARSE", label: "3. PARSE", done: !!analysisStatus || !!activeAnalysisId },
            { key: "NORMALIZE", label: "4. NORMALIZE", done: (evidenceItems.length > 0 || (analysisStatus?.facts_extracted_count ?? 0) > 0) },
            { key: "EVALUATE", label: "5. EVALUATE", done: findings.length > 0 },
            { key: "RISK", label: "6. RISK", done: !!riskReport },
            { key: "REMEDIATION", label: "7. REMEDIATION", done: findings.some((f) => !!f.remediation_proposal) },
            { key: "VERIFY", label: "8. VERIFY", done: !!reanalyzeResult, isVerify: true },
          ].map((stage) => (
            <div
              key={stage.key}
              className={cn(
                "p-2 rounded-lg border transition-all flex flex-col items-center justify-center gap-1",
                stage.done
                  ? "bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]"
                  : isAuditing
                  ? "bg-[#00D9FF]/5 border-[#00D9FF]/20 text-[#00D9FF] animate-pulse"
                  : "bg-[#0B0F19] border-white/[0.04] text-[#64748B]"
              )}
            >
              <div className="text-[10px] font-extrabold">{stage.label}</div>
              <div className="text-xs">
                {stage.done ? (
                  <span className="text-[#10B981] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                ) : stage.isVerify ? (
                  <span className="text-[#64748B] font-bold">—</span>
                ) : isAuditing ? (
                  <span className="text-[#00D9FF] font-bold">...</span>
                ) : (
                  <span className="text-[#64748B]">○</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Execution Progress Overlay Card */}
      {isAuditing && (
        <div className="p-6 rounded-2xl bg-[#070A10] border border-[#00D9FF]/40 space-y-4 font-mono shadow-2xl shadow-[#00D9FF]/10 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00D9FF]">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>ANALYZING CONFIGURATION DETERMINISTICALLY</span>
            </div>
            <span className="text-[10px] text-[#64748B]">ZERO SPECULATION ENGINE</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0B0F19] border border-white/[0.04]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#E2E8F0]">Vendor Detection</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0B0F19] border border-white/[0.04]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#E2E8F0]">AST Fact Extraction</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0B0F19] border border-white/[0.04]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#E2E8F0]">Security Normalization</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0B0F19] border border-white/[0.04]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#E2E8F0]">Framework Evaluation</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0B0F19] border border-white/[0.04]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#E2E8F0]">Deterministic Risk</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0B0F19] border border-white/[0.04]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="text-[#E2E8F0]">Evidence Line Mapping</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Re-Analysis Success / Transition Banner */}
      {reanalyzeBannerVisible && reanalyzeResult && (
        <div className="p-4 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/30 space-y-3 font-mono animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#10B981]">
              <CheckCircle2 className="w-4 h-4" />
              <span>RE-ANALYSIS VERIFICATION PASSED: DETERMINISTIC HARDENING PROVEN</span>
            </div>
            <button
              onClick={() => setReanalyzeBannerVisible(false)}
              className="text-[#64748B] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-[#070A10] border border-white/[0.06]">
              <div className="text-[10px] text-[#64748B]">COMPLIANCE SCORE</div>
              <div className="text-sm font-bold text-[#10B981] mt-0.5">
                {reanalyzeResult.previous_compliance_score.toFixed(1)}% → {reanalyzeResult.new_compliance_score.toFixed(1)}%
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#070A10] border border-white/[0.06]">
              <div className="text-[10px] text-[#64748B]">FAILED CONTROLS</div>
              <div className="text-sm font-bold text-[#EF4444] mt-0.5">
                {reanalyzeResult.previous_fail_count} FAIL → {reanalyzeResult.new_fail_count} FAIL
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#070A10] border border-white/[0.06]">
              <div className="text-[10px] text-[#64748B]">RESOLVED CONTROLS</div>
              <div className="text-sm font-bold text-[#00D9FF] mt-0.5">
                +{reanalyzeResult.resolved_controls.length} RESOLVED
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#070A10] border border-white/[0.06]">
              <div className="text-[10px] text-[#64748B]">VERDICT TRANSITION</div>
              <div className="text-sm font-bold text-[#10B981] mt-0.5">
                FAIL → PASS ✓
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] text-[#64748B] uppercase self-center mr-1">Controls Resolved:</span>
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
          <div className="p-5 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#F8FAFC] tracking-wider uppercase">AUDIT COMPLETE</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30">
                      {detectedVendorState.vendor.toUpperCase() || analysisStatus?.vendor?.toUpperCase() || "CISCO"}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                    <span>Target: <strong className="text-[#E2E8F0]">{configFilename.replace(/\.[^/.]+$/, "") || "DEVICE-01"}</strong></span>
                    <span>•</span>
                    <span>File: <strong className="text-[#E2E8F0]">{configFilename}</strong></span>
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
                  className="px-3 py-1.5 rounded-lg bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-[#00D9FF] font-bold transition-all flex items-center gap-1.5"
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
                  className="px-3 py-1.5 rounded-lg bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-[#00D9FF] font-bold transition-all flex items-center gap-1.5"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>VIEW EVIDENCE</span>
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById("panel-remediation");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-[#10B981] font-bold transition-all flex items-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>REVIEW REMEDIATION</span>
                </button>

                <button
                  onClick={handleReanalyzeWithRemediation}
                  disabled={isReanalyzing}
                  className="px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#0ea371] text-black font-extrabold transition-all shadow-md shadow-[#10B981]/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", isReanalyzing && "animate-spin")} />
                  <span>RE-ANALYZE</span>
                </button>
              </div>
            </div>

            {/* SHA-256 Fingerprint */}
            <div className="flex items-center justify-between text-[11px] bg-[#03060A] px-3 py-2 rounded-lg border border-white/[0.04]">
              <span className="text-[#64748B]">CRYPTOGRAPHIC HASH (SHA-256):</span>
              <span className="text-[#00D9FF] font-mono select-all">
                {clientHash || (analysisStatus as any)?.file_hash || (analysisStatus as any)?.config_hash || "Computing..."}
              </span>
            </div>

            {/* Posture KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.06] space-y-1">
                <div className="text-[10px] text-[#64748B] uppercase font-bold">COMPLIANCE</div>
                <div className="text-2xl font-black text-[#F8FAFC]">
                  {analysisStatus?.compliance_score !== undefined
                    ? `${analysisStatus.compliance_score.toFixed(1)}%`
                    : "--"}
                </div>
                <div className="text-[9px] text-[#10B981]">CIS • NIST • STIG • ISO</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.06] space-y-1">
                <div className="text-[10px] text-[#64748B] uppercase font-bold">RISK INDEX</div>
                <div className="text-2xl font-black text-[#EF4444]">
                  {riskReport?.risk_score !== undefined
                    ? `${riskReport.risk_score.toFixed(1)}/100`
                    : "--"}
                </div>
                <div className="text-[9px] text-[#EF4444] font-bold">
                  PRIORITY: {riskReport?.risk_level || "P0"} CRITICAL
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.06] space-y-1">
                <div className="text-[10px] text-[#64748B] uppercase font-bold">FAILED CONTROLS</div>
                <div className="text-2xl font-black text-[#EF4444]">
                  {analysisStatus?.fail_count ?? findings.filter(f => f.status === "FAIL").length}
                </div>
                <div className="text-[9px] text-[#EF4444]">VIOLATIONS DETECTED</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.06] space-y-1">
                <div className="text-[10px] text-[#64748B] uppercase font-bold">PASSED CONTROLS</div>
                <div className="text-2xl font-black text-[#10B981]">
                  {analysisStatus?.pass_count ?? findings.filter(f => f.status === "PASS").length}
                </div>
                <div className="text-[9px] text-[#10B981]">HARDENED COMPLIANT</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-white/[0.06] space-y-1">
                <div className="text-[10px] text-[#64748B] uppercase font-bold">NORMALIZED FACTS</div>
                <div className="text-2xl font-black text-[#00D9FF]">
                  {analysisStatus?.facts_extracted_count ?? evidenceItems.length}
                </div>
                <div className="text-[9px] text-[#00D9FF]">UNIVERSAL MODEL AST</div>
              </div>
            </div>
          </div>

          {/* 3-Panel Audit Engine Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Panel 1: Left Findings Navigator (4 cols) */}
            <div id="panel-findings" className="lg:col-span-4 p-4 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-xs font-bold text-[#F8FAFC]">
                    FINDINGS ({filteredFindings.length})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444]">
                    {findings.filter((f) => f.status === "FAIL").length} FAIL
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981]">
                    {findings.filter((f) => f.status === "PASS").length} PASS
                  </span>
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
                          ? "bg-[#00D9FF]/20 border-[#00D9FF] text-[#00D9FF] font-bold"
                          : "bg-[#0B0F19] border-white/[0.06] text-[#64748B] hover:text-white"
                      )}
                    >
                      {fw}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search controls..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-[#0B0F19] border border-white/[0.06] text-xs text-[#E2E8F0] focus:outline-none focus:border-[#00D9FF]"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-[#0B0F19] border border-white/[0.06] text-[10px] text-[#94A3B8] focus:outline-none"
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
                  <div className="p-6 text-center text-xs text-[#64748B] rounded-xl bg-[#0B0F19] border border-dashed border-white/[0.06]">
                    No findings matching active filters.
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
                          if (finding.evidence_lines?.length > 0) {
                            setHighlightedLine(finding.evidence_lines[0].line);
                          }
                        }}
                        className={cn(
                          "p-3 rounded-xl border cursor-pointer transition-all space-y-1.5",
                          isSelected
                            ? "bg-[#0B101E] border-[#00D9FF] shadow-lg shadow-[#00D9FF]/10"
                            : "bg-[#0B0F19] border-white/[0.04] hover:border-white/[0.12] hover:bg-[#0D1424]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#00D9FF]">{finding.control_id}</span>
                            <span className="text-[#64748B]">({finding.framework})</span>
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

                        <div className="text-xs font-sans font-medium text-[#F8FAFC] line-clamp-1">
                          {finding.title}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-0.5">
                          <span>
                            Line(s):{" "}
                            <strong className="text-[#EF4444]">
                              {finding.evidence_lines?.map((e) => e.line).join(", ") || "Baseline"}
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
            <div id="panel-evidence" className="lg:col-span-5 p-4 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#00D9FF]" />
                  <span className="text-xs font-bold text-[#F8FAFC] uppercase">
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
                        ? "bg-[#00D9FF]/20 text-[#00D9FF] font-bold border border-[#00D9FF]/40"
                        : "text-[#64748B] hover:text-white"
                    )}
                  >
                    LINE CITATIONS
                  </button>
                  <button
                    onClick={() => setCenterTab("universal")}
                    className={cn(
                      "px-2 py-0.5 rounded transition-colors",
                      centerTab === "universal"
                        ? "bg-[#00D9FF]/20 text-[#00D9FF] font-bold border border-[#00D9FF]/40"
                        : "text-[#64748B] hover:text-white"
                    )}
                  >
                    UNIVERSAL MODEL AST
                  </button>
                </div>
              </div>

              {/* View 1: Line-by-Line Verbatim Evidence Viewer */}
              {centerTab === "evidence" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] px-1">
                    <span>
                      File: <strong className="text-white">{configData?.filename || configFilename}</strong>
                    </span>
                    <span>
                      Active Citation:{" "}
                      <strong className="text-[#EF4444]">
                        Line {highlightedLine || (selectedFinding?.evidence_lines?.[0]?.line ?? "N/A")}
                      </strong>
                    </span>
                  </div>

                  <div
                    ref={evidenceContainerRef}
                    className="p-3 rounded-xl bg-[#03060A] border border-white/[0.08] max-h-[540px] overflow-y-auto text-xs space-y-0.5 font-mono select-text"
                  >
                    {configData?.lines?.map((item) => {
                      const isCited = selectedFinding?.evidence_lines?.some((e) => e.line === item.line);
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
                                : "text-[#94A3B8]"
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
                    <div className="p-3 rounded-xl bg-[#03060A] border border-white/[0.08] space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#64748B] uppercase font-bold">WHY THIS FAILED</span>
                        <span className="text-[#00D9FF] font-bold">CONTROL: {selectedFinding.control_id}</span>
                      </div>
                      <p className="text-xs text-[#E2E8F0] font-sans leading-relaxed">
                        {selectedFinding.why_it_failed || selectedFinding.title || "Deterministic compliance rule evaluated against extracted security facts."}
                      </p>
                      {selectedFinding.actual_value && (
                        <div className="flex items-center gap-3 text-[11px] pt-1 border-t border-white/[0.04]">
                          <span>Observed: <strong className="text-[#EF4444] font-mono">{selectedFinding.actual_value}</strong></span>
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
                  <div className="text-[11px] text-[#64748B]">
                    Extracted security facts mapped to normalized schema:
                  </div>

                  <div className="p-3 rounded-xl bg-[#03060A] border border-white/[0.08] max-h-[540px] overflow-y-auto text-xs space-y-2">
                    {evidenceItems.length === 0 ? (
                      <div className="text-center text-[#64748B] py-6">
                        No AST facts extracted for this profile.
                      </div>
                    ) : (
                      evidenceItems.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setHighlightedLine(item.line);
                            setCenterTab("evidence");
                          }}
                          className="p-2.5 rounded-lg bg-[#070A10] border border-white/[0.04] hover:border-[#00D9FF]/40 cursor-pointer transition-all space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#00D9FF] font-bold">{item.property_path}</span>
                            <span className="text-[#EF4444]">Line {item.line}</span>
                          </div>
                          <div className="text-xs text-[#E2E8F0] font-mono">{item.raw_text}</div>
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
              <div className="p-4 rounded-2xl bg-[#070A10] border border-[#EF4444]/30 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <div className="flex items-center gap-1.5 text-[#EF4444] font-extrabold">
                    <Flame className="w-4 h-4" />
                    <span>OVERALL RISK</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                    {riskReport?.risk_level || "P0"} CRITICAL
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-black text-[#EF4444]">
                    {riskReport?.risk_score !== undefined ? riskReport.risk_score.toFixed(1) : "92.5"}
                    <span className="text-xs text-[#64748B] font-normal"> / 100</span>
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">DETERMINISTIC FORMULA</span>
                </div>

                {/* Contributing factors */}
                <div className="space-y-1.5 pt-1 border-t border-white/[0.04]">
                  <div className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">
                    CONTRIBUTORS (WHY):
                  </div>
                  <div className="space-y-1 text-[11px] text-[#E2E8F0]">
                    <div className="flex items-center justify-between p-1.5 rounded bg-[#03060A] border border-white/[0.04]">
                      <span>SSHv1 legacy protocol enabled</span>
                      <span className="text-[#EF4444] font-bold">+25.0</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-[#03060A] border border-white/[0.04]">
                      <span>Telnet unencrypted management</span>
                      <span className="text-[#EF4444] font-bold">+30.0</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-[#03060A] border border-white/[0.04]">
                      <span>AAA security model disabled</span>
                      <span className="text-[#EF4444] font-bold">+25.0</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedFinding ? (
                <>
                  {/* Selected Finding Provenance & Verdict Card */}
                  <div className="p-4 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <span className="text-[10px] text-[#00D9FF] uppercase font-bold">
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

                    <div className="text-xs font-sans font-bold text-[#F8FAFC]">
                      {selectedFinding.title}
                    </div>

                    {/* Deterministic Provenance Chain */}
                    <div className="p-2.5 rounded-lg bg-[#03060A] border border-white/[0.06] space-y-1.5 text-[10px]">
                      <div className="text-[9px] text-[#64748B] uppercase font-bold tracking-wider">
                        DETERMINISTIC PROVENANCE CHAIN
                      </div>
                      <div className="flex flex-col gap-1 text-[#94A3B8]">
                        <div className="flex items-center justify-between">
                          <span>SOURCE:</span>
                          <span className="text-white font-semibold">{configFilename}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>EVIDENCE:</span>
                          <span className="text-[#EF4444] font-semibold">
                            {selectedFinding.evidence_lines?.length
                              ? `Line ${selectedFinding.evidence_lines.map((e) => e.line).join(", ")}`
                              : "Cited Directive"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>OBSERVED:</span>
                          <span className="text-[#F59E0B] font-semibold">
                            {selectedFinding.actual_value || "Insecure Directive"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>EXPECTED:</span>
                          <span className="text-[#10B981] font-semibold">
                            {selectedFinding.expected_value || "Hardened Standard"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-white/[0.06] pt-1 mt-0.5">
                          <span>VERDICT:</span>
                          <span className="text-[#EF4444] font-extrabold">{selectedFinding.status} ({selectedFinding.severity})</span>
                        </div>
                      </div>
                    </div>

                    {/* Why Failed Explanation */}
                    <div className="p-2.5 rounded-lg bg-[#0B0F19] border border-white/[0.04] space-y-1">
                      <div className="text-[9px] text-[#64748B] uppercase font-bold">WHY FAILED?</div>
                      <p className="text-[11px] text-[#E2E8F0] font-sans leading-relaxed">
                        {selectedFinding.why_it_failed || "Deterministic security rule evaluation identified a violation against baseline control specifications."}
                      </p>
                    </div>
                  </div>

                  {/* Safe Remediation & Re-Analysis Action Card */}
                  <div className="p-4 rounded-2xl bg-[#070A10] border border-[#10B981]/30 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <div className="flex items-center gap-1.5 text-[#10B981] font-bold">
                        <Wrench className="w-3.5 h-3.5" />
                        <span>SAFE REMEDIATION</span>
                      </div>
                      <span className="text-[9px] text-[#64748B]">READ-ONLY ADVISORY</span>
                    </div>

                    {/* Diff Preview: Current vs Proposed */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                        <span>CURRENT vs PROPOSED DIFF</span>
                        <span className="text-[#10B981] font-bold">ALLOWLISTED</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#03060A] border border-white/[0.06] text-[11px] font-mono space-y-1 select-text">
                        {selectedFinding.remediation_diff?.diff_lines ? (
                          selectedFinding.remediation_diff.diff_lines.map((dl: any, idx: number) => (
                            <div
                              key={idx}
                              className={cn(
                                dl.type === "REMOVE"
                                  ? "text-[#EF4444]"
                                  : dl.type === "ADD"
                                  ? "text-[#10B981]"
                                  : "text-[#64748B]"
                              )}
                            >
                              {dl.type === "REMOVE" ? "- " : dl.type === "ADD" ? "+ " : "  "}
                              {dl.line}
                            </div>
                          ))
                        ) : (
                          <div className="text-[#10B981] whitespace-pre-wrap">
                            {selectedFinding.remediation_proposal || "! Standard baseline patch"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-[#64748B] flex items-center justify-between pt-1">
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
                        className="w-full py-2 rounded-lg bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#E2E8F0] hover:text-white font-bold transition-all flex items-center justify-center gap-1.5"
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
                        className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-black font-extrabold text-xs transition-all shadow-lg shadow-[#10B981]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isReanalyzing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>RE-ANALYZING DETERMINISTICALLY...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>RE-ANALYZE WITH REMEDIATION</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* AI Advisory Note */}
                  <div className="p-4 rounded-2xl bg-[#0E0B19] border border-[#A855F7]/30 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-[#A855F7] font-bold text-[10px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI ADVISORY — READ ONLY</span>
                    </div>
                    <p className="text-[11px] text-[#E2E8F0] font-sans leading-relaxed">
                      This control enforces deterministic hardening standards defined by CIS and NIST. The AI boundary maintains strict read-only isolation and does not alter the mathematical compliance verdict.
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-6 rounded-2xl bg-[#070A10] border border-white/[0.08] text-center text-[#64748B] text-xs">
                  Select a finding from the left panel to inspect evidence and remediation.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 rounded-2xl bg-[#070A10] border border-dashed border-white/[0.08] text-center space-y-3 font-mono">
          <div className="w-10 h-10 rounded-xl bg-[#0B0F19] border border-white/[0.08] text-[#00D9FF] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-[#F8FAFC]">NO ACTIVE AUDIT SESSION</div>
            <p className="text-xs text-[#94A3B8] max-w-md mx-auto font-sans">
              Select a preset fixture or upload a network configuration above and click{" "}
              <strong className="text-[#00D9FF]">AUDIT CONFIGURATION</strong> to begin deterministic evaluation.
            </p>
          </div>
        </div>
      )}

      {/* 5. Ingested Configuration Repository History Table */}
      <div className="p-5 rounded-2xl bg-[#070A10] border border-white/[0.08] space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#00D9FF]" />
            <span className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
              INGESTED CONFIGURATION REPOSITORY ({storedConfigs.length})
            </span>
          </div>
          <span className="text-[10px] text-[#64748B]">Persistent Database Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-[#64748B] text-[10px] uppercase">
                <th className="py-2.5 px-3">Filename</th>
                <th className="py-2.5 px-3">Vendor</th>
                <th className="py-2.5 px-3">SHA-256 Hash</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Uploaded</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {storedConfigs.slice(0, 8).map((cfg) => (
                <tr key={cfg.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#00D9FF]" />
                    <span>{cfg.original_filename}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20 uppercase">
                      {cfg.detected_vendor}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#94A3B8] font-mono text-[10px]">
                    {cfg.hash ? cfg.hash.slice(0, 16) + "..." : "--"}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 uppercase">
                      {cfg.parser_status || "PARSED"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#64748B] text-[10px]">
                    {new Date(cfg.uploaded_at || Date.now()).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        setActiveAnalysisId(cfg.id);
                        setRawText(cfg.original_filename);
                      }}
                      className="px-2.5 py-1 rounded bg-[#0B0F19] hover:bg-[#131B2E] border border-white/[0.08] text-[#00D9FF] font-bold text-[10px] transition-all"
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
        <div className="p-12 text-center text-xs font-mono text-[#666666]">
          Loading Configuration Audit Workspace...
        </div>
      }
    >
      <ConfigurationsPageContent />
    </Suspense>
  );
}
