"use client";

import React from "react";
import { Layers, ShieldCheck } from "lucide-react";

export default function NISTCompliancePage() {
  const families = [
    { code: "AC", name: "Access Control", desc: "Remote access, SSH v2 enforcement, AAA authentication" },
    { code: "SC", name: "System and Communications Protection", desc: "Cryptographic protection, boundary defense, BPDU Guard" },
    { code: "AU", name: "Audit and Accountability", desc: "Centralized syslog, timestamp synchronization, log buffering" },
    { code: "CM", name: "Configuration Management", desc: "Baseline configuration control, unused service deactivation" },
    { code: "IA", name: "Identification and Authentication", desc: "Strong password hashing, lockout duration, privilege separation" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span>NIST SP 800-53 Rev. 5 Compliance Mapping</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          National Institute of Standards and Technology security control families mapped to Universal Security Schema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {families.map((fam) => (
          <div key={fam.code} className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/40 font-mono text-xs font-bold">
                {fam.code}
              </span>
              <span className="text-sm font-semibold text-white">{fam.name}</span>
            </div>
            <p className="text-xs text-slate-400">{fam.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
