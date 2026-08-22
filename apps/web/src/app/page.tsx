"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  Sparkles,
  Bot,
  Terminal,
  Cpu,
  Layers,
  Lock,
  Eye,
  CheckCircle2,
  FileCode2,
  ShieldCheck,
  Server,
  Wrench,
  Flame,
  FileText,
  Activity,
  ChevronRight,
  ShieldAlert,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#D4D4D4] font-sans antialiased selection:bg-[#00D9FF]/20 selection:text-[#00D9FF]">
      {/* 1. TOP INSTITUTIONAL NAVIGATION */}
      <header className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-md border-b border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] group-hover:border-[#00D9FF]/40 flex items-center justify-center text-[#00D9FF] transition-colors">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-tight text-[#F5F5F5]">NETVIGIL</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#0E0E0E] text-[#8A8A8A] border border-[#1A1A1A]">
                SIH26155
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#8A8A8A]">
            <a href="#platform" className="hover:text-[#F5F5F5] transition-colors">Platform</a>
            <a href="#how-it-works" className="hover:text-[#F5F5F5] transition-colors">How It Works</a>
            <a href="#frameworks" className="hover:text-[#F5F5F5] transition-colors">Frameworks</a>
            <a href="#security" className="hover:text-[#F5F5F5] transition-colors">Security</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center text-xs font-mono text-[#8A8A8A] hover:text-[#F5F5F5] px-3 py-1.5 transition-colors"
            >
              SOC Overview
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0E0E0E] border border-[#00D9FF]/40 hover:border-[#00D9FF] hover:bg-[#141414] text-[#00D9FF] text-xs font-mono font-semibold transition-all shadow-[0_0_15px_rgba(0,217,255,0.05)]"
            >
              <span>Launch Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 border-b border-[#1A1A1A] overflow-hidden">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1A1A1A0A_1px,transparent_1px),linear-gradient(to_bottom,#1A1A1A0A_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl space-y-6">
            {/* Mission Identifier Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0A0A0A] border border-[#1A1A1A] text-xs font-mono text-[#8A8A8A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
              <span>National Technical Research Organisation (NTRO) • SIH26155</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#F5F5F5] font-sans leading-[1.1]">
              Understand Every Configuration. <br />
              <span className="text-[#8A8A8A]">Trust Every Decision.</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-sm sm:text-base text-[#8A8A8A] leading-relaxed max-w-2xl font-sans">
              NetVigil transforms heterogeneous network configurations into a unified security model, evaluates them deterministically against security frameworks, and uses AI-assisted intelligence to interpret previously unknown configuration syntax.
            </p>

            {/* Hero CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-4 font-mono text-xs">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#00D9FF] hover:bg-[#00b8d9] text-[#050505] font-bold transition-all"
              >
                <span>Launch NetVigil</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0A0A0A] hover:bg-[#111111] text-[#F5F5F5] border border-[#1A1A1A] hover:border-[#242424] transition-all"
              >
                <span>Explore Architecture</span>
                <ChevronRight className="w-4 h-4 text-[#8A8A8A]" />
              </a>
            </div>

            {/* Supported Vendor Families Strip */}
            <div className="pt-8 border-t border-[#1A1A1A] space-y-3 font-mono">
              <div className="text-[10px] text-[#666666] uppercase tracking-wider font-semibold">
                Supported Vendor Architecture Dialects
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { name: "Cisco", detail: "IOS / IOS-XE Block CLI" },
                  { name: "Juniper", detail: "JunOS Hierarchical & Set" },
                  { name: "Fortinet", detail: "FortiOS Config Tables" },
                  { name: "Multi-Vendor", detail: "Universal AST Schema" },
                ].map((vendor) => (
                  <div
                    key={vendor.name}
                    className="p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col justify-between"
                  >
                    <div className="text-[#F5F5F5] font-bold">{vendor.name}</div>
                    <div className="text-[10px] text-[#666666] mt-0.5">{vendor.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TECHNICAL PIPELINE VISUALIZATION */}
      <section id="how-it-works" className="py-20 border-b border-[#1A1A1A] bg-[#070707]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#00D9FF] font-semibold uppercase tracking-wider">
              System Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              Deterministic Security Processing Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-[#8A8A8A] max-w-2xl">
              From raw heterogeneous router/switch CLI dumps to line-level evidence extraction, risk prioritization, and safe CLI remediation scripts.
            </p>
          </div>

          {/* Pipeline Stage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
            {[
              {
                step: "01",
                name: "RAW CONFIGURATION",
                desc: "Ingestion of raw CLI text across heterogeneous routers and firewalls.",
                tag: "Cisco / JunOS / FortiOS",
              },
              {
                step: "02",
                name: "VENDOR DETECTION",
                desc: "Multi-factor heuristic fingerprinting identifies vendor, OS, and syntax style.",
                tag: "Regex Fingerprinting",
              },
              {
                step: "03",
                name: "AST PARSER",
                desc: "Hierarchical block AST tokens parsed with precise source line indices preserved.",
                tag: "Line-Exact Mapping",
              },
              {
                step: "04",
                name: "UNIVERSAL MODEL",
                desc: "Facts normalized into canonical Universal Security Model schema properties.",
                tag: "Canonical Safety Allowlist",
              },
              {
                step: "05",
                name: "DETERMINISTIC COMPLIANCE",
                desc: "Mathematical AST rule evaluation across CIS, NIST, STIG, and ISO/IEC 27001.",
                tag: "Zero Hallucination Rules",
              },
              {
                step: "06",
                name: "EVIDENCE EXTRACTION",
                desc: "Exact CLI configuration snippet and line number citation bound to each finding.",
                tag: "Verifiable Evidence",
              },
              {
                step: "07",
                name: "RISK PRIORITIZATION",
                desc: "Composite risk graph scores exposure severity and groups findings into P0–P3.",
                tag: "Deterministic Scoring",
              },
              {
                step: "08",
                name: "REMEDIATION & DIFF",
                desc: "Vendor-tailored syntax fix generation with before/after visual configuration diffs.",
                tag: "Safe CLI Scripts",
              },
            ].map((node) => (
              <div
                key={node.step}
                className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#242424] transition-colors flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#666666] font-bold">{node.step}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0E0E0E] text-[#00D9FF] border border-[#1A1A1A]">
                    {node.tag}
                  </span>
                </div>
                <div>
                  <div className="text-[#F5F5F5] font-bold tracking-tight group-hover:text-[#00D9FF] transition-colors">
                    {node.name}
                  </div>
                  <p className="text-[11px] text-[#8A8A8A] font-sans mt-1.5 leading-relaxed">
                    {node.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. AI DIFFERENTIATOR SECTION */}
      <section id="platform" className="py-20 border-b border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <div className="text-xs font-mono text-[#8B5CF6] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="w-4 h-4" />
                <span>AI Isolation & Human Authority</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-[#F5F5F5] tracking-tight leading-tight">
                AI doesn't decide compliance.
              </h2>
              <p className="text-xs sm:text-sm text-[#8A8A8A] font-sans leading-relaxed">
                In national-security and enterprise network operations, compliance decisions cannot rely on black-box probabilistic models. NetVigil strictly separates deterministic AST rule engines from AI assistance.
              </p>

              {/* Core Dictum Block */}
              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#8B5CF6]/30 font-mono text-xs space-y-2">
                <div className="text-[#8B5CF6] font-bold text-[11px] uppercase tracking-wider">
                  Operational Dictum
                </div>
                <div className="text-base font-bold text-[#F5F5F5] tracking-tight space-y-1">
                  <div>AI INTERPRETS.</div>
                  <div className="text-[#00D9FF]">RULES DECIDE.</div>
                  <div className="text-[#22C55E]">HUMANS CONTROL.</div>
                </div>
              </div>
            </div>

            {/* Adaptive Training Workflow Box */}
            <div className="lg:col-span-7 p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-5 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]">
                <span className="text-[#F5F5F5] font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
                  <span>Adaptive Training Knowledge Lifecycle</span>
                </span>
                <span className="text-[10px] text-[#666666]">Human-in-the-Loop</span>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    stage: "1. UNKNOWN SYNTAX",
                    actor: "Parser",
                    color: "text-[#8A8A8A]",
                    desc: "An unrecognized proprietary CLI command is detected during ingestion.",
                  },
                  {
                    stage: "2. AI INTERPRETATION",
                    actor: "Security Co-Pilot",
                    color: "text-[#8B5CF6]",
                    desc: "AI classifies semantic intent and proposes candidate security property mapping.",
                  },
                  {
                    stage: "3. PROPERTY VALIDATION",
                    actor: "Safety Allowlist",
                    color: "text-[#00D9FF]",
                    desc: "Candidate property is verified against strict, closed schema definitions.",
                  },
                  {
                    stage: "4. HUMAN APPROVAL",
                    actor: "Network Administrator",
                    color: "text-[#22C55E]",
                    desc: "Administrator reviews, edits if necessary, and explicitly approves the mapping.",
                  },
                  {
                    stage: "5. KNOWLEDGE MAPPING",
                    actor: "Persistent Engine",
                    color: "text-[#00D9FF]",
                    desc: "Approved mapping is stored into live rule knowledge without backend redeployment.",
                  },
                  {
                    stage: "6. RE-ANALYSIS",
                    actor: "Deterministic Engine",
                    color: "text-[#22C55E]",
                    desc: "1-Click instant re-evaluation updates compliance posture and resolves findings.",
                  },
                ].map((item, idx) => (
                  <div
                    key={item.stage}
                    className="p-3 rounded-lg bg-[#0E0E0E] border border-[#1A1A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className={cn("font-bold text-xs", item.color)}>{item.stage}</div>
                      <div className="text-[11px] text-[#8A8A8A] font-sans">{item.desc}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#141414] text-[#8A8A8A] border border-[#1A1A1A] self-start sm:self-auto">
                      {item.actor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CORE CAPABILITIES */}
      <section className="py-20 border-b border-[#1A1A1A] bg-[#070707]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#00D9FF] font-semibold uppercase tracking-wider">
              Core Capabilities
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              Enterprise Compliance Engine
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
            {/* Capability 1 */}
            <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#242424] transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#0E0E0E] border border-[#00D9FF]/30 flex items-center justify-center text-[#00D9FF]">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#F5F5F5] tracking-tight">
                  MULTI-VENDOR INTELLIGENCE
                </h3>
                <p className="text-xs text-[#8A8A8A] font-sans leading-relaxed">
                  Normalize heterogeneous vendor dialects (Cisco IOS block structures, Juniper JunOS hierarchical sets, Fortinet FortiOS config tables) into a unified canonical security model.
                </p>
              </div>
              <div className="pt-3 border-t border-[#1A1A1A] text-[11px] text-[#00D9FF]">
                AST-Driven Normalization →
              </div>
            </div>

            {/* Capability 2 */}
            <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#242424] transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#0E0E0E] border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#F5F5F5] tracking-tight">
                  DETERMINISTIC COMPLIANCE
                </h3>
                <p className="text-xs text-[#8A8A8A] font-sans leading-relaxed">
                  Evaluate network configurations against CIS Benchmarks, NIST SP 800-53, DISA STIG, and ISO/IEC 27001 using exact mathematical logic with 100% reproducible scoring.
                </p>
              </div>
              <div className="pt-3 border-t border-[#1A1A1A] text-[11px] text-[#22C55E]">
                Zero Hallucination Rules →
              </div>
            </div>

            {/* Capability 3 */}
            <div className="p-6 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#242424] transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#0E0E0E] border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#F5F5F5] tracking-tight">
                  ADAPTIVE INTELLIGENCE
                </h3>
                <p className="text-xs text-[#8A8A8A] font-sans leading-relaxed">
                  Handle new or unknown configuration syntax through secure AI semantic interpretation, allowlist boundary validation, and mandatory administrator sign-off.
                </p>
              </div>
              <div className="pt-3 border-t border-[#1A1A1A] text-[11px] text-[#8B5CF6]">
                Human-in-the-Loop Learning →
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECURITY PRINCIPLES */}
      <section id="security" className="py-20 border-b border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#00D9FF] font-semibold uppercase tracking-wider">
              Institutional Safeguards
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              Engineering Security Principles
            </h2>
            <p className="text-xs sm:text-sm text-[#8A8A8A]">
              Rigorous architectural constraints designed for national-security and mission-critical network environments.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
            {[
              {
                title: "Deterministic Compliance",
                desc: "All pass/fail decisions and scoring formulas are 100% mathematical AST rules with zero stochastic variation.",
                icon: ShieldCheck,
              },
              {
                title: "Zero Automated Live Execution",
                desc: "NetVigil operates as a read-only auditor. It never pushes unverified commands directly to production hardware.",
                icon: Lock,
              },
              {
                title: "Human-in-the-Loop Remediation",
                desc: "All remediation CLI scripts and rollback steps require explicit administrator review and verification before manual deployment.",
                icon: Wrench,
              },
              {
                title: "Sensitive-Data Redaction",
                desc: "Passwords, enable secrets, and cryptographic hashes are automatically masked prior to normalization or AI inspection.",
                icon: KeyRound,
              },
              {
                title: "Evidence-Level Findings",
                desc: "Every finding links directly to the exact file line number and full raw configuration context snippet.",
                icon: FileCode2,
              },
              {
                title: "AI Isolation & Sandboxing",
                desc: "AI components operate solely in an advisory capacity for natural-language Q&A and semantic unknown syntax suggestions.",
                icon: Bot,
              },
            ].map((principle) => {
              const Icon = principle.icon;
              return (
                <div
                  key={principle.title}
                  className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-2.5 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 text-[#F5F5F5] font-bold">
                    <Icon className="w-4 h-4 text-[#00D9FF]" />
                    <span>{principle.title}</span>
                  </div>
                  <p className="text-[11px] text-[#8A8A8A] font-sans leading-relaxed">
                    {principle.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. FRAMEWORK COVERAGE */}
      <section id="frameworks" className="py-20 border-b border-[#1A1A1A] bg-[#070707]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#00D9FF] font-semibold uppercase tracking-wider">
              Regulatory Standards
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F5F5] tracking-tight">
              Framework Coverage
            </h2>
            <p className="text-xs sm:text-sm text-[#8A8A8A]">
              Comprehensive control coverage mapped to official cybersecurity baselines and defense hardening benchmarks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            {[
              {
                name: "CIS Benchmarks",
                subtitle: "Center for Internet Security",
                desc: "L1 / L2 Router & Firewall hardening baselines across management, logging, and routing protocols.",
                href: "/compliance/cis",
                tag: "CIS Cisco / JunOS / FortiOS",
              },
              {
                name: "NIST SP 800-53",
                subtitle: "Rev 5 Federal Security",
                desc: "AC (Access Control), AU (Audit), CM (Config Management), and SC (System Protection) control mappings.",
                href: "/compliance/nist",
                tag: "Federal Baseline",
              },
              {
                name: "DISA STIG",
                subtitle: "Defense Information Systems",
                desc: "Department of Defense Security Technical Implementation Guides for perimeter network devices.",
                href: "/compliance/stig",
                tag: "DoD Infrastructure",
              },
              {
                name: "ISO/IEC 27001",
                subtitle: "Information Security Management",
                desc: "Annex A.8 Technical controls, network segregation, and secure telecommunication management.",
                href: "/compliance/iso",
                tag: "ISO/IEC 27001:2022",
              },
            ].map((fw) => (
              <Link
                key={fw.name}
                href={fw.href}
                className="p-5 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#00D9FF]/40 transition-all space-y-3 flex flex-col justify-between group"
              >
                <div className="space-y-1">
                  <div className="text-[10px] text-[#666666] font-bold">{fw.subtitle}</div>
                  <div className="text-base font-bold text-[#F5F5F5] group-hover:text-[#00D9FF] transition-colors">
                    {fw.name}
                  </div>
                  <p className="text-[11px] text-[#8A8A8A] font-sans mt-2 leading-relaxed">
                    {fw.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1A1A1A] flex items-center justify-between text-[10px] text-[#666666]">
                  <span>{fw.tag}</span>
                  <ArrowRight className="w-3 h-3 text-[#00D9FF] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F5F5F5] tracking-tight font-sans">
            Turn configuration complexity into <br />
            <span className="text-[#00D9FF]">security intelligence.</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#8A8A8A] max-w-xl mx-auto font-sans leading-relaxed">
            Run deterministic audits across your multi-vendor network infrastructure with real-time risk prioritization and human-in-the-loop adaptive learning.
          </p>
          <div className="pt-4 flex justify-center gap-4 font-mono text-xs">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-[#00D9FF] hover:bg-[#00b8d9] text-[#050505] font-bold transition-all shadow-[0_0_20px_rgba(0,217,255,0.15)]"
            >
              <span>Enter NetVigil Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 9. INSTITUTIONAL FOOTER */}
      <footer className="border-t border-[#1A1A1A] bg-[#050505] py-12 font-mono text-xs text-[#8A8A8A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#F5F5F5] font-bold">
              <Shield className="w-4 h-4 text-[#00D9FF]" />
              <span>NETVIGIL</span>
            </div>
            <p className="text-[11px] text-[#666666] font-sans leading-relaxed">
              National Technical Research Organisation (NTRO) • Smart India Hackathon Problem Statement SIH26155.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">Workspaces</div>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link href="/dashboard" className="hover:text-white transition-colors">SOC Dashboard</Link></li>
              <li><Link href="/demo" className="hover:text-white transition-colors">Golden Demo</Link></li>
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
              <li><Link href="/ai-assistant" className="hover:text-white transition-colors">Security Co-Pilot</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] text-[#666666] uppercase font-bold tracking-wider">Engine Specs</div>
            <div className="p-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] space-y-1 text-[10px]">
              <div className="flex items-center justify-between">
                <span>Release</span>
                <span className="text-[#F5F5F5]">v1.0.0-SIH2026-RC1</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Execution</span>
                <span className="text-[#22C55E]">Deterministic AST</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Vendors</span>
                <span className="text-[#00D9FF]">Cisco / Jun / Forti</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-[#1A1A1A] flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-[#666666]">
          <div>© 2026 NetVigil Compliance Auditor. Built for NTRO (SIH26155).</div>
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
