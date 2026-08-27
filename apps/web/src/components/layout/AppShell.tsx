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
  Play,
  Lock,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { fetchHealth } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import GlobalSearchModal from "@/components/layout/GlobalSearchModal";
import { useAuth } from "@/components/providers/AuthProvider";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  category?: string;
}

const navItems: NavItem[] = [
  // Overview
  { label: "Security Posture", href: "/dashboard", icon: Activity, category: "Overview" },
  { label: "Audit Configuration", href: "/configurations", icon: FileCode2, category: "Overview", badge: "Audit" },

  // Operations
  { label: "Evidence Explorer", href: "/findings", icon: AlertTriangle, category: "Operations" },
  { label: "Risk Intelligence", href: "/risk", icon: Flame, category: "Operations" },
  { label: "Remediation Center", href: "/remediation", icon: Wrench, category: "Operations", badge: "Fix" },
  { label: "Compliance Audits", href: "/audits", icon: Shield, category: "Operations" },
  { label: "Infrastructure Assets", href: "/devices", icon: Server, category: "Operations" },

  // Intelligence
  { label: "Multi-Vendor Engine", href: "/multi-vendor", icon: Layers, category: "Intelligence", badge: "Multi-OS" },
  { label: "AI Boundary", href: "/ai-boundary", icon: Lock, category: "Intelligence", badge: "Trust" },
  { label: "AI Co-pilot", href: "/ai-assistant", icon: Bot, category: "Intelligence" },
  { label: "Adaptive Training", href: "/adaptive-training", icon: Sparkles, category: "Intelligence" },

  // Governance & Compliance
  { label: "CIS Benchmarks", href: "/compliance/cis", icon: Layers, category: "Governance & Compliance" },
  { label: "NIST SP 800-53", href: "/compliance/nist", icon: Layers, category: "Governance & Compliance" },
  { label: "DISA STIG", href: "/compliance/stig", icon: Layers, category: "Governance & Compliance" },
  { label: "ISO 27001", href: "/compliance/iso", icon: Layers, category: "Governance & Compliance" },
  { label: "Executive Reports", href: "/reports", icon: FileText, category: "Governance & Compliance" },

  // Platform
  { label: "Settings", href: "/settings", icon: SettingsIcon, category: "Platform" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();

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

  // Poll system health every 15 seconds
  const { data: health, isError } = useQuery({
    queryKey: ["system-health"],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  });

  if (isPublicPage) {
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
                              item.badge === "Live"
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
              <span className="text-[#A3A3A3]">API Engine</span>
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
                  {health?.status === "healthy" ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#666666]">
              <span>Auth Boundary</span>
              <span className="text-[#22C55E] font-semibold">{user ? "VERIFIED" : "PUBLIC"}</span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#666666]">
              <span>Read-Only SOC</span>
              <span className="text-[#00D9FF]">Enforced</span>
            </div>
          </div>

          {/* Authenticated User Profile Summary */}
          {user && (
            <div className="mt-2 pt-2 border-t border-[#1A1A1A] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                  <img
                    src={user.user_metadata.avatar_url || user.user_metadata.picture}
                    alt="Avatar"
                    className="w-6 h-6 rounded-full border border-[#00D9FF]/30 object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#141414] border border-[#00D9FF]/30 text-[#00D9FF] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {(user.email?.[0] || "A").toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-[#F5F5F5] truncate">
                    {user.user_metadata?.full_name || user.email?.split("@")[0] || "Auditor"}
                  </div>
                  <div className="text-[9px] text-[#666666] truncate">{user.email || "Operator"}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="p-1 rounded text-[#666666] hover:text-[#EF4444] hover:bg-[#141414] transition-colors flex-shrink-0"
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
            {/* Multi-Vendor Engine Link */}
            <Link
              href="/demo/multi-vendor"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#00D9FF]/40 hover:border-[#00D9FF] hover:bg-[#141414] text-[#00D9FF] text-xs font-mono font-semibold transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Vendor</span>
            </Link>

            {/* Quick Upload CTA */}
            <Link
              href="/configurations?mode=ingest"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] hover:border-[#242424] hover:bg-[#111111] text-[#F5F5F5] text-xs font-mono font-semibold transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#00D9FF]" />
              <span className="hidden sm:inline">Ingest Config</span>
            </Link>            {/* Authenticated User Identity & Logout Action */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-[#1A1A1A]">
                {/* Identity Verified Badge */}
                <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-[#0A1412] border border-[#22C55E]/30 text-[10px] font-mono text-[#22C55E] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  <span>IDENTITY VERIFIED</span>
                </div>

                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] text-xs font-mono">
                  {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                    <img
                      src={user.user_metadata.avatar_url || user.user_metadata.picture}
                      alt="Avatar"
                      className="w-5 h-5 rounded-full border border-[#00D9FF]/30 object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#141414] border border-[#00D9FF]/30 text-[#00D9FF] flex items-center justify-center text-[10px] font-bold">
                      {(user.email?.[0] || "A").toUpperCase()}
                    </div>
                  )}
                  <span className="text-[#F5F5F5] font-semibold max-w-[130px] truncate text-[11px]">
                    {user.user_metadata?.full_name || user.email?.split("@")[0] || "Auditor"}
                  </span>
                </div>

                <button
                  type="button"
                  id="logout-button"
                  onClick={logout}
                  title="Sign out of NetVigil"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#1A1A1A] hover:border-[#EF4444]/40 hover:bg-[#1A0A0A] text-[#A3A3A3] hover:text-[#EF4444] text-xs font-mono transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#00D9FF]/30 hover:border-[#00D9FF] hover:bg-[#141414] text-[#00D9FF] text-xs font-mono transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}
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
