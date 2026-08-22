"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  FileCode,
  Shield,
  AlertTriangle,
  Flame,
  Wrench,
  Server,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { globalSearch, SearchResultItem } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Record<string, SearchResultItem[]>>({
    configurations: [],
    audits: [],
    findings: [],
    risks: [],
    remediations: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ configurations: [], audits: [], findings: [], risks: [], remediations: [] });
    }
  }, [isOpen]);

  // Keyboard shortcut ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ configurations: [], audits: [], findings: [], risks: [], remediations: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await globalSearch(query.trim());
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    (results.configurations?.length || 0) +
    (results.audits?.length || 0) +
    (results.findings?.length || 0) +
    (results.risks?.length || 0) +
    (results.remediations?.length || 0);

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div className="bg-[#060606] border border-white/[0.07] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden font-mono text-xs flex flex-col max-h-[80vh]">
        {/* Search Header */}
        <div className="p-3.5 border-b border-white/[0.07] flex items-center gap-3 bg-[#080808]">
          <Search className="w-4 h-4 text-[#666666]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search devices, configurations, audits, findings, risks, or remediation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[#F5F5F5] text-xs placeholder-[#666666] focus:outline-none"
          />
          {isLoading && <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
          <button
            onClick={onClose}
            className="px-1.5 py-0.5 rounded bg-[#141414] text-[#A1A1A1] hover:text-white text-[10px] border border-white/[0.05]"
          >
            ESC
          </button>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!query.trim() ? (
            <div className="py-8 text-center text-[#666666] space-y-1">
              <p>Type to search across monitored network assets, audits, findings, and risks.</p>
              <div className="text-[10px] text-[#444444]">Quick filters: Cisco, Telnet, SSH, CIS, P0</div>
            </div>
          ) : totalResults === 0 && !isLoading ? (
            <div className="py-8 text-center text-[#666666]">
              No matching records found for &quot;{query}&quot;.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Configurations */}
              {results.configurations?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#8A8A8A] uppercase font-semibold flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Configurations ({results.configurations.length})</span>
                  </div>
                  {results.configurations.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#0B0B0B] hover:bg-[#111111] border border-white/[0.07] flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-[#F5F5F5] font-semibold">{item.title}</div>
                        <div className="text-[10px] text-[#A1A1A1]">{item.subtitle}</div>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/30 text-[10px]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Audits */}
              {results.audits?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#8A8A8A] uppercase font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Audits ({results.audits.length})</span>
                  </div>
                  {results.audits.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#0B0B0B] hover:bg-[#111111] border border-white/[0.07] flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-[#F5F5F5] font-semibold">{item.title}</div>
                        <div className="text-[10px] text-[#A1A1A1]">{item.subtitle}</div>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/30 text-[10px]">
                          Score: {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Findings */}
              {results.findings?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#8A8A8A] uppercase font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Findings ({results.findings.length})</span>
                  </div>
                  {results.findings.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#0B0B0B] hover:bg-[#111111] border border-white/[0.07] flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-[#F5F5F5] font-semibold">{item.title}</div>
                        <div className="text-[10px] text-[#A1A1A1]">{item.subtitle}</div>
                      </div>
                      {item.badge && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                          item.badge === "CRITICAL" ? "bg-rose-950/60 text-rose-300 border-rose-800/40" :
                          item.badge === "HIGH" ? "bg-amber-950/60 text-amber-300 border-amber-800/40" :
                          "bg-cyan-950/60 text-cyan-300 border-cyan-800/40"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Risks */}
              {results.risks?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#8A8A8A] uppercase font-semibold flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    <span>Risks ({results.risks.length})</span>
                  </div>
                  {results.risks.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#0B0B0B] hover:bg-[#111111] border border-white/[0.07] flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-[#F5F5F5] font-semibold">{item.title}</div>
                        <div className="text-[10px] text-[#A1A1A1]">{item.subtitle}</div>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40 text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Remediations */}
              {results.remediations?.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-[#8A8A8A] uppercase font-semibold flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-purple-400" />
                    <span>Remediations ({results.remediations.length})</span>
                  </div>
                  {results.remediations.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#0B0B0B] hover:bg-[#111111] border border-white/[0.07] flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-[#F5F5F5] font-semibold">{item.title}</div>
                        <div className="text-[10px] text-[#A1A1A1]">{item.subtitle}</div>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-[#141414] text-purple-300 border border-purple-500/20 text-[10px]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.07] bg-[#080808] text-[10px] text-[#666666] flex items-center justify-between">
          <span>NetVigil Fast Global Entity Search</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
}
