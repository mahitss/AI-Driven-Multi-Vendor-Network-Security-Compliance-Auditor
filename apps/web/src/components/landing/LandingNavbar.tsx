"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Shield, Activity, Compass, User, LogOut, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LandingNavbar() {
  const { user, loading: authLoading, logout } = useAuth();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setIsAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName =
    user?.user_metadata?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Operator";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#080B12]/90 backdrop-blur-md border-b border-[#1D2939] font-mono text-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand Logo & Precision Identifier */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md bg-[#0D121C] border border-[#1D2939] flex items-center justify-center text-[#3B82F6] group-hover:border-[#3B82F6] transition-colors duration-150">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm tracking-wider text-[#F3F4F6]">NETVIGIL</span>
            <span className="text-[10px] text-[#3B82F6] font-semibold px-1.5 py-0.5 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/20">CORE</span>
          </div>
        </Link>

        {/* Navigation Anchors */}
        <nav className="hidden md:flex items-center gap-6 text-[#A7B0C0]">
          <Link href="#architecture" className="hover:text-[#F3F4F6] transition-colors duration-150">
            Architecture
          </Link>
          <Link href="#security-intelligence" className="hover:text-[#F3F4F6] transition-colors duration-150">
            Security Intelligence
          </Link>
          <Link href="#multi-vendor" className="hover:text-[#F3F4F6] transition-colors duration-150">
            Multi-Vendor
          </Link>
          <Link href="#ai-boundary" className="hover:text-[#F3F4F6] transition-colors duration-150">
            AI Boundary
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/demo/multi-vendor"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] text-[#A7B0C0] hover:text-[#F3F4F6] transition-all duration-150"
          >
            <Compass className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Explore Platform</span>
          </Link>

          {!authLoading && user ? (
            <>
              {/* Primary Console CTA for Authenticated User */}
              <Link
                href="/dashboard"
                id="landing-console-cta"
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold transition-all duration-150 active:translate-y-[0.5px] shadow-sm"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Open Security Console →</span>
              </Link>

              {/* Account Dropdown */}
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  id="landing-account-menu-btn"
                  onClick={() => setIsAccountOpen(!isAccountOpen)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-[#0D121C] border border-[#1D2939] hover:border-[#3B82F6]/40 text-[#F3F4F6] font-medium transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span className="max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown className="w-3 h-3 text-[#667085]" />
                </button>

                {isAccountOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 rounded-lg bg-[#0D121C] border border-[#1D2939] shadow-2xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-[#1D2939] text-[11px] text-[#667085] truncate">
                      Signed in as <span className="text-[#F3F4F6] font-semibold">{user.email || displayName}</span>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[#A7B0C0] hover:text-[#F3F4F6] hover:bg-[#111827] transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5 text-[#3B82F6]" />
                      <span>Security Console</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[#A7B0C0] hover:text-[#F3F4F6] hover:bg-[#111827] transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#A7B0C0]" />
                      <span>Account Settings</span>
                    </Link>
                    <div className="border-t border-[#1D2939] my-1" />
                    <button
                      type="button"
                      id="landing-signout-btn"
                      onClick={() => {
                        setIsAccountOpen(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] text-[#A7B0C0] hover:text-[#F3F4F6] transition-all duration-150"
              >
                <span>Sign In</span>
              </Link>
              <Link
                href="/login?redirectTo=/dashboard"
                id="landing-console-cta"
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold transition-all duration-150 active:translate-y-[0.5px] shadow-sm"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Open Security Console →</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

