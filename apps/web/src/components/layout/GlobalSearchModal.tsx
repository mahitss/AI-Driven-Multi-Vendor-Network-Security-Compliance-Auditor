"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileCode,
  Shield,
  AlertTriangle,
  Flame,
  Wrench,
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden font-mono text-xs flex flex-col max-h-[80vh]">
        {/* Search Header */}
        <div className="p-3.5 border-b border-[#1A1A1A] flex items-center gap-3 bg-[#0B0B0B]">
          <Search className="w-4 h-4 text-[#666666]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search devices, configurations, audits, findings, risks, or remediation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[#F5F5F5] text-xs placeholder-[#666666] focus:outline-none"
          />
          {isLoading && <RefreshCw className="w-3.5 h-3.5 text-[#00D9FF] animate-spin" />}
          <button
            onClick={onClose}
            className="px-1.5 py-0.5 rounded bg-[#141414] text-[#A3A3A3] hover:text-white text-[10px] border border-[#1A1A1A]"
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
                  <div className="text-[10px] text-[#A3A3A3] uppercase font-semibold flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#00D9FF]" />
                    <span>Configurations ({results.configurations.length})</span>
                  </div>
                  {results.configurations.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#141414] border border-[#1A1A1A] flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-[#F5F5F5] font-semibold">{item.title}</div>
                        <div className="text-[10px] text-[#A3A3A3]">{item.subtitle}</div>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-[#111111] text-[#00D9FF] border border-[#00D9FF]/30 text-[10px]">
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
                  <div className="text-[10px] text-[#A3A3A3] uppercase font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Audits ({results.audits.length})</span>
                  </div>
                  {results.audits.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#141414] border border-[#1A1A1A] flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-[#F5F5F5] font-semibold">{item.title}</div>
                        <div className="text-[10px] text-[#A3A3A3]">{item.subtitle}</div>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-[#111111] text-[#22C55E] border border-[#22C55E]/30 text-[10px]">
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
                  <div className="text-[10px] text-[#A3A3A3] uppercase font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Findings ({results.findings.length})</span>
                  </div>
                  {results.findings.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#141414] border border-[#1A1A1A] flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-[#F5F5F5] font-semibold">{item.title}</div>
                        <div className="text-[10px] text-[#A3A3A3]">{item.subtitle}</div>
                      </div>
                      {item.badge && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                          item.badge === "CRITICAL" ? "bg-[#141414] text-[#EF4444] border-[#EF4444]/40" :
                          item.badge === "HIGH" ? "bg-[#141414] text-[#F59E0B] border-[#F59E0B]/40" :
                          "bg-[#111111] text-[#3B82F6] border-[#3B82F6]/40"
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
                  <div className="text-[10px] text-[#A3A3A3] uppercase font-semibold flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-[#EF4444]" />
                    <span>Risks ({results.risks.length})</span>
                  </div>
                  {results.risks.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#141414] border border-[#1A1A1A] flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-[#F5F5F5] font-semibold">{item.title}</div>
                        <div className="text-[10px] text-[#A3A3A3]">{item.subtitle}</div>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-[#141414] text-[#EF4444] border border-[#EF4444]/40 text-[10px] font-bold">
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
                  <div className="text-[10px] text-[#A3A3A3] uppercase font-semibold flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>Remediations ({results.remediations.length})</span>
                  </div>
                  {results.remediations.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#0D0D0D] hover:bg-[#141414] border border-[#1A1A1A] flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-[#F5F5F5] font-semibold">{item.title}</div>
                        <div className="text-[10px] text-[#A3A3A3]">{item.subtitle}</div>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-[#141414] text-[#8B5CF6] border border-[#8B5CF6]/30 text-[10px]">
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
        <div className="p-3 border-t border-[#151515] bg-[#070707] text-[10px] text-[#666666] flex items-center justify-between">
          <span>NetVigil Fast Global Entity Search</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
}
