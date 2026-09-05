"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft, ShieldAlert } from "lucide-react";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error in development/console
    console.error("[NetVigil SOC Error Boundary]", error);
  }, [error]);

  const sanitizedMessage =
    error?.message && !error.message.includes("Object") && !error.message.includes("null")
      ? error.message
      : "An unexpected telemetry or rendering anomaly occurred while processing this view.";

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] shadow-2xl space-y-5 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444] mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#141414] text-[#8E8E93] border border-[#242424] uppercase tracking-wider mb-1">
            RUNTIME EXCEPTION CAUGHT
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-mono text-[#F2F2F2] tracking-tight">
            Security Console View Anomaly
          </h2>
          <p className="text-xs text-[#8E8E93] leading-relaxed max-w-md mx-auto">
            {sanitizedMessage}
          </p>
        </div>

        {error.digest && (
          <div className="p-2.5 rounded-lg bg-[#080808] border border-[#141414] text-[11px] font-mono text-[#636366]">
            <span>Error Digest: </span>
            <span className="text-[#8E8E93]">{error.digest}</span>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 font-mono text-xs">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-[#F2F2F2] hover:bg-white text-black font-semibold transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RETRY OPERATION</span>
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] text-[#8E8E93] hover:text-[#F2F2F2] border border-[#242424] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO DASHBOARD</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
