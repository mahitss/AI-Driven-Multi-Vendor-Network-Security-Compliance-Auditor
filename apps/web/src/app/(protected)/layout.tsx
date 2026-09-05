"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import AppShell from "@/components/layout/AppShell";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const isAuthBypassed = !supabaseUrl || supabaseUrl.includes("placeholder-project");

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthBypassed && !loading && !user) {
      const safePath = pathname || "/dashboard";
      const loginUrl = `/login?redirectTo=${encodeURIComponent(safePath)}`;
      router.replace(loginUrl);
    }
  }, [loading, user, router, pathname]);

  if (!isAuthBypassed && loading) {
    return (
      <div className="flex h-screen bg-[#070707] items-center justify-center font-mono">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0B0B0B] border border-[#1F1F1F] text-xs text-[#8E8E93]">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span>VERIFYING SOC SESSION BOUNDARY...</span>
        </div>
      </div>
    );
  }

  if (!isAuthBypassed && !user) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
