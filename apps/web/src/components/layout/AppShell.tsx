"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Lock,
  LogOut,
  User as UserIcon,
  History,
} from "lucide-react";
import { useSystemHealth } from "@/lib/use-system-health";
import { cn } from "@/lib/utils";
import GlobalSearchModal from "@/components/layout/GlobalSearchModal";
import { useAuth } from "@/components/providers/AuthProvider";

interface NavGroup {
  category: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const navigationGroups: NavGroup[] = [
  {
    category: "Overview",
    items: [
      { label: "Security Posture", href: "/dashboard", icon: Activity },
      { label: "Autonomous Agent", href: "/agent", icon: Bot, badge: "Core" },
    ],
  },
  {
    category: "Investigate",
    items: [
      { label: "Security Audits", href: "/audits", icon: Shield },
      { label: "Findings", href: "/findings", icon: AlertTriangle },
      { label: "Assets & Inventory", href: "/devices", icon: Server },
      { label: "Audit Configurations", href: "/configurations", icon: FileCode2 },
    ],
  },
  {
    category: "Remediation",
    items: [
      { label: "Remediation Center", href: "/remediation", icon: Wrench },
    ],
  },
  {
    category: "Observability",
    items: [
      { label: "Security Time Machine", href: "/security-time-machine", icon: History },
      { label: "Audit Operations", href: "/operations", icon: Layers },
    ],
  },
  {
    category: "Intelligence & Governance",
    items: [
      { label: "Multi-Vendor Engine", href: "/multi-vendor", icon: Layers },
      { label: "Security Briefing", href: "/ai-security-briefing", icon: Bot },
      { label: "AI Safety Boundary", href: "/ai-boundary", icon: Lock },
      { label: "Adaptive Training", href: "/adaptive-training", icon: Sparkles },
      { label: "CIS Benchmarks", href: "/compliance/cis", icon: Shield },
      { label: "Executive Reports", href: "/reports", icon: FileText },
    ],
  },
  {
    category: "Platform",
    items: [
      { label: "Settings", href: "/settings", icon: SettingsIcon },
    ],
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isOnline } = useSystemHealth();

  // If on Landing Page root `/` or Login `/login` or Auth callback `/auth/*`, render clean full-width layout
  const isPublicPage = pathname === "/" || pathname === "/login" || pathname?.startsWith("/auth");

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

  if (isPublicPage) {
    return (
      <div className="min-h-screen bg-[#08090b] text-[#c5cbd8] selection:bg-[#0ea5e9]/20 selection:text-[#0ea5e9]">
        {children}
      </div>
    );
  }

  // Derive readable breadcrumb from pathname
  const getBreadcrumb = () => {
    if (pathname === "/dashboard") return "Security Posture";
    if (pathname === "/agent") return "Autonomous Security Engineer";
    if (pathname === "/remediation") return "Remediation Center";
    if (pathname === "/findings") return "Investigate / Findings";
    if (pathname === "/audits") return "Investigate / Security Audits";
    if (pathname === "/devices" || pathname === "/configurations") return "Investigate / Assets";
    if (pathname === "/security-time-machine") return "Observability / Security Time Machine";
    if (pathname === "/reports") return "Governance / Executive Reports";
    if (pathname === "/multi-vendor" || pathname === "/demo/multi-vendor") return "Intelligence / Multi-Vendor Engine";
    if (pathname === "/settings") return "Platform / Settings";
    const segment = pathname.split("/")[1] || "Overview";
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <div className="flex h-screen bg-[#08090b] text-[#c5cbd8] overflow-hidden font-sans">
      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#050608] border-r border-[#171b26] z-20 select-none">
        {/* Brand Header */}
        <div className="p-3.5 border-b border-[#171b26] flex items-center justify-between bg-[#040507]">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded bg-[#0a0c10] border border-[#171b26] flex items-center justify-center text-[#0ea5e9] group-hover:border-[#222838] transition-colors shadow-inner">
              <Shield className="w-3.5 h-3.5 text-[#0ea5e9]" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-tight text-[#f0f3f8] flex items-center gap-1.5 font-mono">
                <span>NETVIGIL</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-[#0e1117] text-[#0ea5e9] font-medium border border-[#171b26]">
                  SOC
                </span>
              </div>
              <div className="text-[10px] text-[#525c70] font-mono tracking-tight">Mission Control Engine</div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] tactical-pulse-green" />
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5">
          {navigationGroups.map((group) => (
            <div key={group.category} className="space-y-0.5">
              <div className="px-2 py-0.5 text-[10px] font-mono font-medium text-[#525c70] uppercase tracking-wider">
                {group.category}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-all group",
                        isActive
                          ? "bg-[#0e1117] text-[#f0f3f8] font-semibold border-l-2 border-[#0ea5e9] pl-2 shadow-sm"
                          : "text-[#8b95a8] hover:text-[#f0f3f8] hover:bg-[#0a0c10]"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            "w-3.5 h-3.5 transition-colors",
                            isActive ? "text-[#0ea5e9]" : "text-[#525c70] group-hover:text-[#8b95a8]"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            "text-[9px] font-mono px-1.5 py-0.2 rounded font-medium",
                            item.badge === "Core"
                              ? "bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/20"
                              : "bg-[#0a0c10] text-[#8b95a8] border border-[#171b26]"
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

        {/* Status / Profile Footer */}
        <div className="p-2.5 border-t border-[#171b26] bg-[#040507] text-xs space-y-2">
          <div className="p-2 rounded bg-[#07080a] border border-[#171b26] flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isOnline ? "bg-[#10b981]" : "bg-[#ef4444]"
                )}
              />
              <span className="text-[#8b95a8]">
                {isOnline ? "USM AST Active" : "Engine Standby"}
              </span>
            </div>
            <span className="text-[10px] text-[#525c70]">v1.2.0</span>
          </div>

          {user && (
            <div className="pt-2 border-t border-[#171b26] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded bg-[#0e1117] border border-[#171b26] text-[#0ea5e9] flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
                  {(user.email?.[0] || "A").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#f0f3f8] truncate">
                    {user.user_metadata?.full_name || user.email?.split("@")[0] || "Auditor"}
                  </div>
                  <div className="text-[10px] text-[#525c70] truncate font-mono">{user.email || "Security Operator"}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="p-1 rounded text-[#525c70] hover:text-[#ef4444] hover:bg-[#0e1117] transition-colors flex-shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Header */}
        <header className="h-12 bg-[#07080a] border-b border-[#171b26] px-4 md:px-6 flex items-center justify-between z-10 select-none">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded text-[#8b95a8] hover:text-white hover:bg-[#0a0c10]"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            {/* Breadcrumb Title */}
            <div className="flex items-center gap-2 text-xs text-[#8b95a8] font-mono">
              <span className="text-[#525c70]">NETVIGIL</span>
              <span className="text-[#262d3e]">/</span>
              <span className="font-semibold text-[#f0f3f8]">{getBreadcrumb().toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Search Launch Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0a0c10] border border-[#171b26] hover:border-[#222838] text-xs text-[#525c70] hover:text-[#8b95a8] transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Search controls, findings...</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.2 text-[9px] font-mono rounded bg-[#0e1117] text-[#8b95a8] border border-[#171b26]">
                Ctrl K
              </kbd>
            </button>

            {/* Ingest Config Shortcut */}
            <Link
              href="/configurations"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0a0c10] border border-[#171b26] hover:border-[#222838] text-xs text-[#c5cbd8] hover:text-[#f0f3f8] transition-colors font-mono text-[11px]"
            >
              <Upload className="w-3.5 h-3.5 text-[#0ea5e9]" />
              <span className="hidden sm:inline">INGEST</span>
            </Link>

            {/* Operational State Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0a0c10] border border-[#171b26] text-[10px] font-mono">
              <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-[#10b981] tactical-pulse-green" : "bg-[#ef4444]")} />
              <span className={cn("font-semibold tracking-wider", isOnline ? "text-[#10b981]" : "text-[#ef4444]")}>
                {isOnline ? "OPERATIONAL" : "OFFLINE"}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-13 z-30 bg-[#050608] border-b border-[#171b26] p-4 overflow-y-auto">
            <div className="space-y-4">
              {navigationGroups.map((group) => (
                <div key={group.category} className="space-y-1">
                  <div className="text-[10px] font-medium uppercase text-[#5d677a]">{group.category}</div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md text-xs font-medium",
                          pathname === item.href ? "bg-[#12141a] text-[#0ea5e9]" : "text-[#8b95a8]"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#12141a] text-[#0ea5e9]">
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

        {/* Main Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#08090b]">
          {children}
        </main>
      </div>
    </div>
  );
}
