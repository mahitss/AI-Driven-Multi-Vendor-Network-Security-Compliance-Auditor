"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Bot,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit3,
  Check,
  X,
  Play,
  Filter,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Layers,
  Zap,
  ChevronRight,
} from "lucide-react";
import {
  fetchTrainingPending,
  fetchTrainingMappings,
  fetchTrainingStats,
  fetchAllowlist,
  approveTrainingMapping,
  editTrainingMapping,
  rejectTrainingMapping,
  disableTrainingMapping,
  reEnableTrainingMapping,
  reanalyzeConfiguration,
  fetchConfigurations,
  TrainingMapping,
  TrainingImpact,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function AdaptiveTrainingPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"pending" | "knowledge" | "reanalyze">("pending");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Edit Mapping Modal state
  const [editingMapping, setEditingMapping] = useState<TrainingMapping | null>(null);
  const [editProperty, setEditProperty] = useState("");
  const [editValue, setEditValue] = useState<string>("true");
  const [editMeaning, setEditMeaning] = useState("");
  const [editCategory, setEditCategory] = useState("remote_access");
  const [editPattern, setEditPattern] = useState("");
  const [editReason, setEditReason] = useState("");

  // Reject Mapping Modal state
  const [rejectingMapping, setRejectingMapping] = useState<TrainingMapping | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Re-analysis state
  const [reanalyzeConfigId, setReanalyzeConfigId] = useState<string>("");
  const [impactResult, setImpactResult] = useState<TrainingImpact | null>(null);

  // Queries
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["training-stats"],
    queryFn: () => fetchTrainingStats(),
  });

  const {
    data: pendingMappings = [],
    isLoading: isPendingLoading,
    isError: isPendingError,
    error: pendingError,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ["training-pending", selectedVendorFilter],
    queryFn: () => fetchTrainingPending(selectedVendorFilter === "ALL" ? undefined : selectedVendorFilter),
  });

  const {
    data: allMappings = [],
    isLoading: isMappingsLoading,
    isError: isMappingsError,
    error: mappingsError,
    refetch: refetchMappings,
  } = useQuery({
    queryKey: ["training-mappings", selectedStatusFilter, selectedVendorFilter],
    queryFn: () =>
      fetchTrainingMappings({
        status: selectedStatusFilter === "ALL" ? undefined : selectedStatusFilter,
        vendor: selectedVendorFilter === "ALL" ? undefined : selectedVendorFilter,
      }),
  });

  const { data: allowlist = [] } = useQuery({
    queryKey: ["training-allowlist"],
    queryFn: () => fetchAllowlist(),
  });

  const { data: configurations = [] } = useQuery({
    queryKey: ["configurations"],
    queryFn: () => fetchConfigurations(),
  });

  // Set default reanalyze target
  React.useEffect(() => {
    if (configurations.length > 0 && !reanalyzeConfigId) {
      setReanalyzeConfigId(configurations[0].id);
    }
  }, [configurations, reanalyzeConfigId]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveTrainingMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-pending"] });
      queryClient.invalidateQueries({ queryKey: ["training-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["training-stats"] });
    },
  });

  const editMutation = useMutation({
    mutationFn: (payload: { id: string; data: any }) => editTrainingMapping(payload.id, payload.data),
    onSuccess: () => {
      setEditingMapping(null);
      queryClient.invalidateQueries({ queryKey: ["training-pending"] });
      queryClient.invalidateQueries({ queryKey: ["training-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["training-stats"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { id: string; reason?: string }) => rejectTrainingMapping(payload.id, payload.reason),
    onSuccess: () => {
      setRejectingMapping(null);
      queryClient.invalidateQueries({ queryKey: ["training-pending"] });
      queryClient.invalidateQueries({ queryKey: ["training-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["training-stats"] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => disableTrainingMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["training-stats"] });
    },
  });

  const reEnableMutation = useMutation({
    mutationFn: (id: string) => reEnableTrainingMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["training-stats"] });
    },
  });

  const reanalyzeMutation = useMutation({
    mutationFn: (configId: string) => reanalyzeConfiguration(configId),
    onSuccess: (data) => {
      setImpactResult(data);
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      queryClient.invalidateQueries({ queryKey: ["overview-stats"] });
    },
  });

  const handleOpenEditModal = (m: TrainingMapping) => {
    setEditingMapping(m);
    setEditProperty(m.candidate_property);
    setEditValue(typeof m.candidate_value === "object" ? JSON.stringify(m.candidate_value) : String(m.candidate_value ?? true));
    setEditMeaning(m.semantic_meaning);
    setEditCategory(m.category);
    setEditPattern(m.normalized_pattern || m.raw_pattern);
    setEditReason("");
  };

  const handleSaveEdit = () => {
    if (!editingMapping) return;
    let parsedVal: any = editValue;
    if (editValue.toLowerCase() === "true") parsedVal = true;
    else if (editValue.toLowerCase() === "false") parsedVal = false;
    else if (!isNaN(Number(editValue))) parsedVal = Number(editValue);

    editMutation.mutate({
      id: editingMapping.id,
      data: {
        candidate_property: editProperty,
        candidate_value: parsedVal,
        semantic_meaning: editMeaning,
        category: editCategory,
        normalized_pattern: editPattern,
        reason: editReason || "Administrator modified mapping",
      },
    });
  };

  const handleConfirmReject = () => {
    if (!rejectingMapping) return;
    rejectMutation.mutate({
      id: rejectingMapping.id,
      reason: rejectReason || "Rejected by administrator",
    });
  };

  const filteredKnowledgeMappings = allMappings.filter((m) => {
    const matchesSearch =
      searchQuery === "" ||
      m.raw_pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.candidate_property.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.semantic_meaning.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2.5 font-mono">
            <Sparkles className="w-5 h-5 text-[#8B5CF6]" />
            <span>Adaptive Training & Knowledge System</span>
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Human-in-the-loop learning workflow that teaches NetVigil previously unseen vendor syntax without backend redeployment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchStats();
              refetchPending();
              refetchMappings();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#242424] text-xs font-mono transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Adaptive Learning Workflow Stepper */}
      <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
        <div className="text-[10px] font-mono text-[#666666] uppercase tracking-wider mb-2 font-bold">
          Adaptive Knowledge Lifecycle Flow
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 font-mono text-[11px]">
          {[
            { step: "01", name: "Unknown Directive", state: "Raw CLI" },
            { step: "02", name: "AI Suggestion", state: "Semantic Inference" },
            { step: "03", name: "Schema Validation", state: "Allowlist Guard" },
            { step: "04", name: "Human Approval", state: "Administrator Sign-off" },
            { step: "05", name: "Knowledge Mapping", state: "Live In-Memory Base" },
            { step: "06", name: "Re-Analysis", state: "Instant Score Lift" },
          ].map((flow, i) => (
            <div key={flow.step} className="p-2.5 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-[#666666]">
                <span>{flow.step}</span>
                {i < 5 && <ChevronRight className="w-3 h-3 text-[#333333]" />}
              </div>
              <div className="text-[#F5F5F5] font-semibold mt-1">{flow.name}</div>
              <div className="text-[10px] text-[#A3A3A3] mt-0.5">{flow.state}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#8B5CF6]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#8B5CF6] uppercase font-semibold">Pending Reviews</div>
            <div className="text-2xl font-bold text-[#8B5CF6] mt-1">{stats?.pending_count ?? 0}</div>
          </div>
          <Bot className="w-5 h-5 text-[#8B5CF6]" />
        </div>

        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#22C55E]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#22C55E] uppercase font-semibold">Approved Mappings</div>
            <div className="text-2xl font-bold text-[#22C55E] mt-1">{stats?.approved_count ?? 0}</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
        </div>

        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#EF4444]/40 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#EF4444] uppercase font-semibold">Rejected Mappings</div>
            <div className="text-2xl font-bold text-[#EF4444] mt-1">{stats?.rejected_count ?? 0}</div>
          </div>
          <XCircle className="w-5 h-5 text-[#EF4444]" />
        </div>

        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#A3A3A3] uppercase font-semibold">Vendors Learned</div>
            <div className="text-2xl font-bold text-[#00D9FF] mt-1">{stats?.vendors_learned_count ?? 0}</div>
          </div>
          <Layers className="w-5 h-5 text-[#00D9FF]" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab("pending")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "pending"
              ? "bg-[#141414] text-[#8B5CF6] border border-[#8B5CF6]/40"
              : "text-[#A3A3A3] hover:text-[#F5F5F5]"
          )}
        >
          <Bot className="w-4 h-4" />
          <span>Pending Review Queue ({pendingMappings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("knowledge")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "knowledge"
              ? "bg-[#141414] text-[#8B5CF6] border border-[#8B5CF6]/40"
              : "text-[#A3A3A3] hover:text-[#F5F5F5]"
          )}
        >
          <BookOpen className="w-4 h-4" />
          <span>Knowledge Base ({allMappings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("reanalyze")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "reanalyze"
              ? "bg-[#141414] text-[#8B5CF6] border border-[#8B5CF6]/40"
              : "text-[#A3A3A3] hover:text-[#F5F5F5]"
          )}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Re-Analysis & Impact Delta</span>
        </button>
      </div>

      {/* Tab Content: Pending Reviews */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {isPendingError ? (
            <div className="p-8 rounded-xl bg-[#0A0A0A] border border-[#EF4444]/30 text-center space-y-3 font-mono">
              <div className="w-8 h-8 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mx-auto">
                <XCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">DATA SOURCE UNAVAILABLE</div>
                <div className="text-[11px] text-[#EF4444] mt-1">
                  {pendingError instanceof Error ? pendingError.message : "Failed to retrieve pending review candidates."}
                </div>
              </div>
              <button
                onClick={() => refetchPending()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0D0D0D] hover:bg-[#141414] text-[#8B5CF6] border border-[#8B5CF6]/40 text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Request</span>
              </button>
            </div>
          ) : isPendingLoading ? (
            <div className="py-16 text-center text-[#666666] font-mono text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#8B5CF6]" />
              <span>Loading pending review candidates...</span>
            </div>
          ) : pendingMappings.length === 0 ? (
            <div className="p-12 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-[#22C55E]/60 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[#F5F5F5]">No Pending Review Items</h3>
                <p className="text-xs text-[#A3A3A3] max-w-md mx-auto">
                  All unparsed configuration directives have been reviewed. When new unknown directives are uploaded or analyzed, they will queue here for administrator approval.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pendingMappings.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-[#0D0D0D] border border-[#8B5CF6]/30 space-y-3 font-mono text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#111111] text-[#8B5CF6] border border-[#8B5CF6]/30 font-bold uppercase text-[10px]">
                        {m.vendor}
                      </span>
                      <span className="text-[#F5F5F5] font-bold">{m.raw_pattern}</span>
                    </div>

                    <span className="px-2 py-0.5 rounded bg-[#111111] text-[#F59E0B] border border-[#F59E0B]/30 text-[10px] font-bold">
                      Confidence: {(m.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* AI Suggestion Box */}
                  <div className="p-3 rounded-lg bg-[#050505] border border-[#1A1A1A] space-y-1.5 font-sans">
                    <div className="flex items-center justify-between font-mono text-[10px] text-[#666666]">
                      <span className="flex items-center gap-1 text-[#8B5CF6]">
                        <Bot className="w-3.5 h-3.5" />
                        <span>AI Candidate Interpretation</span>
                      </span>
                      <span>Category: {m.category}</span>
                    </div>
                    <p className="text-[#D4D4D4] text-xs">{m.semantic_meaning}</p>
                    <div className="font-mono text-[11px] text-[#00D9FF]">
                      Maps to: <strong className="text-white">{m.candidate_property}</strong> = {String(m.candidate_value)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#1A1A1A]">
                    <button
                      onClick={() => setRejectingMapping(m)}
                      className="px-3 py-1 rounded bg-[#0B0B0B] border border-[#EF4444]/40 hover:border-[#EF4444] text-[#EF4444] text-[11px] transition-colors"
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(m)}
                      className="px-3 py-1 rounded bg-[#0B0B0B] border border-[#1A1A1A] hover:border-[#242424] text-[#A3A3A3] hover:text-[#F5F5F5] text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit & Correct</span>
                    </button>

                    <button
                      onClick={() => approveMutation.mutate(m.id)}
                      disabled={approveMutation.isPending}
                      className="px-3.5 py-1 rounded bg-[#0B0B0B] border border-[#22C55E]/50 hover:border-[#22C55E] hover:bg-[#141414] text-[#22C55E] font-semibold text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Knowledge Base */}
      {activeTab === "knowledge" && (
        <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1A1A1A] font-mono">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#00D9FF]" />
                <span>Status:</span>
              </span>

              <div className="flex items-center gap-1 bg-[#0D0D0D] border border-[#1A1A1A] p-1 rounded-md text-xs">
                {["ALL", "APPROVED", "PENDING", "REJECTED", "DISABLED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatusFilter(st)}
                    className={cn(
                      "px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors",
                      selectedStatusFilter === st
                        ? "bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/30"
                        : "text-[#A3A3A3] hover:text-[#F5F5F5]"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search mapping or pattern..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-md bg-[#0D0D0D] border border-[#1A1A1A] text-xs text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[#00D9FF]/50 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Table */}
          {filteredKnowledgeMappings.length === 0 ? (
            <div className="py-12 text-center text-[#666666] space-y-1 font-mono text-xs">
              <p>No knowledge mappings found matching filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1A1A1A] text-[11px] text-[#666666] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">CLI Pattern</th>
                    <th className="py-2.5 px-3">Normalized Target</th>
                    <th className="py-2.5 px-3">Version & Usage</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {filteredKnowledgeMappings.map((m) => (
                    <tr key={m.id} className="hover:bg-[#111111] transition-colors">
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                            m.status === "APPROVED" && "bg-[#141414] text-[#22C55E] border-[#22C55E]/40",
                            m.status === "PENDING" && "bg-[#141414] text-[#8B5CF6] border-[#8B5CF6]/40",
                            m.status === "REJECTED" && "bg-[#141414] text-[#EF4444] border-[#EF4444]/40",
                            m.status === "DISABLED" && "bg-[#111111] text-[#666666] border-[#1A1A1A]"
                          )}
                        >
                          {m.status}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[#A3A3A3] font-bold uppercase">{m.vendor}</span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-[#F5F5F5] font-semibold">{m.raw_pattern}</div>
                        {m.normalized_pattern && m.normalized_pattern !== m.raw_pattern && (
                          <div className="text-[10px] text-[#666666] mt-0.5">
                            Pattern: {m.normalized_pattern}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-[#00D9FF] font-semibold">{m.candidate_property}</div>
                        <div className="text-[10px] text-[#A3A3A3] font-sans mt-0.5 line-clamp-1">
                          {m.semantic_meaning}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-[11px] text-[#666666]">
                        <div>Rev v{m.version}</div>
                        <div className="text-[10px] text-[#444444] mt-0.5">Used: {m.usage_count} times</div>
                      </td>

                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          className="px-2 py-1 rounded bg-[#0B0B0B] hover:bg-[#141414] text-[#A3A3A3] border border-[#1A1A1A] text-[11px]"
                        >
                          Edit
                        </button>

                        {m.status === "APPROVED" ? (
                          <button
                            onClick={() => disableMutation.mutate(m.id)}
                            className="px-2 py-1 rounded bg-[#0B0B0B] hover:bg-[#141414] text-[#F59E0B] border border-[#F59E0B]/30 text-[11px]"
                          >
                            Disable
                          </button>
                        ) : m.status === "DISABLED" ? (
                          <button
                            onClick={() => reEnableMutation.mutate(m.id)}
                            className="px-2 py-1 rounded bg-[#0B0B0B] hover:bg-[#141414] text-[#22C55E] border border-[#22C55E]/30 text-[11px]"
                          >
                            Re-enable
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Re-Analysis & Impact Delta */}
      {activeTab === "reanalyze" && (
        <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2 font-mono">
              <Play className="w-4 h-4 text-[#00D9FF] fill-current" />
              <span>1-Click Configuration Re-Analysis & Compliance Delta</span>
            </h3>
            <p className="text-xs text-[#A3A3A3] font-sans">
              Re-evaluates an ingested configuration using all approved knowledge mappings. Demonstrates real-time compliance score improvements without requiring backend code changes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 font-mono text-xs">
            <div className="flex-1 space-y-1">
              <label className="text-[#A3A3A3]">Target Configuration:</label>
              <select
                value={reanalyzeConfigId}
                onChange={(e) => setReanalyzeConfigId(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] text-[#00D9FF] font-semibold focus:outline-none focus:border-[#00D9FF]"
              >
                {configurations.map((cfg) => (
                  <option key={cfg.id} value={cfg.id}>
                    {cfg.original_filename} ({cfg.detected_vendor} - ID: {cfg.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>

            <div className="self-end">
              <button
                onClick={() => reanalyzeMutation.mutate(reanalyzeConfigId)}
                disabled={reanalyzeMutation.isPending || !reanalyzeConfigId}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B0B0B] border border-[#00D9FF]/50 hover:border-[#00D9FF] hover:bg-[#141414] disabled:opacity-50 text-[#00D9FF] text-xs font-semibold font-mono transition-colors"
              >
                {reanalyzeMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Re-Evaluating Normalization & Compliance...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Execute Re-Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Impact Results Card */}
          {impactResult && (
            <div className="p-5 rounded-xl bg-[#0D0D0D] border border-[#00D9FF]/30 space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A] font-mono text-xs">
                <div className="flex items-center gap-2 text-[#00D9FF] font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                  <span>Adaptive Training Impact Verified</span>
                </div>
                <span className="text-[10px] text-[#666666]">
                  Mappings Applied: <strong>{impactResult.mappings_applied_count}</strong>
                </span>
              </div>

              {/* Score and Delta Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
                  <div className="text-[10px] text-[#666666] uppercase">Previous Score</div>
                  <div className="text-lg font-bold text-[#A3A3A3] mt-0.5">
                    {impactResult.previous_score.toFixed(0)}%
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
                  <div className="text-[10px] text-[#666666] uppercase">New Re-Analyzed Score</div>
                  <div className="text-lg font-bold text-[#22C55E] mt-0.5">
                    {impactResult.new_score.toFixed(0)}%
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
                  <div className="text-[10px] text-[#666666] uppercase">Score Improvement</div>
                  <div className="text-lg font-bold text-[#00D9FF] mt-0.5">
                    +{impactResult.score_delta.toFixed(1)}%
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A]">
                  <div className="text-[10px] text-[#666666] uppercase">Resolved Directives</div>
                  <div className="text-lg font-bold text-[#8B5CF6] mt-0.5">
                    {impactResult.resolved_directives_count}
                  </div>
                </div>
              </div>

              {/* Finding Transitions Table */}
              {impactResult.finding_transitions.length > 0 && (
                <div className="space-y-2 font-mono">
                  <div className="text-xs text-[#A3A3A3] font-semibold">
                    Evaluated Control Transitions ({impactResult.finding_transitions.length}):
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {impactResult.finding_transitions.map((ft, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-[#0A0A0A] border border-[#1A1A1A] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded bg-[#111111] text-[#00D9FF] text-[10px] font-bold border border-[#1A1A1A]">
                            {ft.framework} • {ft.control_id}
                          </span>
                          <span className="text-[#F5F5F5]">{ft.title}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-bold">
                          <span className="text-[#F59E0B]">{ft.previous_status}</span>
                          <ArrowRight className="w-3 h-3 text-[#666666]" />
                          <span className="text-[#22C55E]">{ft.new_status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit & Correct Modal */}
      {editingMapping && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden font-mono text-xs animate-in fade-in duration-150">
            <div className="p-4 border-b border-[#1A1A1A] bg-[#0B0B0B] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#F5F5F5] font-bold">
                <Edit3 className="w-4 h-4 text-[#8B5CF6]" />
                <span>Human Knowledge Correction</span>
              </div>
              <button onClick={() => setEditingMapping(null)} className="p-1 text-[#666666] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="space-y-1">
                <label className="text-[#A3A3A3] text-[11px]">Vendor CLI Directive:</label>
                <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A] text-[#00D9FF] select-text">
                  {editingMapping.raw_pattern}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#A3A3A3] text-[11px]">Normalized Security Property (Safety Allowlist):</label>
                <select
                  value={editProperty}
                  onChange={(e) => setEditProperty(e.target.value)}
                  className="w-full p-2 rounded bg-[#0B0B0B] border border-[#1A1A1A] text-[#F5F5F5] text-xs focus:outline-none focus:border-[#8B5CF6]"
                >
                  {allowlist.map((item) => (
                    <option key={item.property} value={item.property}>
                      {item.property} ({item.category} - {item.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[#A3A3A3] text-[11px]">Parsed Fact Value:</label>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="true, 15, false..."
                    className="w-full p-2 rounded bg-[#0B0B0B] border border-[#1A1A1A] text-[#F5F5F5] text-xs focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#A3A3A3] text-[11px]">Category:</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full p-2 rounded bg-[#0B0B0B] border border-[#1A1A1A] text-[#F5F5F5] text-xs focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#A3A3A3] text-[11px]">Semantic Description:</label>
                <input
                  type="text"
                  value={editMeaning}
                  onChange={(e) => setEditMeaning(e.target.value)}
                  className="w-full p-2 rounded bg-[#0B0B0B] border border-[#1A1A1A] text-[#F5F5F5] text-xs focus:outline-none focus:border-[#8B5CF6] font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#A3A3A3] text-[11px]">Audit Reason for Edit:</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Corrected property to match official vendor hardening standard..."
                  className="w-full p-2 rounded bg-[#0B0B0B] border border-[#1A1A1A] text-[#F5F5F5] text-xs focus:outline-none focus:border-[#8B5CF6] font-sans"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#1A1A1A] bg-[#070707] flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingMapping(null)}
                className="px-3.5 py-1.5 rounded bg-[#0D0D0D] hover:bg-[#141414] text-[#A3A3A3] border border-[#1A1A1A]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editMutation.isPending}
                className="px-4 py-1.5 rounded bg-[#0B0B0B] border border-[#8B5CF6]/50 hover:border-[#8B5CF6] text-[#8B5CF6] font-semibold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save & Approve</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectingMapping && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl w-full max-w-md shadow-2xl overflow-hidden font-mono text-xs animate-in fade-in duration-150">
            <div className="p-4 border-b border-[#1A1A1A] bg-[#0B0B0B] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#EF4444] font-bold">
                <XCircle className="w-4 h-4" />
                <span>Reject Candidate Mapping</span>
              </div>
              <button onClick={() => setRejectingMapping(null)} className="p-1 text-[#666666] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-[#A3A3A3] font-sans leading-relaxed">
                Are you sure you want to reject the candidate mapping for:
              </p>
              <div className="p-2.5 rounded bg-[#050505] border border-[#1A1A1A] text-[#F59E0B]">
                {rejectingMapping.raw_pattern}
              </div>

              <div className="space-y-1">
                <label className="text-[#A3A3A3] text-[11px]">Rejection Reason:</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Non-standard proprietary telemetry directive..."
                  className="w-full p-2 rounded bg-[#0B0B0B] border border-[#1A1A1A] text-[#F5F5F5] text-xs focus:outline-none focus:border-[#EF4444] font-sans"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#1A1A1A] bg-[#070707] flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectingMapping(null)}
                className="px-3.5 py-1.5 rounded bg-[#0D0D0D] hover:bg-[#141414] text-[#A3A3A3] border border-[#1A1A1A]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={rejectMutation.isPending}
                className="px-4 py-1.5 rounded bg-[#0B0B0B] border border-[#EF4444]/50 hover:border-[#EF4444] text-[#EF4444] font-semibold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
