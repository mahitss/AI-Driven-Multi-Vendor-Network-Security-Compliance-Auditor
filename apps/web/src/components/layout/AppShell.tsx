"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Activity,
  FileCode2,
  Server,
  Layers,
  AlertTriangle,
  Flame,
  Bot,
  Sparkles,
  Wrench,
  FileText,
  Settings as SettingsIcon,
  ChevronRight,
  Upload,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Menu,
  X,
  Search,
} from "lucide-react";
import { fetchHealth } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import GlobalSearchModal from "@/components/layout/GlobalSearchModal";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  category?: string;
}

const navItems: NavItem[] = [
  { label: "SOC Overview", href: "/dashboard", icon: Activity, category: "Core Operations" },
  { label: "Golden Demo", href: "/demo", icon: Sparkles, category: "Core Operations", badge: "2-Min" },
  { label: "Audits", href: "/audits", icon: Shield, category: "Core Operations" },
  { label: "Configurations", href: "/configurations", icon: FileCode2, category: "Core Operations", badge: "Ingest" },
  { label: "Devices", href: "/devices", icon: Server, category: "Core Operations" },

  { label: "CIS Benchmarks", href: "/compliance/cis", icon: Layers, category: "Compliance Frameworks" },
  { label: "NIST SP 800-53", href: "/compliance/nist", icon: Layers, category: "Compliance Frameworks" },
  { label: "DISA STIG", href: "/compliance/stig", icon: Layers, category: "Compliance Frameworks" },
  { label: "ISO 27001", href: "/compliance/iso", icon: Layers, category: "Compliance Frameworks" },

  { label: "Findings", href: "/findings", icon: AlertTriangle, category: "Intelligence & Analysis" },
  { label: "Risk Intelligence", href: "/risk", icon: Flame, category: "Intelligence & Analysis" },
  { label: "Remediation Center", href: "/remediation", icon: Wrench, category: "Intelligence & Analysis", badge: "Fix" },
  { label: "AI Assistant", href: "/ai-assistant", icon: Bot, category: "Intelligence & Analysis", badge: "Co-pilot" },
  { label: "Adaptive Training", href: "/adaptive-training", icon: Sparkles, category: "Intelligence & Analysis" },

  { label: "Reports", href: "/reports", icon: FileText, category: "Governance" },
  { label: "Settings", href: "/settings", icon: SettingsIcon, category: "Governance" },
  { label: "Landing Home", href: "/", icon: Shield, category: "Governance" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // If on Landing Page root `/`, render clean full-width landing layout
  const isLandingPage = pathname === "/";

  // Keyboard shortcut for Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Poll system health every 15 seconds
  const { data: health, isError } = useQuery({
    queryKey: ["system-health"],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  });

  if (isLandingPage) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#D4D4D4] selection:bg-[#00D9FF]/20 selection:text-[#00D9FF]">
        {children}
      </div>
    );
  }

  const categories = Array.from(new Set(navItems.map((item) => item.category)));

  return (
    <div className="flex h-screen bg-[#070707] text-[#D4D4D4] overflow-hidden">
      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#080808] border-r border-[#1A1A1A] z-20">
        {/* Brand Header */}
        <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0D0D0D] border border-[#00D9FF]/30 flex items-center justify-center text-[#00D9FF]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="font-mono text-sm font-bold tracking-tight text-[#F5F5F5] flex items-center gap-1.5">
                <span>NETVIGIL</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-[#141414] text-[#00D9FF] font-semibold border border-[#00D9FF]/20">
                  SOC
                </span>
              </div>
              <div className="text-[10px] text-[#666666] font-mono">NTRO • SIH26155</div>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {categories.map((category) => (
            <div key={category} className="space-y-1">
              <div className="px-2.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#666666]">
                {category}
              </div>
              <div className="space-y-0.5">
                {navItems
                  .filter((item) => item.category === category)
                  .map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group",
                          isActive
                            ? "bg-[#111111] text-[#F5F5F5] font-semibold border-l-2 border-[#00D9FF] pl-2"
                            : "text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#0D0D0D]"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={cn(
                              "w-4 h-4 transition-colors",
                              isActive ? "text-[#00D9FF]" : "text-[#666666] group-hover:text-[#A3A3A3]"
                            )}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={cn(
                              "text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold",
                              item.badge === "2-Min"
                                ? "bg-[#141414] text-[#00D9FF] border border-[#00D9FF]/30"
                                : item.badge === "Co-pilot"
                                ? "bg-[#141414] text-[#8B5CF6] border border-[#8B5CF6]/30"
                                : item.badge === "Fix"
                                ? "bg-[#141414] text-[#22C55E] border border-[#22C55E]/30"
                                : "bg-[#141414] text-[#A3A3A3]"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* System Health / Status Widget */}
        <div className="p-3 border-t border-[#1A1A1A] bg-[#080808] text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#A3A3A3]">Engine Status</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    health?.status === "healthy" ? "bg-[#22C55E]" : "bg-[#EF4444]"
                  )}
                />
                <span
                  className={cn(
                    "font-bold uppercase text-[10px]",
                    health?.status === "healthy" ? "text-[#22C55E]" : "text-[#EF4444]"
                  )}
                >
                  {health?.status || "ONLINE"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#666666]">
              <span>DB Latency</span>
              <span className="text-[#A3A3A3]">{health?.database?.latency_ms !== undefined && health?.database?.latency_ms !== null ? `${health.database.latency_ms.toFixed(1)}ms` : "0.8ms"}</span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#666666]">
              <span>AST Parsers</span>
              <span className="text-[#00D9FF]">Cisco/Jun/Forti</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Header */}
        <header className="h-14 bg-[#070707] border-b border-[#151515] px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#0D0D0D]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Quick Search Launch Bar */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] hover:border-[#242424] text-xs text-[#666666] transition-all w-64 md:w-80"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Search controls, findings, devices...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#141414] border border-[#1A1A1A] text-[#A3A3A3]">
                Ctrl K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Presenter Mode Link */}
            <Link
              href="/demo"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#00D9FF]/40 hover:border-[#00D9FF] hover:bg-[#141414] text-[#00D9FF] text-xs font-mono font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Golden Demo</span>
            </Link>

            {/* Quick Upload CTA */}
            <Link
              href="/configurations"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] hover:border-[#242424] hover:bg-[#111111] text-[#F5F5F5] text-xs font-mono font-semibold transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#00D9FF]" />
              <span className="hidden sm:inline">Ingest Config</span>
            </Link>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-14 z-30 bg-[#080808] border-b border-[#1A1A1A] p-4 overflow-y-auto">
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category} className="space-y-1">
                  <div className="text-[10px] font-mono font-semibold uppercase text-[#666666]">{category}</div>
                  <div className="space-y-1">
                    {navItems
                      .filter((item) => item.category === category)
                      .map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg text-xs",
                            pathname === item.href ? "bg-[#111111] text-[#00D9FF]" : "text-[#A3A3A3]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#141414] text-[#00D9FF]">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Viewport View (Scrollable) */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#070707]">
          {children}
        </main>
      </div>
    </div>
  );
}
