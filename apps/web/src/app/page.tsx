"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  Bot,
  Sparkles,
  Terminal,
  Check,
  X,
  ChevronRight,
  Lock,
  Server,
  Layers,
  FileCode2,
  CheckCircle2,
  ShieldCheck,
  Flame,
  ArrowDown,
  RefreshCw,
  Cpu,
  KeyRound,
  Eye,
  FileText,
  Activity,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorldClassLandingPage() {
  const [activeVendorTab, setActiveVendorTab] = useState<"cisco" | "junos" | "fortios" | "sonic">("cisco");
  const [aiApprovalState, setAiApprovalState] = useState<"approved" | "pending" | "rejected">("pending");
  const [activeDialect, setActiveDialect] = useState<"cisco" | "junos" | "fortios">("cisco");

  return (
    <div className="min-h-screen bg-[#050505] text-[#D4D4D4] font-sans antialiased selection:bg-[#00D9FF]/20 selection:text-[#00D9FF]">
      
      {/* ==================================================
          1. MINIMAL PREMIUM NAVIGATION
          ================================================== */}
      <header className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-md border-b border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-md bg-[#0A0A0A] border border-[#1A1A1A] group-hover:border-[#00D9FF]/40 flex items-center justify-center text-[#00D9FF] transition-colors">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <span className="font-mono text-xs font-bold tracking-tight text-[#F5F5F5]">NETVIGIL</span>
            </Link>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#0E0E0E] text-[#8A8A8A] border border-[#1A1A1A]">
              SIH26155
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-mono text-[#8A8A8A]">
            <a href="#platform" className="hover:text-[#F5F5F5] transition-colors">Platform</a>
            <a href="#how-it-works" className="hover:text-[#F5F5F5] transition-colors">How It Works</a>
            <a href="#frameworks" className="hover:text-[#F5F5F5] transition-colors">Frameworks</a>
            <a href="#security" className="hover:text-[#F5F5F5] transition-colors">Security</a>
            <a href="#resources" className="hover:text-[#F5F5F5] transition-colors">Resources</a>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center text-[#8A8A8A] hover:text-[#F5F5F5] px-2.5 py-1 transition-colors text-[11px]"
            >
              SOC Console
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#0E0E0E] border border-[#00D9FF]/40 hover:border-[#00D9FF] hover:bg-[#141414] text-[#00D9FF] text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,217,255,0.05)]"
            >
              <span>Launch NetVigil</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ==================================================
          2. HERO (SPLIT LAYOUT WITH TECHNICAL SECURITY ENGINE)
          ================================================== */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 border-b border-[#1A1A1A] overflow-hidden">
        {/* Subtle architectural grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1414140D_1px,transparent_1px),linear-gradient(to_bottom,#1414140D_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* LEFT SIDE (45%): Editorial Headline & Technical Positioning */}
            <div className="lg:col-span-5 space-y-6">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#0A0A0A] border border-[#1A1A1A] text-[10px] font-mono text-[#00D9FF]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
                <span>AI-ASSISTED NETWORK SECURITY COMPLIANCE</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-bold tracking-tight text-[#F5F5F5] font-sans leading-[1.1]">
                Different networks. <br />
                <span className="text-[#00D9FF]">One security language.</span>
              </h1>

              {/* Supporting Text */}
              <p className="text-xs sm:text-sm text-[#8A8A8A] leading-relaxed font-sans max-w-lg">
                NetVigil translates heterogeneous network configurations into a universal security model, then evaluates them against deterministic compliance controls.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-wrap items-center gap-3 font-mono text-xs">
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[#00D9FF] hover:bg-[#00b8d9] text-[#050505] font-bold transition-all shadow-[0_0_20px_rgba(0,217,255,0.15)]"
                >
                  <span>Launch NetVigil</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded bg-[#0A0A0A] hover:bg-[#111111] text-[#F5F5F5] border border-[#1A1A1A] hover:border-[#242424] transition-all"
                >
                  <span>See How It Works</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8A8A8A]" />
                </a>
              </div>

              {/* Subtle Enterprise Hardware Strip */}
              <div className="pt-8 border-t border-[#1A1A1A] space-y-2.5 font-mono">
                <div className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold">
                  BUILT FOR MODERN ENTERPRISE NETWORKS
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#8A8A8A]">
                  <span className="hover:text-[#F5F5F5] transition-colors">Cisco IOS/IOS-XE</span>
                  <span className="text-[#333333]">•</span>
                  <span className="hover:text-[#F5F5F5] transition-colors">Juniper JunOS</span>
                  <span className="text-[#333333]">•</span>
                  <span className="hover:text-[#F5F5F5] transition-colors">Fortinet FortiOS</span>
                  <span className="text-[#333333]">•</span>
                  <span className="hover:text-[#F5F5F5] transition-colors">SONiC Linux</span>
                  <span className="text-[#333333]">•</span>
                  <span className="text-[#00D9FF]">+ More</span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE (55%): THE "NETVIGIL SECURITY ENGINE" VISUALIZATION */}
            <div className="lg:col-span-7">
              <div className="rounded-xl bg-[#0A0A0A] border border-[#242424] shadow-2xl overflow-hidden font-mono text-xs">
                {/* Engine Top Header */}
                <div className="p-3.5 bg-[#0E0E0E] border-b border-[#1A1A1A] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                    <span className="font-bold text-[#F5F5F5] tracking-wider">NETVIGIL SECURITY ENGINE</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[#8A8A8A]">
                    <span>STATUS: <strong className="text-[#22C55E]">● ONLINE</strong></span>
                    <span className="text-[#333333]">•</span>
                    <span>PIPELINE: <strong className="text-[#00D9FF]">ACTIVE</strong></span>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* 4 VENDOR CONFIGURATION INPUT SOURCES */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-[#555555] uppercase tracking-wider mb-2 font-semibold">
                      <span>Heterogeneous Configuration Ingestion</span>
                      <span className="text-[#00D9FF]">Multi-Vendor AST Parsers</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                      {/* Cisco Feed */}
                      <div className="p-2.5 rounded bg-[#050505] border border-[#1A1A1A] hover:border-[#00D9FF]/30 transition-colors space-y-1">
                        <div className="text-[10px] font-bold text-[#00D9FF] pb-1 border-b border-[#141414]">
                          CISCO IOS-XE
                        </div>
                        <div className="text-[#8A8A8A] space-y-0.5 leading-tight select-none pt-0.5">
                          <div>ip ssh version 2</div>
                          <div>aaa new-model</div>
                          <div>no ip http server</div>
                        </div>
                      </div>

                      {/* JunOS Feed */}
                      <div className="p-2.5 rounded bg-[#050505] border border-[#1A1A1A] hover:border-[#00D9FF]/30 transition-colors space-y-1">
                        <div className="text-[10px] font-bold text-[#00D9FF] pb-1 border-b border-[#141414]">
                          JUNOS
                        </div>
                        <div className="text-[#8A8A8A] space-y-0.5 leading-tight select-none pt-0.5">
                          <div>set sys services ssh</div>
                          <div>set sys login user</div>
                          <div>delete system http</div>
                        </div>
                      </div>

                      {/* FortiOS Feed */}
                      <div className="p-2.5 rounded bg-[#050505] border border-[#1A1A1A] hover:border-[#00D9FF]/30 transition-colors space-y-1">
                        <div className="text-[10px] font-bold text-[#00D9FF] pb-1 border-b border-[#141414]">
                          FORTIOS
                        </div>
                        <div className="text-[#8A8A8A] space-y-0.5 leading-tight select-none pt-0.5">
                          <div>config system admin</div>
                          <div>set ssh-v1 disable</div>
                          <div>set https-redir en</div>
                        </div>
                      </div>

                      {/* SONiC Feed */}
                      <div className="p-2.5 rounded bg-[#050505] border border-[#1A1A1A] hover:border-[#00D9FF]/30 transition-colors space-y-1">
                        <div className="text-[10px] font-bold text-[#00D9FF] pb-1 border-b border-[#141414]">
                          SONiC
                        </div>
                        <div className="text-[#8A8A8A] space-y-0.5 leading-tight select-none pt-0.5">
                          <div>&quot;SSH&quot;: &quot;enabled&quot;</div>
                          <div>&quot;HTTP&quot;: &quot;disabled&quot;</div>
                          <div>&quot;AAA&quot;: &quot;tacacs+&quot;</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* THIN CONVERGENCE CONNECTOR */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#0E0E0E] border border-[#1A1A1A] text-[9px] text-[#8A8A8A]">
                      <ArrowDown className="w-2.5 h-2.5 text-[#00D9FF]" />
                      <span>AST Normalization (Fact Extraction)</span>
                    </div>
                  </div>

                  {/* UNIVERSAL SECURITY MODEL (CORE STRUCTURE) */}
                  <div className="p-3.5 rounded-lg bg-[#050505] border border-[#00D9FF]/40 space-y-2.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#00D9FF] font-bold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>UNIVERSAL SECURITY MODEL</span>
                      </span>
                      <span className="text-[#22C55E] text-[9px] bg-[#0E0E0E] px-1.5 py-0.2 rounded border border-[#22C55E]/30 font-bold">
                        CANONICAL OBJECT
                      </span>
                    </div>

                    {/* 6 Core Schema Domains */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-[9px] text-center font-bold text-[#8A8A8A]">
                      {["ACCESS", "IDENTITY", "NETWORK", "CRYPTO", "SYSTEM", "LOGGING"].map((d) => (
                        <div key={d} className="p-1 rounded bg-[#0A0A0A] border border-[#1A1A1A]">
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Canonical Extracted Values */}
                    <div className="p-2 rounded bg-[#0A0A0A] border border-[#1A1A1A] grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <span className="text-[#555555]">remote_access.ssh_version: </span>
                        <strong className="text-[#F5F5F5]">2</strong>
                      </div>
                      <div>
                        <span className="text-[#555555]">authentication.aaa: </span>
                        <strong className="text-[#22C55E]">enabled</strong>
                      </div>
                      <div>
                        <span className="text-[#555555]">management.http: </span>
                        <strong className="text-[#EF4444]">disabled</strong>
                      </div>
                    </div>
                  </div>

                  {/* COMPLIANCE ENGINE & DETERMINISTIC OUTFLOW */}
                  <div className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A] space-y-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#F5F5F5] font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#00D9FF]" />
                        <span>COMPLIANCE ENGINE (DETERMINISTIC)</span>
                      </span>
                      <span className="text-[#00D9FF] text-[9px] font-bold">100% REPRODUCIBLE</span>
                    </div>

                    {/* 4 Framework Evaluations */}
                    <div className="grid grid-cols-4 gap-1.5 text-[9px] text-center font-bold">
                      <div className="p-1.5 rounded bg-[#0E0E0E] border border-[#22C55E]/40 text-[#22C55E]">CIS: PASS</div>
                      <div className="p-1.5 rounded bg-[#0E0E0E] border border-[#22C55E]/40 text-[#22C55E]">NIST: PASS</div>
                      <div className="p-1.5 rounded bg-[#0E0E0E] border border-[#22C55E]/40 text-[#22C55E]">STIG: PASS</div>
                      <div className="p-1.5 rounded bg-[#0E0E0E] border border-[#22C55E]/40 text-[#22C55E]">ISO: PASS</div>
                    </div>

                    {/* Outflow Pipeline: EVIDENCE -> RISK -> REMEDIATION */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[#141414] text-[10px]">
                      <div className="p-2 rounded bg-[#0A0A0A] border border-[#1A1A1A]">
                        <div className="text-[#555555] text-[9px] uppercase font-bold">EVIDENCE</div>
                        <div className="text-[#00D9FF] font-semibold mt-0.5">core-rtr-01.cfg:L42</div>
                      </div>
                      <div className="p-2 rounded bg-[#0A0A0A] border border-[#1A1A1A]">
                        <div className="text-[#555555] text-[9px] uppercase font-bold">RISK</div>
                        <div className="text-[#F59E0B] font-semibold mt-0.5">P1 (Score 68)</div>
                      </div>
                      <div className="p-2 rounded bg-[#0A0A0A] border border-[#1A1A1A]">
                        <div className="text-[#555555] text-[9px] uppercase font-bold">REMEDIATION</div>
                        <div className="text-[#22C55E] font-semibold mt-0.5">+ no service telnet</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Engine Bottom Meta */}
                <div className="p-2.5 bg-[#0E0E0E] border-t border-[#1A1A1A] flex flex-wrap items-center justify-between text-[10px] text-[#555555]">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3 h-3 text-[#00D9FF]" />
                    <span>Deterministic AST Evaluation • Line Evidence Grounded</span>
                  </div>
                  <Link href="/demo" className="text-[#00D9FF] hover:underline font-bold">
                    Run Live in Golden Demo →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          3. SECTION 2 — "THE SYNTAX CHANGES. THE SECURITY INTENT DOESN'T."
          ================================================== */}
      <section id="how-it-works" className="py-24 border-b border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-mono text-[#00D9FF] font-semibold uppercase tracking-wider">
              Universal Normalization
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5F5] font-sans">
              THE SYNTAX CHANGES. <br />
              <span className="text-[#8A8A8A]">The security intent doesn't.</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#8A8A8A] font-sans">
              Heterogeneous network vendors express identical security configurations using radically different command syntax. NetVigil extracts canonical security facts so compliance rules evaluate uniformly across all platforms.
            </p>
          </div>

          {/* Transformation Pipeline Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch font-mono text-xs">
            
            {/* LEFT: VENDOR DIALECT BLOCK (4 Cols) */}
            <div className="lg:col-span-4 p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A] text-[10px]">
                  <span className="text-[#00D9FF] font-bold">VENDOR DIALECT</span>
                  <span className="text-[#555555]">Cisco IOS-XE Block</span>
                </div>

                <div className="pt-3 text-[11px] text-[#8A8A8A] space-y-1 leading-relaxed select-none">
                  <div><span className="text-[#555555]">01 </span><span className="text-[#F5F5F5]">ip ssh version 2</span></div>
                  <div><span className="text-[#555555]">02 </span><span className="text-[#F5F5F5]">aaa new-model</span></div>
                  <div><span className="text-[#555555]">03 </span><span className="text-[#F5F5F5]">no ip http server</span></div>
                  <div><span className="text-[#555555]">04 </span><span className="text-[#F5F5F5]">line vty 0 4</span></div>
                  <div><span className="text-[#555555]">05 </span><span className="text-[#F5F5F5]">transport input ssh</span></div>
                </div>
              </div>

              <div className="text-[10px] text-[#555555] pt-2 border-t border-[#141414]">
                Source: Raw CLI Configuration Dump
              </div>
            </div>

            {/* CENTER: NORMALIZE TRANSFORMATION CONNECTOR (2 Cols) */}
            <div className="lg:col-span-2 p-4 rounded-xl bg-[#0E0E0E] border border-[#1A1A1A] flex flex-col items-center justify-center text-center space-y-2">
              <RefreshCw className="w-5 h-5 text-[#00D9FF] animate-spin" />
              <div className="text-xs text-[#F5F5F5] font-bold">NORMALIZE →</div>
              <div className="text-[9px] text-[#8A8A8A]">AST Lexical Tree Parser</div>
            </div>

            {/* RIGHT: UNIVERSAL SECURITY FACTS (3 Cols) */}
            <div className="lg:col-span-3 p-5 rounded-xl bg-[#0A0A0A] border border-[#00D9FF]/30 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A] text-[10px]">
                  <span className="text-[#00D9FF] font-bold">UNIVERSAL FACTS</span>
                  <span className="text-[#22C55E]">Type-Safe</span>
                </div>

                <div className="pt-3 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8A8A]">ssh_version</span>
                    <strong className="text-[#F5F5F5]">2</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8A8A]">aaa_enabled</span>
                    <strong className="text-[#22C55E]">true</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8A8A]">http_management</span>
                    <strong className="text-[#EF4444]">disabled</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8A8A]">remote_access</span>
                    <strong className="text-[#00D9FF]">ssh_only</strong>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-[#555555] pt-2 border-t border-[#141414]">
                Canonical Safety Allowlist Object
              </div>
            </div>

            {/* FINAL PANEL: SECURITY INTENT CAPTURED (3 Cols) */}
            <div className="lg:col-span-3 p-5 rounded-xl bg-[#0A0A0A] border border-[#22C55E]/30 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A] text-[10px]">
                  <span className="text-[#22C55E] font-bold">SECURITY INTENT</span>
                  <span className="text-[#22C55E]">Verified</span>
                </div>

                <div className="pt-3 space-y-2 text-[11px] text-[#D4D4D4] font-sans">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
                    <span>Secure Remote Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
                    <span>Strong Authentication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
                    <span>No Insecure Management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
                    <span>Controlled Access Lines</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-[#22C55E] pt-2 border-t border-[#141414] font-mono">
                100% Deterministic Verification
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          4. SECTION 3 — AI BOUNDARY & ISOLATION
          ================================================== */}
      <section id="platform" className="py-24 border-b border-[#1A1A1A] bg-[#070707]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#0A0A0A] border border-[#8B5CF6]/40 text-[10px] font-mono text-[#8B5CF6]">
              <Bot className="w-3.5 h-3.5" />
              <span>AI BOUNDARY</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F5F5] font-sans leading-tight">
              AI doesn't make the decision.
            </h2>

            <div className="text-lg sm:text-xl font-mono text-[#8A8A8A] space-y-1">
              <div><span className="text-[#8B5CF6] font-bold">AI interprets.</span></div>
              <div><span className="text-[#22C55E] font-bold">Humans approve.</span></div>
              <div><span className="text-[#00D9FF] font-bold">Rules decide.</span></div>
            </div>

            <p className="text-xs sm:text-sm text-[#8A8A8A] font-sans leading-relaxed">
              In mission-critical security environments, compliance evaluation must be mathematical and deterministic. AI is strictly confined to assisting human operators with semantic translation of unknown vendor syntax.
            </p>
          </div>

          {/* Horizontal AI HITL Process Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-xs">
            
            {/* Step 1: Unknown Command */}
            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-2.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-[#555555]">
                  <span>STEP 01</span>
                  <span className="text-[#8A8A8A]">Parser</span>
                </div>
                <div className="text-xs font-bold text-[#F5F5F5]">UNKNOWN COMMAND</div>
                <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A] text-[10px] text-[#8A8A8A]">
                  <div>vendor-x:</div>
                  <div className="text-[#F5F5F5]">secure-admin proto-v2</div>
                </div>
              </div>
              <div className="text-[9px] text-[#555555]">Unrecognized Proprietary Syntax</div>
            </div>

            {/* Step 2: AI Interpretation (Purple) */}
            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#8B5CF6]/40 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-[#8B5CF6]">
                  <span>STEP 02</span>
                  <span className="font-bold">AI ADVISORY</span>
                </div>
                <div className="text-xs font-bold text-[#8B5CF6]">AI INTERPRETATION</div>
                <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A] space-y-1 text-[10px]">
                  <div className="text-[#8A8A8A]">Candidate:</div>
                  <div className="text-[#F5F5F5] font-bold">remote_access.protocol_version</div>
                  <div className="text-[9px] text-[#8B5CF6]">confidence: 0.91</div>
                </div>
              </div>
              <div className="text-[9px] text-[#8B5CF6]">Semantic Category Mapping</div>
            </div>

            {/* Step 3: Human Validation (Interactive / Distinct) */}
            <div className="p-4 rounded-xl bg-[#0E0E0E] border border-[#22C55E]/40 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-[#22C55E]">
                  <span>STEP 03</span>
                  <span className="font-bold">MANDATORY</span>
                </div>
                <div className="text-xs font-bold text-[#22C55E]">HUMAN VALIDATION</div>
                <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A] space-y-1.5 text-[10px]">
                  <div className="text-[#8A8A8A]">Administrator Action:</div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setAiApprovalState("approved")}
                      className={cn(
                        "flex-1 py-1 rounded text-[9px] font-bold transition-all",
                        aiApprovalState === "approved"
                          ? "bg-[#22C55E] text-[#050505]"
                          : "bg-[#0E0E0E] text-[#8A8A8A] border border-[#1A1A1A] hover:text-[#22C55E]"
                      )}
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() => setAiApprovalState("rejected")}
                      className={cn(
                        "flex-1 py-1 rounded text-[9px] font-bold transition-all",
                        aiApprovalState === "rejected"
                          ? "bg-[#EF4444] text-[#050505]"
                          : "bg-[#0E0E0E] text-[#8A8A8A] border border-[#1A1A1A] hover:text-[#EF4444]"
                      )}
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-[9px] text-[#22C55E]">Zero Autonomous Rule Mutation</div>
            </div>

            {/* Step 4: Knowledge Learned */}
            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#00D9FF]/40 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-[#00D9FF]">
                  <span>STEP 04</span>
                  <span className="font-bold">LIVE MEMORY</span>
                </div>
                <div className="text-xs font-bold text-[#00D9FF]">KNOWLEDGE LEARNED</div>
                <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A] text-[10px] space-y-0.5 text-[#8A8A8A]">
                  <div>Mapping stored securely</div>
                  <div className="text-[#F5F5F5]">No redeployment needed</div>
                </div>
              </div>
              <div className="text-[9px] text-[#00D9FF]">Dynamic Knowledge Base</div>
            </div>

            {/* Step 5: Re-Analysis */}
            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-2.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-[#555555]">
                  <span>STEP 05</span>
                  <span className="text-[#22C55E]">1-Click</span>
                </div>
                <div className="text-xs font-bold text-[#F5F5F5]">RE-ANALYSIS</div>
                <div className="p-2 rounded bg-[#050505] border border-[#1A1A1A] text-[10px] space-y-0.5 text-[#8A8A8A]">
                  <div>Recognized automatically</div>
                  <div className="text-[#22C55E] font-bold">Immediate Score Lift</div>
                </div>
              </div>
              <div className="text-[9px] text-[#22C55E]">Instant Compliance Verification</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          5. SECTION 4 — FRAMEWORKS (ONE FACT. MULTIPLE FRAMEWORKS.)
          ================================================== */}
      <section id="frameworks" className="py-24 border-b border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Headline */}
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-mono text-[#00D9FF] font-semibold uppercase tracking-wider">
              Control Convergence
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5F5] font-sans">
              One security fact. <br />
              <span className="text-[#00D9FF]">Multiple frameworks.</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#8A8A8A] font-sans">
              A single extracted fact evaluates simultaneously against industry benchmarks, federal standards, defense technical guides, and international security controls.
            </p>
          </div>

          {/* Central Fact Feeding 4 Framework Evaluations */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center font-mono text-xs">
            
            {/* Left Source Normalized Fact (4 Cols) */}
            <div className="lg:col-span-4 p-6 rounded-xl bg-[#0A0A0A] border border-[#00D9FF]/40 space-y-4">
              <div className="text-[10px] text-[#00D9FF] font-bold uppercase tracking-wider">
                NORMALIZED CANONICAL FACT
              </div>

              <div className="p-4 rounded-lg bg-[#050505] border border-[#1A1A1A] space-y-2">
                <div className="text-xs text-[#555555]">Property &amp; Value:</div>
                <div className="text-sm font-bold text-[#F5F5F5]">
                  <code>ssh_version = 2</code>
                </div>
                <div className="text-[10px] text-[#22C55E]">
                  Status: Extracted &amp; Validated
                </div>
              </div>

              <p className="text-[11px] text-[#8A8A8A] font-sans leading-relaxed">
                Extracted once from heterogeneous router configurations without vendor-specific rule duplication.
              </p>
            </div>

            {/* Right 4 Framework Simultaneous Evaluations (8 Cols) */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* CIS */}
              <Link
                href="/compliance/cis"
                className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#22C55E]/40 transition-all space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F5F5F5]">CIS BENCHMARKS</span>
                  <span className="px-2 py-0.5 rounded bg-[#0E0E0E] text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-bold">
                    ✓ PASS
                  </span>
                </div>
                <div className="text-[10px] text-[#555555]">Control CIS-1.1.2: Enforce SSH Version 2 Only</div>
                <p className="text-[11px] text-[#8A8A8A] font-sans">
                  Evaluates <code>ssh_version == 2</code> directly against the canonical profile.
                </p>
              </Link>

              {/* NIST */}
              <Link
                href="/compliance/nist"
                className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#22C55E]/40 transition-all space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F5F5F5]">NIST SP 800-53</span>
                  <span className="px-2 py-0.5 rounded bg-[#0E0E0E] text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-bold">
                    ✓ PASS
                  </span>
                </div>
                <div className="text-[10px] text-[#555555]">Control AC-17(2): Encrypted Remote Access</div>
                <p className="text-[11px] text-[#8A8A8A] font-sans">
                  Verifies cryptographic confidentiality and remote management compliance.
                </p>
              </Link>

              {/* DISA STIG */}
              <Link
                href="/compliance/stig"
                className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#22C55E]/40 transition-all space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F5F5F5]">DISA STIG</span>
                  <span className="px-2 py-0.5 rounded bg-[#0E0E0E] text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-bold">
                    ✓ PASS
                  </span>
                </div>
                <div className="text-[10px] text-[#555555]">Control NET-042: Secure Management Protocols</div>
                <p className="text-[11px] text-[#8A8A8A] font-sans">
                  Defense Information Systems Agency network device perimeter baseline.
                </p>
              </Link>

              {/* ISO/IEC 27001 */}
              <Link
                href="/compliance/iso"
                className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#22C55E]/40 transition-all space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F5F5F5]">ISO/IEC 27001</span>
                  <span className="px-2 py-0.5 rounded bg-[#0E0E0E] text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-bold">
                    ✓ PASS
                  </span>
                </div>
                <div className="text-[10px] text-[#555555]">Control A.8.20: Network Security &amp; Segregation</div>
                <p className="text-[11px] text-[#8A8A8A] font-sans">
                  International standard for technical management control assurance.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          6. SECTION 5 — ADAPTIVE LEARNING
          ================================================== */}
      <section className="py-24 border-b border-[#1A1A1A] bg-[#070707]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-mono text-[#8B5CF6] font-semibold uppercase tracking-wider">
              Human-in-the-Loop Intelligence
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5F5] font-sans">
              NetVigil learns the dialect. <br />
              <span className="text-[#8B5CF6]">Not the rules.</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#8A8A8A] font-sans">
              When network manufacturers introduce proprietary or non-standard CLI parameters, NetVigil's adaptive learning pipeline extracts the syntax dialect under strict human supervision. AI never alters the compliance rulebook.
            </p>
          </div>

          {/* Stepper Flow */}
          <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { name: "UNKNOWN COMMAND", tag: "Proprietary Line", color: "text-[#8A8A8A]" },
                { name: "AI INTERPRETATION", tag: "Semantic Mapping", color: "text-[#8B5CF6]" },
                { name: "HUMAN APPROVAL", tag: "Strict Gatekeeper", color: "text-[#22C55E]" },
                { name: "KNOWLEDGE BASE", tag: "Rule Memory", color: "text-[#00D9FF]" },
                { name: "NEXT AUDIT", tag: "1-Click Evaluation", color: "text-[#22C55E]" },
              ].map((step, idx) => (
                <div
                  key={step.name}
                  className={cn(
                    "p-4 rounded-lg bg-[#050505] border flex flex-col justify-between space-y-2",
                    idx === 2 ? "border-[#22C55E]/40" : "border-[#1A1A1A]"
                  )}
                >
                  <div className="text-[10px] text-[#555555]">STAGE 0{idx + 1}</div>
                  <div className={cn("font-bold text-xs", step.color)}>{step.name}</div>
                  <div className="text-[10px] text-[#8A8A8A] font-sans">{step.tag}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          7. SECTION 6 — SECURITY PRINCIPLES & GUARANTEES
          ================================================== */}
      <section id="security" className="py-24 border-b border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="space-y-3">
            <div className="text-xs font-mono text-[#00D9FF] font-semibold uppercase tracking-wider">
              Technical Specification
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5F5] font-sans">
              BUILT FOR SECURITY. <br />
              <span className="text-[#8A8A8A]">ENGINEERED FOR TRUST.</span>
            </h2>
          </div>

          {/* 6 Technical Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
            {[
              {
                title: "DETERMINISTIC COMPLIANCE",
                desc: "Rules engine makes the decision. All evaluations execute via mathematical AST operators.",
                icon: ShieldCheck,
                tag: "100% Mathematical",
                color: "text-[#22C55E]",
              },
              {
                title: "AI ADVISORY ONLY",
                desc: "AI never overrides the rules. LLMs operate strictly in an isolated semantic assistance mode.",
                icon: Bot,
                tag: "Zero Hallucination",
                color: "text-[#8B5CF6]",
              },
              {
                title: "ZERO AUTOMATED EXECUTION",
                desc: "No live network push. Read-only static audit analysis prevents unintended network disruption.",
                icon: Lock,
                tag: "Air-Gapped Ready",
                color: "text-[#00D9FF]",
              },
              {
                title: "SENSITIVE DATA PROTECTION",
                desc: "Redaction by default. Passwords, enable secrets, and cryptographic keys are masked prior to parse.",
                icon: KeyRound,
                tag: "Pre-Parse Masking",
                color: "text-[#F5F5F5]",
              },
              {
                title: "HUMAN CONTROLLED",
                desc: "Experts remain responsible. All remediation fix diffs and learned syntax require explicit sign-off.",
                icon: Sliders,
                tag: "Mandatory Review",
                color: "text-[#F59E0B]",
              },
              {
                title: "EVIDENCE BACKED",
                desc: "Every finding is verifiable. Direct link to source configuration line numbers and syntax context.",
                icon: Terminal,
                tag: "Line-Exact Binding",
                color: "text-[#00D9FF]",
              },
            ].map((principle) => {
              const Icon = principle.icon;
              return (
                <div
                  key={principle.title}
                  className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Icon className={cn("w-4 h-4", principle.color)} />
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0E0E0E] text-[#8A8A8A] border border-[#1A1A1A]">
                        {principle.tag}
                      </span>
                    </div>
                    <div className="font-bold text-[#F5F5F5] text-xs tracking-tight">
                      {principle.title}
                    </div>
                    <p className="text-[11px] text-[#8A8A8A] font-sans leading-relaxed">
                      {principle.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================
          8. FINAL CTA
          ================================================== */}
      <section className="py-28 relative overflow-hidden">
        {/* Subtle abstract network line structure behind CTA */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <div className="w-[600px] h-[300px] border border-[#00D9FF]/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative">
          <h2 className="text-3xl sm:text-5xl font-bold text-[#F5F5F5] tracking-tight font-sans">
            Understand the configuration. <br />
            <span className="text-[#00D9FF]">Prove the decision.</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#8A8A8A] max-w-lg mx-auto font-sans leading-relaxed">
            Experience multi-vendor AST normalization, deterministic compliance verification, and human-in-the-loop adaptive learning live.
          </p>
          <div className="pt-4 flex justify-center gap-4 font-mono text-xs">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded bg-[#00D9FF] hover:bg-[#00b8d9] text-[#050505] font-bold transition-all shadow-[0_0_20px_rgba(0,217,255,0.15)]"
            >
              <span>Launch NetVigil Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ==================================================
          9. FOOTER
          ================================================== */}
      <footer id="resources" className="border-t border-[#1A1A1A] bg-[#050505] py-14 font-mono text-xs text-[#8A8A8A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-8">
          
          {/* Brand Col */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-[#F5F5F5] font-bold">
              <Shield className="w-4 h-4 text-[#00D9FF]" />
              <span>NETVIGIL</span>
            </div>
            <p className="text-[11px] text-[#555555] font-sans leading-relaxed max-w-sm">
              AI-Driven Multi-Vendor Network Security Compliance Auditor for heterogeneous enterprise networks.
            </p>
            <div className="text-[10px] text-[#555555]">
              National Technical Research Organisation (NTRO) • SIH26155
            </div>
          </div>

          {/* Product Col */}
          <div className="space-y-2.5">
            <div className="text-[10px] text-[#555555] uppercase font-bold tracking-wider">PRODUCT</div>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Platform</Link></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#engine" className="hover:text-white transition-colors">Security Engine</a></li>
              <li><Link href="/demo" className="hover:text-white transition-colors">SOC Console</Link></li>
            </ul>
          </div>

          {/* Frameworks Col */}
          <div className="space-y-2.5">
            <div className="text-[10px] text-[#555555] uppercase font-bold tracking-wider">FRAMEWORKS</div>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link href="/compliance/cis" className="hover:text-white transition-colors">CIS Benchmarks</Link></li>
              <li><Link href="/compliance/nist" className="hover:text-white transition-colors">NIST SP 800-53</Link></li>
              <li><Link href="/compliance/stig" className="hover:text-white transition-colors">DISA STIG</Link></li>
              <li><Link href="/compliance/iso" className="hover:text-white transition-colors">ISO/IEC 27001</Link></li>
            </ul>
          </div>

          {/* Resources Col */}
          <div className="space-y-2.5">
            <div className="text-[10px] text-[#555555] uppercase font-bold tracking-wider">RESOURCES</div>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link href="/audits" className="hover:text-white transition-colors">Documentation</Link></li>
              <li><a href="#engine" className="hover:text-white transition-colors">Architecture</a></li>
              <li><Link href="/reports" className="hover:text-white transition-colors">Research Paper</Link></li>
              <li><a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">OpenAPI Docs</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-10 border-t border-[#1A1A1A] flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-[#555555]">
          <div>© 2026 NetVigil Compliance Auditor. Built for NTRO (SIH26155).</div>
          <div className="flex items-center gap-4">
            <span>Air-Gapped Ready</span>
            <span>•</span>
            <span>Deterministic Rules</span>
            <span>•</span>
            <span>Human-in-the-Loop</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
