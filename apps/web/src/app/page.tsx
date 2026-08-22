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
  Play,
  Lock,
  Server,
  Layers,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Wrench,
  KeyRound,
  ShieldCheck,
  Activity,
  ArrowDown,
  RefreshCw,
  Sliders,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function EngineLandingPage() {
  const [activeVendorTab, setActiveVendorTab] = useState<"cisco" | "junos" | "fortios">("cisco");
  const [aiApprovalState, setAiApprovalState] = useState<"pending" | "approved" | "rejected">("pending");
  const [pipelinePulse, setPipelinePulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPipelinePulse((p) => !p);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#D4D4D4] font-sans antialiased selection:bg-[#00D9FF]/20 selection:text-[#00D9FF]">
      {/* 1. TOP INSTITUTIONAL NAVIGATION */}
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md bg-[#090909] border border-[#1A1A1A] group-hover:border-[#00D9FF]/40 flex items-center justify-center text-[#00D9FF] transition-colors">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-tight text-[#F5F5F5]">NETVIGIL</span>
              <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-[#0D0D0D] text-[#8A8A8A] border border-[#1A1A1A]">
                ENGINE v1.0
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-mono text-[#8A8A8A]">
            <a href="#engine" className="hover:text-[#00D9FF] transition-colors">Security Engine</a>
            <a href="#dialects" className="hover:text-[#F5F5F5] transition-colors">Multi-Vendor Dialects</a>
            <a href="#decision-layer" className="hover:text-[#F5F5F5] transition-colors">Decision Layer</a>
            <a href="#ai-principles" className="hover:text-[#8B5CF6] transition-colors">AI Boundary</a>
            <a href="#frameworks" className="hover:text-[#F5F5F5] transition-colors">Frameworks</a>
            <a href="#specifications" className="hover:text-[#F5F5F5] transition-colors">Guarantees</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center text-[#8A8A8A] hover:text-[#F5F5F5] px-2.5 py-1 transition-colors text-[11px]"
            >
              SOC Console
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#0D0D0D] border border-[#00D9FF]/40 hover:border-[#00D9FF] hover:bg-[#141414] text-[#00D9FF] text-xs font-bold transition-all"
            >
              <span>Launch NetVigil</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO: 40/60 SPLIT WITH THE "NETVIGIL SECURITY ENGINE" VISUALIZATION */}
      <section id="engine" className="relative pt-12 pb-20 md:pt-16 md:pb-28 border-b border-[#1A1A1A] overflow-hidden">
        {/* Engineering structural line background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1414140D_1px,transparent_1px),linear-gradient(to_bottom,#1414140D_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* LEFT COLUMN (40%): Problem Statement & Mission */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#090909] border border-[#1A1A1A] text-[10px] font-mono text-[#00D9FF]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
                <span>AI-ASSISTED NETWORK SECURITY COMPLIANCE</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F5F5] font-sans leading-[1.15]">
                Understand Every Configuration. <br />
                <span className="text-[#8A8A8A]">Trust Every Decision.</span>
              </h1>

              <p className="text-xs sm:text-sm text-[#8A8A8A] leading-relaxed font-sans">
                NetVigil converts heterogeneous network configurations into a unified security model, evaluates security controls deterministically, and uses human-validated AI to interpret previously unknown configuration syntax.
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
                  href="#dialects"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded bg-[#090909] hover:bg-[#111111] text-[#F5F5F5] border border-[#1A1A1A] hover:border-[#242424] transition-all"
                >
                  <span>Explore Architecture</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8A8A8A]" />
                </a>
              </div>

              {/* Pipeline Real-time Metrics Meta */}
              <div className="pt-6 border-t border-[#1A1A1A] grid grid-cols-3 gap-3 font-mono text-[10px]">
                <div className="p-2 rounded bg-[#090909] border border-[#1A1A1A]">
                  <div className="text-[#666666] uppercase">Engine Rate</div>
                  <div className="text-[#F5F5F5] font-bold text-xs mt-0.5">&lt; 1.5s AST</div>
                </div>
                <div className="p-2 rounded bg-[#090909] border border-[#1A1A1A]">
                  <div className="text-[#666666] uppercase">Rule Method</div>
                  <div className="text-[#22C55E] font-bold text-xs mt-0.5">100% Deterministic</div>
                </div>
                <div className="p-2 rounded bg-[#090909] border border-[#1A1A1A]">
                  <div className="text-[#666666] uppercase">AI Authority</div>
                  <div className="text-[#8B5CF6] font-bold text-xs mt-0.5">Advisory HITL</div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (60%): THE "NETVIGIL SECURITY ENGINE" VISUALIZATION */}
            <div className="lg:col-span-7">
              <div className="rounded-xl bg-[#090909] border border-[#242424] shadow-2xl overflow-hidden font-mono text-xs">
                {/* Engine Panel Header */}
                <div className="p-3.5 bg-[#0D0D0D] border-b border-[#1A1A1A] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                    <span className="font-bold text-[#F5F5F5] tracking-wider">NETVIGIL SECURITY ENGINE</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[#666666]">
                    <span>STATUS: <strong className="text-[#22C55E]">ONLINE</strong></span>
                    <span>•</span>
                    <span>PIPELINE: <strong className="text-[#00D9FF]">ACTIVE</strong></span>
                    <span>•</span>
                    <span className="hidden sm:inline text-[#8A8A8A]">ID: 0x8F92</span>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* STREAM 1: MULTI-VENDOR INPUT FEEDS */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-[#666666] uppercase tracking-wider mb-2">
                      <span>01. Multi-Vendor Configuration Ingestion Feeds</span>
                      <span className="text-[#00D9FF]">Live Syntax AST Extractors</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      {/* Cisco Feed */}
                      <div className="p-2.5 rounded bg-[#050505] border border-[#1A1A1A] hover:border-[#00D9FF]/40 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between pb-1 border-b border-[#141414] text-[10px]">
                          <span className="text-[#00D9FF] font-bold">CISCO IOS-XE</span>
                          <span className="text-[#666666]">Block CLI</span>
                        </div>
                        <div className="text-[10px] text-[#8A8A8A] space-y-0.5 leading-tight select-none">
                          <div><span className="text-[#555555]">01 </span>ip ssh version 2</div>
                          <div><span className="text-[#555555]">02 </span>aaa new-model</div>
                          <div><span className="text-[#555555]">03 </span>no ip http server</div>
                        </div>
                      </div>

                      {/* JunOS Feed */}
                      <div className="p-2.5 rounded bg-[#050505] border border-[#1A1A1A] hover:border-[#00D9FF]/40 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between pb-1 border-b border-[#141414] text-[10px]">
                          <span className="text-[#00D9FF] font-bold">JUNIPER JUNOS</span>
                          <span className="text-[#666666]">Hierarchical</span>
                        </div>
                        <div className="text-[10px] text-[#8A8A8A] space-y-0.5 leading-tight select-none">
                          <div><span className="text-[#555555]">01 </span>set system services ssh</div>
                          <div><span className="text-[#555555]">02 </span>set authentication-order</div>
                          <div><span className="text-[#555555]">03 </span>delete web-management</div>
                        </div>
                      </div>

                      {/* Fortinet Feed */}
                      <div className="p-2.5 rounded bg-[#050505] border border-[#1A1A1A] hover:border-[#00D9FF]/40 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between pb-1 border-b border-[#141414] text-[10px]">
                          <span className="text-[#00D9FF] font-bold">FORTINET FORTIOS</span>
                          <span className="text-[#666666]">Table Stanza</span>
                        </div>
                        <div className="text-[10px] text-[#8A8A8A] space-y-0.5 leading-tight select-none">
                          <div><span className="text-[#555555]">01 </span>set https-redirect en</div>
                          <div><span className="text-[#555555]">02 </span>set ssh-v1 disable</div>
                          <div><span className="text-[#555555]">03 </span>set idle-timeout 10</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CONVERGENCE CONNECTOR */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D0D0D] border border-[#1A1A1A] text-[10px] text-[#666666]">
                      <ArrowDown className="w-3 h-3 text-[#00D9FF]" />
                      <span>AST Normalization Layer (O(V+F) Schema Reduction)</span>
                    </div>
                  </div>

                  {/* STREAM 2: UNIVERSAL SECURITY MODEL */}
                  <div className="p-3.5 rounded-lg bg-[#050505] border border-[#00D9FF]/30 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#00D9FF] font-bold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>02. UNIVERSAL SECURITY MODEL (CANONICAL OBJECT)</span>
                      </span>
                      <span className="text-[#22C55E] text-[9px] bg-[#141414] px-1.5 py-0.2 rounded border border-[#22C55E]/30">
                        NORMALIZED & VERIFIED
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-[#090909] border border-[#1A1A1A] grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                      <div className="space-y-0.5">
                        <div className="text-[#666666]">remote_access.ssh_version:</div>
                        <div className="text-[#F5F5F5] font-bold">2 <span className="text-[#22C55E] text-[9px]">(Enforced)</span></div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[#666666]">authentication.aaa_model:</div>
                        <div className="text-[#F5F5F5] font-bold">true <span className="text-[#22C55E] text-[9px]">(Active)</span></div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[#666666]">management.http_server:</div>
                        <div className="text-[#F5F5F5] font-bold">false <span className="text-[#22C55E] text-[9px]">(Disabled)</span></div>
                      </div>
                    </div>
                  </div>

                  {/* DUAL SPLIT: DETERMINISTIC ENGINE vs AI BRANCH */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    
                    {/* LEFT SUB-PANEL: DETERMINISTIC COMPLIANCE & EVIDENCE (CYAN) */}
                    <div className="p-3.5 rounded-lg bg-[#050505] border border-[#1A1A1A] space-y-3">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#F5F5F5] font-bold flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#00D9FF]" />
                          <span>03. DETERMINISTIC ENGINE</span>
                        </span>
                        <span className="text-[#00D9FF] text-[9px]">RULES DECIDE</span>
                      </div>

                      {/* Framework Control Badges */}
                      <div className="grid grid-cols-4 gap-1 text-[9px] text-center font-bold">
                        <div className="p-1 rounded bg-[#0D0D0D] border border-[#22C55E]/40 text-[#22C55E]">CIS: PASS</div>
                        <div className="p-1 rounded bg-[#0D0D0D] border border-[#22C55E]/40 text-[#22C55E]">NIST: PASS</div>
                        <div className="p-1 rounded bg-[#0D0D0D] border border-[#22C55E]/40 text-[#22C55E]">STIG: PASS</div>
                        <div className="p-1 rounded bg-[#0D0D0D] border border-[#EF4444]/40 text-[#EF4444]">ISO: FAIL</div>
                      </div>

                      {/* Outflow stages */}
                      <div className="p-2 rounded bg-[#090909] border border-[#1A1A1A] space-y-1 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[#666666]">Evidence Citation:</span>
                          <span className="text-[#00D9FF]">core-rtr-01.cfg:L42</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#666666]">Risk Score:</span>
                          <span className="text-[#F59E0B] font-bold">P1 (Score 68)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#666666]">Remediation Diff:</span>
                          <span className="text-[#22C55E]">+ no service telnet</span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT SUB-PANEL: AI UNKNOWN DIRECTIVE & HITL (PURPLE) */}
                    <div className="p-3.5 rounded-lg bg-[#050505] border border-[#8B5CF6]/30 space-y-3">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#8B5CF6] font-bold flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5" />
                          <span>04. UNKNOWN SYNTAX INFERENCE</span>
                        </span>
                        <span className="text-[#8B5CF6] text-[9px]">AI ADVISORY</span>
                      </div>

                      {/* Unknown input */}
                      <div className="p-2 rounded bg-[#090909] border border-[#1A1A1A] space-y-1 text-[10px]">
                        <div className="text-[#666666]">Unknown Directive:</div>
                        <div className="text-[#D4D4D4] font-semibold">vendor-x: secure-admin proto-v2</div>
                        <div className="text-[9px] text-[#8B5CF6] pt-0.5">
                          AI Inferred: <code>remote_access.protocol_version = 2</code>
                        </div>
                      </div>

                      {/* Interactive Human Approval Demo Toggle */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#1A1A1A] text-[10px]">
                        <span className="text-[#666666]">Human Sign-Off:</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setAiApprovalState("approved")}
                            className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-bold transition-colors",
                              aiApprovalState === "approved"
                                ? "bg-[#22C55E] text-[#050505]"
                                : "bg-[#0D0D0D] text-[#8A8A8A] border border-[#1A1A1A] hover:text-[#22C55E]"
                            )}
                          >
                            APPROVE
                          </button>
                          <button
                            onClick={() => setAiApprovalState("rejected")}
                            className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-bold transition-colors",
                              aiApprovalState === "rejected"
                                ? "bg-[#EF4444] text-[#050505]"
                                : "bg-[#0D0D0D] text-[#8A8A8A] border border-[#1A1A1A] hover:text-[#EF4444]"
                            )}
                          >
                            REJECT
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Engine Footer Bar */}
                <div className="p-2.5 bg-[#0D0D0D] border-t border-[#1A1A1A] flex flex-wrap items-center justify-between text-[10px] text-[#666666]">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3 h-3 text-[#00D9FF]" />
                    <span>Deterministic AST Rule Evaluator • Safety Allowlist Protected</span>
                  </div>
                  <div className="text-[#00D9FF] hover:underline">
                    <Link href="/demo">Test Live in Golden Demo →</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION 2 — "DIFFERENT DIALECTS. ONE SECURITY MODEL." */}
      <section id="dialects" className="py-20 border-b border-[#1A1A1A] bg-[#070707]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-2">
            <div className="text-xs font-mono text-[#00D9FF] font-semibold uppercase tracking-wider">
              Architecture Innovation
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              Different Dialects. One Security Model.
            </h2>
            <p className="text-xs sm:text-sm text-[#8A8A8A]">
              Traditional auditors require O(Vendors × Frameworks) separate script rules. NetVigil AST parsers normalize multi-vendor dialects into a single canonical model, enabling O(Vendors + Frameworks) scalability.
            </p>
          </div>

          {/* Three Vendor Dialects to Canonical Model Interactive Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch font-mono text-xs">
            {/* 3 Source Dialects */}
            <div className="lg:col-span-5 space-y-2">
              <div className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                Heterogeneous Input Dialects
              </div>

              {/* Cisco */}
              <div className="p-3 rounded-lg bg-[#090909] border border-[#1A1A1A] space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[#00D9FF]">
                  <span className="font-bold">Cisco IOS-XE Syntax</span>
                  <span className="text-[#666666]">CLI Command</span>
                </div>
                <div className="text-[11px] text-[#F5F5F5]"><code>line vty 0 4; transport input ssh</code></div>
              </div>

              {/* Juniper */}
              <div className="p-3 rounded-lg bg-[#090909] border border-[#1A1A1A] space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[#00D9FF]">
                  <span className="font-bold">Juniper JunOS Syntax</span>
                  <span className="text-[#666666]">Set Directive</span>
                </div>
                <div className="text-[11px] text-[#F5F5F5]"><code>set system services ssh protocol-version v2</code></div>
              </div>

              {/* Fortinet */}
              <div className="p-3 rounded-lg bg-[#090909] border border-[#1A1A1A] space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[#00D9FF]">
                  <span className="font-bold">Fortinet FortiOS Syntax</span>
                  <span className="text-[#666666]">Config Table</span>
                </div>
                <div className="text-[11px] text-[#F5F5F5]"><code>config system global; set ssh-v1 disable</code></div>
              </div>
            </div>

            {/* Transform Convergence Node */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center p-4 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] text-center space-y-2">
              <RefreshCw className="w-5 h-5 text-[#00D9FF] animate-spin" />
              <div className="text-[11px] text-[#F5F5F5] font-bold">AST PARSER NORMALIZATION</div>
              <div className="text-[9px] text-[#666666]">100% Line Evidence Preserved</div>
            </div>

            {/* Canonical Model & Single Rule Result */}
            <div className="lg:col-span-5 space-y-2">
              <div className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                Universal Model $\rightarrow$ 1 Rule Across All Vendors
              </div>

              <div className="p-4 rounded-lg bg-[#090909] border border-[#00D9FF]/30 space-y-3">
                <div className="text-[10px] text-[#00D9FF] font-bold">
                  CANONICAL SECURITY MODEL (FACT)
                </div>
                <div className="p-2.5 rounded bg-[#050505] border border-[#1A1A1A] text-[#F5F5F5] text-[11px]">
                  <code>profile.remote_access.ssh_v2_only == true</code>
                </div>

                <div className="text-[10px] text-[#22C55E] font-bold pt-1 border-t border-[#1A1A1A]">
                  ONE DETERMINISTIC RULE EVALUATES ALL 3 VENDORS
                </div>
                <div className="text-[11px] text-[#8A8A8A] font-sans leading-relaxed">
                  Controls such as <strong>CIS 1.1.2</strong>, <strong>NIST AC-17</strong>, and <strong>DISA STIG NET-042</strong> execute once against the Universal Model without vendor-specific branching.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION 3 — "THE DECISION LAYER" (HORIZONTAL PIPELINE) */}
      <section id="decision-layer" className="py-20 border-b border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#00D9FF] font-semibold uppercase tracking-wider">
              Execution Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              The Six-Stage Decision Layer
            </h2>
            <p className="text-xs sm:text-sm text-[#8A8A8A]">
              Deterministic sequence from raw configuration ingestion to risk prioritization and safe remediation diff generation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 font-mono text-xs">
            {[
              {
                stage: "01. PARSE",
                subtitle: "AST Tokenizer",
                icon: FileCode2,
                detail: "Cisco, JunOS, FortiOS hierarchical block token trees.",
                tag: "Zero Data Loss",
              },
              {
                stage: "02. NORMALIZE",
                subtitle: "Universal Schema",
                icon: Layers,
                detail: "Map raw vendor lines into canonical security facts.",
                tag: "Type-Safe",
              },
              {
                stage: "03. EVALUATE",
                subtitle: "Deterministic Rules",
                icon: ShieldCheck,
                detail: "Mathematical AST rule evaluation (PASS / FAIL / UNKNOWN).",
                tag: "Zero Hallucination",
              },
              {
                stage: "04. EVIDENCE",
                subtitle: "Line-Exact Binding",
                icon: Terminal,
                detail: "Bind exact CLI snippet and file line index to finding.",
                tag: "Verifiable",
              },
              {
                stage: "05. PRIORITIZE",
                subtitle: "Composite Risk",
                icon: Flame,
                detail: "Score attack chain exposure and rank findings into P0–P3.",
                tag: "Reproducible",
              },
              {
                stage: "06. REMEDIATE",
                subtitle: "Safe CLI Diffs",
                icon: Wrench,
                detail: "Generate vendor syntax fix scripts and before/after diffs.",
                tag: "HITL Verified",
              },
            ].map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.stage}
                  className="p-4 rounded-xl bg-[#090909] border border-[#1A1A1A] hover:border-[#242424] transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#666666] font-bold">{st.stage}</span>
                      <Icon className="w-3.5 h-3.5 text-[#00D9FF]" />
                    </div>
                    <div className="text-[#F5F5F5] font-bold text-xs group-hover:text-[#00D9FF] transition-colors">
                      {st.subtitle}
                    </div>
                    <p className="text-[11px] text-[#8A8A8A] font-sans leading-relaxed">
                      {st.detail}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#141414] text-[9px] text-[#00D9FF]">
                    {st.tag}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. SECTION 4 — AI PRINCIPLE: STRICT ISOLATION & HITL */}
      <section id="ai-principles" className="py-20 border-b border-[#1A1A1A] bg-[#070707]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#090909] border border-[#8B5CF6]/40 text-[10px] font-mono text-[#8B5CF6]">
              <Bot className="w-3.5 h-3.5" />
              <span>AI GOVERNANCE & SAFETY BOUNDARY</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-[#F5F5F5] tracking-tight font-sans">
              "AI interprets. <br />
              <span className="text-[#00D9FF]">Rules decide.</span> <br />
              <span className="text-[#22C55E]">Humans control."</span>
            </h2>

            <p className="text-xs sm:text-sm text-[#8A8A8A] font-sans leading-relaxed">
              NetVigil maintains an impermeable barrier between probabilistic AI models and deterministic compliance decisions. AI is restricted to semantic syntax classification and explanation.
            </p>
          </div>

          {/* 6-Step HITL Learning Flow Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-xs">
            {[
              {
                step: "01",
                label: "UNKNOWN SYNTAX",
                desc: "Unrecognized CLI detected by parser.",
                color: "text-[#8A8A8A]",
                badge: "Parser AST",
              },
              {
                step: "02",
                label: "AI CANDIDATE",
                desc: "Proposes property mapping & intent.",
                color: "text-[#8B5CF6]",
                badge: "LLM Classifier",
              },
              {
                step: "03",
                label: "ALLOWLIST GUARD",
                desc: "Validates candidate against schema.",
                color: "text-[#00D9FF]",
                badge: "Safety Gate",
              },
              {
                step: "04",
                label: "HUMAN APPROVAL",
                desc: "Administrator reviews & approves.",
                color: "text-[#22C55E]",
                badge: "Mandatory Sign-off",
              },
              {
                step: "05",
                label: "KNOWLEDGE BASE",
                desc: "Stored in memory without recompile.",
                color: "text-[#00D9FF]",
                badge: "Live Memory",
              },
              {
                step: "06",
                label: "RE-AUDIT",
                desc: "Instant compliance score improvement.",
                color: "text-[#22C55E]",
                badge: "1-Click Lift",
              },
            ].map((flow) => (
              <div
                key={flow.step}
                className="p-3.5 rounded-lg bg-[#090909] border border-[#1A1A1A] hover:border-[#242424] flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between text-[10px] text-[#666666]">
                  <span>{flow.step}</span>
                  <span className="text-[9px] px-1 rounded bg-[#050505] text-[#8A8A8A] border border-[#1A1A1A]">
                    {flow.badge}
                  </span>
                </div>
                <div>
                  <div className={cn("font-bold text-xs", flow.color)}>{flow.label}</div>
                  <p className="text-[10px] text-[#8A8A8A] font-sans mt-1 leading-normal">{flow.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. SECTION 5 — FRAMEWORK COVERAGE */}
      <section id="frameworks" className="py-20 border-b border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#00D9FF] font-semibold uppercase tracking-wider">
              Compliance Baselines
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              Deterministic Framework Coverage
            </h2>
            <p className="text-xs sm:text-sm text-[#8A8A8A]">
              Controls mapped directly to official hardening guidelines and evaluated via mathematical AST expressions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            {[
              {
                name: "CIS BENCHMARKS",
                sub: "Center for Internet Security",
                rules: "L1 / L2 Router & Firewall Baselines",
                href: "/compliance/cis",
                code: "CIS-1.1.1 to 3.2.4",
              },
              {
                name: "NIST SP 800-53",
                sub: "Rev 5 Federal Security",
                rules: "AC (Access), AU (Audit), CM (Config)",
                href: "/compliance/nist",
                code: "AC-17, AU-6, CM-7, SC-8",
              },
              {
                name: "DISA STIG",
                sub: "DoD Hardening Standard",
                rules: "Defense Information Systems Agency",
                href: "/compliance/stig",
                code: "NET-042, NET-088, NET-160",
              },
              {
                name: "ISO/IEC 27001",
                sub: "ISMS Controls",
                rules: "Annex A.8 Technical Network Controls",
                href: "/compliance/iso",
                code: "A.8.20, A.8.21, A.8.22",
              },
            ].map((fw) => (
              <Link
                key={fw.name}
                href={fw.href}
                className="p-5 rounded-xl bg-[#090909] border border-[#1A1A1A] hover:border-[#00D9FF]/40 transition-all space-y-3 flex flex-col justify-between group"
              >
                <div className="space-y-1">
                  <div className="text-[10px] text-[#666666]">{fw.sub}</div>
                  <div className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#00D9FF] transition-colors">
                    {fw.name}
                  </div>
                  <p className="text-[11px] text-[#8A8A8A] font-sans mt-2">{fw.rules}</p>
                </div>
                <div className="pt-3 border-t border-[#141414] flex items-center justify-between text-[10px] text-[#666666]">
                  <span>{fw.code}</span>
                  <ArrowRight className="w-3 h-3 text-[#00D9FF] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. SECTION 6 — SECURITY GUARANTEES SPECIFICATION */}
      <section id="specifications" className="py-20 border-b border-[#1A1A1A] bg-[#070707]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#00D9FF] font-semibold uppercase tracking-wider">
              Technical Specification
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              Platform Engineering Guarantees
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
            {[
              { label: "COMPLIANCE", val: "DETERMINISTIC", desc: "100% mathematical AST rules", color: "text-[#22C55E]" },
              { label: "AI ROLE", val: "ADVISORY ONLY", desc: "Zero pass/fail authority", color: "text-[#8B5CF6]" },
              { label: "REMEDIATION", val: "ZERO AUTO-EXEC", desc: "Read-only static analysis", color: "text-[#00D9FF]" },
              { label: "DATA PRIVACY", val: "REDACTED", desc: "Secrets masked before parse", color: "text-[#F5F5F5]" },
              { label: "LEARNING", val: "HUMAN VALIDATED", desc: "Admin sign-off required", color: "text-[#F59E0B]" },
              { label: "AUDIT TRAIL", val: "EVIDENCE BACKED", desc: "Line-exact source citations", color: "text-[#00D9FF]" },
            ].map((spec) => (
              <div
                key={spec.label}
                className="p-4 rounded-xl bg-[#090909] border border-[#1A1A1A] space-y-1.5"
              >
                <div className="text-[10px] text-[#666666] uppercase">{spec.label}</div>
                <div className={cn("text-xs font-bold", spec.color)}>{spec.val}</div>
                <div className="text-[10px] text-[#8A8A8A] font-sans">{spec.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F5F5F5] tracking-tight font-sans">
            See the Security Engine in Action.
          </h2>
          <p className="text-xs sm:text-sm text-[#8A8A8A] max-w-xl mx-auto font-sans leading-relaxed">
            Experience multi-vendor AST normalization, deterministic compliance scoring, and human-in-the-loop adaptive learning with our live interactive presenter suite.
          </p>
          <div className="pt-4 flex justify-center gap-4 font-mono text-xs">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-[#00D9FF] hover:bg-[#00b8d9] text-[#050505] font-bold transition-all shadow-[0_0_20px_rgba(0,217,255,0.15)]"
            >
              <span>Launch NetVigil</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#engine"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#090909] hover:bg-[#111111] text-[#F5F5F5] border border-[#1A1A1A] hover:border-[#242424] transition-all"
            >
              <span>View Architecture</span>
              <ChevronRight className="w-4 h-4 text-[#8A8A8A]" />
            </a>
          </div>
        </div>
      </section>

      {/* 9. INSTITUTIONAL FOOTER */}
      <footer className="border-t border-[#1A1A1A] bg-[#050505] py-12 font-mono text-xs text-[#8A8A8A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#F5F5F5] font-bold">
              <Shield className="w-4 h-4 text-[#00D9FF]" />
              <span>NETVIGIL AUDITOR</span>
            </div>
            <p className="text-[11px] text-[#666666] font-sans leading-relaxed">
              National Technical Research Organisation (NTRO) • Smart India Hackathon Problem Statement SIH26155.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">Engine Workspaces</div>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link href="/dashboard" className="hover:text-white transition-colors">SOC Dashboard</Link></li>
              <li><Link href="/demo" className="hover:text-white transition-colors">Presenter Golden Demo</Link></li>
              <li><Link href="/audits" className="hover:text-white transition-colors">Audit Workspace</Link></li>
              <li><Link href="/configurations" className="hover:text-white transition-colors">Configuration Ingest</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">Intelligence</div>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link href="/risk" className="hover:text-white transition-colors">Risk Intelligence</Link></li>
              <li><Link href="/remediation" className="hover:text-white transition-colors">Remediation Center</Link></li>
              <li><Link href="/adaptive-training" className="hover:text-white transition-colors">Adaptive Training</Link></li>
              <li><Link href="/ai-assistant" className="hover:text-white transition-colors">AI Security Co-Pilot</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">Engine Status</div>
            <div className="p-3 rounded-lg bg-[#090909] border border-[#1A1A1A] space-y-1 text-[10px]">
              <div className="flex items-center justify-between">
                <span>Release</span>
                <span className="text-[#F5F5F5]">v1.0.0-SIH2026-RC1</span>
              </div>
              <div className="flex items-center justify-between">
                <span>AST Parsers</span>
                <span className="text-[#00D9FF]">Cisco / Jun / Forti</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rule Engine</span>
                <span className="text-[#22C55E]">Deterministic AST</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-[#1A1A1A] flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-[#666666]">
          <div>© 2026 NetVigil Compliance Auditor. NTRO • SIH26155.</div>
          <div className="flex items-center gap-4">
            <span>Air-Gapped Ready</span>
            <span>Zero Hallucination</span>
            <span>Human-in-the-Loop</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
