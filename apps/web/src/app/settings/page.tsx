"use client";

import React from "react";
import { Settings as SettingsIcon, Shield, Key, Database, Server } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
          <span>Platform Settings & Ingestion Policies</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure deterministic parsing thresholds, OpenRouter AI keys, and storage encryption parameters.
        </p>
      </div>

      <div className="p-5 rounded-xl bg-slate-900/50 border border-white/5 space-y-4 max-w-3xl">
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="font-semibold text-white">System Architecture Configuration</span>
            <span className="text-[11px] font-mono text-cyan-400">NTRO SIH26155</span>
          </div>

          <div className="space-y-2 font-mono">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Deterministic Engine Mode:</span>
              <span className="text-emerald-400">Active (AST + Regex Signatures)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Supported File Formats:</span>
              <span className="text-slate-200">.cfg, .conf, .txt, .log</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Max Ingestion Size:</span>
              <span className="text-slate-200">10 MB</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Cryptographic Digest:</span>
              <span className="text-slate-200">SHA-256 (256-bit)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">AI Provider Abstraction:</span>
              <span className="text-cyan-400">OpenRouter (Claude 3.5 Sonnet / Air-Gapped Fallback)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
