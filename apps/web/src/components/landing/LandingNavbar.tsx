"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Shield, Activity, User, LogOut, Settings, ChevronDown, Menu, X, ArrowRight } from "lucide-react";
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

  const getStartedHref = !authLoading && user ? "/console" : "/login";
  const signInHref = !authLoading && user ? "/console" : "/login";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#090B0F]/90 backdrop-blur-md border-b border-[#1E2638] font-mono text-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand Logo & Identifier */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md bg-[#0D1117] border border-[#1E2638] flex items-center justify-center text-[#93C5FD] group-hover:border-[#28354A] transition-colors duration-150">
            <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm tracking-wider text-[#F3F4F6]">NETVIGIL</span>
            <span className="text-[10px] text-[#93C5FD] font-semibold px-1.5 py-0.5 rounded bg-[#141A24] border border-[#28354A]">CORE</span>
          </div>
        </Link>

        {/* Desktop Navigation Anchors */}
        <nav className="hidden md:flex items-center gap-6 text-[#94A3B8]">
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
          {!authLoading && user ? (
            <>
              {/* Primary GET STARTED for Authenticated User */}
              <Link
                href="/console"
                id="landing-get-started-cta"
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md bg-[#141A24] hover:bg-[#1A2230] text-[#F3F4F6] hover:text-white border border-[#28354A] font-bold text-xs transition-all duration-150 active:translate-y-[0.5px] shadow-sm"
              >
                <span>Get Started →</span>
              </Link>

              {/* Account Dropdown */}
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  id="landing-account-menu-btn"
                  onClick={() => setIsAccountOpen(!isAccountOpen)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] text-[#F3F4F6] font-medium transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#93C5FD]" />
                  <span className="max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown className="w-3 h-3 text-[#64748B]" />
                </button>

                {isAccountOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 rounded-lg bg-[#0D1117] border border-[#1E2638] shadow-2xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-[#1E2638] text-[11px] text-[#64748B] truncate">
                      Signed in as <span className="text-[#F3F4F6] font-semibold">{user.email || displayName}</span>
                    </div>
                    <Link
                      href="/console"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-[#141A24] transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5 text-[#93C5FD]" />
                      <span>Security Console</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-[#141A24] transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span>Account Settings</span>
                    </Link>
                    <div className="border-t border-[#1E2638] my-1" />
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
                href={signInHref}
                id="landing-signin-btn"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#0D1117] border border-[#1E2638] hover:border-[#28354A] text-[#94A3B8] hover:text-[#F3F4F6] transition-all duration-150"
              >
                <span>Sign In</span>
              </Link>
              <Link
                href={getStartedHref}
                id="landing-get-started-cta"
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md bg-[#141A24] hover:bg-[#1A2230] text-[#F3F4F6] hover:text-white border border-[#28354A] font-bold text-xs transition-all duration-150 active:translate-y-[0.5px] shadow-sm"
              >
                <span>Get Started →</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            href={getStartedHref}
            className="inline-flex items-center h-7 px-2.5 rounded bg-[#141A24] border border-[#28354A] text-[#F3F4F6] font-bold text-[11px]"
          >
            Get Started →
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="w-8 h-8 rounded-md bg-[#0D1117] border border-[#1E2638] flex items-center justify-center text-[#94A3B8] hover:text-[#F3F4F6]"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-b border-[#1E2638] bg-[#090B0F]/95 backdrop-blur-lg px-4 py-3 space-y-2.5 animate-in slide-in-from-top duration-150">
          <nav className="flex flex-col space-y-2 text-[#94A3B8] text-xs">
            <Link
              href="#architecture"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#141A24] hover:text-[#F3F4F6]"
            >
              Architecture
            </Link>
            <Link
              href="#security-intelligence"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#141A24] hover:text-[#F3F4F6]"
            >
              Security Intelligence
            </Link>
            <Link
              href="#multi-vendor"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#141A24] hover:text-[#F3F4F6]"
            >
              Multi-Vendor
            </Link>
            <Link
              href="#ai-boundary"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-[#141A24] hover:text-[#F3F4F6]"
            >
              AI Boundary
            </Link>
          </nav>

          <div className="border-t border-[#1E2638] pt-2.5 flex flex-col gap-2">
            {!authLoading && user ? (
              <>
                <Link
                  href="/console"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 h-9 rounded-md bg-[#141A24] border border-[#28354A] text-white font-bold"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Security Console</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center justify-center gap-2 h-8 rounded-md bg-[#0D1117] border border-[#1E2638] text-[#EF4444]"
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
                  className="flex items-center justify-center h-8 rounded-md bg-[#0D1117] border border-[#1E2638] text-[#F3F4F6]"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 h-9 rounded-md bg-[#141A24] border border-[#28354A] text-white font-bold"
                >
                  <span>Get Started →</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
