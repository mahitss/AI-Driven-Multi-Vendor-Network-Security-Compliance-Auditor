"use client";

import React, { useState, useEffect } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, logout } = useAuth();
  const { isOnline, isOffline, isDegraded, isConnecting } = useSystemHealth();

  // Load persistent collapse preference safely on mount (prevents SSR/CSR hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem("netvigil_sidebar_collapsed");
      if (stored === "true") {
        setIsCollapsed(true);
      }
    } catch {
      // Storage access may be restricted in sandbox/private mode
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("netvigil_sidebar_collapsed", String(next));
      } catch {
        // Storage write ignored
      }
      return next;
    });
  };

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
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

  // Render navigation content with support for expanded and collapsed presentation
  const renderNavContent = (isMobile = false) => {
    const collapsed = !isMobile && isMounted && isCollapsed;

    return (
      <div className="flex flex-col h-full bg-[#080808]">
        {/* Brand Header */}
        <div
          className={cn(
            "p-3.5 border-b border-[#1F1F1F] bg-[#080808] flex items-center transition-all",
            collapsed ? "flex-col justify-center gap-2.5 px-2" : "justify-between"
          )}
        >
          <Link
            href="/dashboard"
            onClick={() => isMobile && setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 group min-w-0"
            title="NetVigil Security Console"
          >
            <div className="w-8 h-8 rounded-md bg-[#0D0D0D] border border-[#1F1F1F] flex items-center justify-center text-[#E0E0E0] group-hover:border-[#2A2A2A] transition-colors shrink-0">
              <Shield className="w-4 h-4 text-[#E0E0E0]" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden min-w-0">
                <div className="text-xs font-semibold tracking-wider text-[#F2F2F2] flex items-center gap-1.5 font-mono">
                  <span>NETVIGIL</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-[#141414] text-[#888888] font-medium border border-[#242424]">
                    SOC
                  </span>
                </div>
                <div className="text-[10px] text-[#555555] font-mono tracking-tight">Security Console</div>
              </div>
            )}
          </Link>

          {!collapsed && (
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
              {!isMobile && (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Collapse sidebar"
                  aria-expanded="true"
                  title="Collapse sidebar"
                  className="p-1.5 rounded-md text-[#666666] hover:text-[#F2F2F2] hover:bg-[#121212] transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[#444444]"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation"
                  className="p-1.5 rounded-md text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#121212] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              aria-expanded="false"
              title="Expand sidebar"
              className="p-1.5 rounded-md text-[#666666] hover:text-[#F2F2F2] hover:bg-[#121212] transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[#444444]"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <div className={cn("flex-1 overflow-y-auto", collapsed ? "p-2 space-y-3" : "p-3 space-y-5")}>
          {navigationGroups.map((group, groupIdx) => (
            <div key={group.category} className="space-y-1">
              {!collapsed ? (
                <div className="px-3 py-1 text-[11px] font-mono font-semibold text-[#555555] uppercase tracking-wider select-none">
                  {group.category}
                </div>
              ) : (
                groupIdx > 0 && <div className="border-t border-[#161616] my-2 mx-2" />
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  if (collapsed) {
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "relative flex items-center justify-center w-10 h-10 mx-auto rounded-md transition-colors group focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[#444444]",
                          isActive
                            ? "bg-[#141414] text-[#F2F2F2] border border-[#2B2B2B] shadow-xs"
                            : "text-[#777777] hover:text-[#F2F2F2] hover:bg-[#101010]"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 transition-colors",
                            isActive ? "text-[#F2F2F2]" : "text-[#666666] group-hover:text-[#A0A0A0]"
                          )}
                        />
                        {/* Hover Tooltip for Collapsed State */}
                        <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#121212] border border-[#242424] rounded-md text-xs text-[#F2F2F2] font-medium whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                          {item.label}
                          {item.badge && (
                            <span className="ml-1.5 text-[9px] font-mono text-[#888888]">
                              ({item.badge})
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => isMobile && setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-md text-[14px] leading-tight font-medium transition-colors group focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[#444444]",
                        isActive
                          ? "bg-[#141414] text-[#F2F2F2] font-semibold border-l-2 border-[#F2F2F2] pl-2.5 shadow-xs"
                          : "text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#101010]"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0 transition-colors",
                            isActive ? "text-[#F2F2F2]" : "text-[#666666] group-hover:text-[#A0A0A0]"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-medium bg-[#141414] text-[#666666] border border-[#222222] shrink-0">
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
        <div className={cn("border-t border-[#1F1F1F] bg-[#080808]", collapsed ? "p-2 space-y-2" : "p-3 space-y-2.5")}>
          {collapsed ? (
            <Link
              href="/settings"
              title="Settings"
              className={cn(
                "relative flex items-center justify-center w-10 h-10 mx-auto rounded-md transition-colors group focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[#444444]",
                pathname.startsWith("/settings")
                  ? "bg-[#141414] text-[#F2F2F2] border border-[#2B2B2B] shadow-xs"
                  : "text-[#777777] hover:text-[#F2F2F2] hover:bg-[#101010]"
              )}
            >
              <SettingsIcon
                className={cn(
                  "w-4 h-4 transition-colors",
                  pathname.startsWith("/settings") ? "text-[#F2F2F2]" : "text-[#666666] group-hover:text-[#A0A0A0]"
                )}
              />
              <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#121212] border border-[#242424] rounded-md text-xs text-[#F2F2F2] font-medium whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                Settings
              </div>
            </Link>
          ) : (
            <Link
              href="/settings"
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-md text-[14px] leading-tight font-medium transition-colors group focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[#444444]",
                pathname.startsWith("/settings")
                  ? "bg-[#141414] text-[#F2F2F2] font-semibold border-l-2 border-[#F2F2F2] pl-2.5 shadow-xs"
                  : "text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#101010]"
              )}
            >
              <div className="flex items-center gap-3">
                <SettingsIcon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    pathname.startsWith("/settings") ? "text-[#F2F2F2]" : "text-[#666666] group-hover:text-[#A0A0A0]"
                  )}
                />
                <span>Settings</span>
              </div>
            </Link>
          )}

          {user && (
            collapsed ? (
              <div className="pt-2 border-t border-[#1F1F1F] flex flex-col items-center gap-2">
                <div
                  className="relative group cursor-default"
                  title={`${user.user_metadata?.full_name || user.email?.split("@")[0] || "Operator"} (${user.email || "security@netvigil.io"})`}
                >
                  <div className="w-8 h-8 rounded-md bg-[#121212] border border-[#242424] text-[#E0E0E0] flex items-center justify-center text-[11px] font-mono font-bold">
                    {(user.email?.[0] || "A").toUpperCase()}
                  </div>
                  <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#121212] border border-[#242424] rounded-md text-xs text-[#F2F2F2] whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    <div className="font-medium text-[#F2F2F2]">
                      {user.user_metadata?.full_name || user.email?.split("@")[0] || "Operator"}
                    </div>
                    <div className="text-[10px] text-[#777777] font-mono">{user.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="p-1.5 rounded-md text-[#666666] hover:text-[#EF4444] hover:bg-[#141414] transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[#444444]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="pt-2.5 border-t border-[#1F1F1F] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-[#121212] border border-[#242424] text-[#E0E0E0] flex items-center justify-center text-[11px] font-mono font-bold shrink-0">
                    {(user.email?.[0] || "A").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#F2F2F2] truncate">
                      {user.user_metadata?.full_name || user.email?.split("@")[0] || "Operator"}
                    </div>
                    <div className="text-[10px] text-[#555555] truncate font-mono">{user.email || "security@netvigil.io"}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="p-1.5 rounded-md text-[#666666] hover:text-[#EF4444] hover:bg-[#141414] transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[#444444]"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#070707] text-[#A0A0A0] overflow-x-hidden font-sans">
      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Sidebar Desktop */}
      <aside
        className={cn(
          "relative hidden lg:flex flex-col bg-[#080808] border-r border-[#1F1F1F] z-20 select-none transition-[width] duration-200 ease-in-out shrink-0",
          isMounted && isCollapsed ? "w-[68px]" : "w-[280px]"
        )}
      >
        {/* Rail edge collapse/expand toggle tab */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isMounted && isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!(isMounted && isCollapsed)}
          title={isMounted && isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-14 z-30 hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-[#0E0E0E] border border-[#242424] text-[#888888] hover:text-[#F2F2F2] hover:border-[#383838] shadow-md transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-[#444444]"
        >
          {isMounted && isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>

        {renderNavContent(false)}
      </aside>

      {/* Mobile / Tablet Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex flex-col w-[280px] max-w-[85vw] bg-[#080808] border-r border-[#1F1F1F] z-50 shadow-2xl">
            {renderNavContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area - Automatically reclaims space when sidebar collapses */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Header */}
        <header className="h-12 bg-[#080808] border-b border-[#1F1F1F] px-4 md:px-6 flex items-center justify-between z-10 select-none">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Open mobile navigation"
              className="lg:hidden p-1.5 rounded-md text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#121212] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            {/* Breadcrumb Title */}
            <div className="flex items-center gap-2 text-xs text-[#8E8E93] font-mono truncate">
              <span className="text-[#555555]">NETVIGIL</span>
              <span className="text-[#2A2A2A]">/</span>
              <span className="font-semibold text-[#F2F2F2] truncate">{getBreadcrumb()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
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
