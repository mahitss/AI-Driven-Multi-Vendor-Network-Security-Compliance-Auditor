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
    if (pathname === "/dashboard") return "OVERVIEW / SECURITY POSTURE";
    if (pathname === "/remediation") return "REMEDIATION / REMEDIATION CENTER";
    if (pathname === "/findings") return "INVESTIGATE / FINDINGS";
    if (pathname === "/audits") return "INVESTIGATE / SECURITY AUDITS";
    if (pathname === "/devices" || pathname === "/configurations") return "INVESTIGATE / ASSETS & INVENTORY";
    if (pathname === "/security-time-machine") return "OBSERVABILITY / SECURITY TIME MACHINE";
    if (pathname === "/operations") return "OBSERVABILITY / AUDIT OPERATIONS";
    if (pathname === "/reports") return "INTELLIGENCE / SECURITY BRIEFING";
    if (pathname === "/multi-vendor" || pathname === "/demo/multi-vendor") return "INTELLIGENCE / MULTI-VENDOR ENGINE";
    if (pathname === "/ai-security-briefing") return "INTELLIGENCE / SECURITY BRIEFING";
    if (pathname === "/settings") return "SETTINGS";
    const segment = pathname.split("/")[1] || "Overview";
    return segment.toUpperCase();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#080808]">
      {/* Brand Header */}
      <div className="p-3.5 border-b border-[#1F1F1F] flex items-center justify-between bg-[#080808]">
        <Link
          href="/dashboard"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-7 h-7 rounded-md bg-[#0D0D0D] border border-[#1F1F1F] flex items-center justify-center text-[#E0E0E0] group-hover:border-[#2A2A2A] transition-colors">
            <Shield className="w-3.5 h-3.5 text-[#E0E0E0]" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-[#F2F2F2] flex items-center gap-1.5 font-mono">
              <span>NETVIGIL</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#141414] text-[#888888] font-medium border border-[#242424]">
                SOC
              </span>
            </div>
            <div className="text-[10px] text-[#555555] font-mono tracking-tight">Security Console</div>
          </div>
        </Link>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isOnline && "bg-[#10B981]",
              isDegraded && "bg-[#F59E0B]",
              isConnecting && "bg-[#3B82F6] animate-pulse",
              isOffline && "bg-[#EF4444]"
            )}
            title={isOnline ? "Operational" : isDegraded ? "Degraded" : isConnecting ? "Connecting" : "Offline"}
          />
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
        {navigationGroups.map((group) => (
          <div key={group.category} className="space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-mono font-semibold text-[#555555] uppercase tracking-wider">
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
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors group",
                      isActive
                        ? "bg-[#141414] text-[#F2F2F2] font-semibold border-l-2 border-[#F2F2F2] pl-2 shadow-sm"
                        : "text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#101010]"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={cn(
                          "w-3.5 h-3.5 transition-colors",
                          isActive ? "text-[#F2F2F2]" : "text-[#666666] group-hover:text-[#A0A0A0]"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-medium bg-[#141414] text-[#666666] border border-[#222222]">
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
      <div className="p-2.5 border-t border-[#1F1F1F] bg-[#080808] text-xs space-y-2">
        <Link
          href="/settings"
          onClick={() => setMobileMenuOpen(false)}
          className={cn(
            "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors group",
            pathname.startsWith("/settings")
              ? "bg-[#141414] text-[#F2F2F2] font-semibold border-l-2 border-[#F2F2F2] pl-2 shadow-sm"
              : "text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#101010]"
          )}
        >
          <div className="flex items-center gap-2.5">
            <SettingsIcon
              className={cn(
                "w-3.5 h-3.5 transition-colors",
                pathname.startsWith("/settings") ? "text-[#F2F2F2]" : "text-[#666666] group-hover:text-[#A0A0A0]"
              )}
            />
            <span>Settings</span>
          </div>
        </Link>

        {user && (
          <div className="pt-2 border-t border-[#1F1F1F] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#121212] border border-[#242424] text-[#E0E0E0] flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
                {(user.email?.[0] || "A").toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-[#F2F2F2] truncate">
                  {user.user_metadata?.full_name || user.email?.split("@")[0] || "Mahit Saxena"}
                </div>
                <div className="text-[10px] text-[#555555] truncate font-mono">{user.email || "security@netvigil.io"}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-md text-[#666666] hover:text-[#EF4444] hover:bg-[#141414] transition-colors flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#070707] text-[#A0A0A0] overflow-hidden font-sans">
      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#080808] border-r border-[#1F1F1F] z-20 select-none">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-[#080808] border-r border-[#1F1F1F] z-50">
            {navContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Header */}
        <header className="h-12 bg-[#080808] border-b border-[#1F1F1F] px-4 md:px-6 flex items-center justify-between z-10 select-none">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#121212] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            {/* Breadcrumb Title */}
            <div className="flex items-center gap-2 text-xs text-[#8E8E93] font-mono">
              <span className="text-[#555555]">NETVIGIL</span>
              <span className="text-[#2A2A2A]">/</span>
              <span className="font-semibold text-[#F2F2F2]">{getBreadcrumb()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Global Search Launch Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0D0D0D] border border-[#1F1F1F] hover:border-[#2A2A2A] text-xs text-[#666666] hover:text-[#A0A0A0] transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Search controls, findings...</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.2 text-[9px] font-mono rounded bg-[#141414] text-[#888888] border border-[#242424]">
                Ctrl K
              </kbd>
            </button>

            {/* Ingest Primary Action Button */}
            <Link
              href="/configurations?mode=ingest"
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#121212] hover:bg-[#181818] border border-[#262626] text-xs text-[#F2F2F2] hover:text-white transition-colors font-mono text-[11px] font-medium shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-[#A0A0A0]" />
              <span>INGEST</span>
            </Link>

            {/* Operational State Pill */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0D0D0D] border border-[#1F1F1F] text-[10px] font-mono">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isOnline && "bg-[#10B981]",
                  isDegraded && "bg-[#F59E0B]",
                  isConnecting && "bg-[#3B82F6] animate-pulse",
                  isOffline && "bg-[#EF4444]"
                )}
              />
              <span
                className={cn(
                  "font-medium tracking-wider",
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#070707]">
          {children}
        </main>
      </div>
    </div>
  );
}
