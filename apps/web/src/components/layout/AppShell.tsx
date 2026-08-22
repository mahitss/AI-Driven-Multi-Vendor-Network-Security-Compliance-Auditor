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

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  category?: string;
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/", icon: Activity, category: "Core Operations" },
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

import GlobalSearchModal from "@/components/layout/GlobalSearchModal";

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
    <div className="flex h-screen bg-[#070b12] text-slate-200 overflow-hidden">
      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0c121e] border-r border-white/5 z-20">
        {/* Brand Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-white tracking-wide">NetVigil</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 font-mono">
                  v0.1
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-tight font-medium">NTRO • SIH26155</p>
            </div>
          </Link>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {categories.map((category) => (
            <div key={category} className="space-y-1">
              <div className="px-2.5 text-[10px] font-semibold tracking-wider uppercase text-slate-500 font-mono">
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
                          "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all group",
                          isActive
                            ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={cn(
                              "w-4 h-4 transition-colors",
                              isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                            )}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={cn(
                              "text-[10px] font-mono px-1.5 py-0.2 rounded",
                              isActive
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                                : "bg-slate-800 text-slate-400"
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
        <div className="p-3 m-3 rounded-lg bg-slate-900/80 border border-white/5 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400">Deterministic Core</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Cisco, Juniper & Fortinet AST parsing engine active.
          </p>
        </div>

        {/* Operator Profile */}
        <div className="p-3 border-t border-white/5 flex items-center justify-between bg-[#0a0f19]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-semibold text-slate-300">
              NA
            </div>
            <div>
              <div className="text-xs font-medium text-slate-200">NTRO Auditor</div>
              <div className="text-[10px] text-slate-500 font-mono">SecOps Clearance L3</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 bg-[#0c121e]/80 backdrop-blur-md border-b border-white/5 px-4 lg:px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="text-slate-500">NetVigil</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-200 font-medium capitalize">
                {pathname === "/" ? "Overview" : pathname.replace("/", "").replace(/-/g, " ")}
              </span>
            </div>
          </div>

          {/* Right Header Status, Search & Action */}
          <div className="flex items-center gap-3">
            {/* Global Search Launch Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white text-xs font-mono transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Search entities...</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-white/5">
                Ctrl+K
              </kbd>
            </button>

            {/* System Health Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-white/5 text-xs font-mono">
              {isError ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-rose-400 text-[11px]">API Offline</span>
                </>
              ) : health?.status === "healthy" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">API v{health.version} Healthy</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-400 text-[11px]">Connecting...</span>
                </>
              )}
            </div>

            <Link
              href="/configurations"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium shadow-sm transition-colors font-mono"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Config</span>
            </Link>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#080c14]">
          {children}
        </main>
      </div>
    </div>
  );
}
