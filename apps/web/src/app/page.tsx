"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  FileCode2,
  Server,
  AlertTriangle,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Cpu,
  Layers,
  Lock,
  ExternalLink,
} from "lucide-react";
import { fetchOverviewStats } from "@/lib/api-client";

export default function OverviewPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["overview-stats"],
    queryFn: fetchOverviewStats,
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="p-5 lg:p-6 rounded-xl bg-gradient-to-r from-slate-900 via-[#0d1627] to-slate-900 border border-white/5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/40 text-cyan-400 text-[11px] font-mono mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SIH26155 • National Technical Research Organisation</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
              AI-Driven Multi-Vendor Network Compliance Platform
            </h1>
            <p className="text-xs lg:text-sm text-slate-400 max-w-2xl mt-1">
              Deterministic parsing, universal security normalization, and evidence-backed compliance auditing
              for heterogeneous Cisco, Juniper, and Fortinet network infrastructures.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/configurations"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-950 transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Ingest Configuration</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Ingested Configurations</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <FileCode2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {isLoading ? "--" : stats?.total_configurations ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium">Live Ingestion</span>
            <span>• SHA-256 Verified</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Monitored Devices</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {isLoading ? "--" : stats?.total_devices ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">Routers, Switches, Firewalls</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Compliance Audits</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {isLoading ? "--" : stats?.total_audits ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">Deterministic Rule Evaluations</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active Findings</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {isLoading ? "--" : stats?.total_findings ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">Evidence-Backed Deviations</div>
        </div>
      </div>

      {/* Architecture & Pipeline Status */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">NetVigil Processing Pipeline Contract</h2>
            <p className="text-xs text-slate-400">
              Deterministic separation of parsing, normalization, and compliance evaluation from AI interpretation.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800/30">
            Pipeline v1.0
          </span>
        </div>

        {/* Pipeline Visual Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
          {[
            { step: "01", name: "Raw Config", sub: ".cfg / .conf" },
            { step: "02", name: "Ingestion", sub: "SHA-256 Hash" },
            { step: "03", name: "Detection", sub: "Signature Tier" },
            { step: "04", name: "Parser", sub: "Deterministic" },
            { step: "05", name: "Normalize", sub: "Universal Schema" },
            { step: "06", name: "Compliance", sub: "CIS / STIG" },
            { step: "07", name: "Findings", sub: "Evidence Proof" },
            { step: "08", name: "AI Co-pilot", sub: "Remediation" },
          ].map((item, idx) => (
            <div
              key={item.step}
              className="p-3 rounded-lg bg-[#0e1626] border border-white/5 flex flex-col items-center justify-center space-y-1 hover:border-cyan-500/30 transition-colors"
            >
              <span className="text-[10px] font-mono text-cyan-400">{item.step}</span>
              <span className="font-semibold text-slate-200 text-[11px]">{item.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">{item.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Vendor Matrix & Framework Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor Detection Engine Matrix */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Multi-Vendor Parser Engine</h2>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              Active Signatures
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                vendor: "Cisco Systems",
                platform: "IOS / IOS-XE / NX-OS",
                depth: "Deep Parser & Normalizer (Day 1 Focus)",
                status: "Operational",
                color: "text-emerald-400",
              },
              {
                vendor: "Juniper Networks",
                platform: "JunOS (Hierarchical & Set Syntax)",
                depth: "Hierarchical & Set AST Detection",
                status: "Operational",
                color: "text-emerald-400",
              },
              {
                vendor: "Fortinet",
                platform: "FortiOS 6.x / 7.x (FortiGate)",
                depth: "Block Structure & Object Parser",
                status: "Operational",
                color: "text-emerald-400",
              },
            ].map((v) => (
              <div
                key={v.vendor}
                className="p-3 rounded-lg bg-[#0b101c] border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-medium text-slate-200">{v.vendor}</div>
                  <div className="text-[11px] text-slate-400">{v.platform}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{v.depth}</div>
                </div>
                <span className={`text-[11px] font-mono ${v.color}`}>{v.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Frameworks Baseline */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Compliance Framework Engines</h2>
            </div>
            <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
              Universal Schema
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                name: "CIS Benchmarks",
                scope: "Cisco IOS 15 / 17, Juniper JunOS, FortiOS",
                controls: "AAA, SSH, VTY, BPDU Guard, NTP, Syslog",
                link: "/compliance/cis",
              },
              {
                name: "NIST SP 800-53",
                scope: "AC (Access Control), SC (System Comm), AU (Audit)",
                controls: "Zero Trust & Defensive Perimeter Baselines",
                link: "/compliance/nist",
              },
              {
                name: "DISA STIG",
                scope: "Network Infrastructure Security Technical Guide",
                controls: "High & Medium Cat I/II/III STIG Rules",
                link: "/compliance/stig",
              },
              {
                name: "ISO/IEC 27001",
                scope: "Annex A.9, A.10, A.12, A.13 Controls",
                controls: "Cryptographic Controls & Network Segregation",
                link: "/compliance/iso",
              },
            ].map((f) => (
              <Link
                key={f.name}
                href={f.link}
                className="p-3 rounded-lg bg-[#0b101c] border border-white/5 flex items-center justify-between text-xs hover:border-indigo-500/30 transition-colors group"
              >
                <div>
                  <div className="font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">
                    {f.name}
                  </div>
                  <div className="text-[11px] text-slate-400">{f.scope}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{f.controls}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
