"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Shield, Activity, Compass, User, LogOut, Settings, ChevronDown, Menu, X } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LandingNavbar() {
  const { user, loading: authLoading, logout } = useAuth();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

        {/* Desktop Navigation Anchors */}
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

        {/* Action Controls (Desktop) */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Link
            href="/demo/multi-vendor"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] text-[#A7B0C0] hover:text-[#F3F4F6] transition-all duration-150"
          >
            <Compass className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Explore Platform</span>
          </Link>

          {!authLoading && user ? (
            <>
              {/* Primary Console CTA for Authenticated User */}
              <Link
                href="/console"
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
                      href="/console"
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
                id="landing-signin-btn"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#0D121C] border border-[#1D2939] hover:border-[#263B55] text-[#A7B0C0] hover:text-[#F3F4F6] transition-all duration-150"
              >
                <span>Sign In</span>
              </Link>
              <Link
                href="/login?redirectTo=/console"
                id="landing-console-cta"
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold transition-all duration-150 active:translate-y-[0.5px] shadow-sm"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Open Security Console</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          {!authLoading && user ? (
            <Link
              href="/console"
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded bg-[#3B82F6] text-white font-bold text-[11px]"
            >
              <Activity className="w-3 h-3" />
              <span>Console</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center h-7 px-2.5 rounded bg-[#0D121C] border border-[#1D2939] text-[#F3F4F6] font-medium text-[11px]"
            >
              Sign In
            </Link>
          )}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="w-8 h-8 rounded-md bg-[#0D121C] border border-[#1D2939] flex items-center justify-center text-[#A7B0C0] hover:text-[#F3F4F6]"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-b border-[#1D2939] bg-[#080B12]/95 backdrop-blur-lg px-4 py-3 space-y-2.5 animate-in slide-in-from-top duration-150">
          <nav className="flex flex-col space-y-2 text-[#A7B0C0] text-xs">
            <Link
              href="#architecture"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#111827] hover:text-[#F3F4F6]"
            >
              Architecture
            </Link>
            <Link
              href="#security-intelligence"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#111827] hover:text-[#F3F4F6]"
            >
              Security Intelligence
            </Link>
            <Link
              href="#multi-vendor"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#111827] hover:text-[#F3F4F6]"
            >
              Multi-Vendor
            </Link>
            <Link
              href="#ai-boundary"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#111827] hover:text-[#F3F4F6]"
            >
              AI Boundary
            </Link>
            <Link
              href="/demo/multi-vendor"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#111827] hover:text-[#F3F4F6]"
            >
              <Compass className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Explore Platform</span>
            </Link>
          </nav>

          <div className="border-t border-[#1D2939] pt-2.5 flex flex-col gap-2">
            {!authLoading && user ? (
              <>
                <Link
                  href="/console"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 h-9 rounded-md bg-[#3B82F6] text-white font-bold"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Open Security Console</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center justify-center gap-2 h-8 rounded-md bg-[#0D121C] border border-[#1D2939] text-[#EF4444]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center h-8 rounded-md bg-[#0D121C] border border-[#1D2939] text-[#F3F4F6]"
                >
                  Sign In
                </Link>
                <Link
                  href="/login?redirectTo=/console"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 h-9 rounded-md bg-[#3B82F6] text-white font-bold"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Open Security Console</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
