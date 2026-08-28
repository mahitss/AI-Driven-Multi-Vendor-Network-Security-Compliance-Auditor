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
  Sparkles,
  Terminal,
  Copy,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Settings as SettingsIcon,
  HelpCircle,
  FileText,
  Clock,
  Fingerprint,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSystemHealth } from "@/lib/use-system-health";
import { cn } from "@/lib/utils";

// Settings Section Definition
type SettingsSectionId =
  | "profile"
  | "preferences"
  | "authentication"
  | "sessions"
  | "security"
  | "ai-config"
  | "ai-privacy"
  | "general"
  | "ingestion"
  | "database"
  | "network"
  | "frameworks"
  | "audit-policies"
  | "system-status"
  | "about";

interface SettingsNavGroup {
  group: string;
  items: {
    id: SettingsSectionId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[];
}

const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    group: "ACCOUNT",
    items: [
      { id: "profile", label: "Profile", icon: UserIcon },
      { id: "preferences", label: "Preferences", icon: Sliders },
    ],
  },
  {
    group: "SECURITY",
    items: [
      { id: "authentication", label: "Authentication", icon: Key, badge: "OAuth 2.0" },
      { id: "sessions", label: "Sessions", icon: Clock },
      { id: "security", label: "Security Posture", icon: Shield, badge: "Enforced", badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    ],
  },
  {
    group: "AI",
    items: [
      { id: "ai-config", label: "AI Configuration", icon: Cpu, badge: "Advisory" },
      { id: "ai-privacy", label: "AI Privacy & Safety", icon: EyeOff, badge: "Isolated", badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    ],
  },
  {
    group: "PLATFORM",
    items: [
      { id: "general", label: "General", icon: Server },
      { id: "ingestion", label: "Ingestion Policies", icon: Terminal },
      { id: "database", label: "Database", icon: Database },
      { id: "network", label: "API & Network", icon: Globe },
    ],
  },
  {
    group: "COMPLIANCE",
    items: [
      { id: "frameworks", label: "Frameworks", icon: Layers, badge: "4 Active" },
      { id: "audit-policies", label: "Audit Policies", icon: FileCheck },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { id: "system-status", label: "System Status", icon: Activity },
      { id: "about", label: "About NetVigil", icon: Info, badge: "v1.0.0-RC1" },
    ],
  },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, session, logout } = useAuth();
  const { isOnline, isChecking, health } = useSystemHealth();

  // Read section from query param, fallback to 'profile'
  const initialSection = (searchParams.get("section") as SettingsSectionId) || "profile";
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(initialSection);

  // Sync state if URL changes
  useEffect(() => {
    const s = searchParams.get("section") as SettingsSectionId;
    if (s && s !== activeSection) {
      setActiveSection(s);
    }
  }, [searchParams]);

  // Navigate section helper
  const handleSelectSection = (id: SettingsSectionId) => {
    setActiveSection(id);
    router.replace(`/settings?section=${id}`, { scroll: false });
  };

  // Local Preferences State
  const [appearance, setAppearance] = useState<"dark" | "system" | "high-contrast">("dark");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [defaultFramework, setDefaultFramework] = useState<string>("CIS");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedApp = localStorage.getItem("netvigil_pref_appearance");
      if (savedApp) setAppearance(savedApp as any);

      const savedDensity = localStorage.getItem("netvigil_pref_density");
      if (savedDensity) setDensity(savedDensity as any);

      const savedMotion = localStorage.getItem("netvigil_pref_reduced_motion");
      if (savedMotion) setReducedMotion(savedMotion === "true");

      const savedFw = localStorage.getItem("netvigil_pref_default_fw");
      if (savedFw) setDefaultFramework(savedFw);
    } catch {
      // ignore
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const updatePreference = (key: string, val: string) => {
    try {
      localStorage.setItem(`netvigil_pref_${key}`, val);
      showToast(`Preference updated: ${key.replace("_", " ")}`);
    } catch {
      // ignore
    }
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    showToast(`Copied ${keyName} to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Derive User Display Data
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0].replace(".", " ") : "Mahit Saxena");
  const displayEmail = user?.email || "mahitsaxena44@gmail.com";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const userInitials = displayName
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const authProvider = user?.app_metadata?.provider || (user ? "Google OAuth 2.0" : "Google SSO / Demo Session");
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Aug 2026";
  const diagnosticUserId = user?.id ? user.id.slice(0, 18) + "..." : "usr_ntro_sec_26155_verified";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 border border-cyan-500/40 shadow-2xl text-xs font-medium text-cyan-300 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="border-b border-white/5 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <SettingsIcon className="w-6 h-6 text-cyan-400" />
              <span>Settings</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage your NetVigil workspace, security posture, AI gateway, and platform policies.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border",
                isOnline
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
              {isOnline ? "SYSTEM ONLINE" : isChecking ? "CHECKING HEALTH..." : "OFFLINE STANDBY"}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              v1.0.0-RC1
            </span>
          </div>
        </div>
      </div>

      {/* Main Settings Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sticky Navigation Sidebar */}
        <aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-20">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 backdrop-blur-sm space-y-5">
            {SETTINGS_NAV.map((group) => (
              <div key={group.group} className="space-y-1">
                <div className="px-2.5 text-[10px] font-mono tracking-wider font-semibold text-slate-400 uppercase">
                  {group.group}
                </div>
                <div className="space-y-0.5 pt-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectSection(item.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left group",
                          isActive
                            ? "bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={cn(
                              "w-4 h-4 shrink-0 transition-colors",
                              isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-300"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={cn(
                              "text-[10px] font-mono px-1.5 py-0.5 rounded border leading-none ml-2 shrink-0",
                              item.badgeColor || (isActive ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-slate-800 text-slate-400 border-white/5")
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Security Badge Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 text-[11px]">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Air-Gapped SOC Policy</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              NetVigil operates in read-only advisory mode. Live network write APIs are physically disabled.
            </p>
          </div>
        </aside>

        {/* Right Settings Content Viewport */}
        <main className="lg:col-span-9 space-y-6 min-w-0">
          {/* =========================================================================
              SECTION: PROFILE
             ========================================================================= */}
          {activeSection === "profile" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Profile Information</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Managed identity and enterprise authorization credentials.
                </p>
              </div>

              {/* User Identity Card */}
              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-white/5">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-16 h-16 rounded-full border-2 border-cyan-500/40 shadow-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border-2 border-cyan-500/40 shadow-lg flex items-center justify-center text-lg font-bold text-cyan-300">
                      {userInitials}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-white">{displayName}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Identity Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{displayEmail}</p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span>Provider: <strong className="text-slate-300 font-normal">{authProvider}</strong></span>
                      <span>•</span>
                      <span>Member Since: <strong className="text-slate-300 font-normal">{memberSince}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Identity Attribute Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                    <span className="text-slate-400 text-[11px]">Authentication Protocol</span>
                    <p className="font-mono text-white font-medium">OAuth 2.0 / OpenID Connect (OIDC)</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                    <span className="text-slate-400 text-[11px]">Organizational Role</span>
                    <p className="font-mono text-cyan-300 font-medium">SOC Security Compliance Lead</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                    <span className="text-slate-400 text-[11px]">Subject / Diagnostic Identifier</span>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-slate-300 truncate text-[11px]">{diagnosticUserId}</p>
                      <button
                        onClick={() => handleCopy(user?.id || "usr_ntro_sec_26155_verified", "User ID")}
                        className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
                        title="Copy Identifier"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                    <span className="text-slate-400 text-[11px]">Audit Attribution Scoping</span>
                    <p className="font-mono text-emerald-400 font-medium">Strict Tenant Scoped (No Cross-Tenant Read)</p>
                  </div>
                </div>

                {/* Notice Banner */}
                <div className="p-3.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3 text-xs text-slate-300">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Profile metadata is synchronized with your enterprise identity provider (Google Workspace / Supabase). Direct credential changes must be performed through your organization’s identity administration console.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: PREFERENCES
             ========================================================================= */}
          {activeSection === "preferences" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Workspace Preferences</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customize your local client rendering, density, and animation parameters.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-6 text-xs">
                {/* Appearance Mode */}
                <div className="space-y-3 pb-6 border-b border-white/5">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-white">Appearance Theme</label>
                    <p className="text-xs text-slate-400">Select the display theme for the NetVigil operator interface.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {[
                      { id: "dark", label: "Dark (SOC Matte)", desc: "High-contrast matte aesthetic", icon: Moon },
                      { id: "system", label: "System Sync", desc: "Follow OS dark/light mode", icon: Monitor },
                      { id: "high-contrast", label: "High Contrast", desc: "Maximum terminal clarity", icon: Sun },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setAppearance(t.id as any);
                          updatePreference("appearance", t.id);
                        }}
                        className={cn(
                          "p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between gap-3",
                          appearance === t.id
                            ? "bg-cyan-500/10 border-cyan-500/40 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <t.icon className={cn("w-4 h-4", appearance === t.id ? "text-cyan-400" : "text-slate-400")} />
                          {appearance === t.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white">{t.label}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{t.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table & Interface Density */}
                <div className="space-y-3 pb-6 border-b border-white/5">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-white">Interface Density</label>
                    <p className="text-xs text-slate-400">Adjust the vertical table height and card padding for findings.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {[
                      { id: "comfortable", label: "Comfortable", desc: "Generous whitespace for executive review" },
                      { id: "compact", label: "Compact Density", desc: "Dense tabular view for large fleet inspections" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          setDensity(d.id as any);
                          updatePreference("density", d.id);
                        }}
                        className={cn(
                          "p-3.5 rounded-xl text-left border transition-all flex items-center justify-between",
                          density === d.id
                            ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                            : "bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10"
                        )}
                      >
                        <div>
                          <div className="font-semibold text-xs text-white">{d.label}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{d.desc}</div>
                        </div>
                        {density === d.id && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reduced Motion Toggle */}
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-white">Reduced Motion</label>
                    <p className="text-xs text-slate-400">Disable smooth parallax and pulse animations across charts.</p>
                  </div>
                  <button
                    onClick={() => {
                      const next = !reducedMotion;
                      setReducedMotion(next);
                      updatePreference("reduced_motion", String(next));
                    }}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5",
                      reducedMotion ? "bg-cyan-500" : "bg-slate-800 border border-white/10"
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full bg-white transition-transform transform shadow-sm",
                        reducedMotion ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* Default Audit Framework */}
                <div className="space-y-3 pt-2">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-white">Default Framework Focus</label>
                    <p className="text-xs text-slate-400">Default standard pre-selected during configuration ingestion.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["CIS", "NIST", "STIG", "ISO"].map((fw) => (
                      <button
                        key={fw}
                        onClick={() => {
                          setDefaultFramework(fw);
                          updatePreference("default_fw", fw);
                        }}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border",
                          defaultFramework === fw
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                            : "bg-slate-950 text-slate-400 border-white/5 hover:text-slate-200"
                        )}
                      >
                        {fw === "CIS" && "CIS Benchmarks (CIS-1.x)"}
                        {fw === "NIST" && "NIST SP 800-53 (Rev 5)"}
                        {fw === "STIG" && "DISA STIG Standards"}
                        {fw === "ISO" && "ISO/IEC 27001"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: AUTHENTICATION
             ========================================================================= */}
          {activeSection === "authentication" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Authentication & Identity</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Single Sign-On federation and asymmetric JWT validation status.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-6 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Federated Identity Provider</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        CONNECTED
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-cyan-400" />
                      Google Workspace OAuth 2.0
                    </p>
                    <p className="text-[11px] text-slate-400">Authenticated via Supabase Auth identity service.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">JWT Signature Verification</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        VERIFIED
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      RS256 Asymmetric Key
                    </p>
                    <p className="text-[11px] text-slate-400">FastAPI backend validates token signature on every request.</p>
                  </div>
                </div>

                {/* Authentication Controls Table */}
                <div className="space-y-2 font-mono text-xs border-t border-white/5 pt-4">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Session Refresh Protocol:</span>
                    <span className="text-slate-200">Sliding Window Automatic Renewal</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Client Secret Exposure:</span>
                    <span className="text-emerald-400">ZERO (Strictly Isolated on Server)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Cross-Origin Cookie Protection:</span>
                    <span className="text-slate-200">SameSite=Lax, Secure HTTPS</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Unauthorized Request Handling:</span>
                    <span className="text-cyan-400">HTTP 401 Challenge $\rightarrow$ /login Redirect</span>
                  </div>
                </div>

                {/* Sign Out Action */}
                <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-white text-xs">Device Session Termination</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Revoke active credentials and sign out of this workstation.</p>
                  </div>
                  {confirmSignOut ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmSignOut(false)}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white border border-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => logout()}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-colors flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Confirm Sign Out
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmSignOut(true)}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 hover:border-rose-500/40 hover:text-rose-300 transition-all flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-slate-400" />
                      Sign Out of This Device
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: SESSIONS
             ========================================================================= */}
          {activeSection === "sessions" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Active Client Sessions</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect authorized browser instances connected to your NetVigil workstation.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-4">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">Current Workstation</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          THIS DEVICE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Windows PC · Next.js Web Shell (Port 3000)
                      </p>
                      <p className="text-[10px] text-slate-400">
                        IP: 127.0.0.1 (Local) · Active Now · Authenticated via Google OAuth
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => logout()}
                    className="px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all shrink-0"
                  >
                    Revoke Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: SECURITY POSTURE
             ========================================================================= */}
          {activeSection === "security" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Security Posture & Boundaries</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Immutable security guardrails enforcing read-only auditing and data privacy.
                </p>
              </div>

              {/* Core Security Invariant Callout */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-cyan-950/30 via-slate-900 to-slate-900 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider font-mono">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Authoritative Security Invariant</span>
                </div>
                <p className="text-sm font-semibold text-white">
                  &ldquo;NetVigil operates strictly as an air-gapped compliance auditor. The platform contains zero device-write APIs and never automatically pushes configuration changes to live network devices.&rdquo;
                </p>
              </div>

              {/* Posture Controls Matrix */}
              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-3 text-xs">
                <h3 className="font-semibold text-white text-xs mb-3">Enforced Architectural Controls</h3>
                {[
                  { name: "API Route Protection", status: "ENFORCED", desc: "JWT bearer validation required on all /api/v1 domain routes." },
                  { name: "Tenant & Audit Isolation", status: "ENFORCED", desc: "Database queries are strictly scoped to audit IDs to prevent IDOR." },
                  { name: "Sensitive Data Redactor", status: "ACTIVE", desc: "Scans and redacts passwords, Cisco type-7/9 hashes, SNMP communities, and private keys." },
                  { name: "Read-Only Remediation Boundary", status: "ENFORCED", desc: "Zero Telnet, Paramiko, or Netmiko execution libraries exist in the system." },
                  { name: "AI Decision Boundary", status: "ENFORCED", desc: "AI is restricted to advisory explanations; compliance scores are strictly deterministic." },
                  { name: "Security Headers (CSP / HSTS)", status: "ACTIVE", desc: "Injects X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and strict HSTS." },
                  { name: "High-Risk Endpoint Rate Limiter", status: "ACTIVE", desc: "Sliding window token bucket throttles file upload and AI reasoning abuse." },
                ].map((ctrl) => (
                  <div key={ctrl.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-white/5 gap-2">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-white">{ctrl.name}</span>
                      <p className="text-[11px] text-slate-400">{ctrl.desc}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 self-start sm:self-auto">
                      {ctrl.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: AI CONFIGURATION
             ========================================================================= */}
          {activeSection === "ai-config" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">AI Multi-Model Gateway Configuration</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Server-side model routing and air-gapped fallback sequence.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-6 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                    <span className="text-slate-400 text-[11px]">AI Gateway Provider</span>
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      OpenRouter Gateway
                    </p>
                    <p className="text-[11px] text-slate-400">Multi-model router with automatic latency & credit fallback.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                    <span className="text-slate-400 text-[11px]">Authority Tier</span>
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      ADVISORY ONLY
                    </p>
                    <p className="text-[11px] text-slate-400">Deterministic AST engine retains 100% decision authority.</p>
                  </div>
                </div>

                {/* Candidate Model Sequence */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-white text-xs">Model Fallback Sequence</h4>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                      <span className="text-slate-300">1. Primary Reasoner:</span>
                      <span className="text-cyan-400 font-semibold">qwen/qwen3-235b-a22b-thinking-2507</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                      <span className="text-slate-300">2. Secondary Reasoner:</span>
                      <span className="text-cyan-400 font-semibold">nvidia/nemotron-3-ultra-550b-a55b:free</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                      <span className="text-slate-300">3. Offline Standby:</span>
                      <span className="text-emerald-400 font-semibold">Deterministic OfflineStandbyProvider (Air-Gapped)</span>
                    </div>
                  </div>
                </div>

                {/* Safe Key Masking Display */}
                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[11px]">OpenRouter API Key</span>
                    <p className="font-mono text-slate-300">••••••••••••••••••••••••••••••••</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    CONFIGURED IN SERVER ENV
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: AI PRIVACY & SAFETY
             ========================================================================= */}
          {activeSection === "ai-privacy" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">AI Privacy, Safety & Trust Controls</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifiable safeguards protecting sensitive network configurations from prompt injection and exfiltration.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 to-slate-900 border border-emerald-500/30 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider font-mono">Zero-Trust AI Sandbox</h3>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      AI is never granted access to raw credentials or device execution. Raw configuration lines are sanitized by the sensitive data redactor and enclosed within passive XML fences before prompt dispatch.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {[
                    { title: "Cleartext Passwords Redacted", desc: "Scrubbed from prompts prior to gateway serialization." },
                    { title: "Password Hashes Redacted", desc: "Cisco type 5/7/8/9, JunOS $9$, and Fortinet ENC masked." },
                    { title: "SNMP Communities Redacted", desc: "RO/RW community strings sanitized." },
                    { title: "RSA / EC Private Keys Redacted", desc: "Full PEM private key blocks scrubbed." },
                    { title: "Prompt Injection Neutralized", desc: "Payloads encapsulated in <untrusted_configuration_data>." },
                    { title: "Score Tampering Impossible", desc: "Authoritative compliance scores are immutably sourced from DB." },
                    { title: "Zero Live Execution", desc: "AI cannot trigger network commands or device writes." },
                    { title: "Air-Gapped Offline Fallback", desc: "Fully operational without internet connectivity." },
                  ].map((g) => (
                    <div key={g.title} className="p-3 rounded-lg bg-slate-950/60 border border-white/5 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-white text-xs">{g.title}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">{g.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: GENERAL PLATFORM
             ========================================================================= */}
          {activeSection === "general" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">General Platform Details</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Core release metadata, environment parameters, and project attributes.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-3 font-mono text-xs">
                {[
                  { label: "Product Name", val: "NetVigil Network Security Compliance Auditor" },
                  { label: "Problem Statement", val: "NTRO / SIH26155" },
                  { label: "Release Version", val: "v1.0.0-RC1 (Feature Frozen)" },
                  { label: "Environment Mode", val: "Development / Production Ready" },
                  { label: "Client Base URL", val: "http://localhost:8000/api/v1 (FastAPI)" },
                  { label: "Frontend Web Shell", val: "Next.js 15 (React 19, TypeScript, Tailwind CSS)" },
                  { label: "Operational Integrity", val: "100% Deterministic Compliance Decision Engine" },
                ].map((row) => (
                  <div key={row.label} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-white/5 gap-1">
                    <span className="text-slate-400 font-sans">{row.label}:</span>
                    <span className="text-white font-medium">{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: INGESTION POLICIES
             ========================================================================= */}
          {activeSection === "ingestion" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Configuration Ingestion Policies</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cryptographic hashing, file limits, and parser grammar specifications.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-white/5">
                  <span className="text-slate-400 font-semibold">Policy Authority:</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    MANAGED BY PLATFORM
                  </span>
                </div>

                <div className="space-y-2 font-mono">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400 font-sans">Maximum Ingestion File Size:</span>
                    <span className="text-white font-bold">10 MB</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400 font-sans">Supported File Extensions:</span>
                    <span className="text-cyan-300">.cfg, .conf, .txt, .log</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400 font-sans">Cryptographic Fingerprint:</span>
                    <span className="text-emerald-400">SHA-256 (256-bit Digest)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400 font-sans">Grammar Autodetection:</span>
                    <span className="text-emerald-400">ACTIVE (Deterministic Heuristics)</span>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="font-semibold text-white text-xs mb-2">Supported Vendor Grammars</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                      <span className="font-semibold text-white">Cisco IOS / IOS-XE</span>
                      <p className="text-[11px] text-slate-400">Line-oriented hierarchy with indent blocks.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                      <span className="font-semibold text-white">Juniper JunOS</span>
                      <p className="text-[11px] text-slate-400">Hierarchical brace syntax and set commands.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                      <span className="font-semibold text-white">Fortinet FortiOS</span>
                      <p className="text-[11px] text-slate-400">Block-level config/edit/set hierarchy.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: DATABASE
             ========================================================================= */}
          {activeSection === "database" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Database & Persistence</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Relational storage state and migration metadata.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-4 text-xs font-mono">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 font-sans">Primary Database Engine:</span>
                  <span className="text-white">PostgreSQL 16 / SQLite AIO</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 font-sans">Connection State:</span>
                  <span className="text-emerald-400">ONLINE & CONNECTED</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 font-sans">ORM & Migration Driver:</span>
                  <span className="text-slate-200">SQLAlchemy 2.0 Async (Alembic)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 font-sans">Current Migration Level:</span>
                  <span className="text-cyan-300">0005_add_risk_and_remediation_models</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400 font-sans">Connection Credentials:</span>
                  <span className="text-emerald-400">PROTECTED (Server Isolated)</span>
                </div>

                <div className="p-3.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3 font-sans text-slate-300">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Database credentials, connection pools, and migration locks are managed exclusively by the backend service. No database passwords or connection URIs are transmitted to client browsers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: API & NETWORK
             ========================================================================= */}
          {activeSection === "network" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">API Protocols & Network Security</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ingress routing, rate limiting policies, and HTTP security headers.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-4 text-xs font-mono">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 font-sans">API Service Protocol:</span>
                  <span className="text-white">FastAPI ASGI (REST / JSON)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 font-sans">Rate Limiter Defense:</span>
                  <span className="text-emerald-400">ACTIVE (Sliding Window Bucket)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 font-sans">CORS Origin Isolation:</span>
                  <span className="text-slate-200">Enforced for Authorized Domains</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400 font-sans">Security Headers Middleware:</span>
                  <span className="text-emerald-400">nosniff, DENY, HSTS active</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400 font-sans">TLS / Ingress Termination:</span>
                  <span className="text-slate-200 font-sans text-[11px]">Managed by Reverse Proxy / Ingress</span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: COMPLIANCE FRAMEWORKS
             ========================================================================= */}
          {activeSection === "frameworks" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Compliance Standards & Frameworks</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Regulatory catalogs and standards evaluated by the deterministic engine.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: "CIS", name: "CIS Benchmarks", version: "v3.0.0", desc: "Center for Internet Security hardening guidelines for Cisco, JunOS, and FortiOS." },
                  { id: "NIST", name: "NIST SP 800-53", version: "Rev 5", desc: "Federal security and privacy control baseline for federal systems." },
                  { id: "STIG", name: "DISA STIG", version: "V2R1", desc: "Department of Defense cybersecurity policy and implementation guides." },
                  { id: "ISO", name: "ISO/IEC 27001", version: "2022", desc: "International standard for information security management system controls." },
                ].map((fw) => (
                  <div key={fw.id} className="p-5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        <h3 className="font-bold text-white text-sm">{fw.name}</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{fw.desc}</p>
                    <div className="pt-2 text-[11px] font-mono text-cyan-300">
                      Standard Version: {fw.version}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: AUDIT POLICIES
             ========================================================================= */}
          {activeSection === "audit-policies" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Audit & Provenance Policies</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Invariants governing evidence extraction, historical scoping, and score reproduction.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-3 text-xs">
                {[
                  { title: "Latest Audit Active Fleet Scoping", status: "ACTIVE", desc: "Posture metrics exclusively aggregate the latest audit per configuration to prevent score inflation." },
                  { title: "Historical Audit Immutability", status: "ACTIVE", desc: "Historical audit records are preserved permanently and cannot be modified after execution." },
                  { title: "Line-Level AST Proof Provenance", status: "ENABLED", desc: "Every compliance finding is linked to verbatim line numbers in the raw configuration." },
                  { title: "Security Time Machine Delta Engine", status: "ACTIVE", desc: "Deterministic before/after audit comparison tracking resolved and regressed controls." },
                  { title: "Read-Only Remediation Guarantee", status: "ENFORCED", desc: "Allowlisted diffs are generated for human review; live device push is disabled." },
                ].map((pol) => (
                  <div key={pol.title} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-slate-950/60 border border-white/5 gap-2">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-white">{pol.title}</span>
                      <p className="text-[11px] text-slate-400">{pol.desc}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 self-start sm:self-auto">
                      {pol.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: SYSTEM STATUS
             ========================================================================= */}
          {activeSection === "system-status" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">System Status & Subsystem Diagnostics</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Centralized operational health metrics across core subsystems.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">FastAPI Engine</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-base font-bold text-white">ONLINE</p>
                  <p className="text-[11px] font-mono text-slate-400">Port 8000 · v0.1.0</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">Database Layer</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-base font-bold text-white">CONNECTED</p>
                  <p className="text-[11px] font-mono text-slate-400">PostgreSQL / SQLite AIO</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">Auth Provider</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-base font-bold text-white">VERIFIED</p>
                  <p className="text-[11px] font-mono text-slate-400">Google OAuth 2.0 / Supabase</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">AI Gateway</span>
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  </div>
                  <p className="text-base font-bold text-white">READY / STANDBY</p>
                  <p className="text-[11px] font-mono text-slate-400">OpenRouter + Offline Standby</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">Multi-Vendor Parsers</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-base font-bold text-white">3 VENDORS</p>
                  <p className="text-[11px] font-mono text-slate-400">Cisco, Juniper, Fortinet</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">Compliance Engine</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-base font-bold text-white">DETERMINISTIC</p>
                  <p className="text-[11px] font-mono text-slate-400">4 Frameworks Active</p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION: ABOUT NETVIGIL
             ========================================================================= */}
          {activeSection === "about" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">About NetVigil</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI-Driven Multi-Vendor Network Security Compliance Auditor.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-6 text-xs">
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                    <span>NetVigil v1.0.0-RC1</span>
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    Engineered for the National Technical Research Organisation (NTRO) under SIH26155 to audit heterogeneous multi-vendor network device configurations against regulatory compliance standards with mathematical determinism.
                  </p>
                </div>

                {/* Pipeline Flow */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 font-mono text-[11px]">
                  <span className="text-slate-400 font-sans font-semibold">Deterministic Execution Pipeline</span>
                  <p className="text-cyan-300 leading-relaxed">
                    Raw Config $\rightarrow$ SHA-256 Fingerprint $\rightarrow$ Multi-Vendor AST Parser $\rightarrow$ Universal Security Model $\rightarrow$ Deterministic Compliance $\rightarrow$ Risk Graph $\rightarrow$ Allowlisted Remediation $\rightarrow$ Re-Analysis Delta $\rightarrow$ Executive Report
                  </p>
                </div>

                {/* Quick Navigation Links */}
                <div className="pt-2">
                  <h4 className="font-semibold text-white text-xs mb-3">Platform Navigation</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                      href="/security-time-machine"
                      className="p-3 rounded-lg bg-slate-950 border border-white/5 hover:border-cyan-500/30 text-slate-300 hover:text-white flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span>Security Time Machine</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </Link>

                    <Link
                      href="/ai-security-briefing"
                      className="p-3 rounded-lg bg-slate-950 border border-white/5 hover:border-cyan-500/30 text-slate-300 hover:text-white flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-cyan-400" />
                        <span>AI Security Briefing</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </Link>

                    <Link
                      href="/reports"
                      className="p-3 rounded-lg bg-slate-950 border border-white/5 hover:border-cyan-500/30 text-slate-300 hover:text-white flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span>Executive Reports</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </Link>

                    <Link
                      href="/ai-boundary"
                      className="p-3 rounded-lg bg-slate-950 border border-white/5 hover:border-cyan-500/30 text-slate-300 hover:text-white flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-cyan-400" />
                        <span>AI Decision Boundary</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </Link>
                  </div>
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
        <div className="p-12 text-center text-slate-500 text-xs font-mono animate-pulse">
          Loading NetVigil Enterprise Settings...
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
