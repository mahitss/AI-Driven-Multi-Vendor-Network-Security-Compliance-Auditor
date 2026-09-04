"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SeverityMetric, FrameworkMetric, VendorMetric, AffectedAssetMetric } from "@/lib/api-client";
import { BarChart3, ShieldAlert, Layers, Server, ShieldCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoricalBarChartsProps {
  severities: SeverityMetric[];
  frameworks: FrameworkMetric[];
  vendors: VendorMetric[];
  topAssets: AffectedAssetMetric[];
}

type TabType = "severity" | "framework" | "vendor" | "assets";

export default function CategoricalBarCharts({
  severities,
  frameworks,
  vendors,
  topAssets,
}: CategoricalBarChartsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("severity");

  const totalSeverityCount = severities.reduce((acc, s) => acc + s.count, 0);
  const maxSeverityCount = Math.max(...severities.map((s) => s.count), 1);
  const maxFrameworkFailed = Math.max(...frameworks.map((f) => f.failed_count), 1);
  const maxVendorFailed = Math.max(...vendors.map((v) => v.failed_count), 1);
  const maxAssetOpen = Math.max(...topAssets.map((a) => a.open_findings), 1);

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#0B0B0B] border border-[#141414] hover:border-[#2C2C2E] transition-colors space-y-4 font-mono">
      {/* Header & Category Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#141414] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#8E8E93]" />
            <span className="text-xs font-semibold text-[#F2F2F2] uppercase tracking-wider">
              CATEGORICAL SECURITY COMPARISONS
            </span>
          </div>
          <p className="text-[11px] text-[#8E8E93] font-sans mt-0.5">
            Aggregated finding distribution across severities, governance frameworks, vendor dialects, and fleet assets.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-[#080808] p-1 rounded-lg border border-[#141414]">
          <button
            onClick={() => setActiveTab("severity")}
            className={cn(
              "px-2.5 py-1 rounded text-[10px] font-semibold transition-all",
              activeTab === "severity"
                ? "bg-[#141414] text-[#F2F2F2] border border-[#2C2C2E]"
                : "text-[#8E8E93] hover:text-[#F2F2F2]"
            )}
          >
            By Severity
          </button>
          <button
            onClick={() => setActiveTab("framework")}
            className={cn(
              "px-2.5 py-1 rounded text-[10px] font-semibold transition-all",
              activeTab === "framework"
                ? "bg-[#141414] text-[#F2F2F2] border border-[#2C2C2E]"
                : "text-[#8E8E93] hover:text-[#F2F2F2]"
            )}
          >
            By Framework
          </button>
          <button
            onClick={() => setActiveTab("vendor")}
            className={cn(
              "px-2.5 py-1 rounded text-[10px] font-semibold transition-all",
              activeTab === "vendor"
                ? "bg-[#141414] text-[#F2F2F2] border border-[#2C2C2E]"
                : "text-[#8E8E93] hover:text-[#F2F2F2]"
            )}
          >
            By Vendor
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={cn(
              "px-2.5 py-1 rounded text-[10px] font-semibold transition-all",
              activeTab === "assets"
                ? "bg-[#141414] text-[#F2F2F2] border border-[#2C2C2E]"
                : "text-[#8E8E93] hover:text-[#F2F2F2]"
            )}
          >
            Top Assets
          </button>
        </div>
      </div>

      {/* 1. SEVERITY DISTRIBUTION */}
      {activeTab === "severity" && (
        <div className="space-y-3">
          {severities.length === 0 || totalSeverityCount === 0 ? (
            <div className="p-6 text-center text-xs text-[#8E8E93]">
              <ShieldCheck className="w-6 h-6 text-[#10B981] mx-auto mb-2" />
              No active findings in the evaluated fleet.
            </div>
          ) : (
            severities.map((item) => {
              const widthPct = Math.max((item.count / maxSeverityCount) * 100, 2);
              return (
                <Link
                  key={`sev-${item.severity}`}
                  href={`/findings?severity=${item.severity}`}
                  className="block group p-2.5 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#141414] hover:border-[#2C2C2E] transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-bold text-[#F2F2F2] group-hover:text-white">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#F2F2F2]">{item.count} items</span>
                      <span className="text-[10px] text-[#636366]">({item.percentage}%)</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#636366] group-hover:text-[#93C5FD] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-1.5 rounded-full bg-[#161D2A] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* 2. FRAMEWORK DISTRIBUTION */}
      {activeTab === "framework" && (
        <div className="space-y-3">
          {frameworks.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#8E8E93]">
              No framework compliance data available.
            </div>
          ) : (
            frameworks.map((fw) => {
              const failPct = Math.max((fw.failed_count / maxFrameworkFailed) * 100, 2);
              return (
                <Link
                  key={`fw-${fw.framework}`}
                  href={`/compliance/${fw.framework.toLowerCase()}`}
                  className="block group p-2.5 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#141414] hover:border-[#2C2C2E] transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#111620] text-[#93C5FD] border border-[#2C2C2E] font-bold text-[10px]">
                        {fw.framework}
                      </span>
                      <span className="font-bold text-[#F2F2F2]">
                        {fw.framework === "CIS"
                          ? "CIS Benchmarks"
                          : fw.framework === "NIST"
                          ? "NIST SP 800-53"
                          : fw.framework === "STIG"
                          ? "DISA STIG"
                          : "ISO/IEC 27001"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[#EF4444] font-bold">{fw.failed_count} Non-Compliant</span>
                      <span className="text-[#10B981] font-bold">{fw.compliance_score}% Pass</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#636366] group-hover:text-[#93C5FD] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  {/* Dual Bar (Passed / Failed Ratio) */}
                  <div className="w-full h-1.5 rounded-full bg-[#161D2A] overflow-hidden flex">
                    <div
                      className="h-full bg-[#10B981] transition-all duration-500"
                      style={{ width: `${fw.compliance_score}%` }}
                      title={`Passed: ${fw.passed_count}`}
                    />
                    <div
                      className="h-full bg-[#EF4444] transition-all duration-500"
                      style={{ width: `${100 - fw.compliance_score}%` }}
                      title={`Failed: ${fw.failed_count}`}
                    />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* 3. VENDOR DISTRIBUTION */}
      {activeTab === "vendor" && (
        <div className="space-y-3">
          {vendors.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#8E8E93]">
              No vendor telemetry recorded in database.
            </div>
          ) : (
            vendors.map((v) => {
              const failPct = Math.max((v.failed_count / maxVendorFailed) * 100, 2);
              return (
                <Link
                  key={`vnd-${v.vendor}`}
                  href={`/findings`}
                  className="block group p-2.5 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#141414] hover:border-[#2C2C2E] transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#111620] text-[#38BDF8] border border-[#38BDF8]/25 font-bold text-[10px] uppercase">
                        {v.vendor}
                      </span>
                      <span className="font-bold text-[#F2F2F2]">
                        {v.devices_count} Device(s) Evaluated
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[#EF4444] font-bold">{v.critical_count} P0</span>
                      <span className="text-[#8E8E93]">{v.failed_count} Total Open</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#636366] group-hover:text-[#93C5FD] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-[#161D2A] overflow-hidden">
                    <div
                      className="h-full bg-[#3B82F6] rounded-full transition-all duration-500"
                      style={{ width: `${failPct}%` }}
                    />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* 4. TOP AFFECTED ASSETS */}
      {activeTab === "assets" && (
        <div className="space-y-2.5">
          {topAssets.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#8E8E93]">
              No evaluated assets available in fleet.
            </div>
          ) : (
            topAssets.slice(0, 5).map((asset, rank) => {
              const widthPct = Math.max((asset.open_findings / maxAssetOpen) * 100, 2);
              return (
                <Link
                  key={`ast-${asset.configuration_id}`}
                  href={`/findings?audit_id=${asset.audit_id}`}
                  className="block group p-2.5 rounded-lg bg-[#080808] hover:bg-[#141414] border border-[#141414] hover:border-[#2C2C2E] transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-[#111620] text-[#8E8E93] font-bold text-[10px] flex items-center justify-center border border-[#141414]">
                        #{rank + 1}
                      </span>
                      <span className="font-bold text-[#F2F2F2] group-hover:text-white truncate max-w-[180px]">
                        {asset.hostname}
                      </span>
                      <span className="text-[10px] text-[#636366] uppercase">
                        [{asset.vendor}]
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {asset.critical_findings > 0 && (
                        <span className="text-[#EF4444] font-bold">
                          {asset.critical_findings} P0
                        </span>
                      )}
                      <span className="text-[#F2F2F2] font-bold">
                        {asset.open_findings} Open
                      </span>
                      <span className="text-[#10B981] font-semibold">
                        {asset.compliance_score}%
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#636366] group-hover:text-[#93C5FD] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-[#161D2A] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        asset.critical_findings > 0 ? "bg-[#EF4444]" : "bg-[#3B82F6]"
                      )}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
