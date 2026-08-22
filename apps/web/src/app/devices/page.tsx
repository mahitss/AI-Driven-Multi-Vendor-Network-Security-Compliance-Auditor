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
import { cn } from "@/lib/utils";

export default function DevicesPage() {
  const [selectedVendor, setSelectedVendor] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"profile" | "timeline" | "unknown">("profile");

  const { data: devices = [], isLoading, refetch } = useQuery({
    queryKey: ["devices", selectedVendor],
    queryFn: () => fetchDevices(selectedVendor === "ALL" ? undefined : selectedVendor),
  });

  const { data: deviceDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["device-detail", selectedDeviceId],
    queryFn: () => (selectedDeviceId ? fetchDeviceDetail(selectedDeviceId) : null),
    enabled: !!selectedDeviceId,
  });

  const { data: deviceTimeline = [], isLoading: isTimelineLoading } = useQuery({
    queryKey: ["device-timeline", selectedDeviceId],
    queryFn: () => (selectedDeviceId ? fetchDeviceTimeline(selectedDeviceId) : []),
    enabled: !!selectedDeviceId,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5 font-mono">
            <Server className="w-5 h-5 text-cyan-400" />
            <span>Monitored Network Devices</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time inventory of evaluated routers, switches, and security gateways across Cisco, Juniper, and Fortinet platforms.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-300 hover:text-white text-xs font-mono transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Vendor Filter */}
          <div className="flex items-center gap-1 bg-[#0b101c] border border-white/10 p-1 rounded-md">
            {["ALL", "cisco", "juniper", "fortinet"].map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVendor(v)}
                className={cn(
                  "px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase transition-colors",
                  selectedVendor === v
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search hostname or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-md bg-[#0b101c] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Devices Table */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading network inventory...</span>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <div>No network devices discovered.</div>
            <Link
              href="/configurations"
              className="inline-block px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
            >
              Upload Configuration
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/5 bg-[#080c14]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/60 text-slate-400 text-[10px] uppercase font-semibold">
                  <th className="p-3">Device Hostname</th>
                  <th className="p-3">Vendor / OS</th>
                  <th className="p-3">Compliance Score</th>
                  <th className="p-3">Risk Posture</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Seen</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-bold text-white">{device.hostname}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase font-semibold">
                          {device.vendor}
                        </span>
                        <span className="text-[10px] text-slate-500">{device.platform}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      {device.last_audit_score !== null && device.last_audit_score !== undefined ? (
                        <span className={cn(
                          "font-bold",
                          device.last_audit_score >= 80 ? "text-emerald-400" :
                          device.last_audit_score >= 60 ? "text-amber-400" : "text-rose-400"
                        )}>
                          {device.last_audit_score.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">Unassessed</span>
                      )}
                    </td>

                    <td className="p-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold border",
                        device.risk_score >= 75 ? "bg-rose-950 text-rose-300 border-rose-800/40" :
                        device.risk_score >= 50 ? "bg-amber-950 text-amber-300 border-amber-800/40" :
                        "bg-emerald-950 text-emerald-300 border-emerald-800/40"
                      )}>
                        Score {device.risk_score.toFixed(0)}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold border",
                        device.status === "HARDENED" && "bg-emerald-950/60 text-emerald-300 border-emerald-800/30",
                        device.status === "NEEDS_ATTENTION" && "bg-amber-950/60 text-amber-300 border-amber-800/30",
                        device.status === "HIGH_RISK" && "bg-rose-950/60 text-rose-300 border-rose-800/30",
                        device.status === "PENDING_AUDIT" && "bg-slate-800 text-slate-400 border-white/10"
                      )}>
                        {device.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="p-3 text-slate-400 text-[11px]">
                      {new Date(device.last_seen).toLocaleDateString()}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedDeviceId(device.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
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
          <div className="bg-[#0b101c] border-l border-white/10 w-full max-w-xl h-full shadow-2xl overflow-y-auto flex flex-col font-mono text-xs">
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 bg-slate-900/80 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Server className="w-4 h-4" />
                <span>Device Intelligence Details</span>
              </div>
              <button onClick={() => setSelectedDeviceId(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            {isDetailLoading || !deviceDetail ? (
              <div className="py-24 text-center text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading device telemetry...</span>
              </div>
            ) : (
              <div className="p-5 space-y-5 flex-1">
                {/* Device Title & Meta */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">{deviceDetail.hostname}</h2>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/30 uppercase text-[10px] font-bold">
                      {deviceDetail.vendor}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>Platform: <strong className="text-slate-200">{deviceDetail.platform}</strong></div>
                    <div>Model: <strong className="text-slate-200">{deviceDetail.model}</strong></div>
                    <div>Serial: <strong className="text-slate-200">{deviceDetail.serial_number}</strong></div>
                    <div>Firmware: <strong className="text-slate-200">{deviceDetail.firmware_version}</strong></div>
                  </div>
                </div>

                {/* Score & Findings Summary */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-[#070b14] border border-white/5 text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Compliance</div>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">
                      {deviceDetail.compliance_score?.toFixed(0) ?? 0}%
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#070b14] border border-white/5 text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Risk Score</div>
                    <div className="text-lg font-bold text-rose-400 mt-0.5">
                      {deviceDetail.risk_score?.toFixed(0) ?? 0}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#070b14] border border-white/5 text-center">
                    <div className="text-[10px] text-slate-500 uppercase">Open Findings</div>
                    <div className="text-lg font-bold text-amber-400 mt-0.5">
                      {deviceDetail.open_findings_count}
                    </div>
                  </div>
                </div>

                {/* Drawer Tabs */}
                <div className="flex items-center gap-1 border-b border-white/10 pb-1">
                  <button
                    onClick={() => setDrawerTab("profile")}
                    className={cn(
                      "px-3 py-1 rounded transition-colors",
                      drawerTab === "profile" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Security Profile
                  </button>
                  <button
                    onClick={() => setDrawerTab("timeline")}
                    className={cn(
                      "px-3 py-1 rounded transition-colors",
                      drawerTab === "timeline" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Timeline Events
                  </button>
                  <button
                    onClick={() => setDrawerTab("unknown")}
                    className={cn(
                      "px-3 py-1 rounded transition-colors",
                      drawerTab === "unknown" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Unknown Syntax ({deviceDetail.unknown_items?.length || 0})
                  </button>
                </div>

                {/* Tab 1: Security Profile */}
                {drawerTab === "profile" && (
                  <div className="p-3.5 rounded-lg bg-[#04060c] border border-white/10 space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Parsed Normalized Facts:</div>
                    <pre className="text-cyan-300 text-[11px] overflow-x-auto select-text leading-relaxed">
                      {JSON.stringify(deviceDetail.normalized_profile, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Tab 2: Timeline */}
                {drawerTab === "timeline" && (
                  <div className="space-y-3">
                    {deviceTimeline.length === 0 ? (
                      <div className="py-8 text-center text-slate-500">No chronological events found.</div>
                    ) : (
                      deviceTimeline.map((ev) => (
                        <div key={ev.id} className="p-3 rounded-lg bg-slate-900/60 border border-white/5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{ev.title}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(ev.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-sans">{ev.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 3: Unknown Syntax */}
                {drawerTab === "unknown" && (
                  <div className="space-y-2">
                    {(!deviceDetail.unknown_items || deviceDetail.unknown_items.length === 0) ? (
                      <div className="py-8 text-center text-slate-500">All configuration directives fully recognized.</div>
                    ) : (
                      deviceDetail.unknown_items.map((uk, idx) => (
                        <div key={idx} className="p-2.5 rounded bg-amber-950/20 border border-amber-800/30 text-amber-300">
                          {typeof uk === "string" ? uk : JSON.stringify(uk)}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between sticky bottom-0">
              <button
                onClick={() => setSelectedDeviceId(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Close Drawer
              </button>

              <Link
                href="/audits"
                className="px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1"
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
