"use client";

import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  FileCode2,
  CheckCircle2,
  AlertCircle,
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
} from "lucide-react";
import {
  fetchConfigurations,
  fetchConfigurationDetail,
  uploadConfigFile,
  analyzeConfiguration,
  fetchConfigurationAnalysis,
  ConfigurationItem,
  ConfigurationDetail,
  ConfigurationAnalysisDetail,
  SecurityFact,
  UnknownItem,
} from "@/lib/api-client";
import { computeClientSha256, formatBytes, cn } from "@/lib/utils";

// Comprehensive test fixtures covering secure & insecure profiles
const SAMPLE_CONFIGS = [
  {
    name: "cisco_secure_core.cfg",
    vendor: "cisco",
    label: "Cisco Catalyst 9300 (Secure Baseline)",
    variant: "secure",
    content: `! NetVigil Cisco IOS-XE Secure Baseline
version 17.3
hostname SECURE-RTR-01
ip domain name netvigil.gov.in
service password-encryption
service timestamps log datetime msec show-timezone
no service finger
no service pad
aaa new-model
aaa authentication login default group tacacs+ local
aaa authorization exec default group tacacs+ local
aaa authorization commands 15 default group tacacs+ local
enable secret 9 $9$J8f0d83jLk92.kE109k$O8L1iKj.1mQ09s8v7x6
username netsec_admin privilege 15 algorithm-type scrypt secret 9 $9$K1029jSkdi01.Lkso$Z9k1092837465lks
ip ssh version 2
ip ssh time-out 60
ip ssh server algorithm encryption aes256-gcm aes128-gcm
no ip http server
ip http secure-server
no ip source-route
no ip proxy-arp
no ip directed-broadcast
logging buffered 65536 informational
logging trap informational
logging host 10.100.20.50
ntp server 10.100.5.1
ntp authenticate
spanning-tree portfast bpduguard default
banner motd ^C
======================================================================
                 AUTHORIZED GOV / NTRO ACCESS ONLY
   All activities on this network node are continuously logged.
======================================================================
^C
line vty 0 4
 transport input ssh
 access-class 10 in
 exec-timeout 10 0
 login authentication default
end`,
  },
  {
    name: "cisco_insecure_legacy.cfg",
    vendor: "cisco",
    label: "Cisco IOS Legacy (Insecure / Vuln)",
    variant: "insecure",
    content: `! NetVigil Cisco Legacy Insecure Router
version 15.1
hostname VULN-RTR-02
no service password-encryption
service finger
no aaa new-model
enable password cisco123
username admin privilege 15 password 0 cleartextpass
ip http server
no ip http secure-server
snmp-server community public RW
cdp run
line vty 0 4
 transport input telnet
 login
! Legacy unknown syntax for testing adaptive training
weird-vendor-proprietary-command debug-all-interfaces level-9
end`,
  },
  {
    name: "juniper_secure_srx.conf",
    vendor: "juniper",
    label: "Juniper SRX Gateway (Secure Baseline)",
    variant: "secure",
    content: `## NetVigil Juniper SRX Secure Configuration
version 21.4R3-S2;
system {
    host-name SECURE-SRX-01;
    domain-name netvigil.gov.in;
    time-zone Asia/Kolkata;
    root-authentication {
        encrypted-password "$6$kO9d8s7g$f9L1oP0q8s7d6f5g4h3j2k1l0m9n8b7v6c5x4z3a2s1d0f9";
    }
    services {
        ssh {
            protocol-version v2;
            ciphers [ aes256-gcm@openssh.com aes128-gcm@openssh.com ];
        }
    }
    login {
        message "AUTHORIZED GOV / NTRO ACCESS ONLY. Unauthorized access is strictly prohibited.";
        user secops {
            class super-user;
        }
    }
    syslog {
        host 10.100.20.50 {
            any notice;
        }
    }
    ntp {
        server 10.100.5.1;
    }
}
security {
    policies {
        default-policy {
            deny-all;
        }
    }
}`,
  },
  {
    name: "fortinet_secure_firewall.conf",
    vendor: "fortinet",
    label: "Fortinet FortiGate 60F (Secure Baseline)",
    variant: "secure",
    content: `#config-version=FG60F-7.2.4-FW-build1396-230308:opmode=0:vdom=0:user=admin
config system global
    set hostname "SECURE-FGT-01"
    set timezone "80"
    set admintimeout 10
    set admin-ssh-v1 disable
    set admin-lockout-threshold 3
    set admin-lockout-duration 300
    set pre-login-banner enable
    set strong-crypto enable
end

config system interface
    edit "lan"
        set allowaccess ping https ssh
    next
end

config system ntp
    set ntpserver "10.100.5.1"
end

config log syslogd setting
    set status enable
    set server "10.100.20.50"
end

config firewall policy
    edit 1
        set name "DENY_ALL"
        set action deny
    next
end`,
  },
];

export default function ConfigurationsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inspectConfigId, setInspectConfigId] = useState<string | null>(null);
  const [analysisConfigId, setAnalysisConfigId] = useState<string | null>(null);
  const [expandedFact, setExpandedFact] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Fetch configurations list
  const {
    data: configurations = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["configurations", selectedVendor],
    queryFn: () => fetchConfigurations(selectedVendor === "all" ? undefined : selectedVendor),
  });

  // Fetch single inspection detail
  const { data: inspectingConfig, isLoading: isInspectingLoading } = useQuery({
    queryKey: ["configuration-detail", inspectConfigId],
    queryFn: () => (inspectConfigId ? fetchConfigurationDetail(inspectConfigId) : null),
    enabled: !!inspectConfigId,
  });

  // Fetch analysis detail
  const { data: analysisDetail, isLoading: isAnalysisLoading, refetch: refetchAnalysis } = useQuery({
    queryKey: ["configuration-analysis", analysisConfigId],
    queryFn: () => (analysisConfigId ? fetchConfigurationAnalysis(analysisConfigId) : null),
    enabled: !!analysisConfigId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadConfigFile,
    onSuccess: (data) => {
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ["configurations"] });
      queryClient.invalidateQueries({ queryKey: ["overview-stats"] });
      // Automatically trigger analysis view
      setAnalysisConfigId(data.id);
    },
    onError: (err: any) => {
      setUploadError(err.message || "Failed to upload configuration.");
    },
  });

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: (id: string) => analyzeConfiguration(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["configurations"] });
      queryClient.setQueryData(["configuration-analysis", data.configuration_id], data);
      setAnalysisConfigId(data.configuration_id);
    },
  });

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    try {
      await uploadMutation.mutateAsync(file);
    } catch (e) {
      // Handled in onError
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = async (sample: (typeof SAMPLE_CONFIGS)[0]) => {
    const blob = new Blob([sample.content], { type: "text/plain" });
    const file = new File([blob], sample.name, { type: "text/plain" });
    await handleFileUpload(file);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredConfigs = configurations.filter((cfg) => {
    const matchesSearch =
      cfg.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cfg.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cfg.hash.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderFactCard = (label: string, fact?: SecurityFact<any>, factKey?: string) => {
    if (!fact) return null;
    const isExpanded = expandedFact === factKey;
    const isExtracted = fact.status === "extracted";
    const isTrue = fact.value === true;
    const isFalse = fact.value === false;

    return (
      <div
        key={factKey || label}
        className={cn(
          "p-3 rounded-lg border transition-all cursor-pointer",
          isExpanded
            ? "bg-[#0f172a] border-cyan-500/50 shadow-lg shadow-cyan-950/20"
            : "bg-[#0b101c] border-white/5 hover:border-white/20 hover:bg-[#0d1424]"
        )}
        onClick={() => setExpandedFact(isExpanded ? null : factKey || label)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <span>{label}</span>
              {isExtracted ? (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/30">
                  Extracted
                </span>
              ) : (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-white/5">
                  Default Inferred
                </span>
              )}
            </div>

            <div className="font-mono text-xs">
              {typeof fact.value === "boolean" ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold",
                    fact.value
                      ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                      : "bg-rose-950/80 text-rose-400 border border-rose-800/40"
                  )}
                >
                  {fact.value ? "ENABLED / TRUE" : "DISABLED / FALSE"}
                </span>
              ) : Array.isArray(fact.value) ? (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {fact.value.length === 0 ? (
                    <span className="text-slate-500 text-[11px]">None configured</span>
                  ) : (
                    fact.value.map((v, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/30 text-[11px]"
                      >
                        {String(v)}
                      </span>
                    ))
                  )}
                </div>
              ) : (
                <span className="text-cyan-300 font-semibold">{String(fact.value)}</span>
              )}
            </div>
          </div>

          <div className="text-right flex items-center gap-1 text-slate-500">
            <span className="text-[10px] font-mono">{(fact.confidence * 100).toFixed(0)}%</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Expanded Provenance & Verbatim Evidence Inspector */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-xs font-mono animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-cyan-400">
                <Terminal className="w-3 h-3" />
                <span>Verbatim Configuration Evidence</span>
              </span>
              {fact.source_lines.length > 0 && (
                <span className="text-slate-400">
                  Line(s): <strong className="text-cyan-300">{fact.source_lines.join(", ")}</strong>
                </span>
              )}
            </div>

            <div className="p-2.5 rounded bg-[#060911] border border-white/10 text-slate-300 text-[11px] space-y-1">
              {fact.evidence.length === 0 ? (
                <span className="text-slate-500 italic">No direct line evidence (inferred from default baseline)</span>
              ) : (
                fact.evidence.map((line, idx) => (
                  <div key={idx} className="flex gap-2">
                    {fact.source_lines[idx] && (
                      <span className="text-slate-600 select-none">{fact.source_lines[idx]}:</span>
                    )}
                    <span className="text-cyan-200">{line}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
              <span>Method: {fact.method} (AST Parser)</span>
              <span>Status: {fact.status}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileCode2 className="w-5 h-5 text-cyan-400" />
            <span>Configuration Intelligence & Universal Normalization</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ingest heterogeneous network configurations (Cisco, Juniper, Fortinet), extract security facts with exact
            line provenance, and normalize to the vendor-neutral Universal Security Model.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-300 hover:text-white text-xs font-mono transition-colors"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Ingestion Dropzone & Quick Samples Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drop Zone (2 cols) */}
        <div className="lg:col-span-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-900/40 relative overflow-hidden",
              dragOver
                ? "border-cyan-400 bg-cyan-950/20"
                : "border-white/10 hover:border-cyan-500/40 hover:bg-slate-900/60"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".cfg,.conf,.txt,.log"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
              <UploadCloud className={cn("w-6 h-6", uploadMutation.isPending && "animate-bounce")} />
            </div>

            <div className="text-sm font-medium text-white mb-1">
              {uploadMutation.isPending ? "Ingesting & Normalizing Configuration..." : "Drop Network Configuration File"}
            </div>
            <p className="text-xs text-slate-400 max-w-sm mb-3">
              Supports Cisco IOS/NX-OS, Juniper JunOS (hierarchical & set), and Fortinet FortiOS blocks.
            </p>

            <div className="inline-flex items-center gap-3 text-[11px] font-mono text-slate-500">
              <span>Extensions: .cfg, .conf, .txt, .log</span>
              <span>•</span>
              <span>Deterministic AST Pipeline</span>
            </div>

            {uploadMutation.isPending && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center flex-col gap-2">
                <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                <span className="text-xs font-mono text-cyan-300">Extracting Facts & Preserving Line Provenance...</span>
              </div>
            )}
          </div>

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="mt-3 p-3 rounded-lg bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Quick Sample Config Loader Card (1 col) */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Quick Test Fixtures
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Load sample configurations across all 3 vendors to verify deterministic parser equivalence:
          </p>

          <div className="space-y-2 pt-1">
            {SAMPLE_CONFIGS.map((sample) => (
              <button
                key={sample.name}
                onClick={() => handleLoadSample(sample)}
                disabled={uploadMutation.isPending}
                className="w-full p-2.5 rounded-lg bg-[#0b101c] border border-white/5 hover:border-cyan-500/30 text-left transition-colors flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <div className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                    <span>{sample.label}</span>
                    <span
                      className={cn(
                        "text-[9px] font-mono px-1 rounded uppercase",
                        sample.variant === "secure"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
                          : "bg-amber-950 text-amber-400 border border-amber-800/40"
                      )}
                    >
                      {sample.variant}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{sample.name}</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                  Analyze
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ingested Configurations Table */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-white/5 space-y-4">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white font-mono">Ingested Configurations</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {filteredConfigs.length} files
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-md bg-[#0b101c] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-48 sm:w-60 font-mono"
              />
            </div>

            {/* Vendor Filter */}
            <div className="flex items-center gap-1 bg-[#0b101c] border border-white/10 p-1 rounded-md text-xs font-mono">
              {["all", "cisco", "juniper", "fortinet"].map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedVendor(v)}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[11px] capitalize transition-colors",
                    selectedVendor === v
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {filteredConfigs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <FileCode2 className="w-8 h-8 mx-auto text-slate-600" />
            <div className="text-xs font-medium text-slate-400">No network configurations found</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Upload a .cfg, .conf, or .log configuration file above to run deterministic vendor detection and Universal
              Security Normalization.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Configuration File</th>
                  <th className="py-2.5 px-3">Detected Vendor</th>
                  <th className="py-2.5 px-3">Parser Status</th>
                  <th className="py-2.5 px-3">SHA-256 Digest</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Uploaded</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredConfigs.map((cfg) => {
                  const isCisco = cfg.detected_vendor === "cisco";
                  const isJuniper = cfg.detected_vendor === "juniper";
                  const isFortinet = cfg.detected_vendor === "fortinet";
                  const isParsed = cfg.parser_status === "parsed";

                  return (
                    <tr key={cfg.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span>{cfg.original_filename}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{cfg.id}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono capitalize",
                            isCisco && "bg-cyan-950/80 text-cyan-400 border border-cyan-800/40",
                            isJuniper && "bg-indigo-950/80 text-indigo-400 border border-indigo-800/40",
                            isFortinet && "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40",
                            !isCisco && !isJuniper && !isFortinet && "bg-slate-800 text-slate-400"
                          )}
                        >
                          <span>{cfg.detected_vendor}</span>
                          {cfg.detected_platform && (
                            <span className="text-[10px] text-slate-400 uppercase">({cfg.detected_platform})</span>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded border",
                            isParsed
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/40"
                              : "bg-slate-800 text-slate-400 border-white/5"
                          )}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{cfg.parser_status}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1.5 group/hash">
                          <span className="text-[11px] text-slate-400">{cfg.hash.slice(0, 14)}...</span>
                          <button
                            onClick={() => handleCopy(cfg.hash)}
                            className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-200 transition-colors"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedHash === cfg.hash ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                        {formatBytes(cfg.file_size_bytes)}
                      </td>

                      <td className="py-3 px-3 text-slate-400 text-[11px] font-mono">
                        {new Date(cfg.uploaded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>

                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setAnalysisConfigId(cfg.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 hover:text-cyan-200 border border-cyan-800/40 text-[11px] font-mono transition-colors"
                        >
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>Security Facts</span>
                        </button>

                        <button
                          onClick={() => setInspectConfigId(cfg.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 text-[11px] font-mono transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Raw</span>
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

      {/* Universal Normalization & Security Facts Modal */}
      {analysisConfigId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0f1d] border border-cyan-500/30 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{analysisDetail?.filename || "Normalized Security Profile"}</span>
                    {analysisDetail && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 uppercase">
                        {analysisDetail.vendor} ({analysisDetail.platform || "generic"})
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Deterministic Universal Normalization • SIH26155 Canonical Schema v1.1.0
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => analyzeMutation.mutate(analysisConfigId)}
                  disabled={analyzeMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/40 text-xs font-mono transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", analyzeMutation.isPending && "animate-spin")} />
                  <span>Re-Parse</span>
                </button>

                <button
                  onClick={() => setAnalysisConfigId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {isAnalysisLoading || analyzeMutation.isPending ? (
                <div className="py-20 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                  <span>Parsing AST, extracting evidence, and building canonical security profile...</span>
                </div>
              ) : analysisDetail ? (
                <>
                  {/* Executive Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Facts Extracted</div>
                      <div className="text-lg font-bold text-cyan-300 mt-0.5 flex items-baseline gap-1.5">
                        <span>{analysisDetail.facts_extracted}</span>
                        <span className="text-[10px] text-slate-500 font-normal">properties</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Parser Confidence</div>
                      <div className="text-lg font-bold text-emerald-400 mt-0.5">
                        {(analysisDetail.parser_confidence * 100).toFixed(0)}%
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Unparsed Directives</div>
                      <div
                        className={cn(
                          "text-lg font-bold mt-0.5",
                          analysisDetail.unknown_items_count > 0 ? "text-amber-400" : "text-emerald-400"
                        )}
                      >
                        {analysisDetail.unknown_items_count}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Parser Engine</div>
                      <div className="text-xs font-semibold text-slate-300 mt-1 truncate">
                        {analysisDetail.parser_name}
                      </div>
                    </div>
                  </div>

                  {/* Domain Fact Groups */}
                  <div className="space-y-4">
                    {/* 1. Identity */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>1. Device Identity & Banners</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {renderFactCard("Hostname", analysisDetail.normalized_profile.identity?.hostname, "identity_hostname")}
                        {renderFactCard("Domain Name", analysisDetail.normalized_profile.identity?.domain_name, "identity_domain")}
                        {renderFactCard("Login MOTD Banner Present", analysisDetail.normalized_profile.identity?.banner_motd_present, "identity_banner_present")}
                        {renderFactCard("Legal Warning In Banner", analysisDetail.normalized_profile.identity?.banner_legal_warning, "identity_banner_warning")}
                      </div>
                    </div>

                    {/* 2. Remote Access */}
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5" />
                        <span>2. Remote Access Security (SSH / Telnet / HTTPS)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {renderFactCard("SSH Service Active", analysisDetail.normalized_profile.remote_access?.ssh_enabled, "ra_ssh_enabled")}
                        {renderFactCard("SSH Protocol Version", analysisDetail.normalized_profile.remote_access?.ssh_version, "ra_ssh_version")}
                        {renderFactCard("SSH Secure Ciphers (No DES/3DES/RC4)", analysisDetail.normalized_profile.remote_access?.ssh_ciphers_secure, "ra_ssh_ciphers")}
                        {renderFactCard("Telnet Service Active", analysisDetail.normalized_profile.remote_access?.telnet_enabled, "ra_telnet")}
                        {renderFactCard("HTTPS Management Active", analysisDetail.normalized_profile.remote_access?.https_server_enabled, "ra_https")}
                        {renderFactCard("VTY Inbound ACL / Filter Applied", analysisDetail.normalized_profile.remote_access?.vty_access_class_applied, "ra_vty_acl")}
                      </div>
                    </div>

                    {/* 3. Authentication & Authorization */}
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>3. Authentication & AAA Security</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {renderFactCard("AAA New-Model Enabled", analysisDetail.normalized_profile.authentication?.aaa_enabled, "auth_aaa")}
                        {renderFactCard("Password Encryption Service", analysisDetail.normalized_profile.authentication?.password_encryption_enabled, "auth_pw_enc")}
                        {renderFactCard("Enable Secret Configured", analysisDetail.normalized_profile.authentication?.enable_secret_configured, "auth_secret")}
                        {renderFactCard("Enable Secret Algorithm", analysisDetail.normalized_profile.authentication?.enable_secret_type, "auth_secret_alg")}
                        {renderFactCard("Local User Accounts", analysisDetail.normalized_profile.authentication?.local_users, "auth_local_users")}
                        {renderFactCard("Failed Login Lockout / Rate-Limit", analysisDetail.normalized_profile.authentication?.failed_login_lockout_enabled, "auth_lockout")}
                      </div>
                    </div>

                    {/* 4. Logging & Time Sync */}
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5" />
                        <span>4. Logging & Authoritative Time Sync (NTP / Syslog)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {renderFactCard("System Logging Active", analysisDetail.normalized_profile.logging?.logging_enabled, "log_active")}
                        {renderFactCard("Remote Syslog Servers", analysisDetail.normalized_profile.logging?.remote_syslog_servers, "log_syslog_servers")}
                        {renderFactCard("Log Timestamps (msec / UTC)", analysisDetail.normalized_profile.logging?.log_timestamps_enabled, "log_timestamps")}
                        {renderFactCard("NTP Time Sync Enabled", analysisDetail.normalized_profile.time_sync?.ntp_enabled, "ntp_enabled")}
                        {renderFactCard("NTP Servers", analysisDetail.normalized_profile.time_sync?.ntp_servers, "ntp_servers")}
                        {renderFactCard("NTP Cryptographic Authentication", analysisDetail.normalized_profile.time_sync?.ntp_authentication_enabled, "ntp_auth")}
                      </div>
                    </div>

                    {/* 5. Access Control & Network Protection */}
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>5. Access Control & Layer 2/3 Defense</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {renderFactCard("Inbound Firewall / ACL Count", analysisDetail.normalized_profile.access_control?.inbound_acls_count, "ac_acls")}
                        {renderFactCard("Default Drop Inbound Perimeter", analysisDetail.normalized_profile.access_control?.default_drop_inbound, "ac_drop")}
                        {renderFactCard("STP BPDU Guard Enabled", analysisDetail.normalized_profile.network_security?.spanning_tree_bpdu_guard_enabled, "net_bpdu")}
                        {renderFactCard("DHCP Snooping Enabled", analysisDetail.normalized_profile.network_security?.dhcp_snooping_enabled, "net_dhcp")}
                      </div>
                    </div>
                  </div>

                  {/* Unknown Directives Section (for Adaptive Training) */}
                  {analysisDetail.unknown_items && analysisDetail.unknown_items.length > 0 && (
                    <div className="mt-6 p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 font-mono">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span>Unparsed / Unknown Directives ({analysisDetail.unknown_items.length})</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40">
                          Captured for Adaptive Training
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        The following directives were not deterministically mapped to security facts. NetVigil
                        preserves these structured records with exact line provenance:
                      </p>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {analysisDetail.unknown_items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-[#060911] border border-white/5 flex items-center justify-between text-[11px] font-mono"
                          >
                            <div className="flex items-center gap-2">
                              {item.line_number && (
                                <span className="text-slate-500 font-semibold">L{item.line_number}:</span>
                              )}
                              <span className="text-amber-200">{item.raw_text}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">{item.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/10 bg-slate-900/80 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">
                Universal Canonical Model • Deterministic line provenance on all facts
              </span>
              <button
                onClick={() => setAnalysisConfigId(null)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Configuration Inspection Modal */}
      {inspectConfigId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c121e] border border-white/10 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <FileCode2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-sm font-semibold text-white">
                    {inspectingConfig?.original_filename || "Configuration Inspection"}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                    <span>ID: {inspectConfigId}</span>
                    <span>•</span>
                    <span>SHA-256: {inspectingConfig?.hash.slice(0, 16)}...</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectConfigId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isInspectingLoading ? (
                <div className="py-16 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading configuration details...</span>
                </div>
              ) : inspectingConfig ? (
                <>
                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Vendor & Platform</div>
                      <div className="text-cyan-300 font-semibold mt-0.5 capitalize">
                        {inspectingConfig.detected_vendor} ({inspectingConfig.detected_platform || "N/A"})
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Confidence</div>
                      <div className="text-emerald-400 font-semibold mt-0.5">
                        {(inspectingConfig.detection_confidence * 100).toFixed(0)}% (
                        {inspectingConfig.detection_method})
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">File Size</div>
                      <div className="text-slate-300 font-semibold mt-0.5">
                        {formatBytes(inspectingConfig.file_size_bytes)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
                      <div className="text-[10px] text-slate-500 uppercase">Parser Lifecycle</div>
                      <div className="text-indigo-400 font-semibold mt-0.5 uppercase">
                        {inspectingConfig.parser_status}
                      </div>
                    </div>
                  </div>

                  {/* Raw Configuration Text Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>Raw Device Configuration Excerpt</span>
                      <button
                        onClick={() => handleCopy(inspectingConfig.raw_content)}
                        className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy All</span>
                      </button>
                    </div>

                    <pre className="p-4 rounded-lg bg-[#070b12] border border-white/10 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-96 leading-relaxed select-text">
                      {inspectingConfig.raw_content}
                    </pre>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/10 bg-slate-900/60 flex items-center justify-between">
              <button
                onClick={() => {
                  setAnalysisConfigId(inspectConfigId);
                  setInspectConfigId(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/40 text-xs font-mono transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>View Security Facts</span>
              </button>

              <button
                onClick={() => setInspectConfigId(null)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
