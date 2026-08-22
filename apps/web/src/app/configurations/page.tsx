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
} from "lucide-react";
import {
  fetchConfigurations,
  fetchConfigurationDetail,
  uploadConfigFile,
  ConfigurationItem,
  ConfigurationDetail,
} from "@/lib/api-client";
import { computeClientSha256, formatBytes, cn } from "@/lib/utils";

// Sample configs available for 1-click test load
const SAMPLE_CONFIGS = [
  {
    name: "cisco_ios_core_switch.cfg",
    vendor: "cisco",
    label: "Cisco Catalyst 9300 (IOS-XE)",
    content: `! NetVigil Cisco Core Configuration
version 17.3
service timestamps debug datetime msec
service timestamps log datetime msec
service password-encryption
hostname CORE-SW-HQ-01
boot-start-marker
boot-end-marker
logging buffered 65536 informational
aaa new-model
aaa authentication login default group tacacs+ local
enable secret 9 $9$J8f0d83jLk92.kE109k$O8L1iKj.1mQ09s8v7x6
username netsec_admin privilege 15 algorithm-type scrypt secret 9 $9$K1029jSkdi01.Lkso$Z9k1092837465lks
ip domain name corp.netvigil.internal
ip ssh version 2
no ip http server
ip http secure-server
spanning-tree mode rapid-pvst
spanning-tree portfast bpduguard default
line vty 0 4
 transport input ssh
 access-class ACL_MGMT_VTY_INBOUND in
end`,
  },
  {
    name: "juniper_srx_firewall.conf",
    vendor: "juniper",
    label: "Juniper SRX345 (JunOS)",
    content: `## NetVigil Juniper SRX Configuration
version 21.4R3-S2;
system {
    host-name FW-PERIMETER-01;
    domain-name netvigil.internal;
    root-authentication {
        encrypted-password "$6$kO9d8s7g$f9L1oP0q8s7d6f5g4h3j2k1l0m9n8b7v6c5x4z3a2s1d0f9";
    }
    services {
        ssh {
            protocol-version v2;
            ciphers [ aes256-gcm@openssh.com aes128-gcm@openssh.com ];
        }
    }
    syslog {
        host 10.100.20.50 {
            any notice;
        }
    }
}
security {
    zones {
        security-zone trust {
            interfaces { ge-0/0/1.0; }
        }
    }
    policies {
        default-policy { deny-all; }
    }
}`,
  },
  {
    name: "fortinet_fortigate_edge.conf",
    vendor: "fortinet",
    label: "FortiGate 60F (FortiOS)",
    content: `#config-version=FG60F-7.2.4-FW-build1396-230308:opmode=0:vdom=0:user=admin
config system global
    set hostname "EDGE-FGT-BRANCH-01"
    set timezone "80"
    set admintimeout 10
    set admin-sport 8443
    set admin-ssh-port 22
    set strong-crypto enable
end
config system interface
    edit "wan1"
        set vdom "root"
        set mode static
        set ip 198.51.100.2 255.255.255.248
    next
end
config firewall policy
    edit 1
        set name "DENY_ALL_UNSOLICITED"
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

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadConfigFile,
    onSuccess: () => {
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ["configurations"] });
      queryClient.invalidateQueries({ queryKey: ["overview-stats"] });
    },
    onError: (err: any) => {
      setUploadError(err.message || "Failed to upload configuration.");
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileCode2 className="w-5 h-5 text-cyan-400" />
            <span>Configuration Ingestion Workspace</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ingest raw network device configurations (.cfg, .conf, .txt, .log) with real-time SHA-256 verification and
            deterministic vendor detection.
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
              {uploadMutation.isPending ? "Ingesting & Analyzing Configuration..." : "Drop Network Configuration File"}
            </div>
            <p className="text-xs text-slate-400 max-w-sm mb-3">
              Supports Cisco IOS/NX-OS, Juniper JunOS, and Fortinet FortiOS configs.
            </p>

            <div className="inline-flex items-center gap-3 text-[11px] font-mono text-slate-500">
              <span>Extensions: .cfg, .conf, .txt, .log</span>
              <span>•</span>
              <span>Max: 10MB</span>
            </div>

            {uploadMutation.isPending && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center flex-col gap-2">
                <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                <span className="text-xs font-mono text-cyan-300">Computing SHA-256 & Signature Matching...</span>
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
            Load sample production configurations to verify deterministic parser and signature detection:
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
                  <div className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {sample.label}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{sample.name}</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                  Load
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
            <span className="text-xs font-semibold text-white font-mono">Ingested Repository</span>
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

        {/* Table / Empty State */}
        {filteredConfigs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <FileCode2 className="w-8 h-8 mx-auto text-slate-600" />
            <div className="text-xs font-medium text-slate-400">No network configurations found</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Upload a .cfg, .conf, or .log configuration file above to run deterministic vendor detection and SHA-256
              digesting.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Configuration File</th>
                  <th className="py-2.5 px-3">Detected Vendor</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">SHA-256 Digest</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Parser Status</th>
                  <th className="py-2.5 px-3">Uploaded</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredConfigs.map((cfg) => {
                  const isCisco = cfg.detected_vendor === "cisco";
                  const isJuniper = cfg.detected_vendor === "juniper";
                  const isFortinet = cfg.detected_vendor === "fortinet";

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

                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              cfg.detection_confidence >= 0.85
                                ? "text-emerald-400"
                                : cfg.detection_confidence > 0.5
                                ? "text-amber-400"
                                : "text-slate-400"
                            )}
                          >
                            {(cfg.detection_confidence * 100).toFixed(0)}%
                          </span>
                          <span className="text-[10px] text-slate-500">({cfg.detection_method})</span>
                        </div>
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

                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                          {cfg.parser_status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-400 text-[11px] font-mono">
                        {new Date(cfg.uploaded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setInspectConfigId(cfg.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-white/5 hover:border-cyan-800/40 text-[11px] font-mono transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
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

      {/* Inspect Configuration Modal */}
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
              <span className="text-[10px] font-mono text-slate-500">
                Deterministic validation layer • Zero unverified LLM trust
              </span>
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
