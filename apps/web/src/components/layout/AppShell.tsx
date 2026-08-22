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
  { label: "Overview", href: "/", icon: Activity, category: "Core Operations" },
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
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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

  const categories = Array.from(new Set(navItems.map((item) => item.category)));

  return (
    <div className="flex h-screen bg-[#070707] text-[#D4D4D4] overflow-hidden">
      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#080808] border-r border-[#1A1A1A] z-20">
        {/* Brand Header */}
        <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0D0D0D] border border-[#00D9FF]/30 flex items-center justify-center text-[#00D9FF]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-[#F5F5F5] tracking-wide">NetVigil</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0D0D0D] text-[#00D9FF] border border-[#00D9FF]/30 font-mono">
                  v0.1
                </span>
              </div>
              <p className="text-[10px] text-[#666666] tracking-tight font-medium">NTRO • SIH26155</p>
            </div>
          </Link>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {categories.map((category) => (
            <div key={category} className="space-y-1">
              <div className="px-2.5 text-[10px] font-semibold tracking-wider uppercase text-[#666666] font-mono">
                {category}
              </div>
              <div className="space-y-0.5">
                {navItems
                  .filter((item) => item.category === category)
                  .map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-1.5 text-xs font-medium transition-all group",
                          isActive
                            ? "bg-[#111111] text-[#F5F5F5] border-l-2 border-[#00D9FF] rounded-r-md rounded-l-none font-semibold"
                            : "text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#111111] rounded-md border-l-2 border-transparent"
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
                              "text-[10px] font-mono px-1.5 py-0.2 rounded",
                              isActive
                                ? "bg-[#1A1A1A] text-[#00D9FF] border border-[#00D9FF]/30"
                                : "bg-[#111111] text-[#666666] border border-[#1A1A1A]"
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

        {/* Engine Pipeline Status */}
        <div className="p-3 m-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-[#A3A3A3]">Deterministic Core</span>
            <span className="flex items-center gap-1 text-[10px] text-[#22C55E] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              ONLINE
            </span>
          </div>
          <p className="text-[11px] text-[#666666] leading-snug">
            Cisco, Juniper & Fortinet AST parsing engine active.
          </p>
        </div>

        {/* Operator Profile */}
        <div className="p-3 border-t border-[#1A1A1A] flex items-center justify-between bg-[#080808]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#111111] border border-[#1A1A1A] flex items-center justify-center text-xs font-semibold text-[#D4D4D4]">
              NA
            </div>
            <div>
              <div className="text-xs font-medium text-[#F5F5F5]">NTRO Auditor</div>
              <div className="text-[10px] text-[#666666] font-mono">SecOps Clearance L3</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 bg-[#070707] border-b border-[#151515] px-4 lg:px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md text-[#A3A3A3] hover:text-white hover:bg-[#111111]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-xs text-[#A3A3A3] font-mono">
              <span className="text-[#666666]">NetVigil</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#333333]" />
              <span className="text-[#F5F5F5] font-medium capitalize">
                {pathname === "/" ? "Overview" : pathname.replace("/", "").replace(/-/g, " ")}
              </span>
            </div>
          </div>

          {/* Right Header Status, Search & Action */}
          <div className="flex items-center gap-3">
            {/* Global Search Launch Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#242424] text-xs font-mono transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[#666666]" />
              <span className="hidden sm:inline">Search entities...</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-[#111111] text-[10px] text-[#A3A3A3] border border-[#1A1A1A]">
                Ctrl+K
              </kbd>
            </button>

            {/* System Health Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0B0B0B] border border-[#1A1A1A] text-xs font-mono">
              {isError ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  <span className="text-[#EF4444] text-[11px]">API Offline</span>
                </>
              ) : health?.status === "healthy" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  <span className="text-[#22C55E] text-[11px]">API v{health.version} Healthy</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  <span className="text-[#F59E0B] text-[11px]">Connecting...</span>
                </>
              )}
            </div>

            <Link
              href="/configurations"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0B0B0B] border border-[#00D9FF]/40 hover:border-[#00D9FF] hover:bg-[#111111] text-[#00D9FF] text-xs font-medium transition-all font-mono"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Config</span>
            </Link>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#070707]">
          {children}
        </main>
      </div>
    </div>
  );
}
