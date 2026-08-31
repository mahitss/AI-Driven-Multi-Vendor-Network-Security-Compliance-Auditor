"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getAppOrigin } from "@/lib/get-app-origin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  logout: async () => {},
  signInWithGoogle: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    async function handleAuthInit() {
      // 1. Detect if the browser landed on any page with an OAuth ?code= parameter
      if (typeof window !== "undefined") {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const authCode = urlParams.get("code");
          if (authCode && !window.location.pathname.startsWith("/auth/callback")) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
            if (!error && data?.session && mounted) {
              setSession(data.session);
              setUser(data.session.user);
              setLoading(false);
              const target = sessionStorage.getItem("netvigil_auth_redirect") || "/dashboard";
              sessionStorage.removeItem("netvigil_auth_redirect");
              try {
                const cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete("code");
                window.history.replaceState({}, "", cleanUrl.pathname + (cleanUrl.search ? cleanUrl.search : ""));
              } catch {
                // ignore
              }
              router.replace(target);
              return;
            }
          }
        } catch {
          // Fall through to regular session check
        }
      }

      // 2. Standard session retrieval
      try {
        const { data, error } = await supabase.auth.getSession();
        if (mounted) {
          if (!error && data?.session) {
            setSession(data.session);
            setUser(data.session.user);
          }
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    handleAuthInit();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      } else {
        router.replace("/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      } else {
        router.replace("/login");
      }
    }
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    try {
      // Direct window.location.origin is authoritative in the browser
      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin.trim().replace(/\/$/, "")
          : getAppOrigin();

      if (typeof window !== "undefined" && redirectTo) {
        try {
          sessionStorage.setItem("netvigil_auth_redirect", redirectTo);
        } catch {
          // ignore
        }
      }

      // Canonical root redirect URI (matches Supabase Site URL in production and localhost in dev)
      const redirectUri = origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        return { error };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, logout, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
