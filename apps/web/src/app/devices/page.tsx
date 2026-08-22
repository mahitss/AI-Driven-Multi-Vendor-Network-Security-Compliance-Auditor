"use client";

import React from "react";
import { Server, Plus, Cpu, Network } from "lucide-react";

export default function DevicesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Server className="w-5 h-5 text-indigo-400" />
            <span>Network Device Inventory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Managed routers, switches, firewalls, and security gateways across network enclaves.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-xl bg-slate-900/40 border border-white/5 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
          <Network className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-white">Device Inventory Registry</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Devices are automatically associated when configurations with matching hostnames are parsed and audited.
        </p>
      </div>
    </div>
  );
}
