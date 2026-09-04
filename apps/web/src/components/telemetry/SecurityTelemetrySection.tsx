"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSecurityTelemetry } from "@/lib/api-client";
import { useAuth } from "@/components/providers/AuthProvider";
import SecurityTrendLineChart from "./SecurityTrendLineChart";
import CategoricalBarCharts from "./CategoricalBarCharts";
import SecurityPostureHeatMap from "./SecurityPostureHeatMap";
import NetworkTopologyGraph from "./NetworkTopologyGraph";
import AuditExecutionTimeline from "./AuditExecutionTimeline";
import RemediationStatusDonut from "./RemediationStatusDonut";
import {
  Activity,
  TrendingUp,
  Grid,
  Network,
  Clock,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TelemetryViewTab = "analytics" | "heatmap" | "topology" | "timeline";

export default function SecurityTelemetrySection() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TelemetryViewTab>("analytics");

  const {
    data: telemetry,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["securityTelemetry", user?.id],
    queryFn: fetchSecurityTelemetry,
    enabled: !authLoading && !!user,
    staleTime: 10000,
  });

  if (isLoading && !telemetry) {
    return (
      <div className="p-8 rounded-lg bg-[#0B0B0B] border border-[#141414] text-center font-mono space-y-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[#8E8E93] mx-auto" />
        <div className="text-xs font-semibold text-[#F2F2F2]">INITIALIZING SECURITY TELEMETRY...</div>
        <p className="text-[11px] text-[#636366] font-sans">
          Evaluating deterministic compliance benchmarks, heat maps, and fleet topology graph.
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 rounded-lg bg-[#0B0B0B] border border-[#EF4444]/30 text-center font-mono space-y-3">
        <AlertCircle className="w-6 h-6 text-[#EF4444] mx-auto" />
        <div className="text-xs font-bold text-[#F2F2F2]">TELEMETRY UNAVAILABLE</div>
        <p className="text-[11px] text-[#8E8E93] font-sans max-w-lg mx-auto">
          {error instanceof Error ? error.message : "Unable to retrieve real-time security telemetry from the backend pipeline."}
        </p>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="px-3 py-1.5 rounded bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 font-mono"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
          <span>{isRefetching ? "Connecting..." : "Retry Telemetry Sync"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono">
      {/* Visual Analytics Navigation Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#141414] pb-2.5 bg-[#080808]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#8E8E93]" />
          <h2 className="text-xs font-semibold text-[#F2F2F2] uppercase tracking-wider">
            VISUAL SECURITY TELEMETRY
          </h2>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 bg-[#0B0B0B] p-0.5 rounded-lg border border-[#141414]">
            <button
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all",
                activeTab === "analytics"
                  ? "bg-[#141414] text-[#F2F2F2] border border-[#2C2C2E]"
                  : "text-[#8E8E93] hover:text-[#F2F2F2]"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#8E8E93]" />
              <span>Trends &amp; Distributions</span>
            </button>

            <button
              onClick={() => setActiveTab("heatmap")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all",
                activeTab === "heatmap"
                  ? "bg-[#141414] text-[#F2F2F2] border border-[#2C2C2E]"
                  : "text-[#8E8E93] hover:text-[#F2F2F2]"
              )}
            >
              <Grid className="w-3.5 h-3.5 text-[#8E8E93]" />
              <span>Heat Map</span>
            </button>

            <button
              onClick={() => setActiveTab("topology")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all",
                activeTab === "topology"
                  ? "bg-[#141414] text-[#F2F2F2] border border-[#2C2C2E]"
                  : "text-[#8E8E93] hover:text-[#F2F2F2]"
              )}
            >
              <Network className="w-3.5 h-3.5 text-[#8E8E93]" />
              <span>Topology</span>
            </button>

            <button
              onClick={() => setActiveTab("timeline")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all",
                activeTab === "timeline"
                  ? "bg-[#141414] text-[#F2F2F2] border border-[#2C2C2E]"
                  : "text-[#8E8E93] hover:text-[#F2F2F2]"
              )}
            >
              <Clock className="w-3.5 h-3.5 text-[#8E8E93]" />
              <span>Audit Timeline</span>
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-1.5 rounded-lg bg-[#0B0B0B] hover:bg-[#141414] border border-[#141414] text-[#8E8E93] hover:text-[#F2F2F2] transition-colors"
            title="Refresh Telemetry Data"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-[#8E8E93]", isRefetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* TAB 1: TRENDS & DISTRIBUTIONS */}
      {activeTab === "analytics" && (
        <div className="space-y-3">
          {/* Time-Series Line Chart */}
          <SecurityTrendLineChart
            trends={telemetry?.audit_trends || []}
            hasSufficientHistory={telemetry?.has_sufficient_history ?? false}
            isLoading={isLoading}
          />

          {/* Dual Column: Categorical Bar Charts (8 Cols) + Remediation Lifecycle (4 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            <div className="lg:col-span-8">
              <CategoricalBarCharts
                severities={telemetry?.findings_by_severity || []}
                frameworks={telemetry?.findings_by_framework || []}
                vendors={telemetry?.findings_by_vendor || []}
                topAssets={telemetry?.top_affected_assets || []}
              />
            </div>

            <div className="lg:col-span-4">
              <RemediationStatusDonut
                distribution={telemetry?.remediation_distribution || { available: 0, reviewed: 0, applied: 0, verified: 0, total: 0 }}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY POSTURE HEAT MAP */}
      {activeTab === "heatmap" && (
        <SecurityPostureHeatMap
          matrix={telemetry?.heatmap_matrix || []}
          isLoading={isLoading}
        />
      )}

      {/* TAB 3: FLEET TOPOLOGY */}
      {activeTab === "topology" && (
        <NetworkTopologyGraph
          topology={telemetry?.topology || { nodes: [], edges: [], has_topology_data: false }}
          isLoading={isLoading}
        />
      )}

      {/* TAB 4: AUDIT TIMELINE */}
      {activeTab === "timeline" && (
        <AuditExecutionTimeline
          trends={telemetry?.audit_trends || []}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
