"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  User as UserIcon,
  Sliders,
  Shield,
  Key,
  Lock,
  Cpu,
  EyeOff,
  Server,
  Database,
  Globe,
  Layers,
  FileCheck,
  Activity,
  Info,
  Check,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Moon,
  Sun,
  Monitor,
  RefreshCw,
  ExternalLink,
  Terminal,
  Copy,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Settings as SettingsIcon,
  Bell,
  SlidersHorizontal,
  Flame,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSettings } from "@/components/providers/SettingsProvider";
import { useSystemHealth } from "@/lib/use-system-health";
import { cn } from "@/lib/utils";

// Settings Section Definition
type SettingsSectionId =
  | "account"
  | "auth"
  | "appearance"
  | "notifications"
  | "privacy"
  | "api"
  | "advanced"
  | "diagnostics";

function normalizeSection(sec: string | null): SettingsSectionId {
  if (!sec) return "account";
  const s = sec.toLowerCase();
  if (s === "account" || s === "profile") return "account";
  if (s === "auth" || s === "authentication" || s === "security" || s === "sessions") return "auth";
  if (s === "appearance" || s === "theme" || s === "preferences") return "appearance";
  if (s === "notifications" || s === "alerts") return "notifications";
  if (s === "privacy" || s === "data" || s === "ai-privacy") return "privacy";
  if (s === "api" || s === "backend" || s === "network") return "api";
  if (s === "advanced" || s === "telemetry" || s === "frameworks") return "advanced";
  if (s === "diagnostics" || s === "developer" || s === "system" || s === "about") return "diagnostics";
  return "account";
}

interface SettingsTabItem {
  id: SettingsSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const SETTINGS_TABS: SettingsTabItem[] = [
  { id: "account", label: "Account", icon: UserIcon },
  { id: "auth", label: "Authentication & Security", icon: Key, badge: "OAuth 2.0" },
  { id: "appearance", label: "Appearance", icon: Sliders },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Data & Privacy", icon: EyeOff, badge: "Zero-Trust" },
  { id: "api", label: "API / Backend", icon: Globe },
  { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
  { id: "diagnostics", label: "Developer / Diagnostics", icon: Activity, badge: "Active" },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isOnline, isChecking } = useSystemHealth();

  const {
    preferences,
    setTheme,
    setDensity,
    setReducedMotion,
    setDefaultFramework,
    resetPreferences,
    isSaving,
    lastSaved,
  } = useSettings();

  const [activeSection, setActiveSection] = useState<SettingsSectionId>("account");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Local notification toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [criticalP0Webhooks, setCriticalP0Webhooks] = useState(true);
  const [dailyBriefing, setDailyBriefing] = useState(false);

  useEffect(() => {
    const rawSection = searchParams?.get("section");
    if (rawSection) {
      setActiveSection(normalizeSection(rawSection));
    }
  }, [searchParams]);

  const handleSelectSection = (id: SettingsSectionId) => {
    setActiveSection(id);
    if (typeof window !== "undefined") {
      router.replace(`/settings?section=${id}`, { scroll: false });
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    showToast(`Copied ${keyName} to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleReset = () => {
    resetPreferences();
    setConfirmReset(false);
    showToast("Preferences restored to default SOC baseline.");
  };

  // Derive User Display Data
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0].replace(".", " ") : "Security Operator");
  const displayEmail = user?.email || "operator@netvigil.local";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const userInitials = displayName
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const authProvider = user?.app_metadata?.provider || (user ? "Google OAuth 2.0" : "OAuth Session");
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Aug 2026";
  const diagnosticUserId = user?.id ? user.id.slice(0, 18) + "..." : "usr_ntro_sec_26155_verified";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B0B0B] border border-[#38BDF8]/40 shadow-2xl text-xs font-medium text-[#38BDF8] animate-in fade-in slide-in-from-bottom-2 duration-200 font-mono">
          <CheckCircle2 className="w-4 h-4 text-[#38BDF8] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="border-b border-[#141414] pb-4 bg-[#080808]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#F2F2F2] tracking-tight flex items-center gap-2.5 font-mono">
              <SettingsIcon className="w-5 h-5 text-[#38BDF8]" />
              <span>Settings</span>
            </h1>
            <p className="text-xs text-[#8E8E93] mt-1 font-sans">
              Manage workspace configuration, security boundaries, telemetry preferences, and platform diagnostics.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border font-semibold",
                isOnline
                  ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20"
                  : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-[#10B981] animate-pulse" : "bg-[#F59E0B]")} />
              {isOnline ? "OPERATIONAL" : isChecking ? "CHECKING..." : "OFFLINE STANDBY"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Settings Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-16">
          <div className="p-2.5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-1 font-mono text-xs">
            {SETTINGS_TABS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSection(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left",
                    isActive
                      ? "bg-[#141414] text-[#F2F2F2] font-semibold border border-[#2C2C2E] shadow-sm"
                      : "text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#080808] border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-[#38BDF8]" : "text-[#636366]"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[9px] font-mono px-1.5 py-0.2 rounded border leading-none ml-2 shrink-0",
                        isActive
                          ? "bg-[#161D2A] text-[#93C5FD] border-[#2C2C2E]"
                          : "bg-[#080808] text-[#636366] border-[#141414]"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-[#080808] border border-[#141414] space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-[#F2F2F2] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>SOC Policy Active</span>
            </div>
            <p className="text-[11px] text-[#636366] leading-relaxed">
              Advisory audit mode enabled. Write operations to live production networks are physically disabled.
            </p>
          </div>
        </aside>

        {/* Right Settings Viewport */}
        <main className="lg:col-span-9 space-y-6 min-w-0">
          {/* 1. ACCOUNT */}
          {activeSection === "account" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-[#F2F2F2] tracking-tight font-mono">Account &amp; Identity</h2>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Managed identity and enterprise authorization credentials.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 border-b border-[#141414]">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-14 h-14 rounded-full border border-[#2C2C2E] shadow-md object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#141414] border border-[#2C2C2E] shadow-md flex items-center justify-center text-base font-bold text-[#38BDF8] font-mono">
                      {userInitials}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#F2F2F2]">{displayName}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                        VERIFIED
                      </span>
                    </div>
                    <p className="text-xs text-[#8E8E93] font-mono">{displayEmail}</p>
                    <div className="flex items-center gap-3 pt-0.5 text-[11px] text-[#636366]">
                      <span>Provider: <strong className="text-[#8E8E93] font-normal">{authProvider}</strong></span>
                      <span>•</span>
                      <span>Created: <strong className="text-[#8E8E93] font-normal">{memberSince}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-[#080808] border border-[#141414] space-y-1">
                    <span className="text-[#636366] text-[10px] uppercase">Protocol</span>
                    <p className="text-[#F2F2F2] font-medium">OAuth 2.0 / OpenID Connect</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#080808] border border-[#141414] space-y-1">
                    <span className="text-[#636366] text-[10px] uppercase">Role</span>
                    <p className="text-[#38BDF8] font-medium">Security Compliance Lead</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#080808] border border-[#141414] space-y-1">
                    <span className="text-[#636366] text-[10px] uppercase">Subject ID</span>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[#8E8E93] truncate text-[11px]">{diagnosticUserId}</p>
                      <button
                        onClick={() => handleCopy(user?.id || "usr_ntro_sec_26155_verified", "User ID")}
                        className="text-[#636366] hover:text-[#38BDF8] transition-colors p-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#080808] border border-[#141414] space-y-1">
                    <span className="text-[#636366] text-[10px] uppercase">Tenant Isolation</span>
                    <p className="text-[#10B981] font-medium">Strict Tenant Scoped (RLS Enforced)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. AUTHENTICATION & SECURITY */}
          {activeSection === "auth" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-[#F2F2F2] tracking-tight font-mono">Authentication &amp; Security</h2>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Single Sign-On federation and asymmetric JWT validation status.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-5 text-xs font-mono">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#141414] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#636366] text-[10px] uppercase">Identity Provider</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#F2F2F2] flex items-center gap-1.5 font-sans">
                      <Key className="w-3.5 h-3.5 text-[#38BDF8]" />
                      Google Workspace OAuth 2.0
                    </p>
                    <p className="text-[10px] text-[#636366] font-sans">Authenticated via Supabase Auth service.</p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#141414] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#636366] text-[10px] uppercase">JWT Validation</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                        ENFORCED
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#F2F2F2] flex items-center gap-1.5 font-sans">
                      <Lock className="w-3.5 h-3.5 text-[#10B981]" />
                      Bearer Signature Validation
                    </p>
                    <p className="text-[10px] text-[#636366] font-sans">FastAPI backend validates token signature on every request.</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#141414] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-[#F2F2F2] text-xs font-sans">Device Session Termination</h4>
                    <p className="text-[11px] text-[#636366] font-sans">Revoke credentials and return to login screen.</p>
                  </div>
                  {confirmSignOut ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmSignOut(false)}
                        className="px-3 py-1.5 rounded-lg text-xs text-[#8E8E93] hover:text-white border border-[#141414]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => logout()}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-lg transition-colors flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Confirm Sign Out
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmSignOut(true)}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 transition-all flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out of This Device
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. APPEARANCE */}
          {activeSection === "appearance" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-[#F2F2F2] tracking-tight font-mono">Appearance &amp; Theme</h2>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Customize client rendering, density, and animation parameters.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-5 text-xs">
                {/* Theme Selector */}
                <div className="space-y-2.5 pb-4 border-b border-[#141414]">
                  <label className="text-xs font-semibold text-[#F2F2F2] font-mono">Theme Mode</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: "dark", label: "Dark (SOC Charcoal)", desc: "Near-black matte aesthetic", icon: Moon },
                      { id: "system", label: "System Sync", desc: "Follow OS preference", icon: Monitor },
                      { id: "high-contrast", label: "High Contrast", desc: "High contrast borders", icon: Sun },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id as any);
                          showToast(`Theme updated to ${t.label}`);
                        }}
                        className={cn(
                          "p-3 rounded-lg text-left border transition-all flex flex-col justify-between gap-2 font-mono",
                          preferences.theme === t.id
                            ? "bg-[#141414] border-[#2C2C2E] text-[#F2F2F2]"
                            : "bg-[#080808] border-[#141414] text-[#8E8E93] hover:border-[#2C2C2E]"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <t.icon className={cn("w-3.5 h-3.5", preferences.theme === t.id ? "text-[#38BDF8]" : "text-[#636366]")} />
                          {preferences.theme === t.id && <Check className="w-3.5 h-3.5 text-[#38BDF8]" />}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-[#F2F2F2]">{t.label}</div>
                          <div className="text-[10px] text-[#636366] mt-0.5">{t.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Density Selector */}
                <div className="space-y-2.5 pb-4 border-b border-[#141414]">
                  <label className="text-xs font-semibold text-[#F2F2F2] font-mono">Interface Density</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono">
                    {[
                      { id: "comfortable", label: "Comfortable", desc: "Generous whitespace for review" },
                      { id: "compact", label: "Compact Density", desc: "Dense tabular findings view" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          setDensity(d.id as any);
                          showToast(`Density set to ${d.label}`);
                        }}
                        className={cn(
                          "p-3 rounded-lg text-left border transition-all flex items-center justify-between",
                          preferences.density === d.id
                            ? "bg-[#141414] border-[#2C2C2E] text-[#F2F2F2]"
                            : "bg-[#080808] border-[#141414] text-[#8E8E93] hover:border-[#2C2C2E]"
                        )}
                      >
                        <div>
                          <div className="font-semibold text-xs text-[#F2F2F2]">{d.label}</div>
                          <div className="text-[10px] text-[#636366] mt-0.5">{d.desc}</div>
                        </div>
                        {preferences.density === d.id && <Check className="w-3.5 h-3.5 text-[#38BDF8]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reduced Motion */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <label className="text-xs font-semibold text-[#F2F2F2] font-mono">Reduced Motion</label>
                    <p className="text-[11px] text-[#636366] font-sans">Disable animations and pulse effects across console.</p>
                  </div>
                  <button
                    onClick={() => {
                      const next = !preferences.reducedMotion;
                      setReducedMotion(next);
                      showToast(`Reduced motion ${next ? "enabled" : "disabled"}`);
                    }}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5",
                      preferences.reducedMotion ? "bg-[#38BDF8]" : "bg-[#141414] border border-[#141414]"
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full bg-white transition-transform transform shadow-sm",
                        preferences.reducedMotion ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. NOTIFICATIONS */}
          {activeSection === "notifications" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-[#F2F2F2] tracking-tight font-mono">Security Notifications</h2>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Configure alert routing for critical security events and daily summaries.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#080808] border border-[#141414]">
                  <div className="space-y-0.5 font-sans">
                    <span className="font-semibold text-[#F2F2F2] text-xs">Critical (P0) Violation Alerts</span>
                    <p className="text-[11px] text-[#636366]">Immediate notification on cleartext passwords or unauthenticated remote access.</p>
                  </div>
                  <button
                    onClick={() => {
                      setCriticalP0Webhooks(!criticalP0Webhooks);
                      showToast(`Critical alerts ${!criticalP0Webhooks ? "enabled" : "disabled"}`);
                    }}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0",
                      criticalP0Webhooks ? "bg-[#38BDF8]" : "bg-[#141414] border border-[#141414]"
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full bg-white transition-transform transform shadow-sm",
                        criticalP0Webhooks ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-[#080808] border border-[#141414]">
                  <div className="space-y-0.5 font-sans">
                    <span className="font-semibold text-[#F2F2F2] text-xs">Audit Completion Notifications</span>
                    <p className="text-[11px] text-[#636366]">Notification upon finishing multi-vendor configuration analysis.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEmailAlerts(!emailAlerts);
                      showToast(`Audit completion alerts ${!emailAlerts ? "enabled" : "disabled"}`);
                    }}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0",
                      emailAlerts ? "bg-[#38BDF8]" : "bg-[#141414] border border-[#141414]"
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full bg-white transition-transform transform shadow-sm",
                        emailAlerts ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-[#080808] border border-[#141414]">
                  <div className="space-y-0.5 font-sans">
                    <span className="font-semibold text-[#F2F2F2] text-xs">Daily Executive Briefing</span>
                    <p className="text-[11px] text-[#636366]">Daily posture summary of unresolved findings and remediation progress.</p>
                  </div>
                  <button
                    onClick={() => {
                      setDailyBriefing(!dailyBriefing);
                      showToast(`Daily briefing ${!dailyBriefing ? "enabled" : "disabled"}`);
                    }}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0",
                      dailyBriefing ? "bg-[#38BDF8]" : "bg-[#141414] border border-[#141414]"
                    )}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full bg-white transition-transform transform shadow-sm",
                        dailyBriefing ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. DATA & PRIVACY */}
          {activeSection === "privacy" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-[#F2F2F2] tracking-tight font-mono">Data &amp; Privacy Safeguards</h2>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Verifiable protections preventing credential leakage and cross-tenant exposure.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-3 text-xs font-mono">
                {[
                  { title: "Sensitive Credential Redaction", desc: "Cleartext passwords, type-7/9 hashes, and SNMP strings scrubbed before parsing." },
                  { title: "AI Advisory Boundary", desc: "AI is restricted to explanations; compliance scores are 100% deterministic." },
                  { title: "Multi-Tenant Isolation", desc: "Database rows are scoped to authenticated Supabase user UUID with RLS." },
                  { title: "Air-Gapped Standby Mode", desc: "System executes fully offline without external API dependencies." },
                ].map((item) => (
                  <div key={item.title} className="p-3 rounded-lg bg-[#080808] border border-[#141414] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                    <div className="font-sans">
                      <span className="font-semibold text-[#F2F2F2] text-xs">{item.title}</span>
                      <p className="text-[11px] text-[#636366] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. API / BACKEND */}
          {activeSection === "api" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-[#F2F2F2] tracking-tight font-mono">API &amp; Backend Service</h2>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  FastAPI service parameters, rate limiting, and network endpoints.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-3 text-xs font-mono">
                <div className="flex justify-between py-2 border-b border-[#141414]">
                  <span className="text-[#636366] font-sans">API Endpoint:</span>
                  <span className="text-[#F2F2F2]">http://localhost:8000/api/v1</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#141414]">
                  <span className="text-[#636366] font-sans">Protocol:</span>
                  <span className="text-[#38BDF8]">FastAPI ASGI (REST / JSON)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#141414]">
                  <span className="text-[#636366] font-sans">Rate Limiter:</span>
                  <span className="text-[#10B981]">ACTIVE (Sliding Window Bucket)</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#636366] font-sans">CORS Origin Isolation:</span>
                  <span className="text-[#8E8E93]">Enforced for Authorized Domains</span>
                </div>
              </div>
            </div>
          )}

          {/* 7. ADVANCED */}
          {activeSection === "advanced" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-[#F2F2F2] tracking-tight font-mono">Advanced Dashboard Configuration</h2>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Framework defaults, risk calculation weights, and ingestion parameters.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-5 text-xs font-mono">
                {/* Default Framework */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#F2F2F2]">Default Compliance Framework</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["CIS", "NIST", "STIG", "ISO"].map((fw) => (
                      <button
                        key={fw}
                        onClick={() => {
                          setDefaultFramework(fw as any);
                          showToast(`Default framework set to ${fw}`);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border",
                          preferences.defaultFramework === fw
                            ? "bg-[#141414] text-[#38BDF8] border-[#2C2C2E]"
                            : "bg-[#080808] text-[#8E8E93] border-[#141414] hover:text-[#F2F2F2]"
                        )}
                      >
                        {fw} Benchmarks
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk Formula Explanation */}
                <div className="space-y-2 pt-3 border-t border-[#141414]">
                  <label className="text-xs font-semibold text-[#F2F2F2]">Deterministic Risk Formula</label>
                  <div className="p-3 rounded-lg bg-[#080808] border border-[#141414] space-y-1 text-[11px] text-[#8E8E93]">
                    <div className="text-[#F2F2F2] font-bold">Risk Score Calculation:</div>
                    <div className="text-[#38BDF8]">
                      Risk Score = (0.70 × Severity Base) + 1.5 × (Exposure Mod + Impact Mod) + Correlation Bonus
                    </div>
                    <div className="text-[#636366] text-[10px] pt-1">
                      Critical (90) • High (75) • Medium (50) • Low (25)
                    </div>
                  </div>
                </div>

                {/* Reset Preferences */}
                <div className="pt-3 border-t border-[#141414] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-0.5 font-sans">
                    <h4 className="font-semibold text-[#F2F2F2] text-xs">Reset All Preferences</h4>
                    <p className="text-[11px] text-[#636366]">Restore appearance and settings to default SOC baseline.</p>
                  </div>
                  {confirmReset ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmReset(false)}
                        className="px-3 py-1.5 rounded-lg text-xs text-[#8E8E93] hover:text-white border border-[#141414]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReset}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#38BDF8] hover:bg-[#0284C7] text-white transition-colors"
                      >
                        Confirm Reset
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmReset(true)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#080808] hover:bg-[#141414] text-[#8E8E93] border border-[#141414] hover:text-white transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3 text-[#636366]" />
                      Reset to Defaults
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 8. DEVELOPER / DIAGNOSTICS */}
          {activeSection === "diagnostics" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-bold text-[#F2F2F2] tracking-tight font-mono">Developer &amp; Diagnostics</h2>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Operational health metrics across core deterministic subsystems.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono">
                <div className="p-3.5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-1">
                  <span className="text-[#636366] text-[10px] uppercase">FastAPI Engine</span>
                  <p className="text-sm font-bold text-[#10B981]">ONLINE</p>
                  <p className="text-[10px] text-[#636366]">Port 8000 · REST / JSON</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-1">
                  <span className="text-[#636366] text-[10px] uppercase">Database Layer</span>
                  <p className="text-sm font-bold text-[#10B981]">CONNECTED</p>
                  <p className="text-[10px] text-[#636366]">PostgreSQL / SQLite AIO</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-1">
                  <span className="text-[#636366] text-[10px] uppercase">Auth Service</span>
                  <p className="text-sm font-bold text-[#10B981]">VERIFIED</p>
                  <p className="text-[10px] text-[#636366]">Google OAuth 2.0</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-1">
                  <span className="text-[#636366] text-[10px] uppercase">Multi-Vendor AST</span>
                  <p className="text-sm font-bold text-[#F2F2F2]">3 VENDORS</p>
                  <p className="text-[10px] text-[#636366]">Cisco, Juniper, Fortinet</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-1">
                  <span className="text-[#636366] text-[10px] uppercase">Compliance Engine</span>
                  <p className="text-sm font-bold text-[#F2F2F2]">DETERMINISTIC</p>
                  <p className="text-[10px] text-[#636366]">4 Standards Active</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0B0B] border border-[#141414] space-y-1">
                  <span className="text-[#636366] text-[10px] uppercase">Platform Version</span>
                  <p className="text-sm font-bold text-[#38BDF8]">v1.0.0-RC1</p>
                  <p className="text-[10px] text-[#636366]">NTRO / SIH26155</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-[#636366] text-xs font-mono animate-pulse">
          Loading NetVigil Enterprise Settings...
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
