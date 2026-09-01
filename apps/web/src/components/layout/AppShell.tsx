"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Activity,
  Server,
  Layers,
  AlertTriangle,
  Wrench,
  Settings as SettingsIcon,
  Upload,
  Menu,
  X,
  Search,
  LogOut,
  History,
  Bot,
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
    ],
  },
  {
    category: "Investigate",
    items: [
      { label: "Security Audits", href: "/audits", icon: Shield },
      { label: "Findings", href: "/findings", icon: AlertTriangle },
      { label: "Assets & Inventory", href: "/devices", icon: Server },
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
    category: "Intelligence",
    items: [
      { label: "Multi-Vendor Engine", href: "/multi-vendor", icon: Layers },
      { label: "Security Briefing", href: "/ai-security-briefing", icon: Bot },
    ],
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isOnline, isOffline, isDegraded, isConnecting } = useSystemHealth();

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

  const getBreadcrumb = () => {
    if (pathname === "/dashboard") return "Security Posture";
    if (pathname === "/remediation") return "Remediation Center";
    if (pathname === "/findings") return "Investigate / Findings";
    if (pathname === "/audits") return "Investigate / Security Audits";
    if (pathname === "/devices" || pathname === "/configurations") return "Investigate / Assets & Inventory";
    if (pathname === "/security-time-machine") return "Observability / Security Time Machine";
    if (pathname === "/operations") return "Observability / Audit Operations";
    if (pathname === "/reports") return "Governance / Executive Reports";
    if (pathname === "/multi-vendor" || pathname === "/demo/multi-vendor") return "Intelligence / Multi-Vendor Engine";
    if (pathname === "/ai-security-briefing") return "Intelligence / Security Briefing";
    if (pathname === "/settings") return "Platform / Settings";
    const segment = pathname.split("/")[1] || "Overview";
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <div className="flex h-screen bg-[#080B12] text-[#A7B0C0] overflow-hidden font-sans">
      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0A0F18] border-r border-[#1D2939] z-20 select-none">
        {/* Brand Header */}
        <div className="p-3.5 border-b border-[#1D2939] flex items-center justify-between bg-[#080B12]">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded bg-[#0D121C] border border-[#1D2939] flex items-center justify-center text-[#3B82F6] group-hover:border-[#263B55] transition-colors shadow-inner">
              <Shield className="w-3.5 h-3.5 text-[#3B82F6]" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-tight text-[#F3F4F6] flex items-center gap-1.5 font-mono">
                <span>NETVIGIL</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-[#111827] text-[#3B82F6] font-medium border border-[#1D2939]">
                  SOC
                </span>
              </div>
              <div className="text-[10px] text-[#667085] font-mono tracking-tight">Security Console</div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                isOnline && "bg-[#10B981] tactical-pulse-green",
                isDegraded && "bg-[#F59E0B]",
                isConnecting && "bg-[#3B82F6] animate-pulse",
                isOffline && "bg-[#EF4444]"
              )}
            />
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5">
          {navigationGroups.map((group) => (
            <div key={group.category} className="space-y-0.5">
              <div className="px-2 py-0.5 text-[10px] font-mono font-medium text-[#667085] uppercase tracking-wider">
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
                          ? "bg-[#111827] text-[#F3F4F6] font-semibold border-l-2 border-[#3B82F6] pl-2 shadow-sm"
                          : "text-[#A7B0C0] hover:text-[#F3F4F6] hover:bg-[#0D121C]"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            "w-3.5 h-3.5 transition-colors",
                            isActive ? "text-[#3B82F6]" : "text-[#667085] group-hover:text-[#A7B0C0]"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-medium bg-[#111827] text-[#667085] border border-[#1D2939]">
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

        {/* Bottom Sidebar: User Identity & Settings */}
        <div className="p-2.5 border-t border-[#1D2939] bg-[#080B12] text-xs space-y-2">
          <Link
            href="/settings"
            className={cn(
              "flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-all group",
              pathname.startsWith("/settings")
                ? "bg-[#111827] text-[#F3F4F6] font-semibold border-l-2 border-[#3B82F6] pl-2 shadow-sm"
                : "text-[#A7B0C0] hover:text-[#F3F4F6] hover:bg-[#0D121C]"
            )}
          >
            <div className="flex items-center gap-2.5">
              <SettingsIcon
                className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  pathname.startsWith("/settings") ? "text-[#3B82F6]" : "text-[#667085] group-hover:text-[#A7B0C0]"
                )}
              />
              <span>Settings</span>
            </div>
          </Link>

          {user && (
            <div className="pt-2 border-t border-[#1D2939] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded bg-[#111827] border border-[#1D2939] text-[#3B82F6] flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
                  {(user.email?.[0] || "A").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#F3F4F6] truncate">
                    {user.user_metadata?.full_name || user.email?.split("@")[0] || "Auditor"}
                  </div>
                  <div className="text-[10px] text-[#667085] truncate font-mono">{user.email || "Security Operator"}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="p-1 rounded text-[#667085] hover:text-[#EF4444] hover:bg-[#111827] transition-colors flex-shrink-0"
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
        <header className="h-12 bg-[#080B12] border-b border-[#1D2939] px-4 md:px-6 flex items-center justify-between z-10 select-none">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded text-[#A7B0C0] hover:text-white hover:bg-[#0D121C]"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            {/* Breadcrumb Title */}
            <div className="flex items-center gap-2 text-xs text-[#A7B0C0] font-mono">
              <span className="text-[#667085]">NETVIGIL</span>
              <span className="text-[#263B55]">/</span>
              <span className="font-semibold text-[#F3F4F6]">{getBreadcrumb().toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Global Search Launch Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] text-xs text-[#667085] hover:text-[#A7B0C0] transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Search controls, findings...</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.2 text-[9px] font-mono rounded bg-[#111827] text-[#A7B0C0] border border-[#1D2939]">
                Ctrl K
              </kbd>
            </button>

            {/* Ingest Primary Action Button */}
            <Link
              href="/configurations?mode=ingest"
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#141A24] hover:bg-[#1A2230] border border-[#28354A] text-xs text-[#F3F4F6] hover:text-white transition-colors font-mono text-[11px] font-semibold shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>INGEST</span>
            </Link>

            {/* Operational State Pill */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0D121C] border border-[#1D2939] text-[10px] font-mono">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isOnline && "bg-[#10B981] tactical-pulse-green",
                  isDegraded && "bg-[#F59E0B]",
                  isConnecting && "bg-[#3B82F6] animate-pulse",
                  isOffline && "bg-[#EF4444]"
                )}
              />
              <span
                className={cn(
                  "font-semibold tracking-wider",
                  isOnline && "text-[#10B981]",
                  isDegraded && "text-[#F59E0B]",
                  isConnecting && "text-[#3B82F6]",
                  isOffline && "text-[#EF4444]"
                )}
              >
                {isOnline ? "OPERATIONAL" : isDegraded ? "DEGRADED" : isConnecting ? "CONNECTING" : "OFFLINE"}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Children Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#080B12]">
          {children}
        </main>
      </div>
    </div>
  );
}
