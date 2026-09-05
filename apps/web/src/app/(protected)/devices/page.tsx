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

  // Filtered devices query for the table
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

  // Global inventory query to ensure summary cards reflect total fleet scope
  const {
    data: allDevices = [],
  } = useQuery({
    queryKey: ["all-devices-inventory", user?.id],
    queryFn: () => fetchDevices(),
    enabled: !authLoading,
    staleTime: 60000,
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

  // Dynamic real backend metrics derivation
  const summaryDevices = allDevices.length > 0 ? allDevices : devices;
  const totalAssets = summaryDevices.length;
  const activeAssets = summaryDevices.filter((d) => Boolean(d.status && d.last_seen)).length;
  const evaluatedDevices = summaryDevices.filter((d) => d.last_audit_score !== null && d.last_audit_score !== undefined);
  const avgCompliance = evaluatedDevices.length > 0
    ? evaluatedDevices.reduce((acc, d) => acc + (d.last_audit_score || 0), 0) / evaluatedDevices.length
    : 0;
  const scoredRiskDevices = summaryDevices.filter((d) => d.risk_score !== null && d.risk_score !== undefined);
  const avgRisk = scoredRiskDevices.length > 0
    ? scoredRiskDevices.reduce((acc, d) => acc + (d.risk_score || 0), 0) / scoredRiskDevices.length
    : 0;

  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      searchQuery === "" ||
      d.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.platform.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full pb-12 font-sans select-none overflow-x-hidden">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans bg-[#080808] p-4 sm:p-5 rounded-lg border border-[#1F1F1F]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded bg-[#141414] text-[#D4D4D8] border border-[#262626] text-[10px] font-mono font-bold">
              AUDITED ASSETS
            </span>
            <span className="text-[11px] text-[#666666] font-mono">•</span>
            <span className="text-[11px] text-[#666666] font-mono uppercase">STATIC CONFIGURATION INVENTORY</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold text-[#F2F2F2] tracking-tight flex items-center gap-3 font-mono leading-none">
            <Server className="w-6 h-6 text-[#888888] shrink-0" />
            <span>ASSETS & INVENTORY</span>
          </h1>
          <p className="text-sm sm:text-[15px] text-[#8E8E93] mt-1.5 font-sans leading-relaxed">
            Inventory of evaluated routers, switches, and security gateways across Cisco, Juniper, and Fortinet platforms based on parsed configuration records.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0D0D0D] hover:bg-[#141414] border border-[#1F1F1F] hover:border-[#2A2A2A] text-[#8E8E93] hover:text-white text-xs sm:text-[13px] font-mono transition-colors self-start sm:self-center cursor-pointer shrink-0"
          title="Refresh Device Inventory"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-[#F2F2F2]")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. Summary Cards Grid (Real Backend Values) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono items-stretch">
        {/* TOTAL ASSETS */}
        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full min-h-[115px]">
          <div>
            <div className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-wider font-mono">TOTAL ASSETS</div>
            <div className="text-3xl sm:text-[32px] font-bold text-[#F2F2F2] mt-2 font-mono leading-none">
              {totalAssets}
            </div>
          </div>
          <div className="text-xs text-[#666666] font-sans mt-2">Monitored network devices</div>
        </div>

        {/* ACTIVE */}
        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full min-h-[115px]">
          <div>
            <div className="text-[13px] font-bold text-[#10B981] uppercase tracking-wider font-mono flex items-center justify-between">
              <span>ACTIVE</span>
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="text-3xl sm:text-[32px] font-bold text-[#10B981] mt-2 font-mono leading-none">
              {activeAssets}
            </div>
          </div>
          <div className="text-xs text-[#666666] font-sans mt-2">Online & evaluated configurations</div>
        </div>

        {/* AVERAGE COMPLIANCE */}
        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full min-h-[115px]">
          <div>
            <div className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-wider font-mono flex items-center justify-between">
              <span>AVERAGE COMPLIANCE</span>
              <Shield className="w-4 h-4 text-[#888888]" />
            </div>
            <div className="text-3xl sm:text-[32px] font-bold text-[#F2F2F2] mt-2 font-mono leading-none">
              {avgCompliance.toFixed(1)}%
            </div>
          </div>
          <div className="text-xs text-[#666666] font-sans mt-2">Mean across active baseline audits</div>
        </div>

        {/* AVERAGE RISK */}
        <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] hover:border-[#2A2A2A] transition-colors flex flex-col justify-between h-full min-h-[115px]">
          <div>
            <div className="text-[13px] font-bold text-[#EF4444] uppercase tracking-wider font-mono flex items-center justify-between">
              <span>AVERAGE RISK</span>
              <Flame className="w-4 h-4 text-[#EF4444]" />
            </div>
            <div className="text-3xl sm:text-[32px] font-bold text-[#EF4444] mt-2 font-mono leading-none">
              {avgRisk.toFixed(1)}
            </div>
          </div>
          <div className="text-xs text-[#666666] font-sans mt-2">Mean fleet posture risk rating</div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Asset Table */}
      <div className="p-4 sm:p-5 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F1F1F]">
          {/* Vendor Filter */}
          <div className="flex items-center gap-1 bg-[#080808] border border-[#1F1F1F] p-1 rounded-md text-xs">
            {["ALL", "cisco", "juniper", "fortinet"].map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVendor(v)}
                className={cn(
                  "px-3 py-1 rounded text-xs font-semibold uppercase transition-colors cursor-pointer whitespace-nowrap",
                  selectedVendor === v
                    ? "bg-[#141414] text-[#F2F2F2] border border-[#2E2E2E] font-bold shadow-xs"
                    : "text-[#8E8E93] hover:text-[#F2F2F2]"
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search hostname, vendor, platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-md bg-[#080808] border border-[#1F1F1F] text-xs text-[#F2F2F2] placeholder-[#666666] focus:outline-none focus:border-[#383838] transition-colors font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666666] hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#141414] hover:bg-[#1C1C1C] text-[#D4D4D8] border border-[#2E2E2E] text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          </div>
        ) : isLoading ? (
          <div className="py-20 text-center text-[#666666] flex items-center justify-center gap-2 font-mono text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-[#888888]" />
            <span>Loading network inventory...</span>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="py-16 px-4 text-center text-[#666666] space-y-3 font-mono">
            <Server className="w-8 h-8 text-[#666666] mx-auto" />
            <div className="text-xs font-bold text-[#F2F2F2] uppercase tracking-wider">
              {devices.length === 0 ? "NO DEVICES INGESTED" : "NO MATCHING ASSETS FOUND"}
            </div>
            <p className="text-xs text-[#8E8E93] max-w-md mx-auto font-sans leading-relaxed">
              {devices.length === 0
                ? "Your network device inventory is currently empty because no configurations have been ingested yet."
                : `No assets match your search "${searchQuery}" or vendor filter "${selectedVendor}". Try clearing the filters.`}
            </p>
            {devices.length === 0 ? (
              <Link
                href="/configurations?mode=ingest"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#141414] hover:bg-[#1C1C1C] text-[#F2F2F2] border border-[#2A2A2A] font-semibold text-xs mt-2 transition-colors"
              >
                <span>Ingest Configuration →</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedVendor("ALL");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#141414] hover:bg-[#1C1C1C] text-[#F2F2F2] border border-[#2A2A2A] font-semibold text-xs mt-2 transition-colors"
              >
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#1F1F1F] bg-[#080808]">
            <table className="w-full text-left border-collapse table-fixed min-w-[960px]">
              <thead>
                <tr className="border-b border-[#1F1F1F] bg-[#0B0B0B] text-[#8E8E93] text-xs font-mono uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[260px]">Device</th>
                  <th className="py-3 px-4 w-[150px] shrink-0">Vendor</th>
                  <th className="py-3 px-4 w-[140px] shrink-0">Compliance</th>
                  <th className="py-3 px-4 w-[140px] shrink-0">Risk</th>
                  <th className="py-3 px-4 w-[150px] shrink-0">Status</th>
                  <th className="py-3 px-4 w-[140px] shrink-0">Last Ingested</th>
                  <th className="py-3 px-4 w-[110px] shrink-0 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181818] bg-[#080808] font-mono text-xs">
                {filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-[#101010] transition-colors">
                    {/* DEVICE */}
                    <td className="py-3.5 px-4 min-w-[260px]">
                      <div className="flex items-center gap-2.5 min-w-0" title={device.hostname}>
                        <Server className="w-4 h-4 text-[#888888] shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-[#F2F2F2] text-sm truncate block">{device.hostname}</span>
                          <span className="text-[11px] text-[#666666] font-mono truncate block">
                            {device.platform || "Standard Platform"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* VENDOR */}
                    <td className="py-3.5 px-4 w-[150px] shrink-0 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#141414] text-[#F2F2F2] text-xs uppercase font-semibold border border-[#262626]">
                          {device.vendor}
                        </span>
                      </div>
                    </td>

                    {/* COMPLIANCE */}
                    <td className="py-3.5 px-4 w-[140px] shrink-0 font-mono">
                      {device.last_audit_score !== null && device.last_audit_score !== undefined ? (
                        <div className="flex items-baseline gap-1">
                          <span className={cn(
                            "text-sm font-bold",
                            device.last_audit_score >= 80 ? "text-[#10B981]" :
                            device.last_audit_score >= 60 ? "text-[#F59E0B]" : "text-[#EF4444]"
                          )}>
                            {device.last_audit_score.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#666666]">Unassessed</span>
                      )}
                    </td>

                    {/* RISK */}
                    <td className="py-3.5 px-4 w-[140px] shrink-0 font-mono">
                      <span className={cn(
                        "px-2.5 py-1 rounded text-xs font-bold border inline-block whitespace-nowrap",
                        device.risk_score >= 75 ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30" :
                        device.risk_score >= 50 ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30" :
                        "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30"
                      )}>
                        Score {device.risk_score.toFixed(1)}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="py-3.5 px-4 w-[150px] shrink-0 font-mono">
                      <span className={cn(
                        "px-2.5 py-1 rounded text-[11px] font-bold uppercase border inline-flex items-center gap-1.5 whitespace-nowrap",
                        device.status === "HARDENED" && "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30",
                        device.status === "NEEDS_ATTENTION" && "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
                        device.status === "HIGH_RISK" && "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30",
                        device.status === "PENDING_AUDIT" && "bg-[#141414] text-[#8E8E93] border-[#262626]"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          device.status === "HARDENED" && "bg-[#10B981]",
                          device.status === "NEEDS_ATTENTION" && "bg-[#F59E0B]",
                          device.status === "HIGH_RISK" && "bg-[#EF4444]",
                          device.status === "PENDING_AUDIT" && "bg-[#8E8E93]"
                        )} />
                        <span>{device.status.replace(/_/g, " ")}</span>
                      </span>
                    </td>

                    {/* LAST INGESTED */}
                    <td className="py-3.5 px-4 w-[140px] shrink-0 text-[#8E8E93] text-xs font-mono">
                      {new Date(device.last_seen).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* INSPECT ACTION */}
                    <td className="py-3.5 px-4 w-[110px] shrink-0 text-right">
                      <button
                        onClick={() => setSelectedDeviceId(device.id)}
                        className="px-3 py-1.5 rounded-md bg-[#141414] hover:bg-[#1E1E1E] text-[#D4D4D8] hover:text-white border border-[#242424] hover:border-[#383838] text-xs font-mono font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#888888]" />
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
              <div className="flex items-center gap-2.5 text-[#F2F2F2] font-bold text-sm">
                <Server className="w-4 h-4 text-[#888888]" />
                <span>Device Intelligence Details</span>
              </div>
              <button
                onClick={() => setSelectedDeviceId(null)}
                className="p-1 rounded-md text-[#666666] hover:text-white hover:bg-[#141414] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            {isDetailError ? (
              <div className="p-8 text-center space-y-3 font-mono">
                <div className="text-[#EF4444] font-bold text-xs">Failed to load device details</div>
                <div className="text-[11px] text-[#666666]">
                  {detailError instanceof Error ? detailError.message : "Unknown error"}
                </div>
                <button
                  onClick={() => refetchDetail()}
                  className="px-3 py-1.5 rounded-md bg-[#141414] text-[#D4D4D8] border border-[#2E2E2E] text-xs font-semibold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : isDetailLoading || !deviceDetail ? (
              <div className="py-24 text-center text-[#666666] flex items-center justify-center gap-2 font-mono text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-[#888888]" />
                <span>Loading device telemetry...</span>
              </div>
            ) : (
              <div className="p-5 space-y-5 flex-1 font-mono">
                {/* Device Title & Meta */}
                <div className="p-4 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[#F2F2F2]">{deviceDetail.hostname}</h2>
                    <span className="px-2 py-0.5 rounded bg-[#141414] text-[#D4D4D8] border border-[#262626] uppercase text-[10px] font-bold">
                      {deviceDetail.vendor}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-[#8E8E93]">
                    <div>Platform: <strong className="text-[#F2F2F2]">{deviceDetail.platform}</strong></div>
                    <div>Model: <strong className="text-[#F2F2F2]">{deviceDetail.model}</strong></div>
                    <div>Serial: <strong className="text-[#F2F2F2]">{deviceDetail.serial_number}</strong></div>
                    <div>Firmware: <strong className="text-[#F2F2F2]">{deviceDetail.firmware_version}</strong></div>
                  </div>
                </div>

                {/* Score & Findings Summary */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-center">
                    <div className="text-[11px] text-[#666666] uppercase">Compliance</div>
                    <div className="text-xl font-bold text-[#10B981] mt-1">
                      {deviceDetail.compliance_score?.toFixed(1) ?? 0}%
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-center">
                    <div className="text-[11px] text-[#666666] uppercase">Risk Score</div>
                    <div className="text-xl font-bold text-[#EF4444] mt-1">
                      {deviceDetail.risk_score?.toFixed(1) ?? 0}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] text-center">
                    <div className="text-[11px] text-[#666666] uppercase">Open Findings</div>
                    <div className="text-xl font-bold text-[#F59E0B] mt-1">
                      {deviceDetail.open_findings_count}
                    </div>
                  </div>
                </div>

                {/* Drawer Tabs */}
                <div className="flex items-center gap-1 border-b border-[#1F1F1F] pb-1">
                  <button
                    onClick={() => setDrawerTab("profile")}
                    className={cn(
                      "px-3 py-1.5 rounded text-xs transition-colors cursor-pointer",
                      drawerTab === "profile" ? "bg-[#141414] text-[#F2F2F2] font-bold border border-[#262626]" : "text-[#666666] hover:text-white"
                    )}
                  >
                    Security Profile
                  </button>
                  <button
                    onClick={() => setDrawerTab("timeline")}
                    className={cn(
                      "px-3 py-1.5 rounded text-xs transition-colors cursor-pointer",
                      drawerTab === "timeline" ? "bg-[#141414] text-[#F2F2F2] font-bold border border-[#262626]" : "text-[#666666] hover:text-white"
                    )}
                  >
                    Timeline Events
                  </button>
                  <button
                    onClick={() => setDrawerTab("unknown")}
                    className={cn(
                      "px-3 py-1.5 rounded text-xs transition-colors cursor-pointer",
                      drawerTab === "unknown" ? "bg-[#141414] text-[#F2F2F2] font-bold border border-[#262626]" : "text-[#666666] hover:text-white"
                    )}
                  >
                    Unknown Syntax ({deviceDetail.unknown_items?.length || 0})
                  </button>
                </div>

                {/* Tab 1: Security Profile */}
                {drawerTab === "profile" && (
                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-2">
                    <div className="text-[11px] text-[#666666] uppercase font-semibold">Parsed Normalized Facts:</div>
                    <pre className="text-[#E0E0E0] text-xs overflow-x-auto select-text leading-relaxed font-mono p-2 bg-[#050505] rounded border border-[#181818]">
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
                            <span className="font-bold text-[#F2F2F2] text-xs">{ev.title}</span>
                            <span className="text-[11px] text-[#666666]">
                              {new Date(ev.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs text-[#8E8E93] font-sans">{ev.description}</p>
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
                        <div key={idx} className="p-2.5 rounded bg-[#080808] border border-[#F59E0B]/30 text-[#F59E0B] text-xs">
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
                className="px-3.5 py-2 rounded-md bg-[#141414] hover:bg-[#1E1E1E] text-[#A0A0A0] hover:text-white border border-[#222222] text-xs font-mono cursor-pointer"
              >
                Close Drawer
              </button>

              <Link
                href="/audits"
                className="px-4 py-2 rounded-md bg-[#161616] hover:bg-[#202020] text-[#F2F2F2] border border-[#2E2E2E] font-semibold flex items-center gap-1.5 shadow-xs text-xs font-mono"
              >
                <span>Audit Asset</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#10B981]" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
