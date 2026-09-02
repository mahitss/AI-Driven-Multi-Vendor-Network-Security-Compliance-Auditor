"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  fetchConfigurations,
  fetchAudits,
  fetchFindings,
  fetchDevices,
  Finding,
  ConfigurationItem,
  AuditItem,
  DeviceItem,
} from "@/lib/api-client";
import {
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileCode2,
  Layers,
  ArrowRight,
  RefreshCw,
  Server,
  AlertTriangle,
  Info,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MultiVendorSecurityPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedVendor, setSelectedVendor] = useState<"cisco" | "juniper" | "fortinet" | "ALL">("ALL");
  const [selectedFramework, setSelectedFramework] = useState<string>("ALL");

  // 1. Fetch live configurations
  const {
    data: configurations = [],
    isLoading: isConfigsLoading,
    refetch: refetchConfigs,
  } = useQuery<ConfigurationItem[]>({
    queryKey: ["configurations", user?.id],
    queryFn: () => fetchConfigurations(),
    enabled: !authLoading && !!user,
  });

  // 2. Fetch live audits
  const {
    data: audits = [],
    isLoading: isAuditsLoading,
    refetch: refetchAudits,
  } = useQuery<AuditItem[]>({
    queryKey: ["audits", user?.id],
    queryFn: () => fetchAudits(),
    enabled: !authLoading && !!user,
  });

  // 3. Fetch live findings
  const {
    data: findings = [],
    isLoading: isFindingsLoading,
    refetch: refetchFindings,
  } = useQuery<Finding[]>({
    queryKey: ["all-findings-for-multivendor", user?.id],
    queryFn: () => fetchFindings(),
    enabled: !authLoading && !!user,
  });

  // 4. Fetch live devices
  const {
    data: devices = [],
    isLoading: isDevicesLoading,
    refetch: refetchDevices,
  } = useQuery<DeviceItem[]>({
    queryKey: ["devices-for-multivendor", user?.id],
    queryFn: () => fetchDevices(),
    enabled: !authLoading && !!user,
  });

  const isLoading = isConfigsLoading || isAuditsLoading || isFindingsLoading || isDevicesLoading;

  const handleRefresh = () => {
    refetchConfigs();
    refetchAudits();
    refetchFindings();
    refetchDevices();
  };

  // Vendor classification
  const vendorBreakdown = useMemo(() => {
    const ciscoConfigs = configurations.filter((c) => c.detected_vendor?.toLowerCase() === "cisco");
    const juniperConfigs = configurations.filter((c) => c.detected_vendor?.toLowerCase() === "juniper");
    const fortinetConfigs = configurations.filter((c) => c.detected_vendor?.toLowerCase() === "fortinet");

    const getVendorStats = (vendorConfigs: ConfigurationItem[], vendorName: string) => {
      const configIds = vendorConfigs.map((c) => c.id);
      const vendorAudits = audits.filter((a) => configIds.includes(a.configuration_id));
      const vendorFindings = findings.filter((f) => {
        const item = f as any;
        return (
          item.vendor?.toLowerCase() === vendorName.toLowerCase() ||
          configIds.includes(item.configuration_id)
        );
      });

      const avgScore =
        vendorAudits.length > 0
          ? vendorAudits.reduce((acc, a) => acc + (a.score || 0), 0) / vendorAudits.length
          : null;

      const criticalCount = vendorFindings.filter((f) => f.severity === "CRITICAL").length;
      const failedCount = vendorFindings.filter((f) => f.status === "FAIL").length;

      return {
        configs: vendorConfigs,
        audits: vendorAudits,
        findings: vendorFindings,
        avgScore,
        criticalCount,
        failedCount,
        evaluated: vendorConfigs.length > 0,
      };
    };

    return {
      cisco: getVendorStats(ciscoConfigs, "cisco"),
      juniper: getVendorStats(juniperConfigs, "juniper"),
      fortinet: getVendorStats(fortinetConfigs, "fortinet"),
    };
  }, [configurations, audits, findings]);

  // Filtered findings for matrix
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const item = f as any;
      if (selectedVendor !== "ALL") {
        const vendor = (item.vendor || "").toLowerCase();
        if (vendor !== selectedVendor.toLowerCase()) return false;
      }
      if (selectedFramework !== "ALL") {
        if (f.framework?.toUpperCase() !== selectedFramework.toUpperCase()) return false;
      }
      return true;
    });
  }, [findings, selectedVendor, selectedFramework]);

  return (
    <div className="space-y-10 max-w-[1440px] mx-auto pb-16 font-sans">
      {/* 1. Header & Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1D2939] pb-5 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-[#3B82F6]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
              <span>UNIVERSAL SECURITY MODEL</span>
            </span>
            <span className="text-[#667085]">•</span>
            <span className="text-[#667085]">CROSS-VENDOR NORMALIZATION</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F3F4F6] tracking-tight font-sans">
            MULTI-VENDOR SECURITY MATRIX
          </h1>
          <p className="text-xs sm:text-sm text-[#A7B0C0] mt-1 max-w-3xl font-sans leading-relaxed">
            Deterministic AST normalization across Cisco IOS, Juniper JunOS, and Fortinet FortiOS. Compliance rules evaluate identically regardless of underlying vendor syntax.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0D121C] hover:bg-[#151E2D] border border-[#1D2939] text-xs text-[#A7B0C0] hover:text-white rounded-lg transition-colors font-semibold shadow-sm active:scale-[0.98]"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-[#3B82F6]")} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* 2. Empty State (Honest Representation) */}
      {!isLoading && configurations.length === 0 && (
        <div className="p-12 rounded-2xl bg-[#0D121C] border border-[#1D2939] text-center space-y-4 font-mono">
          <div className="w-12 h-12 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F3F4F6] uppercase tracking-wider">
              NO EVALUATED CONFIGURATIONS AVAILABLE
            </h2>
            <p className="text-xs text-[#667085] mt-1.5 max-w-md mx-auto font-sans leading-relaxed">
              No network device configurations have been ingested in this account. Ingest and audit real configuration files (Cisco IOS, Juniper JunOS, Fortinet FortiOS) to activate the multi-vendor security matrix.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/configurations?mode=ingest"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold shadow-lg shadow-[#3B82F6]/20 transition-all"
            >
              <FileCode2 className="w-4 h-4" />
              <span>Ingest Configuration →</span>
            </Link>
          </div>
        </div>
      )}

      {/* 3. Real Multi-Vendor Overview & Vendor Cards */}
      {configurations.length > 0 && (
        <>
          {/* Vendor Fleet Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono">
            {/* CISCO IOS */}
            <div className="p-5 rounded-2xl bg-[#0D121C] border border-[#1D2939] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3B82F6] flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    <span>CISCO IOS / IOS-XE</span>
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded border uppercase font-bold",
                      vendorBreakdown.cisco.evaluated
                        ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                        : "bg-[#667085]/15 text-[#667085] border-[#667085]/30"
                    )}
                  >
                    {vendorBreakdown.cisco.evaluated ? "EVALUATED" : "NOT INGESTED"}
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-[#F3F4F6]">
                  {vendorBreakdown.cisco.avgScore !== null
                    ? `${vendorBreakdown.cisco.avgScore.toFixed(1)}%`
                    : "—"}
                </div>
                <div className="text-xs text-[#667085]">
                  {vendorBreakdown.cisco.configs.length} Configuration(s) •{" "}
                  {vendorBreakdown.cisco.failedCount} Violation(s)
                </div>
              </div>

              <div className="pt-3 border-t border-[#1D2939] text-xs space-y-1">
                <div className="flex items-center justify-between text-[#A7B0C0]">
                  <span>Critical (P0):</span>
                  <span className="text-[#EF4444] font-bold">
                    {vendorBreakdown.cisco.criticalCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#A7B0C0]">
                  <span>Grammar Parser:</span>
                  <span className="text-white">CiscoIOSParser v1.0.0</span>
                </div>
              </div>
            </div>

            {/* JUNIPER JUNOS */}
            <div className="p-5 rounded-2xl bg-[#0D121C] border border-[#1D2939] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#10B981] flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    <span>JUNIPER JUNOS</span>
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded border uppercase font-bold",
                      vendorBreakdown.juniper.evaluated
                        ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                        : "bg-[#667085]/15 text-[#667085] border-[#667085]/30"
                    )}
                  >
                    {vendorBreakdown.juniper.evaluated ? "EVALUATED" : "NOT INGESTED"}
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-[#F3F4F6]">
                  {vendorBreakdown.juniper.avgScore !== null
                    ? `${vendorBreakdown.juniper.avgScore.toFixed(1)}%`
                    : "—"}
                </div>
                <div className="text-xs text-[#667085]">
                  {vendorBreakdown.juniper.configs.length} Configuration(s) •{" "}
                  {vendorBreakdown.juniper.failedCount} Violation(s)
                </div>
              </div>

              <div className="pt-3 border-t border-[#1D2939] text-xs space-y-1">
                <div className="flex items-center justify-between text-[#A7B0C0]">
                  <span>Critical (P0):</span>
                  <span className="text-[#EF4444] font-bold">
                    {vendorBreakdown.juniper.criticalCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#A7B0C0]">
                  <span>Grammar Parser:</span>
                  <span className="text-white">JunOSParser v1.0.0</span>
                </div>
              </div>
            </div>

            {/* FORTINET FORTIOS */}
            <div className="p-5 rounded-2xl bg-[#0D121C] border border-[#1D2939] space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F59E0B] flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    <span>FORTINET FORTIOS</span>
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded border uppercase font-bold",
                      vendorBreakdown.fortinet.evaluated
                        ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30"
                        : "bg-[#667085]/15 text-[#667085] border-[#667085]/30"
                    )}
                  >
                    {vendorBreakdown.fortinet.evaluated ? "EVALUATED" : "NOT INGESTED"}
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-[#F3F4F6]">
                  {vendorBreakdown.fortinet.avgScore !== null
                    ? `${vendorBreakdown.fortinet.avgScore.toFixed(1)}%`
                    : "—"}
                </div>
                <div className="text-xs text-[#667085]">
                  {vendorBreakdown.fortinet.configs.length} Configuration(s) •{" "}
                  {vendorBreakdown.fortinet.failedCount} Violation(s)
                </div>
              </div>

              <div className="pt-3 border-t border-[#1D2939] text-xs space-y-1">
                <div className="flex items-center justify-between text-[#A7B0C0]">
                  <span>Critical (P0):</span>
                  <span className="text-[#EF4444] font-bold">
                    {vendorBreakdown.fortinet.criticalCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#A7B0C0]">
                  <span>Grammar Parser:</span>
                  <span className="text-white">FortiOSParser v1.0.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Cross-Vendor Findings Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
              <div className="text-xs font-bold text-[#667085] uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>CROSS-VENDOR COMPLIANCE FINDINGS ({filteredFindings.length})</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {/* Vendor Filter */}
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value as any)}
                  className="bg-[#0D121C] border border-[#1D2939] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="ALL">All Vendors</option>
                  <option value="cisco">Cisco IOS</option>
                  <option value="juniper">Juniper JunOS</option>
                  <option value="fortinet">Fortinet FortiOS</option>
                </select>

                {/* Framework Filter */}
                <select
                  value={selectedFramework}
                  onChange={(e) => setSelectedFramework(e.target.value)}
                  className="bg-[#0D121C] border border-[#1D2939] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="ALL">All Frameworks</option>
                  <option value="CIS">CIS</option>
                  <option value="NIST">NIST</option>
                  <option value="STIG">STIG</option>
                  <option value="ISO">ISO</option>
                </select>
              </div>
            </div>

            {filteredFindings.length > 0 ? (
              <div className="rounded-2xl border border-[#1D2939] bg-[#0D121C] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#080B12] border-b border-[#1D2939] text-[#667085]">
                      <tr>
                        <th className="py-3 px-4">CONTROL</th>
                        <th className="py-3 px-4">VENDOR</th>
                        <th className="py-3 px-4">DEVICE</th>
                        <th className="py-3 px-4">SEVERITY</th>
                        <th className="py-3 px-4">VERDICT</th>
                        <th className="py-3 px-4">EVIDENCE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1D2939]">
                      {filteredFindings.slice(0, 50).map((f) => {
                        const item = f as any;
                        const vendor = item.vendor || "network";
                        return (
                          <tr key={f.id} className="hover:bg-[#111827]/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-white">{f.control_id}</td>
                            <td className="py-3 px-4 uppercase text-[#3B82F6]">{vendor}</td>
                            <td className="py-3 px-4 text-[#A7B0C0] truncate max-w-[150px]">
                              {item.device_name || "—"}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                  f.severity === "CRITICAL"
                                    ? "bg-[#EF4444]/15 text-[#EF4444]"
                                    : f.severity === "HIGH"
                                    ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                                    : "bg-[#3B82F6]/15 text-[#3B82F6]"
                                )}
                              >
                                {f.severity}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                  f.status === "FAIL"
                                    ? "bg-[#EF4444]/15 text-[#EF4444]"
                                    : "bg-[#10B981]/15 text-[#10B981]"
                                )}
                              >
                                {f.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-[#A7B0C0] truncate max-w-[280px]">
                              {f.evidence || "AST rule match"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center text-xs font-mono text-[#667085]">
                No findings matching the selected filters.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
