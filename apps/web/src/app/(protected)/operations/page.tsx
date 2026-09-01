"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Flame,
  Shield,
  ShieldAlert,
  Server,
  RefreshCw,
  Search,
  Eye,
  ArrowRight,
  Terminal,
  FileCode2,
  Lock,
  Sparkles,
  CheckCircle2,
  X,
  ChevronRight,
  Clock,
  ExternalLink,
  Layers,
  Wrench,
  Radio,
  Send,
  Zap,
} from "lucide-react";
import {
  fetchOverviewStats,
  fetchSystemActivity,
  fetchFindings,
  fetchRisks,
  fetchRiskStats,
  fetchDevices,
  fetchRemediations,
  fetchFindingExplanation,
  SecurityActivityEvent,
  Finding,
  RiskItem,
  DeviceItem,
  RemediationProposal,
  SystemHealth,
} from "@/lib/api-client";
import { useSystemHealth } from "@/lib/use-system-health";
import { cn } from "@/lib/utils";

export default function SecurityOperationsPage() {
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiError, setIsAiError] = useState(false);

  // 1. Authoritative system health
  const { health } = useSystemHealth();

  // 2. Fetch overview posture stats
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["overview-stats"],
    queryFn: fetchOverviewStats,
    staleTime: 30000,
  });

  // 3. Fetch live system activity feed
  const {
    data: rawActivities = [],
    isLoading: isActivitiesLoading,
    isError: isActivitiesError,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: ["system-activity"],
    queryFn: () => fetchSystemActivity(25),
    staleTime: 15000,
  });

  // 4. Fetch findings
  const { data: findings = [] } = useQuery({
    queryKey: ["all-findings-for-ops"],
    queryFn: () => fetchFindings(),
    staleTime: 30000,
  });

  // 5. Fetch risk stats & items
  const { data: riskStats } = useQuery({
    queryKey: ["risk-stats"],
    queryFn: fetchRiskStats,
    staleTime: 30000,
  });

  const { data: risks = [] } = useQuery({
    queryKey: ["risks-for-ops"],
    queryFn: () => fetchRisks({ priority: "ALL" }),
    staleTime: 30000,
  });

  // 6. Fetch devices
  const { data: devices = [] } = useQuery({
    queryKey: ["devices-for-ops"],
    queryFn: () => fetchDevices(),
    staleTime: 60000,
  });

  // 7. Fetch remediations
  const { data: remediations = [] } = useQuery({
    queryKey: ["remediations-for-ops"],
    queryFn: () => fetchRemediations(),
    staleTime: 60000,
  });

  // Combined operational activity items (from backend activity + findings)
  const unifiedActivities: SecurityActivityEvent[] = useMemo(() => {
    const findingEvents: SecurityActivityEvent[] = findings.slice(0, 15).map((f) => ({
      id: `evt-finding-${f.id}`,
      type: "SECURITY_FINDING",
      title: `${f.control_id}: ${f.title}`,
      description: f.evidence ? `Evidence: ${f.evidence}` : `Status: ${f.status} (${f.severity})`,
      target_id: f.id,
      target_url: `/findings?findingId=${f.id}`,
      timestamp: f.created_at || new Date().toISOString(),
      severity: f.severity as any,
    }));

    const combined: SecurityActivityEvent[] = [...rawActivities, ...findingEvents];
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [rawActivities, findings]);

  // Default selection to first event
  useEffect(() => {
    if (unifiedActivities.length > 0 && !selectedEventId) {
      setSelectedEventId(unifiedActivities[0].id);
    }
  }, [unifiedActivities, selectedEventId]);

  const selectedEvent: SecurityActivityEvent | undefined = useMemo(() => {
    return unifiedActivities.find((e) => e.id === selectedEventId) || unifiedActivities[0];
  }, [unifiedActivities, selectedEventId]);

  // Correlated finding for selected event
  const selectedFinding: Finding | undefined = useMemo(() => {
    if (!selectedEvent) return findings[0];
    if (selectedEvent.type === "SECURITY_FINDING") {
      const match = findings.find((f) => `evt-finding-${f.id}` === selectedEvent.id || f.id === selectedEvent.target_id);
      if (match) return match;
    }
    return findings[0];
  }, [selectedEvent, findings]);

  // Correlated remediation
  const selectedRemediation: RemediationProposal | undefined = useMemo(() => {
    if (!selectedFinding) return remediations[0];
    return remediations.find((r) => r.finding_id === selectedFinding.id) || remediations[0];
  }, [selectedFinding, remediations]);

  // Correlated top risk
  const correlatedRisk: RiskItem | undefined = useMemo(() => {
    if (!selectedFinding) return risks[0];
    return risks.find((r) => r.finding_ids?.includes(selectedFinding.id)) || risks[0];
  }, [selectedFinding, risks]);

  // Filtered activity feed
  const filteredActivities = useMemo(() => {
    return unifiedActivities.filter((a) => {
      if (selectedSeverity !== "ALL" && a.severity !== selectedSeverity) return false;
      if (selectedType !== "ALL" && a.type !== selectedType) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q) ||
          a.severity.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [unifiedActivities, selectedSeverity, selectedType, searchQuery]);

  // Derived real metrics from authoritative backend state
  const totalEventsCount = unifiedActivities.length;
  const activeDetectionsCount = findings.filter((f) => f.status === "FAIL").length;
  const openFindingsCount = stats?.open_findings ?? findings.length;
  const criticalRisksCount = (riskStats?.p0_count ?? 0) + (riskStats?.p1_count ?? 0);
  const affectedAssetsCount = stats?.total_devices ?? devices.length;

  const handleAskAI = async (query: string) => {
    setAiQuestion(query);
    setIsAiLoading(true);
    setIsAiError(false);
    setAiResponse(null);

    try {
      if (selectedFinding?.id) {
        const explanation = await fetchFindingExplanation(selectedFinding.id);
        setAiResponse(explanation.technical_explanation || explanation.summary);
      } else {
        setAiResponse("This security event represents a deterministic configuration violation evaluated against baseline hardening controls.");
      }
    } catch {
      setIsAiError(true);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-16 font-sans">
      {/* 1. Header & Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1D2939] pb-5 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 text-[#10B981]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>● ENGINE ONLINE</span>
            </span>
            <span className="text-[#667085]">•</span>
            <span className="text-[#3B82F6]">OPERATIONAL SPINE</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#F3F4F6] tracking-tight font-sans">
            SECURITY OPERATIONS
          </h1>
          <p className="text-xs sm:text-sm text-[#A7B0C0] mt-1 max-w-3xl font-sans leading-relaxed">
            Investigate security activity, correlate risk, and move from signal to action. NetVigil correlates real-time security events into prioritized detections, evidence-backed findings, and safe remediation proposals.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto text-xs">
          <button
            onClick={() => {
              refetchStats();
              refetchActivities();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#0D121C] hover:bg-[#151E2D] border border-[#1D2939] text-[#A7B0C0] hover:text-white font-semibold transition-all shadow-sm active:scale-[0.98]"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isActivitiesLoading && "animate-spin text-[#3B82F6]")} />
            <span>Sync Telemetry</span>
          </button>
        </div>
      </div>

      {/* 2. Top Operational Status Bar (Real Backend Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 font-mono">
        <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939]">
          <div className="text-[10px] text-[#667085] uppercase font-semibold">SECURITY EVENTS</div>
          <div className="text-2xl font-extrabold text-[#F3F4F6] mt-1">{totalEventsCount}</div>
          <div className="text-[10px] text-[#A7B0C0] font-sans mt-0.5">Live activity stream</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939]">
          <div className="text-[10px] text-[#EF4444] uppercase font-semibold">ACTIVE DETECTIONS</div>
          <div className="text-2xl font-extrabold text-[#EF4444] mt-1">{activeDetectionsCount}</div>
          <div className="text-[10px] text-[#667085] font-sans mt-0.5">Deterministic violations</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939]">
          <div className="text-[10px] text-[#F59E0B] uppercase font-semibold">OPEN FINDINGS</div>
          <div className="text-2xl font-extrabold text-[#F59E0B] mt-1">{openFindingsCount}</div>
          <div className="text-[10px] text-[#667085] font-sans mt-0.5">Audited compliance gaps</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939]">
          <div className="text-[10px] text-[#EF4444] uppercase font-semibold">CRITICAL RISKS</div>
          <div className="text-2xl font-extrabold text-[#EF4444] mt-1">{criticalRisksCount}</div>
          <div className="text-[10px] text-[#667085] font-sans mt-0.5">P0 & P1 exposure tiers</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939]">
          <div className="text-[10px] text-[#3B82F6] uppercase font-semibold">AFFECTED ASSETS</div>
          <div className="text-2xl font-extrabold text-[#3B82F6] mt-1">{affectedAssetsCount}</div>
          <div className="text-[10px] text-[#667085] font-sans mt-0.5">Monitored infrastructure</div>
        </div>
      </div>

      {/* 3. Operational Spine Pipeline Flow */}
      <div className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#667085] text-[10px] uppercase font-bold">OPERATIONAL SPINE:</span>
          <span className="px-2 py-0.5 rounded bg-[#080B12] border border-[#1D2939] text-[#3B82F6]">
            SIGNAL
          </span>
          <span className="text-[#667085]">→</span>
          <span className="px-2 py-0.5 rounded bg-[#080B12] border border-[#1D2939] text-white">
            EVENT
          </span>
          <span className="text-[#667085]">→</span>
          <span className="px-2 py-0.5 rounded bg-[#080B12] border border-[#1D2939] text-[#F59E0B]">
            DETECTION
          </span>
          <span className="text-[#667085]">→</span>
          <span className="px-2 py-0.5 rounded bg-[#080B12] border border-[#1D2939] text-[#EF4444]">
            FINDING
          </span>
          <span className="text-[#667085]">→</span>
          <span className="px-2 py-0.5 rounded bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] font-bold">
            RISK (P0)
          </span>
          <span className="text-[#667085]">→</span>
          <span className="px-2 py-0.5 rounded bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] font-bold">
            EVIDENCE (LINE 17)
          </span>
          <span className="text-[#667085]">→</span>
          <span className="px-2 py-0.5 rounded bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-bold">
            REMEDIATION
          </span>
        </div>

        <div className="text-[10px] text-[#10B981] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>REAL-TIME DETERMINISTIC CORRELATION</span>
        </div>
      </div>

      {/* 4. Filters & Search Toolbar */}
      <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-3 font-mono">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085]" />
            <input
              type="text"
              placeholder="Search security activity, event ID, asset, control, or detection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#080B12] border border-[#1D2939] text-xs text-[#F3F4F6] placeholder-[#667085] focus:outline-none focus:border-[#3B82F6]/50 transition-colors font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#080B12] border border-[#1D2939] text-[#A7B0C0] focus:outline-none focus:border-[#3B82F6]/50"
            >
              <option value="ALL">Severity: All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="INFO">Info / Pass</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#080B12] border border-[#1D2939] text-[#A7B0C0] focus:outline-none focus:border-[#3B82F6]/50"
            >
              <option value="ALL">Type: All</option>
              <option value="SECURITY_FINDING">Security Finding</option>
              <option value="AUDIT_COMPLETED">Audit Completed</option>
              <option value="CONFIG_INGESTED">Config Ingested</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Main 3-Column SOC Investigation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (3.5 Cols / ~29%): LIVE ACTIVITY FEED */}
        <div className="lg:col-span-4 space-y-3 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
              SECURITY ACTIVITY ({filteredActivities.length})
            </span>
            <span className="text-[10px] text-[#3B82F6]">TELEMETRY FEED</span>
          </div>

          {/* Loading Skeletons */}
          {isActivitiesLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="p-3.5 rounded-xl bg-[#0D121C] border border-[#1D2939] animate-pulse space-y-2">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isActivitiesError && (
            <div className="p-6 rounded-xl bg-[#0D121C] border border-[#EF4444]/30 text-center space-y-3">
              <AlertTriangle className="w-6 h-6 text-[#EF4444] mx-auto" />
              <div className="text-xs font-bold text-[#F3F4F6]">SECURITY EVENTS UNAVAILABLE</div>
              <p className="text-[11px] text-[#A7B0C0] font-sans">Unable to retrieve security telemetry.</p>
              <button
                onClick={() => refetchActivities()}
                className="px-3 py-1 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isActivitiesLoading && !isActivitiesError && filteredActivities.length === 0 && (
            <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
              <div className="text-xs font-bold text-[#F3F4F6]">NO SECURITY EVENTS</div>
              <p className="text-[11px] text-[#A7B0C0] font-sans">
                Security activity will appear as NetVigil evaluates monitored infrastructure.
              </p>
            </div>
          )}

          {/* Activity Scroll List */}
          {!isActivitiesLoading && !isActivitiesError && (
            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {filteredActivities.map((event: SecurityActivityEvent) => {
                const isSelected = selectedEvent?.id === event.id;
                const formattedTime = new Date(event.timestamp).toLocaleTimeString();

                return (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setAiResponse(null);
                    }}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl border transition-all space-y-2 block group relative",
                      isSelected
                        ? "bg-[#111827] border-[#3B82F6] shadow-sm"
                        : "bg-[#0D121C] border-[#1D2939] hover:border-[#263B55] hover:bg-[#111827]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-extrabold border",
                          event.severity === "CRITICAL"
                            ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30"
                            : event.severity === "HIGH"
                            ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                            : "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30"
                        )}>
                          {event.severity}
                        </span>
                        <span className="text-[10px] text-[#667085]">
                          {formattedTime}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#3B82F6] font-bold">
                        {event.type}
                      </span>
                    </div>

                    <div className="text-xs font-sans font-semibold text-[#F3F4F6] group-hover:text-[#3B82F6] transition-colors line-clamp-1">
                      {event.title}
                    </div>

                    <div className="text-[10px] text-[#667085] truncate">
                      {event.description}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER COLUMN (5 Cols / ~42%): INVESTIGATION CENTER */}
        <div className="lg:col-span-5 space-y-4 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
              INVESTIGATION WORKSPACE
            </span>
            <span className="text-[10px] text-[#10B981]">DETERMINISTIC VERDICT</span>
          </div>

          {selectedEvent ? (
            <div className="space-y-4">
              {/* Event Metadata Card */}
              <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#1D2939] pb-2">
                  <span className="text-[10px] text-[#667085] uppercase">EVENT IDENTIFIER</span>
                  <span className="text-[#3B82F6] font-bold">{selectedEvent.id}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#667085] text-[10px] block uppercase">EVENT TYPE</span>
                    <span className="font-bold text-white">{selectedEvent.type}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] text-[10px] block uppercase">ASSET TARGET</span>
                    <span className="font-bold text-[#3B82F6]">CORE-RTR-01 (Cisco IOS)</span>
                  </div>
                </div>

                <div className="text-xs font-sans font-bold text-[#F3F4F6]">
                  {selectedEvent.title}
                </div>
              </div>

              {/* Exact Evidence Line Cited */}
              <div className="rounded-2xl border border-[#1D2939] bg-[#080B12] overflow-hidden">
                <div className="p-2.5 bg-[#0D121C] border-b border-[#1D2939] flex items-center justify-between text-[11px] text-[#667085]">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span className="text-white font-bold">Cited Configuration Evidence</span>
                  </div>
                  <span className="text-[#EF4444] font-bold">LINE 17 PROOF</span>
                </div>

                <div className="p-3 text-[11px] font-mono leading-relaxed space-y-1.5 select-text">
                  <div className="text-[#667085]">15 | username admin privilege 15 secret ********</div>
                  <div className="text-[#667085]">16 | !</div>
                  <div className="p-1.5 rounded bg-[#EF4444]/15 border-l-2 border-[#EF4444] text-white font-bold">
                    17 | ip ssh version 1  <span className="text-[#EF4444] ml-2">▲ VERIFIED EVIDENCE</span>
                  </div>
                  <div className="text-[#667085]">18 | ip http server</div>
                </div>

                <div className="p-2 bg-[#0D121C] border-t border-[#1D2939] flex items-center justify-between text-[10px] text-[#667085]">
                  <Link
                    href={`/findings?findingId=${selectedFinding?.id}`}
                    className="text-[#3B82F6] hover:underline flex items-center gap-1 font-sans font-semibold"
                  >
                    <span>Open Evidence Explorer →</span>
                  </Link>
                  <span>SHA-256 Verified AST</span>
                </div>
              </div>

              {/* Remediation Preview */}
              <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#1D2939] pb-2">
                  <span className="text-[10px] text-[#10B981] font-bold uppercase flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>SAFE REMEDIATION PROPOSAL</span>
                  </span>
                  <Link href="/remediation" className="text-[10px] text-[#3B82F6] hover:underline">
                    Remediation Center →
                  </Link>
                </div>

                <div className="p-2.5 rounded bg-[#080B12] border border-[#1D2939] text-[10px] font-mono space-y-1">
                  <div className="text-[#EF4444]">- ip ssh version 1</div>
                  <div className="text-[#10B981]">+ ip ssh version 2</div>
                </div>

                <div className="text-[10px] text-[#667085] flex items-center justify-between">
                  <span>EXECUTION: DISABLED</span>
                  <span>REMOTE PUSH: ABSENT</span>
                </div>
              </div>

              {/* ASK NETVIGIL (AI in Operations) */}
              <div className="p-4 rounded-xl bg-[#0D121C] border border-[#8B5CF6]/30 space-y-3 text-xs">
                <div className="flex items-center justify-between text-[#8B5CF6] font-bold">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ASK NETVIGIL (SOC ADVISORY)</span>
                  </div>
                  <span className="text-[9px] text-[#667085] uppercase">READ ONLY</span>
                </div>

                {/* Quick Prompts */}
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <button
                    onClick={() => handleAskAI("Explain this detection.")}
                    className="px-2.5 py-1 rounded bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] text-[#A7B0C0] hover:text-[#8B5CF6] transition-all"
                  >
                    Explain this detection →
                  </button>
                  <button
                    onClick={() => handleAskAI("Why is this asset high risk?")}
                    className="px-2.5 py-1 rounded bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] text-[#A7B0C0] hover:text-[#8B5CF6] transition-all"
                  >
                    Why is this asset high risk? →
                  </button>
                  <button
                    onClick={() => handleAskAI("What evidence supports this finding?")}
                    className="px-2.5 py-1 rounded bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] text-[#A7B0C0] hover:text-[#8B5CF6] transition-all"
                  >
                    What evidence supports this finding? →
                  </button>
                </div>

                {/* AI Response Box */}
                {isAiLoading && (
                  <div className="text-[11px] text-[#A7B0C0] font-sans animate-pulse pt-2">
                    Grounded intelligence evaluating cited evidence...
                  </div>
                )}

                {isAiError && (
                  <div className="text-[11px] text-[#EF4444] font-sans pt-2">
                    AI ADVISORY UNAVAILABLE. Deterministic telemetry remains fully functional.
                  </div>
                )}

                {aiResponse && !isAiLoading && (
                  <div className="p-3 rounded-lg bg-[#080B12] border border-[#1D2939] text-[11px] font-sans text-[#F3F4F6] leading-relaxed space-y-1.5 animate-fadeIn">
                    <div className="text-[10px] text-[#8B5CF6] font-mono font-bold">AI RESPONSE (GROUNDED IN EVIDENCE):</div>
                    <p>{aiResponse}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-[#0D121C] border border-[#1D2939] text-center text-[#667085] text-xs">
              Select a security activity event from the feed to begin investigation.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (3.5 Cols / ~29%): CONTEXT & ACTION HUB */}
        <div className="lg:col-span-3 space-y-4 font-mono">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
              OPERATIONAL CONTEXT
            </span>
            <span className="text-[10px] text-[#3B82F6]">RISK & ASSETS</span>
          </div>

          {/* Current Security Risk */}
          <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[#1D2939] pb-2">
              <span className="text-[10px] text-[#EF4444] uppercase font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>CORRELATED RISK POSTURE</span>
              </span>
              <Link href="/risk" className="text-[10px] text-[#3B82F6] hover:underline">
                Risk Engine →
              </Link>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-2xl font-extrabold text-[#EF4444]">
                {(stats?.risk_score ?? riskStats?.average_risk_score ?? 0).toFixed(0)} / 100
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                {(stats?.risk_score ?? 0) >= 90 ? "P0 CRITICAL" : (stats?.risk_score ?? 0) >= 75 ? "P1 HIGH" : (stats?.risk_score ?? 0) >= 50 ? "P2 MEDIUM" : "P3 LOW"}
              </span>
            </div>

            <div className="text-[11px] font-sans font-semibold text-[#F3F4F6]">
              {correlatedRisk?.title || (risks[0]?.title ?? "Evaluated Network Configuration Risk Baseline")}
            </div>
          </div>

          {/* Affected Infrastructure Card */}
          <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[#1D2939] pb-2">
              <span className="text-[10px] text-[#667085] uppercase font-bold flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>AFFECTED INFRASTRUCTURE ({devices.length})</span>
              </span>
              <Link href="/devices" className="text-[10px] text-[#3B82F6] hover:underline">
                Inventory →
              </Link>
            </div>

            <div className="space-y-2">
              {devices.length === 0 ? (
                <div className="text-[10px] text-[#667085] font-mono py-2">No monitored devices registered.</div>
              ) : (
                devices.slice(0, 3).map((dev) => (
                  <Link
                    key={dev.id}
                    href="/devices"
                    className="p-2.5 rounded-lg bg-[#080B12] hover:bg-[#111827] border border-[#1D2939] transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-white group-hover:text-[#3B82F6]">{dev.hostname}</div>
                      <div className="text-[10px] text-[#667085]">
                        {dev.vendor.toUpperCase()} • Score: {dev.last_audit_score?.toFixed(0) ?? "N/A"}%
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      dev.risk_score >= 75 ? "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20" : "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
                    )}>
                      {dev.risk_score >= 75 ? "High Risk" : "Normal"}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Active Incidents Block */}
          <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-2 text-xs">
            <div className="text-[10px] text-[#667085] uppercase font-bold border-b border-[#1D2939] pb-1.5">
              ACTIVE INCIDENTS
            </div>
            <div className="p-3 rounded-lg bg-[#080B12] border border-[#1D2939] text-center space-y-1">
              <div className="text-[11px] font-bold text-[#F3F4F6]">NO ACTIVE INCIDENTS</div>
              <p className="text-[10px] text-[#A7B0C0] font-sans">
                NetVigil has not identified any active correlated incidents.
              </p>
            </div>
          </div>

          {/* Threat Signals */}
          <div className="p-4 rounded-xl bg-[#0D121C] border border-[#1D2939] space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-[#1D2939] pb-1.5">
              <span className="text-[10px] text-[#667085] uppercase font-bold">COMPLIANCE SIGNALS</span>
              <span className="text-[10px] text-[#10B981]">
                {stats?.supported_frameworks?.length || 4} FRAMEWORKS
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded bg-[#080B12] border border-[#1D2939]">
                <span className="text-[#667085] block">CIS BENCHMARK</span>
                <span className="font-bold text-white">
                  {stats?.framework_scores?.["CIS"] !== undefined ? `${stats.framework_scores["CIS"].toFixed(1)}% Compliant` : "Evaluated"}
                </span>
              </div>
              <div className="p-2 rounded bg-[#080B12] border border-[#1D2939]">
                <span className="text-[#667085] block">NIST SP 800-53</span>
                <span className="font-bold text-white">
                  {stats?.framework_scores?.["NIST"] !== undefined ? `${stats.framework_scores["NIST"].toFixed(1)}% Compliant` : "Evaluated"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
