"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  FileCode,
  Shield,
  AlertTriangle,
  Flame,
  Wrench,
  RefreshCw,
  History,
  Sparkles,
  ArrowRight,
  Layers,
  FileText,
  Lock,
  Bot,
  Activity,
  Server,
  CornerDownLeft,
  X,
  Clock,
  ExternalLink,
} from "lucide-react";
import { globalSearch, UnifiedSearchResult, SearchResultItem } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FlattenedItem extends SearchResultItem {
  groupName: string;
}

const RECENT_SEARCHES_KEY = "netvigil_recent_searches_v1";

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [contextAuditId, setContextAuditId] = useState<string | undefined>(undefined);
  const [contextConfigId, setContextConfigId] = useState<string | undefined>(undefined);
  const [results, setResults] = useState<UnifiedSearchResult>({
    query: "",
    total_results: 0,
    categories: {
      navigation: [],
      findings: [],
      controls: [],
      configurations: [],
      audits: [],
      risks: [],
      remediations: [],
      reports: [],
    },
    configurations: [],
    audits: [],
    findings: [],
    controls: [],
    risks: [],
    remediations: [],
    reports: [],
    navigation: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Extract active audit context safely on client when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setContextAuditId(params.get("audit_id") || params.get("id") || undefined);
      setContextConfigId(params.get("config_id") || params.get("configuration_id") || undefined);
    }
  }, [isOpen, pathname]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const saveRecentSearch = (text: string) => {
    if (!text.trim()) return;
    try {
      const updated = [text.trim(), ...recentSearches.filter((s) => s.toLowerCase() !== text.trim().toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults({
        query: "",
        total_results: 0,
        categories: { navigation: [], findings: [], controls: [], configurations: [], audits: [], risks: [], remediations: [], reports: [] },
        configurations: [],
        audits: [],
        findings: [],
        controls: [],
        risks: [],
        remediations: [],
        reports: [],
        navigation: [],
      });
      setHasError(false);
    }
  }, [isOpen]);

  // Debounced Unified Search API Call
  useEffect(() => {
    if (!query.trim()) {
      setResults({
        query: "",
        total_results: 0,
        categories: { navigation: [], findings: [], controls: [], configurations: [], audits: [], risks: [], remediations: [], reports: [] },
        configurations: [],
        audits: [],
        findings: [],
        controls: [],
        risks: [],
        remediations: [],
        reports: [],
        navigation: [],
      });
      setHasError(false);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const data = await globalSearch(query.trim(), contextAuditId, contextConfigId);
        setResults(data);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Global search error:", err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, contextAuditId, contextConfigId]);

  // Flatten active search results for unified keyboard navigation
  const flattenedResults: FlattenedItem[] = useMemo(() => {
    const list: FlattenedItem[] = [];
    const cat = results.categories;
    if (!cat) return list;

    if (cat.findings?.length) list.push(...cat.findings.map((item) => ({ ...item, groupName: "Findings" })));
    if (cat.controls?.length) list.push(...cat.controls.map((item) => ({ ...item, groupName: "Governance Controls" })));
    if (cat.configurations?.length) list.push(...cat.configurations.map((item) => ({ ...item, groupName: "Configurations" })));
    if (cat.audits?.length) list.push(...cat.audits.map((item) => ({ ...item, groupName: "Audits" })));
    if (cat.risks?.length) list.push(...cat.risks.map((item) => ({ ...item, groupName: "Risks" })));
    if (cat.remediations?.length) list.push(...cat.remediations.map((item) => ({ ...item, groupName: "Remediations" })));
    if (cat.reports?.length) list.push(...cat.reports.map((item) => ({ ...item, groupName: "Reports" })));
    if (cat.navigation?.length) list.push(...cat.navigation.map((item) => ({ ...item, groupName: "Navigation" })));

    return list;
  }, [results]);

  // Default Quick Navigation Actions
  const defaultActions = [
    { title: "Security Posture Dashboard", subtitle: "Fleet compliance & risk overview", url: "/dashboard", icon: Activity, badge: "Overview" },
    { title: "Security Time Machine", subtitle: "Replay configuration security evolution & deltas", url: "/security-time-machine", icon: History, badge: "Evolution" },
    { title: "Audit Configurations", subtitle: "Ingest device configs & run deterministic audits", url: "/configurations", icon: FileCode, badge: "Audit" },
    { title: "Evidence Explorer", subtitle: "Line-level AST compliance evidence & proofs", url: "/findings", icon: AlertTriangle, badge: "Findings" },
    { title: "Risk Intelligence", subtitle: "Correlated risk graph & P0-P3 priorities", url: "/risk", icon: Flame, badge: "Risk" },
    { title: "Remediation Center", subtitle: "Allowlisted vendor hardening playbooks (Read-Only)", url: "/remediation", icon: Wrench, badge: "Fix" },
    { title: "Compliance Audits", subtitle: "Audit history and benchmark evaluation logs", url: "/audits", icon: Shield, badge: "Audits" },
    { title: "AI Security Briefing", subtitle: "Evidence-grounded briefing & analyst copilot", url: "/ai-security-briefing", icon: Bot, badge: "Copilot" },
    { title: "Multi-Vendor Engine", subtitle: "Cisco IOS, Juniper JunOS, Fortinet FortiOS matrix", url: "/multi-vendor", icon: Layers, badge: "Multi-OS" },
    { title: "AI Boundary Architecture", subtitle: "Advisory isolation & deterministic authority", url: "/ai-boundary", icon: Lock, badge: "Trust" },
    { title: "Executive Reports", subtitle: "Generate official compliance audit documents", url: "/reports", icon: FileText, badge: "Reports" },
  ];

  const handleSelect = (url: string) => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
    }
    onClose();
    router.push(url);
  };

  // Keyboard navigation: Arrow Up, Arrow Down, Enter, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (flattenedResults.length > 0) {
          setSelectedIndex((prev) => (prev + 1) % flattenedResults.length);
        } else if (!query.trim() && defaultActions.length > 0) {
          setSelectedIndex((prev) => (prev + 1) % defaultActions.length);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (flattenedResults.length > 0) {
          setSelectedIndex((prev) => (prev - 1 + flattenedResults.length) % flattenedResults.length);
        } else if (!query.trim() && defaultActions.length > 0) {
          setSelectedIndex((prev) => (prev - 1 + defaultActions.length) % defaultActions.length);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flattenedResults.length > 0 && flattenedResults[selectedIndex]) {
          handleSelect(flattenedResults[selectedIndex].url);
        } else if (!query.trim() && defaultActions[selectedIndex]) {
          handleSelect(defaultActions[selectedIndex].url);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flattenedResults, selectedIndex, query, defaultActions, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="NetVigil Command Center"
    >
      <div
        className="bg-[#0D121C] border border-[#1D2939] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden font-mono text-xs flex flex-col max-h-[82vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="p-3.5 border-b border-[#1D2939] flex items-center gap-3 bg-[#080B12]">
          <Search className="w-4 h-4 text-[#667085] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search NetVigil (audits, findings, controls, configs, remediations)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[#F3F4F6] text-xs placeholder-[#667085] focus:outline-none font-mono"
          />
          {isLoading && <RefreshCw className="w-3.5 h-3.5 text-[#3B82F6] animate-spin shrink-0" />}
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[#667085] hover:text-[#F3F4F6] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#1D2939]">
            <kbd className="px-1.5 py-0.5 rounded bg-[#111827] text-[#667085] text-[10px] border border-[#1D2939]">
              ESC
            </kbd>
          </div>
        </div>

        {/* Search Content Body */}
        <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0D121C]">
          {/* Query Empty State: Quick Commands & Recent Searches */}
          {!query.trim() ? (
            <div className="space-y-4">
              {/* Active Context Banner */}
              {contextAuditId && (
                <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#3B82F6]" />
                    <span className="text-[#A7B0C0]">
                      Active Inspection Context: <strong className="text-[#3B82F6]">Audit {contextAuditId.substring(0, 8)}...</strong>
                    </span>
                  </div>
                  <span className="text-[10px] text-[#667085] uppercase font-mono">Auto-Prioritized</span>
                </div>
              )}

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#667085] uppercase font-semibold flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-[#667085]" />
                    <span>Recent Searches</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {recentSearches.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(s)}
                        className="px-2.5 py-1 rounded bg-[#111827] hover:bg-[#151E2D] border border-[#1D2939] text-xs text-[#A7B0C0] hover:text-[#F3F4F6] transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation & System Commands */}
              <div className="space-y-2">
                <div className="text-[10px] text-[#667085] uppercase font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#3B82F6]" />
                  <span>Navigation & SOC Operations</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {defaultActions.map((action, idx) => {
                    const isSelected = selectedIndex === idx;
                    const IconComponent = action.icon;
                    return (
                      <button
                        key={action.title}
                        onClick={() => handleSelect(action.url)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg border flex items-center justify-between transition-colors",
                          isSelected
                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#F3F4F6]"
                            : "bg-[#0A0F18] hover:bg-[#111827] border-[#1D2939] text-[#A7B0C0]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "p-1.5 rounded border",
                              isSelected
                                ? "bg-[#3B82F6]/20 border-[#3B82F6]/50 text-[#3B82F6]"
                                : "bg-[#111827] border-[#1D2939] text-[#667085]"
                            )}
                          >
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-[#F3F4F6] font-semibold">{action.title}</div>
                            <div className="text-[10px] text-[#667085]">{action.subtitle}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-[#111827] text-[#3B82F6] border border-[#3B82F6]/30 text-[10px]">
                            {action.badge}
                          </span>
                          {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-[#3B82F6]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : flattenedResults.length === 0 && !isLoading ? (
            /* Empty Results */
            <div className="py-12 text-center text-[#667085] space-y-2">
              <Search className="w-8 h-8 text-[#667085] mx-auto" />
              <p className="text-[#A7B0C0]">No matching security records found for &quot;{query}&quot;.</p>
              <p className="text-[11px] text-[#667085]">
                Try searching by Control ID (e.g. CIS-1.2.1), protocol (SSH, Telnet), vendor (Cisco, Juniper), or risk priority.
              </p>
            </div>
          ) : (
            /* Active Grouped Search Results */
            <div className="space-y-4">
              {/* Findings */}
              {results.categories.findings?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#EF4444] uppercase font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Findings ({results.categories.findings.length})
                    </span>
                    <span className="text-[#667085] text-[9px]">Line-Level AST Proof</span>
                  </div>
                  {results.categories.findings.map((item) => {
                    const globalIdx = flattenedResults.findIndex((r) => r.id === item.id);
                    const isSelected = selectedIndex === globalIdx;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.url)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg border flex items-center justify-between transition-colors",
                          isSelected
                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#F3F4F6]"
                            : "bg-[#0A0F18] hover:bg-[#111827] border-[#1D2939]"
                        )}
                      >
                        <div className="space-y-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[#3B82F6] font-bold">{item.control_id || item.title.split("—")[0]}</span>
                            <span className="text-[#F3F4F6] font-semibold truncate max-w-sm">
                              {item.title.includes("—") ? item.title.split("—")[1] : item.title}
                            </span>
                          </div>
                          {item.evidence && (
                            <div className="text-[10px] text-[#EF4444] font-mono bg-[#EF4444]/10 px-2 py-0.5 rounded border border-[#EF4444]/20 truncate max-w-md">
                              Proof: {item.evidence}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.severity && (
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase",
                                item.severity === "CRITICAL" && "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30",
                                item.severity === "HIGH" && "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30",
                                item.severity === "MEDIUM" && "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20",
                                item.severity === "LOW" && "bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30"
                              )}
                            >
                              {item.severity}
                            </span>
                          )}
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-semibold",
                              item.status === "PASS" ? "bg-[#10B981]/15 text-[#10B981]" : "bg-[#EF4444]/15 text-[#EF4444]"
                            )}
                          >
                            {item.status || "FAIL"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Governance Controls */}
              {results.categories.controls?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#3B82F6] uppercase font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Governance Benchmark Controls ({results.categories.controls.length})</span>
                  </div>
                  {results.categories.controls.map((item) => {
                    const globalIdx = flattenedResults.findIndex((r) => r.id === item.id);
                    const isSelected = selectedIndex === globalIdx;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.url)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg border flex items-center justify-between transition-colors",
                          isSelected
                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#F3F4F6]"
                            : "bg-[#0A0F18] hover:bg-[#111827] border-[#1D2939]"
                        )}
                      >
                        <div>
                          <div className="text-[#F3F4F6] font-semibold">{item.title}</div>
                          <div className="text-[10px] text-[#667085]">{item.subtitle}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#111827] text-[#3B82F6] border border-[#3B82F6]/30 text-[10px]">
                          {item.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Configurations */}
              {results.categories.configurations?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#10B981] uppercase font-semibold flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Monitored Configurations ({results.categories.configurations.length})</span>
                  </div>
                  {results.categories.configurations.map((item) => {
                    const globalIdx = flattenedResults.findIndex((r) => r.id === item.id);
                    const isSelected = selectedIndex === globalIdx;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.url)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg border flex items-center justify-between transition-colors",
                          isSelected
                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#F3F4F6]"
                            : "bg-[#0A0F18] hover:bg-[#111827] border-[#1D2939]"
                        )}
                      >
                        <div>
                          <div className="text-[#F3F4F6] font-semibold">{item.title}</div>
                          <div className="text-[10px] text-[#667085]">{item.subtitle}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px]">
                          {item.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Audits */}
              {results.categories.audits?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#60A5FA] uppercase font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Compliance Audits ({results.categories.audits.length})</span>
                  </div>
                  {results.categories.audits.map((item) => {
                    const globalIdx = flattenedResults.findIndex((r) => r.id === item.id);
                    const isSelected = selectedIndex === globalIdx;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.url)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg border flex items-center justify-between transition-colors",
                          isSelected
                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#F3F4F6]"
                            : "bg-[#0A0F18] hover:bg-[#111827] border-[#1D2939]"
                        )}
                      >
                        <div>
                          <div className="text-[#F3F4F6] font-semibold">{item.title}</div>
                          <div className="text-[10px] text-[#667085]">{item.subtitle}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#111827] text-[#60A5FA] border border-[#3B82F6]/30 text-[10px]">
                          Score: {item.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Risks */}
              {results.categories.risks?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#F59E0B] uppercase font-semibold flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Risk Items ({results.categories.risks.length})</span>
                  </div>
                  {results.categories.risks.map((item) => {
                    const globalIdx = flattenedResults.findIndex((r) => r.id === item.id);
                    const isSelected = selectedIndex === globalIdx;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.url)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg border flex items-center justify-between transition-colors",
                          isSelected
                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#F3F4F6]"
                            : "bg-[#0A0F18] hover:bg-[#111827] border-[#1D2939]"
                        )}
                      >
                        <div>
                          <div className="text-[#F3F4F6] font-semibold">{item.title}</div>
                          <div className="text-[10px] text-[#667085]">{item.subtitle}</div>
                        </div>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            item.badge === "P0" && "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40",
                            item.badge === "P1" && "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40",
                            item.badge !== "P0" && item.badge !== "P1" && "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30"
                          )}
                        >
                          {item.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Remediations */}
              {results.categories.remediations?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#8B5CF6] uppercase font-semibold flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Allowlisted Remediations ({results.categories.remediations.length})</span>
                  </div>
                  {results.categories.remediations.map((item) => {
                    const globalIdx = flattenedResults.findIndex((r) => r.id === item.id);
                    const isSelected = selectedIndex === globalIdx;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.url)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg border flex items-center justify-between transition-colors",
                          isSelected
                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#F3F4F6]"
                            : "bg-[#0A0F18] hover:bg-[#111827] border-[#1D2939]"
                        )}
                      >
                        <div>
                          <div className="text-[#F3F4F6] font-semibold">{item.title}</div>
                          <div className="text-[10px] text-[#667085]">{item.subtitle}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/40 text-[10px]">
                          {item.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Reports */}
              {results.categories.reports?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#10B981] uppercase font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Executive Reports ({results.categories.reports.length})</span>
                  </div>
                  {results.categories.reports.map((item) => {
                    const globalIdx = flattenedResults.findIndex((r) => r.id === item.id);
                    const isSelected = selectedIndex === globalIdx;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.url)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg border flex items-center justify-between transition-colors",
                          isSelected
                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#F3F4F6]"
                            : "bg-[#0A0F18] hover:bg-[#111827] border-[#1D2939]"
                        )}
                      >
                        <div>
                          <div className="text-[#F3F4F6] font-semibold">{item.title}</div>
                          <div className="text-[10px] text-[#667085]">{item.subtitle}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40 text-[10px]">
                          {item.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Navigation Shortcuts */}
              {results.categories.navigation?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#667085] uppercase font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span>Navigation ({results.categories.navigation.length})</span>
                  </div>
                  {results.categories.navigation.map((item) => {
                    const globalIdx = flattenedResults.findIndex((r) => r.id === item.id);
                    const isSelected = selectedIndex === globalIdx;

                    return (
                      <button
                        key={item.title}
                        onClick={() => handleSelect(item.url)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg border flex items-center justify-between transition-colors",
                          isSelected
                            ? "bg-[#3B82F6]/10 border-[#3B82F6]/40 text-[#F3F4F6]"
                            : "bg-[#0A0F18] hover:bg-[#111827] border-[#1D2939]"
                        )}
                      >
                        <div>
                          <div className="text-[#F3F4F6] font-semibold">{item.title}</div>
                          <div className="text-[10px] text-[#667085]">{item.subtitle}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#111827] text-[#3B82F6] border border-[#3B82F6]/30 text-[10px]">
                          {item.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Command Palette Footer */}
        <div className="p-3 border-t border-[#1D2939] bg-[#080B12] text-[10px] text-[#667085] flex items-center justify-between font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded bg-[#111827] border border-[#1D2939] text-[#A7B0C0]">↑</kbd>
              <kbd className="px-1 py-0.2 rounded bg-[#111827] border border-[#1D2939] text-[#A7B0C0]">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 rounded bg-[#111827] border border-[#1D2939] text-[#A7B0C0]">↵</kbd>
              <span>Select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 rounded bg-[#111827] border border-[#1D2939] text-[#A7B0C0]">ESC</kbd>
              <span>Close</span>
            </span>
          </div>
          <span className="text-[#667085]">NetVigil Global Command Center</span>
        </div>
      </div>
    </div>
  );
}
