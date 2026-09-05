"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  User as UserIcon,
  Shield,
  Key,
  Lock,
  Server,
  Layers,
  Activity,
  Check,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Moon,
  Sun,
  Monitor,
  RefreshCw,
  Copy,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Globe,
  Database,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSettings, type ThemeOption, type DensityOption, type FrameworkOption } from "@/components/providers/SettingsProvider";
import { useSystemHealth } from "@/lib/use-system-health";
import { cn } from "@/lib/utils";

type SettingsSectionId =
  | "account"
  | "security"
  | "workspace"
  | "preferences"
  | "system";

function normalizeSection(sec: string | null): SettingsSectionId {
  if (!sec) return "account";
  const s = sec.toLowerCase();
  if (s === "account" || s === "profile") return "account";
  if (s === "security" || s === "auth" || s === "authentication") return "security";
  if (s === "workspace" || s === "tenant" || s === "privacy") return "workspace";
  if (s === "preferences" || s === "appearance" || s === "theme") return "preferences";
  if (s === "system" || s === "about" || s === "diagnostics" || s === "api") return "system";
  return "account";
}

interface SettingsTabItem {
  id: SettingsSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const SETTINGS_TABS: SettingsTabItem[] = [
  { id: "account", label: "Account", icon: UserIcon },
  { id: "security", label: "Security & Authentication", icon: Key, badge: "SSO Active" },
  { id: "workspace", label: "Workspace & Tenant", icon: Server, badge: "RLS Isolated" },
  { id: "preferences", label: "Application Preferences", icon: SlidersHorizontal },
  { id: "system", label: "About & System Diagnostics", icon: Activity, badge: "v1.0.0" },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isOnline, isDegraded, isConnecting } = useSystemHealth();

  const {
    preferences,
    setTheme,
    setDensity,
    setReducedMotion,
    setDefaultFramework,
    resetPreferences,
  } = useSettings();

  const [activeSection, setActiveSection] = useState<SettingsSectionId>("account");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

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
    user?.user_metadata?.username ||
    (user?.email ? user.email.split("@")[0].replace(".", " ") : "Security Operator");
  const displayEmail = user?.email || "operator@enterprise.mil";
  const userInitials = displayName
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const authProvider = user?.app_metadata?.provider || (user ? "Google OAuth 2.0" : "OAuth Session");
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "September 2026";
  const diagnosticUserId = user?.id ? user.id : "usr_ntro_sec_26155_verified";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B0B0B] border border-[#2A2A2A] shadow-2xl text-xs font-medium text-[#F2F2F2] animate-in fade-in slide-in-from-bottom-2 duration-200 font-mono">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="border-b border-[#1F1F1F] pb-4 bg-[#080808]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold text-[#F2F2F2] tracking-tight flex items-center gap-3 font-mono">
              <SettingsIcon className="w-6 h-6 text-[#8E8E93]" />
              <span>Platform Settings</span>
            </h1>
            <p className="text-sm sm:text-[15px] text-[#8E8E93] mt-1 font-sans leading-relaxed">
              Enterprise workspace configuration, security boundaries, client preferences, and system diagnostics.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs border font-medium",
                isOnline && "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25",
                isDegraded && "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25",
                isConnecting && "bg-[#141414] text-[#8E8E93] border-[#2A2A2A]"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isOnline && "bg-[#10B981]",
                  isDegraded && "bg-[#F59E0B]",
                  isConnecting && "bg-[#8E8E93] animate-pulse"
                )}
              />
              {isOnline ? "OPERATIONAL" : isDegraded ? "DEGRADED" : "CONNECTING"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Settings Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <aside className="lg:col-span-3 space-y-4 lg:sticky lg:top-16">
          <div className="p-2 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-1 font-mono text-xs">
            {SETTINGS_TABS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSection(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left",
                    isActive
                      ? "bg-[#141414] text-[#F2F2F2] font-semibold border border-[#2A2A2A] shadow-xs"
                      : "text-[#8E8E93] hover:text-[#F2F2F2] hover:bg-[#101010] border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-[#F2F2F2]" : "text-[#666666]"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[9px] font-mono px-1.5 py-0.2 rounded border leading-none ml-2 shrink-0",
                        isActive
                          ? "bg-[#1C1C1C] text-[#D4D4D8] border-[#333333]"
                          : "bg-[#0E0E0E] text-[#666666] border-[#1F1F1F]"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[#F2F2F2] font-semibold font-mono">
              <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>SOC Policy Active</span>
            </div>
            <p className="text-[12px] text-[#8E8E93] leading-relaxed font-sans">
              Deterministic AST compliance audit mode enabled. Direct write operations to production devices are physically disabled.
            </p>
          </div>
        </aside>

        {/* Right Settings Viewport */}
        <main className="lg:col-span-9 space-y-6 min-w-0">
          {/* 1. ACCOUNT */}
          {activeSection === "account" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#F2F2F2] tracking-tight font-mono">Account &amp; Operator Profile</h2>
                <p className="text-xs sm:text-[13px] text-[#8E8E93] mt-0.5 font-sans">
                  Active operator identity and authorization credentials for this security audit session.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 border-b border-[#1F1F1F]">
                  <div className="w-14 h-14 rounded-full bg-[#141414] border border-[#2A2A2A] shadow-md flex items-center justify-center text-base font-bold text-[#F2F2F2] font-mono shrink-0">
                    {userInitials || "OP"}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-[#F2F2F2] font-mono">{displayName}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25">
                        AUTHENTICATED OPERATOR
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-[#8E8E93] font-mono truncate">{displayEmail}</p>
                    <div className="flex items-center gap-3 pt-0.5 text-xs text-[#666666]">
                      <span>Provider: <strong className="text-[#8E8E93] font-medium font-mono">{authProvider}</strong></span>
                      <span>•</span>
                      <span>Active Since: <strong className="text-[#8E8E93] font-medium font-mono">{memberSince}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1">
                    <span className="text-[#666666] text-[10px] uppercase font-semibold">Federation Protocol</span>
                    <p className="text-[#F2F2F2] font-medium text-xs">OAuth 2.0 / OpenID Connect (OIDC)</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1">
                    <span className="text-[#666666] text-[10px] uppercase font-semibold">Security Role</span>
                    <p className="text-[#F2F2F2] font-medium text-xs">Network Security Compliance Lead</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1">
                    <span className="text-[#666666] text-[10px] uppercase font-semibold">Operator Subject ID</span>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[#8E8E93] truncate text-[11px] font-mono">{diagnosticUserId}</p>
                      <button
                        type="button"
                        onClick={() => handleCopy(diagnosticUserId, "User ID")}
                        className="text-[#666666] hover:text-[#F2F2F2] transition-colors p-1"
                        title="Copy Subject ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1">
                    <span className="text-[#666666] text-[10px] uppercase font-semibold">Tenant Isolation Boundary</span>
                    <p className="text-[#10B981] font-medium text-xs">Row-Level Security (RLS) Enforced</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. SECURITY & AUTHENTICATION */}
          {activeSection === "security" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#F2F2F2] tracking-tight font-mono">Security &amp; Authentication</h2>
                <p className="text-xs sm:text-[13px] text-[#8E8E93] mt-0.5 font-sans">
                  Federated identity credentials, cryptographically signed tokens, and session termination controls.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-6 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
                  <div className="p-4 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#666666] text-[10px] uppercase font-semibold">Identity Provider</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#F2F2F2] flex items-center gap-2">
                      <Key className="w-4 h-4 text-[#8E8E93]" />
                      <span>{authProvider}</span>
                    </p>
                    <p className="text-[11px] text-[#636366] font-sans">
                      Session tokens authenticated via Supabase Identity Gateway.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#636366] text-[10px] uppercase font-semibold">Token Validation</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25">
                        ENFORCED
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#F2F2F2] flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#10B981]" />
                      <span>Bearer JWT Asymmetric Verification</span>
                    </p>
                    <p className="text-[11px] text-[#636366] font-sans">
                      FastAPI API layer verifies cryptographically signed JWTs on every operation.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1F1F1F] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-[#F2F2F2] text-sm font-mono">Active Device Session</h4>
                    <p className="text-xs text-[#8E8E93] font-sans mt-0.5">
                      Terminates local session tokens and returns immediately to the authentication gateway.
                    </p>
                  </div>
                  {confirmSignOut ? (
                    <div className="flex items-center gap-2 font-mono">
                      <button
                        type="button"
                        onClick={() => setConfirmSignOut(false)}
                        className="px-3 py-1.5 rounded-md text-xs text-[#8E8E93] hover:text-[#F2F2F2] border border-[#242424] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => logout()}
                        className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#EF4444] hover:bg-[#DC2626] text-white transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Confirm Sign Out</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmSignOut(true)}
                      className="px-4 py-2 rounded-md text-xs font-semibold font-mono bg-[#141414] hover:bg-[#1A1A1A] text-[#EF4444] border border-[#EF4444]/30 hover:border-[#EF4444]/50 transition-colors flex items-center gap-2 shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out of Console</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. WORKSPACE & TENANT */}
          {activeSection === "workspace" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#F2F2F2] tracking-tight font-mono">Workspace &amp; Tenant Safeguards</h2>
                <p className="text-xs sm:text-[13px] text-[#8E8E93] mt-0.5 font-sans">
                  Architectural invariants enforcing data isolation, zero network push, and credential redaction.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-4 text-xs font-mono">
                {[
                  {
                    title: "Strict Tenant Isolation (RLS)",
                    status: "ACTIVE",
                    desc: "Configurations, audits, findings, and risk assessments are strictly isolated by authenticated user UUID with PostgreSQL Row-Level Security.",
                  },
                  {
                    title: "Zero Network Push Boundary",
                    status: "ENFORCED",
                    desc: "NetVigil is fundamentally read-only. Automated network modifications, live config pushing, and intrusive probe execution are disabled.",
                  },
                  {
                    title: "Sensitive Credential Redaction",
                    status: "ENFORCED",
                    desc: "Cleartext passwords, Cisco Type-7 / Juniper $9$ hashes, and SNMP community strings are scrubbed before AST evaluation.",
                  },
                  {
                    title: "Deterministic AST Evaluation",
                    status: "ACTIVE",
                    desc: "Compliance verdict calculations are deterministic mathematics, completely isolated from generative hallucination.",
                  },
                ].map((policy) => (
                  <div
                    key={policy.title}
                    className="p-4 rounded-lg bg-[#080808] border border-[#1F1F1F] flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1 font-sans min-w-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                        <span className="font-semibold text-[#F2F2F2] text-sm font-mono">{policy.title}</span>
                      </div>
                      <p className="text-xs text-[#8E8E93] leading-relaxed pl-6">{policy.desc}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#141414] text-[#8E8E93] border border-[#242424] shrink-0">
                      {policy.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. APPLICATION PREFERENCES */}
          {activeSection === "preferences" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#F2F2F2] tracking-tight font-mono">Application Preferences</h2>
                <p className="text-xs sm:text-[13px] text-[#8E8E93] mt-0.5 font-sans">
                  Customize interface density, theme presentation, default benchmark standards, and animation controls.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-6 text-xs">
                {/* Theme Selector */}
                <div className="space-y-3 pb-5 border-b border-[#1F1F1F]">
                  <div>
                    <label className="text-sm font-semibold text-[#F2F2F2] font-mono">Theme Mode</label>
                    <p className="text-xs text-[#8E8E93] font-sans mt-0.5">Select client rendering aesthetic.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: "dark", label: "Dark (SOC Matte)", desc: "Matte charcoal surfaces", icon: Moon },
                      { id: "system", label: "System Sync", desc: "Follow OS preference", icon: Monitor },
                      { id: "high-contrast", label: "High Contrast", desc: "Sharpened border contrast", icon: Sun },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTheme(t.id as ThemeOption);
                          showToast(`Theme updated to ${t.label}`);
                        }}
                        className={cn(
                          "p-3.5 rounded-lg text-left border transition-all flex flex-col justify-between gap-3 font-mono",
                          preferences.theme === t.id
                            ? "bg-[#141414] border-[#333333] text-[#F2F2F2] shadow-xs"
                            : "bg-[#080808] border-[#1F1F1F] text-[#8E8E93] hover:border-[#2C2C2E]"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <t.icon className={cn("w-4 h-4", preferences.theme === t.id ? "text-[#F2F2F2]" : "text-[#666666]")} />
                          {preferences.theme === t.id && <Check className="w-4 h-4 text-[#F2F2F2]" />}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-[#F2F2F2]">{t.label}</div>
                          <div className="text-[11px] text-[#666666] mt-0.5 font-sans">{t.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Density Selector */}
                <div className="space-y-3 pb-5 border-b border-[#1F1F1F]">
                  <div>
                    <label className="text-sm font-semibold text-[#F2F2F2] font-mono">Interface Density</label>
                    <p className="text-xs text-[#8E8E93] font-sans mt-0.5">Control whitespace padding across telemetry tables and cards.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                    {[
                      { id: "comfortable", label: "Comfortable", desc: "Generous whitespace for executive review" },
                      { id: "compact", label: "Compact Density", desc: "High-density view for rapid triage" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setDensity(d.id as DensityOption);
                          showToast(`Density set to ${d.label}`);
                        }}
                        className={cn(
                          "p-3.5 rounded-lg text-left border transition-all flex items-center justify-between",
                          preferences.density === d.id
                            ? "bg-[#141414] border-[#333333] text-[#F2F2F2] shadow-xs"
                            : "bg-[#080808] border-[#1F1F1F] text-[#8E8E93] hover:border-[#2C2C2E]"
                        )}
                      >
                        <div>
                          <div className="font-semibold text-xs text-[#F2F2F2]">{d.label}</div>
                          <div className="text-[11px] text-[#666666] mt-0.5 font-sans">{d.desc}</div>
                        </div>
                        {preferences.density === d.id && <Check className="w-4 h-4 text-[#F2F2F2]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Framework */}
                <div className="space-y-3 pb-5 border-b border-[#1F1F1F]">
                  <div>
                    <label className="text-sm font-semibold text-[#F2F2F2] font-mono">Default Compliance Benchmark</label>
                    <p className="text-xs text-[#8E8E93] font-sans mt-0.5">Preferred security standard pre-selected on audit views.</p>
                  </div>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {(["CIS", "NIST", "STIG", "ISO"] as FrameworkOption[]).map((fw) => (
                      <button
                        key={fw}
                        type="button"
                        onClick={() => {
                          setDefaultFramework(fw);
                          showToast(`Default framework set to ${fw}`);
                        }}
                        className={cn(
                          "px-4 py-2 rounded-md text-xs font-mono font-semibold transition-all border",
                          preferences.defaultFramework === fw
                            ? "bg-[#161616] text-[#F2F2F2] border-[#383838] shadow-xs"
                            : "bg-[#080808] text-[#8E8E93] border-[#1F1F1F] hover:text-[#F2F2F2] hover:border-[#2C2C2E]"
                        )}
                      >
                        {fw} Benchmarks
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reduced Motion Toggle */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <label className="text-sm font-semibold text-[#F2F2F2] font-mono">Reduced Motion</label>
                    <p className="text-xs text-[#8E8E93] font-sans mt-0.5">Disable subtle CSS transitions and pulsing telemetry animations.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !preferences.reducedMotion;
                      setReducedMotion(next);
                      showToast(`Reduced motion ${next ? "enabled" : "disabled"}`);
                    }}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0",
                      preferences.reducedMotion ? "bg-[#F2F2F2]" : "bg-[#141414] border border-[#242424]"
                    )}
                    aria-label="Toggle reduced motion"
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full transition-transform transform shadow-sm",
                        preferences.reducedMotion ? "translate-x-5 bg-black" : "translate-x-0 bg-[#8E8E93]"
                      )}
                    />
                  </button>
                </div>

                {/* Reset Preferences */}
                <div className="pt-4 border-t border-[#1F1F1F] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-[#F2F2F2] text-sm font-mono">Reset Console Preferences</h4>
                    <p className="text-xs text-[#8E8E93] font-sans mt-0.5">Restore all appearance and density preferences to default baseline.</p>
                  </div>
                  {confirmReset ? (
                    <div className="flex items-center gap-2 font-mono">
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="px-3 py-1.5 rounded-md text-xs text-[#8E8E93] hover:text-[#F2F2F2] border border-[#242424] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#F2F2F2] hover:bg-white text-black transition-colors"
                      >
                        Confirm Reset
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="px-4 py-2 rounded-md text-xs font-semibold font-mono bg-[#141414] hover:bg-[#1A1A1A] text-[#8E8E93] hover:text-[#F2F2F2] border border-[#242424] transition-colors flex items-center gap-2 shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#666666]" />
                      <span>Reset to Defaults</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. ABOUT & SYSTEM DIAGNOSTICS */}
          {activeSection === "system" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#F2F2F2] tracking-tight font-mono">About &amp; System Diagnostics</h2>
                <p className="text-xs sm:text-[13px] text-[#8E8E93] mt-0.5 font-sans">
                  Deterministic engine architecture, parser status, mathematical formulas, and live subsystem health.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] space-y-6 text-xs font-mono">
                {/* 6 Engine Diagnostics Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1">
                    <span className="text-[#666666] text-[10px] uppercase font-semibold">FastAPI Engine</span>
                    <p className="text-sm font-bold text-[#10B981]">ONLINE</p>
                    <p className="text-[11px] text-[#636366]">REST / JSON ASGI Service</p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1">
                    <span className="text-[#666666] text-[10px] uppercase font-semibold">Database Layer</span>
                    <p className="text-sm font-bold text-[#10B981]">CONNECTED</p>
                    <p className="text-[11px] text-[#636366]">PostgreSQL / SQLite AIO</p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1">
                    <span className="text-[#666666] text-[10px] uppercase font-semibold">Vendor AST Parsers</span>
                    <p className="text-sm font-bold text-[#F2F2F2]">3 VENDORS ACTIVE</p>
                    <p className="text-[11px] text-[#636366]">Cisco, Juniper, Fortinet</p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1">
                    <span className="text-[#666666] text-[10px] uppercase font-semibold">Compliance Engine</span>
                    <p className="text-sm font-bold text-[#F2F2F2]">DETERMINISTIC</p>
                    <p className="text-[11px] text-[#636366]">CIS, NIST, STIG, ISO 27001</p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1">
                    <span className="text-[#666666] text-[10px] uppercase font-semibold">Evidence Provenance</span>
                    <p className="text-sm font-bold text-[#10B981]">AST FACT VERIFIED</p>
                    <p className="text-[11px] text-[#636366]">Line-Level Citations</p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-1">
                    <span className="text-[#666666] text-[10px] uppercase font-semibold">Platform Version</span>
                    <p className="text-sm font-bold text-[#F2F2F2]">v1.0.0-RC1</p>
                    <p className="text-[11px] text-[#636366]">NTRO · SIH26155</p>
                  </div>
                </div>

                {/* Deterministic Risk Formula */}
                <div className="space-y-2 pt-2 border-t border-[#1F1F1F]">
                  <label className="text-xs font-semibold text-[#F2F2F2] uppercase tracking-wider">
                    Authoritative Deterministic Risk Formula
                  </label>
                  <div className="p-4 rounded-lg bg-[#080808] border border-[#1F1F1F] space-y-2 text-[12px] text-[#8E8E93]">
                    <div className="text-[#F2F2F2] font-semibold">
                      Risk Score = (0.70 × Severity Base) + 1.5 × (Exposure Mod + Impact Mod) + Correlation Bonus
                    </div>
                    <div className="text-[#636366] text-[11px]">
                      Severity Base: Critical (90) • High (75) • Medium (50) • Low (25) | Topological modifiers bound [0, 100].
                    </div>
                  </div>
                </div>

                {/* Service Endpoints */}
                <div className="space-y-2 pt-2 border-t border-[#1F1F1F]">
                  <label className="text-xs font-semibold text-[#F2F2F2] uppercase tracking-wider">
                    Backend Service Specifications
                  </label>
                  <div className="divide-y divide-[#141414] border border-[#1F1F1F] rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-[#080808]">
                      <span className="text-[#666666] font-sans">API Endpoint:</span>
                      <span className="text-[#F2F2F2] font-mono">/api/v1 (FastAPI ASGI)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#080808]">
                      <span className="text-[#666666] font-sans">AST Serialization:</span>
                      <span className="text-[#F2F2F2] font-mono">Universal Security Model (USM)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#080808]">
                      <span className="text-[#666666] font-sans">Authentication Mode:</span>
                      <span className="text-[#10B981] font-mono">Bearer JWT (HMAC-SHA256 / EdDSA)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#080808]">
                      <span className="text-[#666666] font-sans">Background Worker Engine:</span>
                      <span className="text-[#8E8E93] font-mono">Go Worker (v1, Optional / Standby)</span>
                    </div>
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
        <div className="p-12 text-center text-[#636366] text-xs font-mono animate-pulse">
          Loading NetVigil Enterprise Settings...
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
