"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Server,
  Shield,
  AlertTriangle,
  Flame,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Eye,
  X,
  FileCode,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import {
  fetchDevices,
  fetchDeviceDetail,
  fetchDeviceTimeline,
  DeviceItem,
  DeviceDetail,
  DeviceTimelineEvent,
} from "@/lib/api-client";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export default function DevicesPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedVendor, setSelectedVendor] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"profile" | "timeline" | "unknown">("profile");

  const {
    data: devices = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["devices", selectedVendor, user?.id],
    queryFn: () => fetchDevices(selectedVendor === "ALL" ? undefined : selectedVendor),
    enabled: !authLoading,
  });

  const {
    data: deviceDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ["device-detail", selectedDeviceId, user?.id],
    queryFn: () => (selectedDeviceId ? fetchDeviceDetail(selectedDeviceId) : null),
    enabled: !!selectedDeviceId && !authLoading,
  });

  const {
    data: deviceTimeline = [],
    isLoading: isTimelineLoading,
    isError: isTimelineError,
  } = useQuery({
    queryKey: ["device-timeline", selectedDeviceId, user?.id],
    queryFn: () => (selectedDeviceId ? fetchDeviceTimeline(selectedDeviceId) : []),
    enabled: !!selectedDeviceId && !authLoading,
  });

  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      searchQuery === "" ||
      d.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.platform.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans bg-[#080808] p-4 rounded-lg border border-[#1F1F1F]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-[#141414] text-[#D4D4D8] border border-[#262626] text-[9px] font-mono font-bold">
              AUDITED ASSETS
            </span>
            <span className="text-[10px] text-[#666666] font-mono">STATIC CONFIGURATION INVENTORY</span>
          </div>
          <h1 className="text-xl font-bold text-[#F2F2F2] tracking-tight flex items-center gap-2.5 font-mono">
            <Server className="w-5 h-5 text-[#888888]" />
            <span>Audited Network Devices</span>
          </h1>
          <p className="text-xs text-[#8E8E93] mt-1">
            Inventory of evaluated routers, switches, and security gateways across Cisco, Juniper, and Fortinet platforms based on parsed configuration records.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-[#8E8E93] hover:text-[#F2F2F2] hover:border-[#2A2A2A] text-xs font-mono transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Vendor Filter */}
          <div className="flex items-center gap-1 bg-[#080808] border border-[#1F1F1F] p-1 rounded-lg">
            {["ALL", "cisco", "juniper", "fortinet"].map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVendor(v)}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-semibold uppercase transition-colors",
                  selectedVendor === v
                    ? "bg-[#141414] text-[#F2F2F2] border border-[#2E2E2E] font-bold"
                    : "text-[#666666] hover:text-[#F2F2F2]"
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search hostname or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-xs text-[#F2F2F2] placeholder-[#666666] focus:outline-none focus:border-[#2A2A2A] w-full sm:w-64"
            />
          </div>
        </div>

        {/* Devices Table / States */}
        {isError ? (
          <div className="p-8 rounded-lg bg-[#080808] border border-[#EF4444]/30 text-center space-y-3 font-mono">
            <div className="w-8 h-8 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mx-auto">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F2F2F2] uppercase tracking-wider">DATA SOURCE UNAVAILABLE</div>
              <div className="text-[11px] text-[#EF4444] mt-1">
                {error instanceof Error ? error.message : "Failed to retrieve network devices from backend API."}
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#141414] hover:bg-[#1C1C1C] text-[#D4D4D8] border border-[#2E2E2E] text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          </div>
        ) : isLoading ? (
          <div className="py-16 text-center text-[#666666] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#888888]" />
            <span>Loading network inventory...</span>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="py-16 text-center text-[#666666] space-y-3">
            <Server className="w-8 h-8 text-[#666666] mx-auto" />
            <div className="text-sm font-bold text-[#F2F2F2]">NO DEVICES INGESTED</div>
            <p className="text-xs text-[#8E8E93] max-w-sm mx-auto">
              Upload a configuration file or ingest devices to audit your network infrastructure.
            </p>
            <Link
              href="/configurations?mode=ingest"
              className="inline-block px-3.5 py-1.5 rounded bg-[#141414] hover:bg-[#1C1C1C] text-[#F2F2F2] border border-[#2E2E2E] font-semibold text-xs mt-2"
            >
              Ingest Configuration →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#1F1F1F] bg-[#080808]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1F1F1F] bg-[#0B0B0B] text-[#666666] text-[10px] uppercase font-semibold">
                  <th className="p-3">Device Hostname</th>
                  <th className="p-3">Vendor / OS</th>
                  <th className="p-3">Compliance Score</th>
                  <th className="p-3">Risk Posture</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Ingested</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F1F]">
                {filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-[#121212] transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-[#888888]" />
                        <span className="font-bold text-[#F2F2F2]">{device.hostname}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#141414] text-[#F2F2F2] text-[10px] uppercase font-semibold border border-[#222222]">
                          {device.vendor}
                        </span>
                        <span className="text-[10px] text-[#666666]">{device.platform}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      {device.last_audit_score !== null && device.last_audit_score !== undefined ? (
                        <span className={cn(
                          "font-bold",
                          device.last_audit_score >= 80 ? "text-[#10B981]" :
                          device.last_audit_score >= 60 ? "text-[#F59E0B]" : "text-[#EF4444]"
                        )}>
                          {device.last_audit_score.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-[#666666]">Unassessed</span>
                      )}
                    </td>

                    <td className="p-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold border",
                        device.risk_score >= 75 ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25" :
                        device.risk_score >= 50 ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25" :
                        "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25"
                      )}>
                        Score {device.risk_score.toFixed(0)}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold border",
                        device.status === "HARDENED" && "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25",
                        device.status === "NEEDS_ATTENTION" && "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25",
                        device.status === "HIGH_RISK" && "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25",
                        device.status === "PENDING_AUDIT" && "bg-[#141414] text-[#666666] border-[#222222]"
                      )}>
                        {device.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="p-3 text-[#666666] text-[11px]">
                      {new Date(device.last_seen).toLocaleDateString()}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedDeviceId(device.id)}
                        className="px-2.5 py-1 rounded bg-[#141414] hover:bg-[#1C1C1C] text-[#D4D4D8] hover:text-white border border-[#222222] hover:border-[#383838] text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
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
      </div>

      {/* Device Intelligence Drawer */}
      {selectedDeviceId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-end animate-in fade-in duration-150">
          <div className="bg-[#0B0B0B] border-l border-[#1F1F1F] w-full max-w-xl h-full shadow-2xl overflow-y-auto flex flex-col font-mono text-xs">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#1F1F1F] bg-[#080808] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2 text-[#F2F2F2] font-bold">
                <Server className="w-4 h-4 text-[#888888]" />
                <span>Device Intelligence Details</span>
              </div>
              <button onClick={() => setSelectedDeviceId(null)} className="p-1 text-[#666666] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            {isDetailError ? (
              <div className="p-8 text-center space-y-3">
                <div className="text-[#EF4444] font-bold">Failed to load device details</div>
                <button
                  onClick={() => refetchDetail()}
                  className="px-3 py-1 rounded bg-[#141414] text-[#D4D4D8] border border-[#222222] text-xs"
                >
                  Retry
                </button>
              </div>
            ) : isDetailLoading || !deviceDetail ? (
              <div className="py-24 text-center text-[#666666] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#888888]" />
                <span>Loading device telemetry...</span>
              </div>
            ) : (
              <div className="p-5 space-y-5 flex-1">
                {/* Device Title & Meta */}
                <div className="p-4 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[#F2F2F2]">{deviceDetail.hostname}</h2>
                    <span className="px-2 py-0.5 rounded bg-[#141414] text-[#D4D4D8] border border-[#262626] uppercase text-[10px] font-bold">
                      {deviceDetail.vendor}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8E8E93]">
                    <div>Platform: <strong className="text-[#F2F2F2]">{deviceDetail.platform}</strong></div>
                    <div>Model: <strong className="text-[#F2F2F2]">{deviceDetail.model}</strong></div>
                    <div>Serial: <strong className="text-[#F2F2F2]">{deviceDetail.serial_number}</strong></div>
                    <div>Firmware: <strong className="text-[#F2F2F2]">{deviceDetail.firmware_version}</strong></div>
                  </div>
                </div>

                {/* Score & Findings Summary */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-[#080808] border border-[#1F1F1F] text-center">
                    <div className="text-[10px] text-[#666666] uppercase">Compliance</div>
                    <div className="text-lg font-bold text-[#10B981] mt-0.5">
                      {deviceDetail.compliance_score?.toFixed(0) ?? 0}%
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#080808] border border-[#1F1F1F] text-center">
                    <div className="text-[10px] text-[#666666] uppercase">Risk Score</div>
                    <div className="text-lg font-bold text-[#EF4444] mt-0.5">
                      {deviceDetail.risk_score?.toFixed(0) ?? 0}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#080808] border border-[#1F1F1F] text-center">
                    <div className="text-[10px] text-[#666666] uppercase">Open Findings</div>
                    <div className="text-lg font-bold text-[#F59E0B] mt-0.5">
                      {deviceDetail.open_findings_count}
                    </div>
                  </div>
                </div>

                {/* Drawer Tabs */}
                <div className="flex items-center gap-1 border-b border-[#1F1F1F] pb-1">
                  <button
                    onClick={() => setDrawerTab("profile")}
                    className={cn(
                      "px-3 py-1 rounded transition-colors",
                      drawerTab === "profile" ? "bg-[#141414] text-[#F2F2F2] font-bold" : "text-[#666666] hover:text-white"
                    )}
                  >
                    Security Profile
                  </button>
                  <button
                    onClick={() => setDrawerTab("timeline")}
                    className={cn(
                      "px-3 py-1 rounded transition-colors",
                      drawerTab === "timeline" ? "bg-[#141414] text-[#F2F2F2] font-bold" : "text-[#666666] hover:text-white"
                    )}
                  >
                    Timeline Events
                  </button>
                  <button
                    onClick={() => setDrawerTab("unknown")}
                    className={cn(
                      "px-3 py-1 rounded transition-colors",
                      drawerTab === "unknown" ? "bg-[#141414] text-[#F2F2F2] font-bold" : "text-[#666666] hover:text-white"
                    )}
                  >
                    Unknown Syntax ({deviceDetail.unknown_items?.length || 0})
                  </button>
                </div>

                {/* Tab 1: Security Profile */}
                {drawerTab === "profile" && (
                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-2">
                    <div className="text-[10px] text-[#666666] uppercase font-semibold">Parsed Normalized Facts:</div>
                    <pre className="text-[#E0E0E0] text-[11px] overflow-x-auto select-text leading-relaxed">
                      {JSON.stringify(deviceDetail.normalized_profile, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Tab 2: Timeline */}
                {drawerTab === "timeline" && (
                  <div className="space-y-3">
                    {deviceTimeline.length === 0 ? (
                      <div className="py-8 text-center text-[#666666]">No chronological events found.</div>
                    ) : (
                      deviceTimeline.map((ev) => (
                        <div key={ev.id} className="p-3 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#F2F2F2]">{ev.title}</span>
                            <span className="text-[10px] text-[#666666]">
                              {new Date(ev.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8E8E93] font-sans">{ev.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 3: Unknown Syntax */}
                {drawerTab === "unknown" && (
                  <div className="space-y-2">
                    {(!deviceDetail.unknown_items || deviceDetail.unknown_items.length === 0) ? (
                      <div className="py-8 text-center text-[#666666]">All configuration directives fully recognized.</div>
                    ) : (
                      deviceDetail.unknown_items.map((uk, idx) => (
                        <div key={idx} className="p-2.5 rounded bg-[#080808] border border-[#F59E0B]/30 text-[#F59E0B]">
                          {typeof uk === "string" ? uk : JSON.stringify(uk)}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-[#1F1F1F] bg-[#080808] flex items-center justify-between sticky bottom-0">
              <button
                onClick={() => setSelectedDeviceId(null)}
                className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] text-[#A0A0A0] hover:text-white border border-[#222222]"
              >
                Close Drawer
              </button>

              <Link
                href="/audits"
                className="px-3.5 py-1.5 rounded-lg bg-[#161616] hover:bg-[#202020] text-[#F2F2F2] border border-[#2E2E2E] font-semibold flex items-center gap-1 shadow-sm"
              >
                <span>Audit Asset</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
