import React from "react";

export default function ProtectedLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse select-none">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#1F1F1F]">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-[#141414] rounded-md" />
          <div className="h-4 w-96 max-w-full bg-[#101010] rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-[#141414] rounded-md" />
          <div className="h-8 w-32 bg-[#141414] rounded-md" />
        </div>
      </div>

      {/* 2. Metric Grid Skeleton (4 Balanced Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] min-h-[120px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-[#141414] rounded" />
              <div className="h-3 w-12 bg-[#121212] rounded" />
            </div>
            <div className="h-9 w-20 bg-[#161616] rounded my-2" />
            <div className="h-3 w-36 bg-[#101010] rounded" />
          </div>
        ))}
      </div>

      {/* 3. Main Workspace Skeleton (Two Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-6 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] min-h-[360px] space-y-4">
          <div className="h-4 w-48 bg-[#141414] rounded" />
          <div className="space-y-2.5 pt-2">
            <div className="h-10 w-full bg-[#101010] rounded-lg" />
            <div className="h-10 w-full bg-[#101010] rounded-lg" />
            <div className="h-10 w-full bg-[#101010] rounded-lg" />
            <div className="h-10 w-full bg-[#101010] rounded-lg" />
          </div>
        </div>

        <div className="lg:col-span-4 p-6 rounded-xl bg-[#0B0B0B] border border-[#1F1F1F] min-h-[360px] space-y-4">
          <div className="h-4 w-36 bg-[#141414] rounded" />
          <div className="h-28 w-full bg-[#101010] rounded-lg" />
          <div className="space-y-2 pt-2">
            <div className="h-8 w-full bg-[#121212] rounded-md" />
            <div className="h-8 w-full bg-[#121212] rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
